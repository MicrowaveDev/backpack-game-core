export interface TelegramInitDataVerification {
  ok: boolean;
  user: any;
  issue: string | null;
  authDate: number;
}

export function parseTelegramInitData(initData: unknown): Record<string, any>;
export function verifyTelegramInitData(initData: unknown, options?: {
  botToken?: string;
  maxAgeSeconds?: number;
  futureSkewSeconds?: number;
  nowSeconds?: number;
}): TelegramInitDataVerification;
export function createTelegramBotApiClient(options?: Record<string, any>): {
  call(method: string, payload?: any, options?: any): Promise<any>;
  sendMessage(chatTarget: unknown, text: string, options?: any): Promise<any>;
  editMessageText(chatTarget: unknown, messageId: unknown, text: string, options?: any): Promise<any>;
  deleteMessage(chatTarget: unknown, messageId: unknown, options?: any): Promise<boolean>;
  sendDocument(chatTarget: unknown, document: any, options?: any): Promise<any>;
};
export function createTelegramUpdateRouter(options?: Record<string, any>): (update: any, context?: any) => Promise<any>;
export function createTelegramBotRuntime(options?: Record<string, any>): Record<string, (...args: any[]) => any>;
