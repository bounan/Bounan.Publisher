import { client_setClientToken } from '@lightweight-clients/telegram-bot-api-lightweight-client';
import type { Context, SNSEvent } from 'aws-lambda';

import type { VideoDownloadedNotification } from '../../../../../third-party/common/ts/interfaces';
import { config, initConfig } from '../../config/config';
import { createLogger } from '../../logger';
import { processNewEpisode } from './processor';

const logger = createLogger('app/handlers/on-video-downloaded/handler');

const processMessage = async (message: string): Promise<void> => {
  logger.info('Processing video-downloaded message', { message });

  const publishingRequest: VideoDownloadedNotification = JSON.parse(message);
  await processNewEpisode(publishingRequest);

  logger.info('Video-downloaded message processed');
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler = async (event: SNSEvent, context: Context): Promise<void> => {
  logger.info('Processing video-downloaded event', { recordCount: event.Records.length });

  await initConfig();
  client_setClientToken(config.value.telegram.token);

  for (const record of event.Records) {
    logger.info('Processing video-downloaded record', { messageId: record?.Sns?.MessageId });
    await processMessage(record.Sns.Message);
  }

  logger.info('Video-downloaded event processed');
};
