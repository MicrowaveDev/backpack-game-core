import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(repoRoot, 'src');

function sourceFiles(dir = srcRoot) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    if (!entry.isFile() || !/\.(js|d\.ts)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function rel(file) {
  return path.relative(repoRoot, file);
}

const quarantinedMushroomPortFiles = new Set([
  'src/server/ports/mushroom/gameplay/artifact-fusion-service.js',
  'src/server/ports/mushroom/gameplay/battle-engine.js',
  'src/server/ports/mushroom/gameplay/battle-service.js',
  'src/server/ports/mushroom/gameplay/game-run-loadout.js',
  'src/server/ports/mushroom/gameplay/index.d.ts',
  'src/server/ports/mushroom/gameplay/index.js',
  'src/server/ports/mushroom/gameplay/season-service.js'
]);

const quarantinedMushroomModelFiles = new Set([
  'src/server/models/mushroom/AssetBurnExchange.js',
  'src/server/models/mushroom/AssetGachaCollection.js',
  'src/server/models/mushroom/AssetGachaPack.js',
  'src/server/models/mushroom/AssetGachaPackItem.js',
  'src/server/models/mushroom/AssetGachaPlanItem.js',
  'src/server/models/mushroom/AssetGachaSeason.js',
  'src/server/models/mushroom/AssetRoll.js',
  'src/server/models/mushroom/AuthCode.js',
  'src/server/models/mushroom/Battle.js',
  'src/server/models/mushroom/BattleEvent.js',
  'src/server/models/mushroom/BattleRequest.js',
  'src/server/models/mushroom/BattleReward.js',
  'src/server/models/mushroom/BattleSnapshot.js',
  'src/server/models/mushroom/ClientEvent.js',
  'src/server/models/mushroom/DailyRateLimit.js',
  'src/server/models/mushroom/FriendChallenge.js',
  'src/server/models/mushroom/Friendship.js',
  'src/server/models/mushroom/GameRound.js',
  'src/server/models/mushroom/GameRun.js',
  'src/server/models/mushroom/GameRunFusion.js',
  'src/server/models/mushroom/GameRunLoadoutItem.js',
  'src/server/models/mushroom/GameRunPlayer.js',
  'src/server/models/mushroom/GameRunRefund.js',
  'src/server/models/mushroom/GameRunShopState.js',
  'src/server/models/mushroom/LocalTestRun.js',
  'src/server/models/mushroom/MutationClaim.js',
  'src/server/models/mushroom/PaymentWebhookEvent.js',
  'src/server/models/mushroom/Player.js',
  'src/server/models/mushroom/PlayerAchievement.js',
  'src/server/models/mushroom/PlayerActiveCharacter.js',
  'src/server/models/mushroom/PlayerAssetInstance.js',
  'src/server/models/mushroom/PlayerEquippedAsset.js',
  'src/server/models/mushroom/PlayerMushroom.js',
  'src/server/models/mushroom/PlayerSeasonArchive.js',
  'src/server/models/mushroom/PlayerSeasonProgress.js',
  'src/server/models/mushroom/PlayerSeasonRun.js',
  'src/server/models/mushroom/PlayerSettings.js',
  'src/server/models/mushroom/PlayerWalletBalance.js',
  'src/server/models/mushroom/PlayerWalletTransaction.js',
  'src/server/models/mushroom/ProviderSettlementImport.js',
  'src/server/models/mushroom/ProviderSettlementRecord.js',
  'src/server/models/mushroom/Session.js',
  'src/server/models/mushroom/SupportAction.js',
  'src/server/models/mushroom/WalletPurchaseIntent.js',
  'src/server/models/mushroom/index.d.ts',
  'src/server/models/mushroom/index.js'
]);

const sequelizePattern = /\bsequelize\b/i;

const forbiddenProductPatterns = [
  /\bmushroom-master\b/i,
  /\bmeat-master\b/i,
  /(?:^|['"])web\/src\//,
  /(?:^|['"])app\/server\//,
  /(?:^|['"])app\/shared\//,
  /(?:^|['"])src\/data\//,
  /(?:^|['"])web\/public\//,
  /\bexpress\b/,
  sequelizePattern,
  /\btelegram\b/i,
  /\bbtcpay\b/i,
  /\bnowpayments\b/i
];

const browserSafeEntryPatterns = [
  /(^|\/)client-view-model\.(js|d\.ts)$/,
  /(^|\/)client\//,
  /(^|\/)vue\//
];

test('[boundaries] core source does not import product or provider code', () => {
  for (const file of sourceFiles()) {
    const relativeFile = rel(file);
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of forbiddenProductPatterns) {
      if (pattern === sequelizePattern && quarantinedMushroomModelFiles.has(relativeFile)) continue;
      assert.doesNotMatch(content, pattern, `${relativeFile} should not match forbidden product/provider pattern ${pattern}`);
    }
  }
});

test('[boundaries] quarantined Mushroom ports stay explicitly allowlisted', () => {
  const portFiles = sourceFiles()
    .map(rel)
    .filter((file) => file.startsWith('src/server/ports/mushroom/'));

  assert.deepEqual(portFiles.sort(), Array.from(quarantinedMushroomPortFiles).sort());
});

test('[boundaries] quarantined Mushroom models stay explicitly allowlisted', () => {
  const modelFiles = sourceFiles()
    .map(rel)
    .filter((file) => file.startsWith('src/server/models/mushroom/'));

  assert.deepEqual(modelFiles.sort(), Array.from(quarantinedMushroomModelFiles).sort());
});

test('[boundaries] browser-safe core exports avoid Node-only imports', () => {
  for (const file of sourceFiles()) {
    if (!browserSafeEntryPatterns.some((pattern) => pattern.test(file))) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(content, /from\s+['"]node:/, `${rel(file)} should not import node:* from browser-safe exports`);
    assert.doesNotMatch(content, /require\s*\(/, `${rel(file)} should not use require() from browser-safe exports`);
  }
});
