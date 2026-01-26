import { HeaderMessageInfo } from './message-info';

export interface PublishingResult {
    threadId: number;
    headerMessageInfo: HeaderMessageInfo;
}