import { client_setClientToken } from '@lightweight-clients/telegram-bot-api-lightweight-client';
import type { Context, SNSEvent } from 'aws-lambda';

import { config, initConfig } from '../../config/config';
import { createLogger } from '../../logger';
import { processScenes } from './processor';

const logger = createLogger('app/handlers/on-scenes-recognised/handler');

const processMessage = async (message: string): Promise<void> => {
  logger.info('Processing scene-recognised message', { message });

  const updatingRequest = JSON.parse(message);
  await processScenes(updatingRequest);

  logger.info('Scene-recognised message processed');
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler = async (event: SNSEvent, context: Context): Promise<void> => {
  logger.info('Processing scene-recognised event', { recordCount: event.Records.length });

  await initConfig();
  client_setClientToken(config.value.telegram.token);

  for (const record of event.Records) {
    logger.info('Processing scene-recognised record', { messageId: record?.Sns?.MessageId });
    await processMessage(record.Sns.Message);
  }

  logger.info('Scene-recognised event processed');
};
