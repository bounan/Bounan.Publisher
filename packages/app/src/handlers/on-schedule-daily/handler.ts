import { client_setClientToken } from '@lightweight-clients/telegram-bot-api-lightweight-client';
import type { Context, ScheduledEvent } from 'aws-lambda';

import { config, initConfig } from '../../config/config';
import { createLogger } from '../../logger';
import { updateCalendar } from './processor';

const logger = createLogger('app/handlers/on-schedule-daily/handler');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler = async (_event: ScheduledEvent, _context: Context): Promise<void> => {
  logger.info('Processing scheduled calendar event');

  await initConfig();
  client_setClientToken(config.value.telegram.token);

  await updateCalendar();

  logger.info('Scheduled calendar event processed');
};
