import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

import type { VideoDownloadedNotification } from '../../../../../third-party/common/ts/interfaces';
import { updatePublishingDetails } from '../../api-clients/animan/animan-client';
import { getJikanAnimePoster } from '../../api-clients/jikan/jikan-client';
import type { ShikiAnimeInfo } from '../../api-clients/shikimori/shikimori-client';
import { getShikiAnimeInfo } from '../../api-clients/shikimori/shikimori-client';
import { publishAnime, publishEpisode } from '../../api-clients/telegram/telegram-service';
import { config } from '../../config/config';
import type { PublishedAnimeEntity } from '../../database/entities/published-anime-entity';
import { getOrRegisterAnimeAndLock, unlock, upsertEpisodes } from '../../database/repository';
import { AnimeLockedError } from '../../errors/anime-locked-error';
import { createLogger } from '../../logger';
import type { AnimeKey } from '../../models/anime-key';
import { setHeader } from './repository';

const logger = createLogger('app/handlers/on-video-downloaded/processor');

const createTopic = async (
  shikiAnimeInfo: ShikiAnimeInfo,
  animeKey: AnimeKey,
): Promise<Pick<PublishedAnimeEntity, 'threadId' | 'episodes'>> => {
  logger.info('Creating new topic for anime', { animeKey });

  const posterUrl = shikiAnimeInfo.poster?.originalUrl ?? await getJikanAnimePoster(animeKey.myAnimeListId);
  if (!posterUrl) {
    throw new Error('Anime poster not found');
  }

  const headerPublishingResult = await publishAnime(shikiAnimeInfo, animeKey.dub, posterUrl);
  logger.info('Anime header published', { animeKey, headerPublishingResult });

  await setHeader(animeKey, headerPublishingResult.threadId, headerPublishingResult.headerMessageInfo);
  return {
    threadId: headerPublishingResult.threadId,
    episodes: {},
  };
}

const addEpisode = async (
  publishingRequest: Required<VideoDownloadedNotification>,
  animeInfo: ShikiAnimeInfo,
  threadId: number,
  publishedEpisodes: PublishedAnimeEntity['episodes'],
): Promise<{ episode: number; messageId: number; }[]> => {
  const messageInfos = await publishEpisode(publishingRequest, animeInfo, threadId, publishedEpisodes);
  logger.info('Episode published', { videoKey: publishingRequest.videoKey, messageInfos });

  const newEpisodes = Object.fromEntries(messageInfos.map(x => [x.episode, x]));
  await upsertEpisodes(publishingRequest.videoKey, publishedEpisodes, newEpisodes);
  logger.info('Published episodes persisted', { videoKey: publishingRequest.videoKey, newEpisodes });

  return messageInfos;
};

const tryProcessNewEpisode = async (publishingRequest: Required<VideoDownloadedNotification>): Promise<void> => {
  const publishedAnime = await getOrRegisterAnimeAndLock(publishingRequest.videoKey);
  logger.info('Anime retrieved for episode processing', { publishedAnime });

  try {
    const episodeExists = 'episodes' in publishedAnime
      && !!publishedAnime.episodes?.[publishingRequest.videoKey.episode];
    if (episodeExists) {
      logger.info('Episode already published, skipping', { videoKey: publishingRequest.videoKey });
      return;
    }

    const animeInfo = await getShikiAnimeInfo(publishedAnime.myAnimeListId);
    logger.info('Anime info retrieved for episode processing', { myAnimeListId: publishedAnime.myAnimeListId });

    const { threadId, episodes } = 'threadId' in publishedAnime
      ? publishedAnime
      : await createTopic(animeInfo, publishedAnime);

    logger.info('Publishing episode into topic', { videoKey: publishingRequest.videoKey, threadId });
    const messageIds = await addEpisode(publishingRequest, animeInfo, threadId, episodes);
    logger.info('Episode messages saved', { videoKey: publishingRequest.videoKey, messageIds });

    await updatePublishingDetails(publishedAnime, threadId, messageIds);
    logger.info('Publishing details updated', { videoKey: publishingRequest.videoKey, threadId });
  } finally {
    await unlock(publishedAnime);
    logger.info('Anime unlocked after episode processing', { videoKey: publishingRequest.videoKey });
  }
};

export const processNewEpisode = async (publishingRequest: VideoDownloadedNotification): Promise<void> => {
  if (!publishingRequest.messageId) {
    logger.warn('MessageId is not set, skipping episode processing', { videoKey: publishingRequest.videoKey });
    return;
  }

  let totalRetries = 0;
  while (totalRetries < config.value.retries.max) {
    try {
      return await tryProcessNewEpisode(publishingRequest as Required<VideoDownloadedNotification>);
    } catch (e: unknown) {
      logger.warn('Failed to process anime, retrying', {
        videoKey: publishingRequest.videoKey,
        retry: totalRetries + 1,
        error: e,
      });

      if (!(e instanceof AnimeLockedError || e instanceof ConditionalCheckFailedException)) {
        await unlock(publishingRequest.videoKey);
      }

      if (totalRetries === config.value.retries.max - 1) {
        logger.error('Failed to process anime, no retries left', e, {
          videoKey: publishingRequest.videoKey,
          retries: totalRetries + 1,
        });
        throw e;
      }

      totalRetries++;
      const timeout = totalRetries * config.value.retries.delayMs + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, timeout));
    }
  }

  throw new Error('Unexpected error');
};
