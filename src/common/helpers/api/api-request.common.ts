import { ApiRequestConfig, ApiRequestInit } from './api-request.types';

/**
 * Формирует полный URL из baseUrl и path
 * @param baseUrl - Базовый URL API
 * @param path - Путь к эндпоинту
 * @returns Полный URL
 */
export function buildApiUrl(baseUrl: string, path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
}

/**
 * Формирует заголовки запроса, объединяя authHeaders из конфига и headers из init
 * @param config - Конфигурация API
 * @param init - Опции запроса
 * @returns Объект с заголовками
 */
export function buildRequestHeaders(
    config: ApiRequestConfig,
    init: ApiRequestInit,
): Record<string, string> {
    return {
        Accept: 'application/json',
        ...config.authHeaders,
        ...(init.headers ? init.headers : {}),
    };
}

/**
 * Сериализует body в строку, если это необходимо
 * @param body - Тело запроса (может быть строкой или объектом)
 * @param logPrefix - Префикс для логирования ошибок
 * @returns Сериализованное тело запроса или undefined
 * @throws Error если не удалось сериализовать объект
 */
export function serializeRequestBody(
    body: string | unknown | undefined,
    logPrefix: string,
): string | undefined {
    if (body === undefined) {
        return undefined;
    }

    if (typeof body === 'string') {
        return body;
    }

    try {
        return JSON.stringify(body);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${logPrefix}] JSON.stringify failed:`, errorMessage);
        throw new Error(`${logPrefix} JSON.stringify failed: ${errorMessage}`);
    }
}

/**
 * Устанавливает Content-Type: application/json, если он не указан и есть body
 * @param headers - Заголовки запроса
 * @param hasBody - Есть ли тело запроса
 */
export function ensureContentType(headers: Record<string, string>, hasBody: boolean): void {
    if (hasBody && !(headers['Content-Type'] || headers['content-type'])) {
        headers['Content-Type'] = 'application/json';
    }
}

/**
 * Обрабатывает ошибку API запроса
 * Логирует ошибку и выбрасывает исключение с понятным сообщением
 * @param logPrefix - Префикс для логирования
 * @param path - Путь к эндпоинту
 * @param statusCode - HTTP статус код
 * @param data - Данные ответа (для формирования сообщения об ошибке)
 */
export function handleApiError(
    logPrefix: string,
    path: string,
    statusCode: number,
    data: unknown,
): never {
    const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);

    if (statusCode === 401) {
        console.error(`[${logPrefix}] 401 Unauthorized - проверьте токен для: ${path}`);
    } else if (statusCode === 403) {
        console.error(`[${logPrefix}] 403 Forbidden - нет доступа к: ${path}`);
    } else {
        console.error(`[${logPrefix}] error response:`, { status: statusCode, body: bodyStr });
    }

    throw new Error(`${logPrefix} API error ${statusCode}: ${bodyStr}`);
}

/**
 * Парсит ответ API в нужный тип
 * @param text - Текст ответа
 * @returns Распарсенные данные или текст, если парсинг не удался
 */
export function parseApiResponse<T>(text: string): T {
    try {
        return text ? (JSON.parse(text) as T) : (text as T);
    } catch {
        return text as T;
    }
}
