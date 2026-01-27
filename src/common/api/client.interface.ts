import type { ApiRequestInit } from './api.types';

/**
 * Конфигурация для API запроса
 */
export interface ApiRequestConfig {
    /**
     * Базовый URL API (например, 'https://common-api.wildberries.ru')
     */
    baseUrl: string;
    /**
     * Префикс для логирования (например, 'wb-api' или 'ozon-api')
     */
    logPrefix: string;
    /**
     * Заголовки авторизации (например, { Authorization: token } или { 'Client-Id': id, 'Api-Key': key })
     */
    authHeaders: Record<string, string>;
}

/**
 * Интерфейс для работы с API запросами
 */
export interface ApiClient {
    /**
     * Универсальный запрос к любому API
     * @param config - Конфигурация API (baseUrl, logPrefix, authHeaders)
     * @param path - Путь к эндпоинту (например, '/ping')
     * @param init - Дополнительные опции запроса (method, body, headers и т.д.)
     * @returns Промис с данными ответа от API
     * @throws Error при ошибках сети или API (401, 403, и т.д.)
     */
    request<T = unknown>(config: ApiRequestConfig, path: string, init?: ApiRequestInit): Promise<T>;
}
