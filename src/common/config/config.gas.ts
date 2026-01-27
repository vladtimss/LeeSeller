import type { EnvironmentConfig } from './environment-config.interface';

/**
 * GAS реализация EnvironmentConfig
 * Использует PropertiesService для получения переменных окружения
 */
export const environmentConfigGas: EnvironmentConfig = {
    getEnv: (key: string): string | undefined => {
        return PropertiesService.getScriptProperties().getProperty(key) || undefined;
    },
};
