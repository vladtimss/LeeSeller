import * as dotenv from 'dotenv';
import type { EnvironmentConfig } from './environment-config.interface';

dotenv.config();

/**
 * Node.js реализация EnvironmentConfig
 * Использует process.env для получения переменных окружения
 */
export const environmentConfigNode: EnvironmentConfig = {
    getEnv: (key: string): string | undefined => {
        return process.env[key];
    },
};
