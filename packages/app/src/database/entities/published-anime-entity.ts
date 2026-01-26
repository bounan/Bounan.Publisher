import type { EpisodeMessageInfoEntity } from './episode-message-info-entity';
import type { HeaderMessageInfoEntity } from './header-message-info-entity';

export interface RegisteredAnimeEntity {
  myAnimeListId: number;
  dub: string;
  updatedAt: string;
}

export interface PublishedAnimeEntity {
  myAnimeListId: number;
  dub: string;
  threadId: number;
  headerPost: HeaderMessageInfoEntity;
  episodes: { [episode: number]: EpisodeMessageInfoEntity };

  updatedAt: string;
}
