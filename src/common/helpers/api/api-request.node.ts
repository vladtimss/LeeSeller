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

const NODE_RETRY_MAX_ATTEMPTS = 6;
const NODE_RETRY_DELAY_5XX_MS = 2000;
const NODE_RETRY_DELAY_429_DEFAULT_MS = 10000;
const NODE_RETRY_AFTER_MIN_MS = 5000;
const NODE_RETRY_AFTER_MAX_MS = 120000;

/**
 * Retry-After как секунды (число) или дефолт в мс.
 */
function parseRetryAfterMsNode(retryAfterHeader: string | null, defaultMs: number): number {
    if (retryAfterHeader === null || retryAfterHeader.trim() === '') {
        return defaultMs;
    }
    const seconds = parseInt(retryAfterHeader.trim(), 10);
    if (Number.isNaN(seconds) || seconds < 0) {
        return defaultMs;
    }
    const ms = seconds * 1000;
    return Math.min(Math.max(ms, NODE_RETRY_AFTER_MIN_MS), NODE_RETRY_AFTER_MAX_MS);
}

/**
 * Универсальный запрос к любому API для Node.js окружения
 * Использует node-fetch для выполнения HTTP запросов
 * Обрабатывает формирование URL, сериализацию body, обработку ошибок
 * При 429 и 5xx — повтор с задержкой (WB analytics и др.)
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

    const fetchOptionsBase: Parameters<typeof fetch>[1] = {
        method: init.method || 'GET',
        headers: headers,
        body: body,
    };

    let lastStatus = 0;
    let lastData: unknown = null;

    for (let attempt = 1; attempt <= NODE_RETRY_MAX_ATTEMPTS; attempt++) {
        let res: Awaited<ReturnType<typeof fetch>>;

        try {
            res = await fetch(url, fetchOptionsBase);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[${config.logPrefix}] fetch error:`, errorMessage);
            throw new Error(`${config.logPrefix} fetch failed: ${errorMessage}`);
        }

        lastStatus = res.status;
        const text = await res.text().catch(() => '');
        lastData = parseApiResponse<T>(text);

        if (res.ok) {
            return lastData as T;
        }

        if (attempt < NODE_RETRY_MAX_ATTEMPTS && lastStatus === 429) {
            const waitMs = parseRetryAfterMsNode(
                res.headers.get('retry-after'),
                NODE_RETRY_DELAY_429_DEFAULT_MS,
            );
            console.info(
                `[${config.logPrefix}] ${path} → 429 Too Many Requests, повтор через ${waitMs / 1000} сек (попытка ${attempt}/${NODE_RETRY_MAX_ATTEMPTS})`,
            );
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            continue;
        }

        if (attempt < NODE_RETRY_MAX_ATTEMPTS && lastStatus >= 500 && lastStatus < 600) {
            console.info(
                `[${config.logPrefix}] ${path} → ${lastStatus}, повтор через ${NODE_RETRY_DELAY_5XX_MS / 1000} сек (попытка ${attempt}/${NODE_RETRY_MAX_ATTEMPTS})`,
            );
            await new Promise((resolve) => setTimeout(resolve, NODE_RETRY_DELAY_5XX_MS));
            continue;
        }

        handleApiError(config.logPrefix, path, lastStatus, lastData);
    }

    handleApiError(config.logPrefix, path, lastStatus, lastData);
}
