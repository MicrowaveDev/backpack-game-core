export interface TelegramCommand {
  command: string;
  botUsername: string;
  args: string;
}

export function normalizeTelegramBotUsername(value: unknown): string;
export function normalizeTelegramChatTarget(target: unknown): string;
export function buildTelegramMiniAppLink(options?: {
  botUsername?: unknown;
  miniAppName?: unknown;
  startParam?: unknown;
}): string;
export function buildTelegramDmStartLink(options?: {
  botUsername?: unknown;
  startParam?: unknown;
}): string;
export function createTelegramInlineKeyboard(reply?: {
  ctas?: Array<{ label?: unknown; url?: unknown }>;
}): { inline_keyboard: Array<Array<{ text: string; url: string }>> } | undefined;
export function buildTelegramGameScorePayload(options?: Record<string, unknown>): Record<string, unknown>;
export function parseTelegramCommand(text: unknown): TelegramCommand | null;
export function normalizeTelegramUpdate(update?: Record<string, any>): {
  kind: 'pre_checkout_query' | 'callback_query' | 'successful_payment' | 'command' | 'message' | 'ignored';
  value: any;
  message?: any;
  update: Record<string, any>;
};
