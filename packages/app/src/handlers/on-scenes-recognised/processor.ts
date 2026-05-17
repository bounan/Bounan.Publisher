import type {
  SceneRecognisedNotification,
  SceneRecognisedNotificationItem,
} from '../../../../../third-party/common/ts/interfaces';
import { getShikiAnimeInfo } from '../../api-clients/shikimori/shikimori-client';
import { updateEpisodeMessages } from '../../api-clients/telegram/telegram-service';
import type { EpisodeMessageInfoEntity } from '../../database/entities/episode-message-info-entity';
import { getOrRegisterAnimeAndLock, unlock, upsertEpisodes } from '../../database/repository';
import { createLogger } from '../../logger';
import { hashCode } from '../../utils/hash';
import { createTextForEpisodePost } from '../../utils/post-maker';

const logger = createLogger('app/handlers/on-scenes-recognised/processor');

const processAnime = async (notificationItems: SceneRecognisedNotificationItem[]): Promise<void> => {
  const publishedAnime = await getOrRegisterAnimeAndLock(notificationItems[0].videoKey);
  logger.info('Anime retrieved for scene processing', { publishedAnime });

  try {
    if (!('threadId' in publishedAnime)) {
      logger.info('Skipping scene processing because topic is not published', { publishedAnime });
      return;
    }

    const animeInfo = await getShikiAnimeInfo(publishedAnime.myAnimeListId);
    logger.info('Anime info retrieved for scene processing', { myAnimeListId: publishedAnime.myAnimeListId });

    const newCaptions = notificationItems.map(item => ({
      episode: item.videoKey.episode,
      caption: createTextForEpisodePost(animeInfo, item),
    }));

    const captionsToUpdate = newCaptions
      .filter(x => !!publishedAnime.episodes[x.episode]
        && publishedAnime.episodes[x.episode].hash !== hashCode(x.caption));
    logger.info('Calculated captions to update', { count: captionsToUpdate.length, captionsToUpdate });
    if (!captionsToUpdate.length) {
      logger.info('No episode captions require updates');
      return;
    }

    await updateEpisodeMessages(publishedAnime, captionsToUpdate);
    logger.info('Episode captions updated');

    const updatedEpisodes: { [episode: number]: EpisodeMessageInfoEntity } = Object.fromEntries(captionsToUpdate
      .map(x => [x.episode, {
        ...publishedAnime.episodes[x.episode],
        hash: hashCode(x.caption),
      }]));
    await upsertEpisodes(publishedAnime, publishedAnime.episodes, updatedEpisodes);
    logger.info('Updated episode hashes persisted', { updatedEpisodes });
  } finally {
    await unlock(publishedAnime);
    logger.info('Anime unlocked after scene processing', { publishedAnime });
  }
};

export const processScenes = async (updatingRequests: SceneRecognisedNotification): Promise<void> => {
  logger.info('Processing scenes payload', { updatingRequests });
  const items = updatingRequests.items as SceneRecognisedNotificationItem[];
  const nonEmptyRequestItems = items.filter((x: SceneRecognisedNotificationItem) => !!x.scenes);
  if (!nonEmptyRequestItems.length) {
    logger.info('No scene payload items to process');
    return;
  }

  const requestItemsWithNonEmptyScenes = nonEmptyRequestItems
    .filter((x: SceneRecognisedNotificationItem) => Object.values(x.scenes!).filter(x => !!x).length > 0);
  if (!requestItemsWithNonEmptyScenes.length) {
    logger.info('No non-empty scenes found in payload');
    return;
  }

  const groupedRequestsItems = nonEmptyRequestItems.reduce(
    (acc: Record<string, SceneRecognisedNotificationItem[]>, item: SceneRecognisedNotificationItem) => {
      const key = `${item.videoKey.myAnimeListId}_${item.videoKey.dub}`;
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    },
    {},
  );
  logger.info('Grouped scene requests by anime', { groupedRequestsItems });

  for (const key of Object.keys(groupedRequestsItems)) {
    logger.info('Processing grouped scene requests', { key });
    const groupedItems = groupedRequestsItems[key];
    await processAnime(groupedItems);
    logger.info('Grouped scene requests processed', { key });
  }

  logger.info('Scenes payload processed');
}
