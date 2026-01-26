export class AnimeLockedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AnimeLockedError';
    }
}