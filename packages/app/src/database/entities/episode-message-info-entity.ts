import { BaseTelegramMessageInfo } from './base-telegram-message-info';

export interface EpisodeMessageInfoEntity extends BaseTelegramMessageInfo {
    episode: number;
}
