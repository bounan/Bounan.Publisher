import { fetchSsmValue } from '../../third-party/common/ts/runtime/ssm-client';

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

let cachedConfig: Config | undefined;

export const initConfig = async (): Promise<void> => {
    cachedConfig = await fetchSsmValue('/bounan/publisher/runtime-config') as Config;
}

export const config = {
    get value() {
        if (!cachedConfig) {
            throw new Error('Config not initialized');
        }

        return cachedConfig;
    },
}