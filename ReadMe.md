# Bounan Publisher

Manages private telegram group.

## Actions:

- When a new video is registered, it:
  - publishes it to a thread, registers it in the database
  - creates the thread if it doesn't exist, registers it in the database
  - notifies AniMan about new posts
- When scenes are recognized in a video, it:
  - updates the post with the recognized scenes, if the post exists

## Database:

- Bounan Publisher Table (DynamoDB):
  - myAnimeListId: number
  - dub: string
  - threadId: number
  - headerPost: HeaderMessageInfoEntity
    - messageId: number
    - hash: number
  - episodes: { [episode: number]: EpisodeMessageInfoEntity }
    - episode: number
    - messageId: number
    - hash: number
  - updatedAt: string

## External Connections

### Events Subscribed

- on-video-downloaded events (SNS)
- on-scenes-recognized events (SNS)

### Events Published

None

### Used APIs:

- AniMan Lambda
- [Shikimori API](https://shikimori.one/)
- [Telegram Bot API](https://core.telegram.org/bots/api)

### Provided APIs

None

---

## Legal Notice

This project does **not** host, distribute, or provide access to copyrighted content.

Bounan operates exclusively on metadata and event orchestration
and is intended to be used only with content sources and services that
the user has the legal right to access.

The authors of this project do not endorse or encourage the use of this
software for copyright infringement or any unlawful activity.

Responsibility for compliance with applicable laws and regulations
lies solely with the user of the software.

### License

This project is licensed under the BSD 3-Clause License.

See the LICENSE file for details.
Third-party software licenses are listed in THIRD_PARTY_NOTICES.md.