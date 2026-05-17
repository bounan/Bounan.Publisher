import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { config } from '../../config/config';
import type { HeaderMessageInfoEntity } from '../../database/entities/header-message-info-entity';
import { docClient, getTableKey } from '../../database/repository';
import { createLogger } from '../../logger';
import type { AnimeKey } from '../../models/anime-key';

const logger = createLogger('app/handlers/on-video-downloaded/repository');

export const setHeader = async (
  anime: AnimeKey,
  threadId: number,
  headerPostInfo: HeaderMessageInfoEntity,
): Promise<void> => {
  const command = new UpdateCommand({
    TableName: config.value.database.tableName,
    Key: { AnimeKey: getTableKey(anime) },
    ConditionExpression: 'attribute_exists(AnimeKey)',
    UpdateExpression: 'SET threadId = :threadId, headerPost = :headerPost, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':threadId': threadId,
      ':headerPost': headerPostInfo,
      ':updatedAt': new Date().toISOString(),
    },
  });

  const result = await docClient.send(command);
  logger.info('Header and thread saved', { anime, threadId, result });
}
