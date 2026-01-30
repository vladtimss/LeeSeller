import fetch from 'node-fetch';
import { ApiRequestConfig, ApiRequestInit } from './api-request.types';
import {
    buildApiUrl,
    buildRequestHeaders,
    serializeRequestBody,
    ensureContentType,
    handleApiError,
    parseApiResponse,
} from './api-request.common';

/**
 * Универсальный запрос к любому API для Node.js окружения
 * Использует node-fetch для выполнения HTTP запросов
 * Обрабатывает формирование URL, сериализацию body, обработку ошибок
 * @param config - Конфигурация API (baseUrl, logPrefix, authHeaders)
 * @param path - Путь к эндпоинту (например, '/ping')
 * @param init - Дополнительные опции запроса (method, body, headers и т.д.)
 * @returns Промис с данными ответа от API
 * @throws Error при ошибках сети или API (401, 403, и т.д.)
 */
export async function makeApiRequestNode<T = unknown>(
    config: ApiRequestConfig,
    path: string,
    init: ApiRequestInit = {},
): Promise<T> {
    const url = buildApiUrl(config.baseUrl, path);
    const headers = buildRequestHeaders(config, init);

    // Сериализуем body
    const body = serializeRequestBody(init.body, config.logPrefix);
    ensureContentType(headers, body !== undefined);

    let res: Awaited<ReturnType<typeof fetch>>;

    try {
        // Формируем опции для node-fetch
        const fetchOptions: Parameters<typeof fetch>[1] = {
            method: init.method || 'GET',
            headers: headers,
            body: body,
        };
        res = await fetch(url, fetchOptions);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${config.logPrefix}] fetch error:`, errorMessage);
        throw new Error(`${config.logPrefix} fetch failed: ${errorMessage}`);
    }

    const text = await res.text().catch(() => '');
    const data = parseApiResponse<T>(text);

    if (!res.ok) {
        handleApiError(config.logPrefix, path, res.status, data);
    }

    return data;
}
