import { OzonStoreIdentifier } from '../enums/ozon-store-identifier.enum';
import { getEnvVariableRequired } from '../../common/helpers/env/env-helpers';

export interface OzonCredentials {
    clientId: string;
    apiKey: string;
}

/**
 * Ключ переменной окружения для Client ID по идентификатору магазина Ozon
 */
function getClientIdEnvKey(storeIdentifier: OzonStoreIdentifier): string {
    switch (storeIdentifier) {
        case OzonStoreIdentifier.LEESHOP:
            return 'OZON_LEESHOP_CLIENT_ID';
        case OzonStoreIdentifier.POVAR:
            return 'OZON_POVAR_CLIENT_ID';
        default:
            throw new Error(`Неизвестный идентификатор магазина Ozon: ${storeIdentifier}`);
    }
}

/**
 * Ключ переменной окружения для API Key по идентификатору магазина Ozon
 */
function getApiKeyEnvKey(storeIdentifier: OzonStoreIdentifier): string {
    switch (storeIdentifier) {
        case OzonStoreIdentifier.LEESHOP:
            return 'OZON_LEESHOP_API_KEY';
        case OzonStoreIdentifier.POVAR:
            return 'OZON_POVAR_API_KEY';
        default:
            throw new Error(`Неизвестный идентификатор магазина Ozon: ${storeIdentifier}`);
    }
}

/**
 * Возвращает учётные данные Ozon из переменных окружения для указанного магазина
 * @param storeIdentifier - Идентификатор магазина Ozon
 * @returns Client Id и API Key
 * @throws Error если переменная не найдена
 */
export function getOzonCredentials(storeIdentifier: OzonStoreIdentifier): OzonCredentials {
    const clientId = getEnvVariableRequired(getClientIdEnvKey(storeIdentifier));
    const apiKey = getEnvVariableRequired(getApiKeyEnvKey(storeIdentifier));
    return { clientId, apiKey };
}

/**
 * Отображаемое имя магазина для CSV/Google Sheets (Povar / Leeshop).
 */
export function getOzonStoreDisplayName(storeIdentifier: OzonStoreIdentifier): string {
    switch (storeIdentifier) {
        case OzonStoreIdentifier.POVAR:
            return 'Povar';
        case OzonStoreIdentifier.LEESHOP:
            return 'Leeshop';
        default:
            return String(storeIdentifier);
    }
}
