export interface TelegramCommand {
  command: string;
  botUsername: string;
  args: string;
}

export interface TelegramWindowLike {
  Telegram?: {
    WebApp?: Record<string, any>;
  };
  location?: {
    origin?: string;
  };
  navigator?: {
    share?: (data: { text?: string; url?: string }) => Promise<unknown>;
    clipboard?: {
      writeText?: (value: string) => Promise<unknown>;
    };
  };
}

export function normalizeTelegramBotUsername(value: unknown): string;
export function normalizeTelegramChatTarget(target: unknown): string;
export function getTelegramWebApp(win?: TelegramWindowLike | null): Record<string, any> | null;
export function getTelegramStartParam(webApp?: Record<string, any> | null): string;
export function isTelegramMiniAppEnvironment(win?: TelegramWindowLike | null): boolean;
export function buildFriendRefParam(friendCode: unknown): string;
export function buildTelegramMiniAppLink(options?: {
  botUsername?: unknown;
  miniAppName?: unknown;
  startParam?: unknown;
}): string;
export function buildTelegramShareUrl(options?: {
  url?: unknown;
  text?: unknown;
}): string;
export function shareTelegramText(options?: {
  text?: string;
  url?: string;
  win?: TelegramWindowLike | null;
  navigatorRef?: TelegramWindowLike['navigator'];
}): Promise<'telegram' | 'native' | 'clipboard' | 'none'>;
export function buildWebsiteFriendInviteLink(options?: {
  friendCode?: unknown;
  location?: { origin?: string } | null;
}): string;
export function buildFriendInviteLink(options?: {
  friendCode?: unknown;
  botUsername?: unknown;
  win?: TelegramWindowLike | null;
  location?: { origin?: string } | null;
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
