/**
 * Допустимые HTTP-методы для API-запросов
 * Нотация в нижнем регистре, чтобы быть совместимой с GoogleAppsScript.URL_Fetch.HttpMethod
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Упрощённый аналог RequestInit, чтобы не тянуть DOM-типы везде
 */
export interface ApiRequestInit {
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: unknown;
}

