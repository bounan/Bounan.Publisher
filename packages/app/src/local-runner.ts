/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { SceneRecognisedNotification, VideoDownloadedNotification } from '../../../third-party/common/ts/interfaces';
import { handler as scenesHandler } from './handlers/on-scenes-recognised/handler';
import { handler as videoHandler } from './handlers/on-video-downloaded/handler';

const ep = async (message: VideoDownloadedNotification) => {
    console.log('Processing message: ', message);

    await videoHandler(
        // @ts-ignore
        { Records: [{ Sns: { Message: JSON.stringify(message) } }] },
        null as any);

    console.log('Message processed');
}

const sc = async (message: SceneRecognisedNotification) => {
    console.log('Processing message: ', message);

    await scenesHandler(
        // @ts-ignore
        { Records: [{ Sns: { Message: JSON.stringify(message) } }] },
        null as any);

    console.log('Message processed');
}

const main = async () => {
    const myAnimeListId = 1;
    const sourceChannelMessageId = 186;

    await ep({
        videoKey: {
            myAnimeListId: myAnimeListId,
            dub: 'AniLibria.TV',
            episode: 1,
        },
        messageId: sourceChannelMessageId,
        scenes: {
            opening: { start: 90, end: 180 },
            ending: { start: 300, end: 320 },
            sceneAfterEnding: { start: 320, end: 400 },
        },
    });

    await ep({
        videoKey: {
            myAnimeListId: myAnimeListId,
            dub: 'AniLibria.TV',
            episode: 3,
        },
        messageId: sourceChannelMessageId,
        scenes: {
            opening: { start: 90, end: 180 },
            ending: { start: 300, end: 320 },
        },
    });

    await ep({
        videoKey: {
            myAnimeListId: myAnimeListId,
            dub: 'AniLibria.TV',
            episode: 4,
        },
        messageId: sourceChannelMessageId,
    });

    await ep({
        videoKey: {
            myAnimeListId: myAnimeListId,
            dub: 'AniLibria.TV',
            episode: 2,
        },
        messageId: sourceChannelMessageId,
        scenes: {
            ending: { start: 300, end: 320 },
            sceneAfterEnding: { start: 320, end: 400 },
        },
    });

    await ep({
        videoKey: {
            myAnimeListId: myAnimeListId,
            dub: 'AniLibria.TV',
            episode: 1,
        },
        messageId: sourceChannelMessageId,
        scenes: {
            ending: { start: 300, end: 320 },
            sceneAfterEnding: { start: 320, end: 400 },
        },
    });

    await sc({
        items: [
            {
                videoKey: {
                    myAnimeListId: myAnimeListId,
                    dub: 'AniLibria.TV',
                    episode: 1,
                },
                scenes: {
                    opening: { start: 0, end: 50 },
                    ending: { start: 300, end: 320 },
                    sceneAfterEnding: { start: 320, end: 400 },
                },
            },
            {
                videoKey: {
                    myAnimeListId: myAnimeListId,
                    dub: 'AniLibria.TV',
                    episode: 2,
                },
                scenes: {
                    opening: { start: 0, end: 50 },
                    ending: { start: 1, end: 320 },
                    sceneAfterEnding: { start: 20, end: 400 },
                },
            },
        ],
    });
}

main();
