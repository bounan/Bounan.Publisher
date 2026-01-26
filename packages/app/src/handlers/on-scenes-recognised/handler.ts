import { client_setClientToken } from '@lightweight-clients/telegram-bot-api-lightweight-client';
import { Context, SNSEvent } from 'aws-lambda';

import { config, initConfig } from '../../config/config';
import { processScenes } from './processor';

const processMessage = async (message: string): Promise<void> => {
    console.log('Processing message: ', message);

    const updatingRequest = JSON.parse(message);
    await processScenes(updatingRequest);

    console.log('Message processed');
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler = async (event: SNSEvent, context: Context): Promise<void> => {
    console.log('Processing event: ', event);

    await initConfig();
    client_setClientToken(config.value.telegram.token);

    for (const record of event.Records) {
        console.log('Processing record: ', record?.Sns?.MessageId);
        await processMessage(record.Sns.Message);
    }

    console.info('done');
};
