// /*
//  * Updates posters in the published posts.
//  */
//
// import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
// import { config, initConfig } from '../../src/config/config';
// import { client_setClientToken } from 'telegram-bot-api-lightweight-client';
// import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
// import { PublishedAnimeEntity } from '../../src/database/entities/published-anime-entity';
// import { editMessageMedia } from 'telegram-bot-api-lightweight-client';
// import { getShikiAnimeInfo, ShikiAnimeInfo } from '../../src/api-clients/shikimori/shikimori-client';
// import { Error } from 'telegram-bot-api-lightweight-client/src/types';
// import { createTextForHeaderPost } from '../../src/utils/post-maker';
//
// const SKIP_COUNT = 0;
//
// const getPublishDetails = async (): Promise<PublishedAnimeEntity[]> => {
//     const command = new ScanCommand({ TableName: config.value.database.tableName });
//     const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient());
//     const response = await documentClient.send(command);
//     const items = (response.Items || []) as PublishedAnimeEntity[];
//     const sortedItems = items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
//
//     console.log(`Found ${sortedItems.length} items in the database`);
//     return sortedItems;
// }
//
// const updatePoster = async (shiki: ShikiAnimeInfo, details: PublishedAnimeEntity, posterUrl: string): Promise<void> => {
//     const caption = createTextForHeaderPost(shiki, details.dub).substring(0, 1024);
//
//     // const newCaptionHash = hashCode(caption);
//     // const oldCaptionHash = details.headerPost.hash;
//     // if (oldCaptionHash !== newCaptionHash) {
//     //     console.error(`Caption hash mismatch for ${details.myAnimeListId}: ${oldCaptionHash} !== ${newCaptionHash}`);
//     //     return;
//     // }
//
//     const args = {
//         chat_id: config.value.telegram.targetGroupId,
//         message_id: details.headerPost.messageId,
//         media: {
//             type: 'photo',
//             media: posterUrl,
//             caption: caption,
//             parse_mode: 'HTML',
//         },
//     };
//
//     const result = await editMessageMedia(args);
//
//     if (!result.ok) {
//         console.error(result);
//         const err = result as unknown as Error;
//         if (err.error_code === 429) {
//             const timeout = (err.parameters!.retry_after! + 1) * 1000;
//             console.log(`Retrying after ${timeout} ms`);
//             await new Promise(resolve => setTimeout(resolve, timeout));
//             const res2 = await editMessageMedia(args);
//             if (!res2.ok) {
//                 console.error(res2);
//             }
//         }
//     }
// }
//
// const main = async () => {
//     await initConfig();
//     client_setClientToken(config.value.telegram.token);
//
//     const publishDetails = await getPublishDetails();
//     for (let i = SKIP_COUNT; i < publishDetails.length; i++) {
//         const publishDetail = publishDetails[i];
//
//         const malInfo = await getMalAnimeInfo(publishDetail.myAnimeListId);
//         const shikiAnimeInfo = await getShikiAnimeInfo(publishDetail.myAnimeListId);
//         console.log(`Processing ${i + 1} of ${publishDetails.length}: ${publishDetail.myAnimeListId} ${publishDetail.threadId} ${shikiAnimeInfo.russian}`);
//
//         const posterUrl = getPosterImageUrl(shikiAnimeInfo, malInfo);
//         await updatePoster(shikiAnimeInfo, publishDetail, posterUrl);
//
//         const timeoutMs = 350;
//         await new Promise(resolve => setTimeout(resolve, timeoutMs));
//     }
// }
//
// main();