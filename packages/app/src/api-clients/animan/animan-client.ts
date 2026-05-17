import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

import type {
  PublisherResultRequest,
  PublisherResultRequestItem,
} from '../../../../../third-party/common/ts/interfaces';
import { config } from '../../config/config';
import { createLogger } from '../../logger';
import type { AnimeKey } from '../../models/anime-key';

const lambdaClient = new LambdaClient({});
const logger = createLogger('app/api-clients/animan-client');

export const updatePublishingDetails = async (
  animeKey: AnimeKey,
  threadId: number,
  messageIds: { episode: number; messageId: number }[],
): Promise<void> => {
  if (messageIds.length === 0) {
    logger.info('No publishing details to update', { animeKey });
    return;
  }

  const items: PublisherResultRequestItem[] = messageIds.map(item => ({
    videoKey: {
      myAnimeListId: animeKey.myAnimeListId,
      dub: animeKey.dub,
      episode: item.episode,
    },
    publishingDetails: {
      threadId: threadId,
      messageId: item.messageId,
    },
  }));

  const request: PublisherResultRequest = { items };
  const message = JSON.stringify(request);
  logger.info('Sending update publishing details request', { animeKey, threadId, itemCount: items.length });

  const result = await lambdaClient.send(new InvokeCommand({
    FunctionName: config.value.animan.updatePublishingDetailsFunctionName,
    Payload: message,
  }));
  logger.info('Update publishing details request sent', { animeKey, result });
}
