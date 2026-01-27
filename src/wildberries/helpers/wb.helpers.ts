import { WBStoreIdentifier } from '../enums/wb-store-identifier.enum';
import type { ApiRequestConfig } from '../../common/api/client.interface';
import { environmentConfigNode } from '../../common/config/config.node';

/**
 * Базовый URL для Wildberries Seller Analytics API
 */
const WB_ANALYTICS_API_BASE_URL = 'https://seller-analytics-api.wildberries.ru';

/**
 * Преобразует идентификатор магазина (из CLI аргументов) в ключ для переменной окружения .env
 * @param storeIdentifier - Идентификатор магазина из enum (например, 'povar-na-rayone')
 * @returns Ключ для переменной окружения (например, 'WB_POVAR_NA_RAYONE_TOKEN')
 * @throws Error если передан неизвестный идентификатор магазина
 */
export function getStoreEnvKey(storeIdentifier: WBStoreIdentifier): string {
    switch (storeIdentifier) {
        case WBStoreIdentifier.POVAR_NA_RAYONE:
            return 'WB_POVAR_NA_RAYONE_TOKEN';
        case WBStoreIdentifier.LEESHOP:
            return 'WB_LEESHOP_TOKEN';
        default:
            throw new Error(`Неизвестный идентификатор магазина: ${storeIdentifier}`);
    }
}

/**
 * Извлекает токен WB из .env по идентификатору магазина
 * @param storeIdentifier - Идентификатор магазина WB из enum
 * @returns Токен авторизации для WB API
 * @throws Error если токен не найден в .env
 */
export function getWBStoreToken(storeIdentifier: WBStoreIdentifier): string {
    const envKey = getStoreEnvKey(storeIdentifier);
    const token = environmentConfigNode.getEnv(envKey);

    if (!token) {
        throw new Error(`Не найден токен: ${envKey}`);
    }

    return token;
}

/**
 * Создает полную конфигурацию для WB Analytics API с токеном
 * @param token - Токен авторизации для WB API (тот же токен, что и для обычного API)
 * @returns Полная конфигурация для API запроса к Analytics API
 */
export function getWBAnalyticsConfig(token: string): ApiRequestConfig {
    return {
        baseUrl: WB_ANALYTICS_API_BASE_URL,
        logPrefix: 'wb-analytics-api',
        authHeaders: {
            Authorization: token,
        },
    };
}
