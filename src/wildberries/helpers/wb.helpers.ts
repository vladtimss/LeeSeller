import { WBStoreIdentifier } from '../enums/wb-store-identifier.enum';

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
