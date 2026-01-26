import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

import { VideoDownloadedNotification } from '../../../third-party/common/ts/interfaces';
import { updatePublishingDetails } from '../../api-clients/animan/animan-client';
import { getShikiAnimeInfo, ShikiAnimeInfo } from '../../api-clients/shikimori/shikimori-client';
import { publishAnime, publishEpisode } from '../../api-clients/telegram/telegram-service';
import { config } from '../../config/config';
import { PublishedAnimeEntity } from '../../database/entities/published-anime-entity';
import { getOrRegisterAnimeAndLock, unlock, upsertEpisodes } from '../../database/repository';
import { AnimeLockedError } from '../../errors/anime-locked-error';
import { AnimeKey } from '../../models/anime-key';
import { setHeader } from './repository';

const createTopic = async (
    shikiAnimeInfo: ShikiAnimeInfo,
    animeKey: AnimeKey,
): Promise<Pick<PublishedAnimeEntity, 'threadId' | 'episodes'>> => {
    console.log('The topic was not found in the database, adding');

    const headerPublishingResult = await publishAnime(shikiAnimeInfo, animeKey.dub);
    console.log('Published anime with message: ', headerPublishingResult);

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
    console.log('Published episode with message: ', messageInfos);

    const newEpisodes = Object.fromEntries(messageInfos.map(x => [x.episode, x]));
    await upsertEpisodes(publishingRequest.videoKey, publishedEpisodes, newEpisodes);
    console.log('Anime updated in database');

    return messageInfos;
};

const tryProcessNewEpisode = async (publishingRequest: Required<VideoDownloadedNotification>): Promise<void> => {
    const publishedAnime = await getOrRegisterAnimeAndLock(publishingRequest.videoKey);
    console.log('Anime retrieved: ', publishedAnime);

    try {
        const episodeExists = 'episodes' in publishedAnime
            && !!publishedAnime.episodes?.[publishingRequest.videoKey.episode];
        if (episodeExists) {
            console.log('Episode already published, skipping');
            return;
        }

        const animeInfo = await getShikiAnimeInfo(publishedAnime.myAnimeListId);
        console.log('Got anime info');

        const { threadId, episodes } = 'threadId' in publishedAnime
            ? publishedAnime
            : await createTopic(animeInfo, publishedAnime);

        console.log('The topic was found in the database, adding episode');
        const messageIds = await addEpisode(publishingRequest, animeInfo, threadId, episodes);
        console.log('Episode added to the database: ' + JSON.stringify(messageIds));

        await updatePublishingDetails(publishedAnime, threadId, messageIds);
        console.log('Publishing details updated');
    } finally {
        await unlock(publishedAnime);
        console.log('Anime unlocked');
    }
};

export const processNewEpisode = async (publishingRequest: VideoDownloadedNotification): Promise<void> => {
    if (!publishingRequest.messageId) {
        console.warn('MessageId is not set, skipping');
        return;
    }

    let totalRetries = 0;
    while (totalRetries < config.value.retries.max) {
        try {
            return await tryProcessNewEpisode(publishingRequest as Required<VideoDownloadedNotification>);
        } catch (e: unknown) {
            console.warn('Failed to process anime, retrying', e);

            if (!(e instanceof AnimeLockedError || e instanceof ConditionalCheckFailedException)) {
                await unlock(publishingRequest.videoKey);
            }

            if (totalRetries === config.value.retries.max - 1) {
                console.error('Failed to process anime, no retries left', e);
                throw e;
            }

            totalRetries++;
            const timeout = totalRetries * config.value.retries.delayMs + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, timeout));
        }
    }

    throw new Error('Unexpected error');
};