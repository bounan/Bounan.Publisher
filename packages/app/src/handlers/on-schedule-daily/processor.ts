import { editMessageText, sendMessage } from '@lightweight-clients/telegram-bot-api-lightweight-client';

import type { ShikiAnimeInfo } from '../../api-clients/shikimori/shikimori-client';
import { getShikiAnimeInfos } from '../../api-clients/shikimori/shikimori-client';
import { config } from '../../config/config';
import type { PublishedAnimeEntity } from '../../database/entities/published-anime-entity';
import { scanRecentlyPublished } from '../../database/repository';
import { createLogger } from '../../logger';
import { hashCode } from '../../utils/hash';
import { buildCalendarEntries, createCalendarText } from './calendar-maker';
import type { CalendarState } from './calendar-state-repository';
import { getCalendarState, saveCalendarState } from './calendar-state-repository';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const logger = createLogger('app/handlers/on-schedule-daily/processor');

const fetchOngoingAnimes = async (animes: PublishedAnimeEntity[]): Promise<{
  ongoingAnimes: PublishedAnimeEntity[];
  animeNames: Record<number, string>;
}> => {
  const uniqueIds = [...new Set(animes.map(a => a.myAnimeListId))];
  const shikiInfos = await getShikiAnimeInfos(uniqueIds);

  const isOngoing = (info: ShikiAnimeInfo) => info.status === 'ongoing';
  const ongoingIds = new Set(shikiInfos.filter(isOngoing).map(info => Number(info.id)));

  return {
    ongoingAnimes: animes.filter(a => ongoingIds.has(a.myAnimeListId)),
    animeNames: Object.fromEntries(shikiInfos.map(info => [Number(info.id), info.russian ?? info.name])),
  };
};

const postCalendar = async (text: string): Promise<number> => {
  const result = await sendMessage({
    chat_id: config.value.telegram.targetGroupId,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  });

  if (!result.ok) throw new Error(`Failed to post calendar: ${JSON.stringify(result)}`);
  return result.result.message_id;
};

const editCalendar = async (messageId: number, text: string): Promise<void> => {
  const result = await editMessageText({
    message_id: messageId,
    chat_id: config.value.telegram.targetGroupId,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  });

  if (!result.ok) throw new Error(`Failed to edit calendar: ${JSON.stringify(result)}`);
};

const updateOrPostCalendar = async (state: CalendarState | null, text: string, hash: number): Promise<void> => {
  if (state?.messageId) {
    logger.info('Editing existing calendar message', { messageId: state.messageId });
    await editCalendar(state.messageId, text);
    await saveCalendarState({ messageId: state.messageId, hash });
  } else {
    logger.info('Posting new calendar message');
    const messageId = await postCalendar(text);
    await saveCalendarState({ messageId, hash });
  }
};

export const updateCalendar = async (): Promise<void> => {
  const since = new Date(Date.now() - TWO_WEEKS_MS);
  logger.info('Scanning recently published animes', { since: since.toISOString() });

  const recentAnimes = await scanRecentlyPublished(since);
  logger.info('Recently updated animes loaded', { count: recentAnimes.length });

  const { ongoingAnimes, animeNames } = await fetchOngoingAnimes(recentAnimes);
  logger.info('Ongoing animes resolved', { count: ongoingAnimes.length });

  const entries = buildCalendarEntries(ongoingAnimes, animeNames);
  const text = createCalendarText(entries, config.value.telegram.targetGroupId);
  const hash = hashCode(text);

  const state = await getCalendarState();
  if (state?.hash === hash) {
    logger.info('Calendar unchanged, skipping update');
    return;
  }

  await updateOrPostCalendar(state, text, hash);
  logger.info('Calendar updated', { entryCount: entries.length });
};



