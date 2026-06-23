import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { DynamoDbTableFixture } from '../tools/dynamodb';

describe('Publisher database', () => {
  it('stores a registered anime using the production key schema', async () => {
    const table = await DynamoDbTableFixture.create(`test-table-${randomUUID()}`);
    try {
      const anime = {
        AnimeKey: '5114#false',
        myAnimeListId: 5114,
        dub: false,
        Locked: true,
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      await table.put(anime);
      await expect(table.getAll()).resolves.toEqual([anime]);
    }
    finally {
      await table.drop();
    }
  });
});
