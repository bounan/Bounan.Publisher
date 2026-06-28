import {
  copyMessage,
  copyMessages,
  createForumTopic,
  deleteMessages,
  editMessageCaption,
  sendPhoto,
} from '@lightweight-clients/telegram-bot-api-lightweight-client';

import type { VideoDownloadedNotification } from '../../../../../third-party/common/ts/interfaces';
import { config } from '../../config/config';
import type { PublishedAnimeEntity } from '../../database/entities/published-anime-entity';
import { createLogger } from '../../logger';
import { hashCode } from '../../utils/hash';
import { createTextForEpisodePost, createTextForHeaderPost, createTextForTopicName } from '../../utils/post-maker';
import type { ShikiAnimeInfo } from '../shikimori/shikimori-client';
import type { EpisodeMessageInfo } from './models/message-info';
import type { PublishingResult } from './models/publishing-result';

const logger = createLogger('app/api-clients/telegram-service');

const reorderEpisodes = async (
  threadId: number,
  publishedEpisodes: PublishedAnimeEntity['episodes'],
  episode: number,
): Promise<EpisodeMessageInfo[]> => {
  logger.info('Reordering episodes', { threadId, episode, publishedEpisodes });

  const episodesToForward = Object.values(publishedEpisodes)
    .filter(x => x.episode > episode)
    .sort((a, b) => a.episode - b.episode);
  logger.info('Episodes selected for forwarding', { threadId, episode, episodesToForward });
  if (episodesToForward.length === 0) {
    return [];
  }

  const messagesToForward = episodesToForward.map(x => x.messageId);
  const forwardedMessages = await copyMessages({
    chat_id: config.value.telegram.targetGroupId,
    from_chat_id: config.value.telegram.targetGroupId,
    message_ids: messagesToForward,
    message_thread_id: threadId,
    disable_notification: true,
  });
  logger.info('Episodes forwarded', { threadId, messagesToForward, forwardedMessages });

  await deleteMessages({
    chat_id: config.value.telegram.targetGroupId,
    message_ids: messagesToForward,
  });
  logger.info('Original episode messages deleted', { threadId, messagesToForward });

  return episodesToForward.map((episode, index) => ({
    episode: episode.episode,
    messageId: forwardedMessages.result[index].message_id,
    hash: episode.hash,
  }));
}

const sendSingleEpisodeInternal = async (
  publishingRequest: Required<VideoDownloadedNotification>,
  animeInfo: ShikiAnimeInfo,
  threadId: number,
): Promise<EpisodeMessageInfo> => {
  const caption = createTextForEpisodePost(animeInfo, publishingRequest);
  const episodeMessage = await copyMessage({
    chat_id: config.value.telegram.targetGroupId,
    from_chat_id: config.value.telegram.sourceChannelId,
    message_id: publishingRequest.messageId,
    caption,
    message_thread_id: threadId,
    parse_mode: 'HTML',
  });

  if (!episodeMessage.ok) {
    throw new Error(JSON.stringify(episodeMessage));
  }

  return {
    episode: publishingRequest.videoKey.episode,
    messageId: episodeMessage.result.message_id,
    hash: hashCode(caption),
  };
}

export const publishAnime = async (
  animeInfo: ShikiAnimeInfo,
  dub: string,
  posterUrl: string,
): Promise<PublishingResult> => {
  const createdTopic = await createForumTopic({
    chat_id: config.value.telegram.targetGroupId,
    name: createTextForTopicName(animeInfo, dub),
  });
  if (!createdTopic.ok) {
    throw new Error(JSON.stringify(createdTopic));
  }

  const threadId = createdTopic.result.message_thread_id;

  // Telegram has a limit of 1024 characters for the caption
  const firstPostText = createTextForHeaderPost(animeInfo, dub).substring(0, 1024);
  const firstPost = await sendPhoto({
    chat_id: config.value.telegram.targetGroupId,
    photo: posterUrl,
    caption: firstPostText,
    message_thread_id: threadId,
    parse_mode: 'HTML',
  });
  if (!firstPost.ok) {
    throw new Error(JSON.stringify(firstPost));
  }

  return {
    threadId: threadId,
    headerMessageInfo: {
      messageId: firstPost.result.message_id,
      hash: hashCode(firstPostText),
    },
  }
}

export const publishEpisode = async (
  publishingRequest: Required<VideoDownloadedNotification>,
  animeInfo: ShikiAnimeInfo,
  threadId: number,
  publishedEpisodes: PublishedAnimeEntity['episodes'],
): Promise<EpisodeMessageInfo[]> => {
  const episodeMessageInfo = await sendSingleEpisodeInternal(publishingRequest, animeInfo, threadId);
  const forwardedMessages = await reorderEpisodes(threadId, publishedEpisodes, publishingRequest.videoKey.episode);

  return [
    episodeMessageInfo,
    ...forwardedMessages,
  ];
}

export const updateEpisodeMessages = async (
  publishedAnime: PublishedAnimeEntity,
  captionsToUpdate: {
    caption: string;
    episode: number;
  }[],
) => {
  logger.info('Updating episode captions', { anime: publishedAnime });

  for (const captionToUpdate of captionsToUpdate) {
    if (captionsToUpdate.length > 20) {
      await new Promise(resolve => setTimeout(resolve, 1000 / 29));
    }

    logger.info('Updating episode caption', { captionToUpdate });
    const episode = publishedAnime.episodes[captionToUpdate.episode];
    logger.info('Episode message loaded for caption update', { episode });

    const result = await editMessageCaption({
      chat_id: config.value.telegram.targetGroupId,
      message_id: episode.messageId,
      caption: captionToUpdate.caption,
      parse_mode: 'HTML',
    });
    if (!result.ok) {
      logger.error('Failed to update caption', undefined, { result, captionToUpdate });
    }
  }

  logger.info('Episode captions updated', { updatedCount: captionsToUpdate.length });
}
