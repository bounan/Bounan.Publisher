import { GetParameterCommand, PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

import { config } from '../../config/config';

const ssmClient = new SSMClient();

export interface CalendarState {
  messageId: number;
  hash: number;
}

export const getCalendarState = async (): Promise<CalendarState> => {
  const query = new GetParameterCommand({ Name: config.value.database.calendarStateParameterName });
  const response = await ssmClient.send(query);
  const value = response.Parameter?.Value;
  if (!value)
    throw new Error('Calendar state parameter not found');

  return JSON.parse(value) as CalendarState;
};

export const saveCalendarState = async (state: CalendarState): Promise<void> => {
  await ssmClient.send(new PutParameterCommand({
    Name: config.value.database.calendarStateParameterName,
    Value: JSON.stringify(state),
    Type: 'String',
    Overwrite: true,
  }));
};

