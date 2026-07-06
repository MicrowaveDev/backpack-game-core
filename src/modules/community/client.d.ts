export interface HostedCommunityClientStatus {
  runtimeMode: string;
  configured: boolean;
  communityServerUrl: string | null;
  readOnly: boolean;
  surfaces: Record<string, boolean>;
}

export interface HostedCommunityClientOptions {
  runtimeMode?: string;
  communityServerUrl?: string;
  fetchImpl?: typeof fetch;
  endpoints?: {
    leaderboard?: string;
    [key: string]: unknown;
  };
  surfaces?: Record<string, unknown>;
}

export interface HostedLeaderboardResult {
  available: boolean;
  source: string;
  entries: unknown[];
}

export class HostedCommunityClient {
  runtimeMode: string;
  communityServerUrl: string;
  fetchImpl: typeof fetch;
  endpoints: {
    leaderboard: string;
  };
  surfaces: Record<string, boolean>;
  constructor(options?: HostedCommunityClientOptions);
  status(): HostedCommunityClientStatus;
  requestJson(endpoint: string, options?: {
    headers?: Record<string, string>;
    statusMessage?: string;
  }): Promise<unknown>;
  leaderboard(): Promise<HostedLeaderboardResult>;
}

export function createHostedCommunityClient(options?: HostedCommunityClientOptions): HostedCommunityClient;
