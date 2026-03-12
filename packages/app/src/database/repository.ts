import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { config } from '../config/config';
import { AnimeLockedError } from '../errors/anime-locked-error';
import type { AnimeKey } from '../models/anime-key';
import type { EpisodeMessageInfoEntity } from './entities/episode-message-info-entity';
import type { PublishedAnimeEntity, RegisteredAnimeEntity } from './entities/published-anime-entity';

const dynamoDbClient = new DynamoDBClient();
export const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

export const getTableKey = (animeKey: AnimeKey): string => {
  return `${animeKey.myAnimeListId}#${animeKey.dub}`;
}

const lock = async (key: AnimeKey): Promise<void> => {
  await docClient.send(new UpdateCommand({
    TableName: config.value.database.tableName,
    Key: { AnimeKey: getTableKey(key) },
    ConditionExpression: 'attribute_exists(AnimeKey) AND attribute_not_exists(Locked)',
    UpdateExpression: 'SET Locked = :locked',
    ExpressionAttributeValues: {
      ':locked': true,
    },
  }));
}

export const unlock = async (key: AnimeKey): Promise<void> => {
  await docClient.send(new UpdateCommand({
    TableName: config.value.database.tableName,
    Key: { AnimeKey: getTableKey(key) },
    ConditionExpression: 'attribute_exists(AnimeKey) AND Locked = :locked',
    UpdateExpression: 'REMOVE Locked',
    ExpressionAttributeValues: {
      ':locked': true,
    },
  }));
}

export const getOrRegisterAnimeAndLock = async (
  key: AnimeKey,
): Promise<PublishedAnimeEntity | RegisteredAnimeEntity> => {
  const command = new GetCommand({
    TableName: config.value.database.tableName,
    Key: { AnimeKey: getTableKey(key) },
  });

  const response = await docClient.send(command);
  if (response.Item) {
    if (response.Item.Locked) {
      throw new AnimeLockedError('Anime is locked');
    }

    await lock(key);
    return response.Item as PublishedAnimeEntity;
  }

  const anime: RegisteredAnimeEntity = {
    myAnimeListId: key.myAnimeListId,
    dub: key.dub,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(new PutCommand({
    TableName: config.value.database.tableName,
    Item: {
      ...anime,
      AnimeKey: getTableKey(key),
      Locked: true,
    },
    ConditionExpression: 'attribute_not_exists(AnimeKey)',
  }));

  return anime;
}

export const upsertEpisodes = async (
  animeKey: AnimeKey,
  originalEpisodes: PublishedAnimeEntity['episodes'],
  newEpisodes: { [episode: number]: EpisodeMessageInfoEntity },
): Promise<void> => {
  const command = new UpdateCommand({
    TableName: config.value.database.tableName,
    Key: { AnimeKey: getTableKey(animeKey) },
    ConditionExpression: 'attribute_exists(AnimeKey)',
    UpdateExpression: 'SET #episodes = :episodes, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#episodes': 'episodes',
    },
    ExpressionAttributeValues: {
      ':episodes': {
        ...originalEpisodes,
        ...newEpisodes,
      },
      ':updatedAt': new Date().toISOString(),
    },
  });

  await docClient.send(command);
}

export const scanRecentlyPublished = async (since: Date): Promise<PublishedAnimeEntity[]> => {
  const items: PublishedAnimeEntity[] = [];
  let lastKey: Record<string, unknown> | undefined = undefined;

  do {
    const response = await docClient.send(new ScanCommand({
      TableName: config.value.database.tableName,
      FilterExpression: 'attribute_exists(threadId) AND updatedAt >= :since',
      ExpressionAttributeValues: { ':since': since.toISOString() },
      ExclusiveStartKey: lastKey,
    }));

    items.push(...(response.Items ?? []) as PublishedAnimeEntity[]);
    lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items;
};
