import {
    SceneRecognisedNotification,
    SceneRecognisedNotificationItem,
} from '../../../../../third-party/common/ts/interfaces';
import { getShikiAnimeInfo } from '../../api-clients/shikimori/shikimori-client';
import { updateEpisodeMessages } from '../../api-clients/telegram/telegram-service';
import { EpisodeMessageInfoEntity } from '../../database/entities/episode-message-info-entity';
import { getOrRegisterAnimeAndLock, unlock, upsertEpisodes } from '../../database/repository';
import { hashCode } from '../../utils/hash';
import { createTextForEpisodePost } from '../../utils/post-maker';

const processAnime = async (notificationItems: SceneRecognisedNotificationItem[]): Promise<void> => {
    const publishedAnime = await getOrRegisterAnimeAndLock(notificationItems[0].videoKey);
    console.log('Anime retrieved: ', publishedAnime);

    try {
        if (!('threadId' in publishedAnime)) {
            console.log('The topic was not found in the database, skipping');
            return;
        }

        const animeInfo = await getShikiAnimeInfo(publishedAnime.myAnimeListId);
        console.log('Anime info retrieved');

        const newCaptions = notificationItems.map(item => ({
            episode: item.videoKey.episode,
            caption: createTextForEpisodePost(animeInfo, item),
        }));

        const captionsToUpdate = newCaptions
            .filter(x => !!publishedAnime.episodes[x.episode]
                && publishedAnime.episodes[x.episode].hash !== hashCode(x.caption));
        console.log(`Found ${captionsToUpdate.length} captions to update`);
        if (!captionsToUpdate.length) {
            console.log('No captions to update, skipping');
            return;
        }

        await updateEpisodeMessages(publishedAnime, captionsToUpdate);
        console.log('Captions updated');

        const updatedEpisodes: { [episode: number]: EpisodeMessageInfoEntity } = Object.fromEntries(captionsToUpdate
            .map(x => [x.episode, {
                ...publishedAnime.episodes[x.episode],
                hash: hashCode(x.caption),
            }]));
        await upsertEpisodes(publishedAnime, publishedAnime.episodes, updatedEpisodes);
        console.log('Episodes upserted');
    } finally {
        await unlock(publishedAnime);
        console.log('Anime unlocked');
    }
};

export const processScenes = async (updatingRequests: SceneRecognisedNotification): Promise<void> => {
    console.log('Processing scenes: ', updatingRequests);
    const items = updatingRequests.items as SceneRecognisedNotificationItem[];
    const nonEmptyRequestItems = items.filter((x: SceneRecognisedNotificationItem) => !!x.scenes);
    if (!nonEmptyRequestItems.length) {
        console.log('No scenes to process, skipping');
        return;
    }

    const requestItemsWithNonEmptyScenes = nonEmptyRequestItems
        .filter((x: SceneRecognisedNotificationItem) => Object.values(x.scenes!).filter(x => !!x).length > 0);
    if (!requestItemsWithNonEmptyScenes.length) {
        console.log('No non-empty scenes to process, skipping');
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
    console.log('Grouped requests: ', groupedRequestsItems);

    for (const key of Object.keys(groupedRequestsItems)) {
        console.log('Processing key: ', key);
        const items = groupedRequestsItems[key];
        await processAnime(items);
        console.log('Key processed: ', key);
    }

    console.log('Scenes processed');
}