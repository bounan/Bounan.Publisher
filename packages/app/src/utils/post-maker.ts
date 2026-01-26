import { SceneRecognisedNotificationItem } from '../../../../third-party/common/ts/interfaces';
import { ShikiAnimeInfo } from '../api-clients/shikimori/shikimori-client';
import { secToTime } from './sec-to-time';

const escapeLinks = (text: string): string => {
    return text.replaceAll('.', '');
}

export const createTextForTopicName = (animeInfo: ShikiAnimeInfo, dub: string): string => {
    return [
        animeInfo.russian || animeInfo.name,
        dub,
        animeInfo.airedOn?.year,
    ]
        .filter(Boolean)
        .join(' | ');
}

export const createTextForHeaderPost = (animeInfo: ShikiAnimeInfo, dub: string): string => {
    const genres = animeInfo.genres
        ?.map(genre => genre.russian)
        .filter(genre => genre)
        .map(genre => `#${genre!.replace(/ /g, '_')}`)
        .sort()
        .join(' ');

    const allNamesSet = new Set([animeInfo.name, animeInfo.licenseNameRu, animeInfo.english]);
    animeInfo.synonyms?.forEach(name => allNamesSet.add(name));
    const otherNames = Array.from(allNamesSet)
        .filter(name => !!name)
        .map(name => name!.replaceAll('>', '&gt;').replaceAll('<', '&lt;'))
        .join('; ');

    const hashtag = animeInfo.url
        ?.replace(/^[^-]+-/, '')
        .replaceAll('-', '_');

    return [
        `<b>${animeInfo.russian || animeInfo.name}</b>`,
        dub && `В озвучке ${escapeLinks(dub)}`,
        animeInfo.airedOn && `Год выпуска: ${animeInfo.airedOn.year}`,
        genres && `Жанры: ${genres}`,
        animeInfo.franchise && `Франшиза: #${animeInfo.franchise}`,
        `Другие озвучки: #header_${hashtag}`,
        `<a href="https://shikimori.one/animes/${animeInfo.id}">Shikimori >> </a> | <a href="https://myanimelist.net/anime/${animeInfo.id}">MAL >></a>`,
        otherNames && `Другие названия: ${otherNames}`,
    ]
        .filter(Boolean)
        .join('\n');
}

export const createTextForEpisodePost = (
    animeInfo: ShikiAnimeInfo,
    publishingRequest: SceneRecognisedNotificationItem,
): string => {
    const has_episodes = animeInfo.episodes && animeInfo.episodes > 1
        || animeInfo.episodesAired && animeInfo.episodesAired > 1;

    return [
        `<b>${animeInfo.russian || animeInfo.name}</b> ${publishingRequest.videoKey.dub && `(${escapeLinks(publishingRequest.videoKey.dub)})`}`,
        has_episodes && `Серия ${publishingRequest.videoKey.episode}`,

        publishingRequest.scenes?.opening
        && `${secToTime(publishingRequest.scenes.opening.end)} - Конец опенинга (от ${secToTime(publishingRequest.scenes.opening.start)})`,

        publishingRequest.scenes?.sceneAfterEnding
        && `${secToTime(publishingRequest.scenes.sceneAfterEnding.start)} - Сцена-после-титров`,
    ]
        .filter(Boolean)
        .join('\n');
}
