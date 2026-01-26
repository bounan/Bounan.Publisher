import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

import type {
  PublisherResultRequest,
  PublisherResultRequestItem,
} from '../../../../../third-party/common/ts/interfaces';
import { config } from '../../config/config';
import type { AnimeKey } from '../../models/anime-key';

const lambdaClient = new LambdaClient({});

export const updatePublishingDetails = async (
  animeKey: AnimeKey,
  threadId: number,
  messageIds: { episode: number; messageId: number }[],
): Promise<void> => {
  if (messageIds.length === 0) {
    console.log('No items to update');
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
  console.log('Sending request: ', message);

  const result = await lambdaClient.send(new InvokeCommand({
    FunctionName: config.value.animan.updatePublishingDetailsFunctionName,
    Payload: message,
  }));
  console.log('Request sent: ', result);
}