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
 * Опции для HTTP запроса
 * Совместимо с RequestInit из Web API
 */
export interface ApiRequestInit {
    /** HTTP метод (GET, POST, PUT, DELETE и т.д.) */
    method?: string;
    /** Тело запроса (может быть строкой или объектом, который будет сериализован в JSON) */
    body?: string | unknown;
    /** Дополнительные заголовки запроса */
    headers?: Record<string, string>;
}
