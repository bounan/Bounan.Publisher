interface AniManConfig {
    updatePublishingDetailsFunctionName: string;
}

interface TelegramConfig {
    token: string;
    sourceChannelId: string;
    targetGroupId: string;
}

interface DatabaseConfig {
    tableName: string;
}

interface RetriesConfig {
    max: number;
    delayMs: number;
}

export interface Config {
    animan: AniManConfig;
    telegram: TelegramConfig;
    database: DatabaseConfig;
    retries: RetriesConfig;
}