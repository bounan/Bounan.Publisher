import { client_setClientToken } from '@lightweight-clients/telegram-bot-api-lightweight-client';
import type { Context, ScheduledEvent } from 'aws-lambda';

import { config, initConfig } from '../../config/config';
import { updateCalendar } from './processor';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler = async (_event: ScheduledEvent, _context: Context): Promise<void> => {
  console.log('Processing scheduled event');

  await initConfig();
  client_setClientToken(config.value.telegram.token);

  await updateCalendar();

  console.info('done');
};

