import { BaseTelegramMessageInfo } from './base-telegram-message-info';

// Header post is just a message, no additional info is needed
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HeaderMessageInfoEntity extends BaseTelegramMessageInfo {
}