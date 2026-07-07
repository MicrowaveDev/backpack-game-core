const DEFAULT_CLAIM_TTL_MS = 2 * 60 * 1000;
const DEFAULT_WAIT_TIMEOUT_MS = 2500;
const DEFAULT_WAIT_INTERVAL_MS = 25;

function defaultHttpError(message, statusCode = 409) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function positiveNumber(value, fallback, { allowZero = false } = {}) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  if (allowZero && number >= 0) return number;
  return number > 0 ? number : fallback;
}

function optionValue(value) {
  return typeof value === 'function' ? value() : value;
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeScope(scope, httpError) {
  const normalized = String(scope || '').trim();
  if (!normalized) throw httpError('Mutation claim scope is required', 500);
  return normalized;
}

function normalizeClaimKey(claimKey, httpError) {
  const normalized = String(claimKey || '').trim();
  if (!normalized) throw httpError('Mutation claim key is required', 500);
  return normalized;
}

export function createMutationClaimService(options = {}) {
  const query = options.query;
  const createId = options.createId;
  const nowIso = options.nowIso;
  const nowMs = options.nowMs || (() => Date.now());
  const sleep = options.sleep || defaultSleep;
  const httpError = options.httpError || defaultHttpError;

  if (typeof query !== 'function') throw new Error('createMutationClaimService requires query');
  if (typeof createId !== 'function') throw new Error('createMutationClaimService requires createId');
  if (typeof nowIso !== 'function') throw new Error('createMutationClaimService requires nowIso');

  function claimTtlMs() {
    return positiveNumber(optionValue(options.claimTtlMs), DEFAULT_CLAIM_TTL_MS);
  }

  function waitTimeoutMs() {
    return positiveNumber(optionValue(options.waitTimeoutMs), DEFAULT_WAIT_TIMEOUT_MS, { allowZero: true });
  }

  function waitIntervalMs() {
    return positiveNumber(optionValue(options.waitIntervalMs), DEFAULT_WAIT_INTERVAL_MS);
  }

  async function tryAcquireMutationClaim(scope, claimKey) {
    const claimToken = createId('mutation_claim');
    const now = nowIso();
    const inserted = await query(
      `INSERT INTO mutation_claims (scope, claim_key, claim_token, claimed_at, updated_at)
       VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT DO NOTHING`,
      [scope, claimKey, claimToken, now]
    );
    if (inserted.rowCount) return { scope, claimKey, claimToken, acquiredAt: now, reclaimed: false };

    const staleBefore = new Date(nowMs() - claimTtlMs()).toISOString();
    const reclaimed = await query(
      `UPDATE mutation_claims
       SET claim_token = $3,
           claimed_at = $4,
           updated_at = $4
       WHERE scope = $1
         AND claim_key = $2
         AND claimed_at < $5
       RETURNING *`,
      [scope, claimKey, claimToken, now, staleBefore]
    );
    if (!reclaimed.rowCount) return null;
    return { scope, claimKey, claimToken, acquiredAt: now, reclaimed: true };
  }

  async function acquireMutationClaim(scope, claimKey) {
    const normalizedScope = normalizeScope(scope, httpError);
    const normalizedClaimKey = normalizeClaimKey(claimKey, httpError);
    const deadline = nowMs() + waitTimeoutMs();

    while (true) {
      const claim = await tryAcquireMutationClaim(normalizedScope, normalizedClaimKey);
      if (claim) return claim;
      if (nowMs() >= deadline) {
        throw httpError('Another mutation is already in progress; retry shortly', 409);
      }
      await sleep(Math.min(waitIntervalMs(), Math.max(0, deadline - nowMs())));
    }
  }

  async function releaseMutationClaim(claim) {
    if (!claim?.scope || !claim?.claimKey || !claim?.claimToken) return;
    await query(
      `DELETE FROM mutation_claims
       WHERE scope = $1 AND claim_key = $2 AND claim_token = $3`,
      [claim.scope, claim.claimKey, claim.claimToken]
    );
  }

  async function withMutationClaim(scope, claimKey, work) {
    const claim = await acquireMutationClaim(scope, claimKey);
    try {
      return await work(claim);
    } finally {
      await releaseMutationClaim(claim);
    }
  }

  return {
    acquireMutationClaim,
    releaseMutationClaim,
    withMutationClaim
  };
}
