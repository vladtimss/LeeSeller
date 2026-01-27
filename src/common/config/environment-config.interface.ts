/**
 * Конфиг окружения (переменные окружения / свойства скрипта)
 * Здесь лежат секреты и прочие значения наподобие токенов API.
 */
export interface EnvironmentConfig {
    /**
     * Получить значение переменной окружения / свойства по ключу
     * @param key - имя ключа (например, 'WB_POVAR_NA_RAYONE_TOKEN')
     */
    getEnv(key: string): string | undefined;
}

