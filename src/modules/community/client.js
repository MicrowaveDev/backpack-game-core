const DEFAULT_ENDPOINTS = Object.freeze({
  leaderboard: '/api/leaderboard'
});

const DEFAULT_SURFACES = Object.freeze({
  leaderboard: true,
  friends: false,
  challenges: false,
  accountLinking: false,
  sharedSeasons: false
});

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function normalizeEndpoint(value, fallback) {
  const endpoint = String(value || fallback || '').trim();
  return endpoint || fallback;
}

function configuredSurfaces(communityServerUrl, surfaces = {}) {
  const configured = Boolean(communityServerUrl);
  return Object.fromEntries(
    Object.entries({ ...DEFAULT_SURFACES, ...surfaces })
      .map(([key, value]) => [key, configured && Boolean(value)])
  );
}

function communityUnavailable(surface) {
  return {
    available: false,
    source: 'unconfigured',
    surface
  };
}

function entriesFromCommunityPayload(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.entries)) return data.entries;
  return [];
}

export class HostedCommunityClient {
  constructor({
    runtimeMode = 'local',
    communityServerUrl = '',
    fetchImpl = globalThis.fetch,
    endpoints = {},
    surfaces = {}
  } = {}) {
    this.runtimeMode = runtimeMode;
    this.communityServerUrl = normalizeBaseUrl(communityServerUrl);
    this.fetchImpl = fetchImpl;
    this.endpoints = {
      leaderboard: normalizeEndpoint(endpoints.leaderboard, DEFAULT_ENDPOINTS.leaderboard)
    };
    this.surfaces = configuredSurfaces(this.communityServerUrl, surfaces);
  }

  status() {
    return {
      runtimeMode: this.runtimeMode,
      configured: Boolean(this.communityServerUrl),
      communityServerUrl: this.communityServerUrl || null,
      readOnly: true,
      surfaces: { ...this.surfaces }
    };
  }

  async requestJson(endpoint, {
    headers = {},
    statusMessage = 'Community request failed'
  } = {}) {
    if (!this.communityServerUrl) return communityUnavailable(endpoint);
    const url = new URL(endpoint, `${this.communityServerUrl}/`);
    const response = await this.fetchImpl(url, {
      headers: {
        accept: 'application/json',
        ...headers
      }
    });
    if (!response.ok) {
      const error = new Error(`${statusMessage} with ${response.status}`);
      error.status = 502;
      throw error;
    }
    return response.json();
  }

  async leaderboard() {
    if (!this.communityServerUrl) {
      return {
        available: false,
        source: 'unconfigured',
        entries: []
      };
    }
    const payload = await this.requestJson(this.endpoints.leaderboard, {
      statusMessage: 'Community leaderboard request failed'
    });
    return {
      available: true,
      source: 'hosted',
      entries: entriesFromCommunityPayload(payload)
    };
  }
}

export function createHostedCommunityClient(options = {}) {
  return new HostedCommunityClient(options);
}
