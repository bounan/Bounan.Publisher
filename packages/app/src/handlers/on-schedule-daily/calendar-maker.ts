import type { PublishedAnimeEntity } from '../../database/entities/published-anime-entity';
import { groupBy } from '../../utils/lists-utils';

interface CalendarEntry {
  title: string;
  dub: string;
  threadId: number;
  latestEpisode: number;
  nextEpisodeDate: Date;
}

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const MS_IN_WEEK = 7 * MS_IN_DAY;
const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const formatDate = (date: Date): string => {
  const day = DAYS_RU[date.getDay()];
  const month = MONTHS_RU[date.getMonth()];
  const overdue = date.getTime() < Date.now() - MS_IN_DAY ? ' (задерживается)' : '';

  return `${day} ${date.getDate()} ${month} ${overdue}`;
};

export const buildCalendarEntries = (
  animes: PublishedAnimeEntity[],
  animeNames: Record<number, string>,
): CalendarEntry[] => {
  return animes.map(anime => {
    const latestEpisode = Math.max(...Object.keys(anime.episodes).map(Number));
    const updatedAt = new Date(anime.updatedAt);
    const nextEpisodeDate = new Date(updatedAt.getTime() + MS_IN_WEEK);

    return {
      title: animeNames[anime.myAnimeListId],
      dub: anime.dub,
      threadId: anime.threadId,
      latestEpisode,
      nextEpisodeDate,
    };
  }).sort((a, b) => a.nextEpisodeDate.getTime() - b.nextEpisodeDate.getTime());
};

export const createCalendarText = (entries: CalendarEntry[], targetGroupId: string): string => {
  const header = '<b>Календарь выхода серий</b>';

  if (entries.length === 0) {
    return `${header}\n\nОнгоингов не найдено.`;
  }

  const groupedByDate: Record<string, CalendarEntry[][]> = groupBy(
    Object.values(groupBy(entries, e => e.title)),
    gr => formatDate(gr[0].nextEpisodeDate));

  const chatId = targetGroupId.replace('-100', '');

  const lines: string[] = [];
  for (const dateKey in groupedByDate) {
    lines.push(`\n<b>${dateKey}</b>`);

    const groups = groupedByDate[dateKey];
    for (const titleGroup of groups) {
      const title = titleGroup[0].title;
      lines.push(`${title}`);

      for (const entry of titleGroup) {
        const episode = entry.latestEpisode + 1;
        lines.push(`   <a href="https://t.me/c/${chatId}/${entry.threadId}">${entry.dub}</a>, ${episode} серия`);
      }
    }
  }

  return `${header}\n${lines.join('\n')}`;
};
