export interface MushroomAuthServicePortOptions {
  crypto: {
    createHmac: (...args: any[]) => any;
    randomUUID: () => string;
  };
  query: (...args: any[]) => Promise<any>;
  withTransaction: (callback: (client: any) => Promise<any>) => Promise<any>;
  createId: (prefix: string) => string;
  createSessionKey: () => string;
  createShortCode: (length?: number) => string;
  normalizeLanguage?: (value: unknown, fallback: string) => string;
  nowIso?: () => string;
  nowDate?: () => Date;
  random?: () => number;
  characters?: Array<{ id: string }>;
  sessionTtlHours?: number;
}

export interface MushroomAuthServicePort {
  verifyTelegramInitData(initData: string, botToken: string): boolean;
  upsertTelegramPlayer(telegramUser: any, provider?: string): Promise<any>;
  loginWithDevSession(payload?: Record<string, unknown>): Promise<any>;
  loginWithWebSession(payload?: Record<string, unknown>): Promise<any>;
  loginWithTelegram(initData: string, botToken: string): Promise<any>;
  logoutSession(sessionKey?: string): Promise<void>;
  pruneExpiredAuthRecords(now?: string): Promise<any>;
  createTelegramAuthCode(): Promise<any>;
  confirmTelegramAuthCode(publicCode: string, telegramUser: any): Promise<any>;
  verifyTelegramAuthCode(privateCode: string): Promise<any>;
  authenticateRequest(req: any, res: any, next: () => unknown): Promise<unknown>;
  requireAuth(req: any, res: any, next: () => unknown): unknown;
}

export function createMushroomAuthServicePort(
  options: MushroomAuthServicePortOptions
): MushroomAuthServicePort;
