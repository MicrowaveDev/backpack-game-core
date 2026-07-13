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

export interface TelegramBotGatewayPortOptions {
  createTelegramAuthCode: (...args: any[]) => Promise<any>;
  confirmTelegramAuthCode: (...args: any[]) => Promise<any>;
  completeTelegramSuccessfulPayment: (...args: any[]) => Promise<any>;
  getPaymentSupportLinks: (...args: any[]) => any;
  validateTelegramPreCheckout: (...args: any[]) => Promise<any>;
  env?: Record<string, string | undefined>;
  defaultFetch?: (...args: any[]) => Promise<any>;
  defaultMiniAppName?: string;
  defaultGameShortName?: string;
  copy?: Record<string, string>;
}

export type TelegramBotGatewayPort = Record<string, (...args: any[]) => any>;

export function createTelegramBotGatewayPort(
  options: TelegramBotGatewayPortOptions
): TelegramBotGatewayPort;

export interface WikiServicePortOptions {
  rootDir: string;
  readFile: (path: string, encoding: string) => Promise<string>;
  readDirectory: (path: string, options: any) => Promise<any[]>;
  joinPath?: (...parts: string[]) => string;
  parseMarkdown?: (markdown: string) => string;
  lexMarkdown?: (markdown: string) => any[];
  sections?: string[];
  gatedSection?: string;
  tierThresholds?: number[];
  summarizeEntry?: (entry: any) => any;
}

export interface WikiServicePort {
  getWikiHome(): Promise<Record<string, any[]>>;
  getWikiEntry(section: string, slug: string, progressValue?: number): Promise<any>;
}

export function createWikiServicePort(options: WikiServicePortOptions): WikiServicePort;
