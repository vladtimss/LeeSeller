/**
 * Конфигурация магазина
 */
export interface StoreConfig {
    token: string;
    name: string;
}

/**
 * Конфигурация executor'а
 */
export interface ExecutorConfig {
    marketplace: 'wb' | 'ozon';
    feature: string;
    store?: string;
}

