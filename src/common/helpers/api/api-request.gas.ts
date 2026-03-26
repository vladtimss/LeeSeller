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
 * Универсальный запрос к любому API для Google Apps Script окружения
 * Использует UrlFetchApp.fetch() для выполнения HTTP запросов
 * Обрабатывает формирование URL, сериализацию body, обработку ошибок
 * @param config - Конфигурация API (baseUrl, logPrefix, authHeaders)
 * @param path - Путь к эндпоинту (например, '/ping')
 * @param init - Дополнительные опции запроса (method, body, headers и т.д.)
 * @returns Промис с данными ответа от API
 * @throws Error при ошибках сети или API (401, 403, и т.д.)
 */
export async function makeApiRequestGAS<T = unknown>(
    config: ApiRequestConfig,
    path: string,
    init: ApiRequestInit = {},
): Promise<T> {
    const url = buildApiUrl(config.baseUrl, path);
    const headers = buildRequestHeaders(config, init);

    // Получаем UrlFetchApp из глобального контекста GAS
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const UrlFetchApp = (
        globalThis as {
            UrlFetchApp?: {
                fetch: (
                    url: string,
                    options: Record<string, unknown>,
                ) => { getResponseCode: () => number; getContentText: () => string };
            };
        }
    ).UrlFetchApp;
    if (!UrlFetchApp) {
        throw new Error('UrlFetchApp не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
    }

    // Сериализуем body
    const payload = serializeRequestBody(init.body, config.logPrefix);
    ensureContentType(headers, payload !== undefined);

    // Формируем опции для UrlFetchApp
    const options: Record<string, unknown> = {
        method: init.method || 'GET',
        headers: headers,
        muteHttpExceptions: true, // Чтобы не выбрасывать исключения при ошибках HTTP
    };

    if (payload !== undefined) {
        options.payload = payload;
    }

    const maxAttempts = 6;
    const retryDelay5xxMs = 2000;
    const retryDelay429DefaultMs = 10000;
    const retryAfterMinMs = 5000;
    const retryAfterMaxMs = 120000;

    const getRetryAfterMsFromGasResponse = (
        response: { getAllHeaders?: () => Record<string, string | string[]> },
        defaultMs: number,
    ): number => {
        const getAllHeaders = response.getAllHeaders;
        if (typeof getAllHeaders !== 'function') {
            return defaultMs;
        }
        const raw = getAllHeaders.call(response);
        const keys = Object.keys(raw);
        const raKey = keys.find((k) => k.toLowerCase() === 'retry-after');
        if (raKey === undefined) {
            return defaultMs;
        }
        const val = raw[raKey];
        const str = Array.isArray(val) ? val[0] : val;
        const seconds = parseInt(String(str).trim(), 10);
        if (Number.isNaN(seconds) || seconds < 0) {
            return defaultMs;
        }
        const ms = seconds * 1000;
        return Math.min(Math.max(ms, retryAfterMinMs), retryAfterMaxMs);
    };

    let lastStatus = 0;
    let lastData: unknown = null;
    let lastText = '';

    const Utilities = (globalThis as { Utilities?: { sleep: (ms: number) => void } }).Utilities;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let response: {
            getResponseCode: () => number;
            getContentText: () => string;
            getAllHeaders?: () => Record<string, string | string[]>;
        };
        try {
            response = UrlFetchApp.fetch(url, options);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[${config.logPrefix}] UrlFetchApp.fetch error:`, errorMessage);
            throw new Error(`${config.logPrefix} fetch failed: ${errorMessage}`);
        }

        lastStatus = response.getResponseCode();
        lastText = response.getContentText();
        lastData = parseApiResponse<T>(lastText);

        if (lastStatus >= 200 && lastStatus < 300) {
            return lastData as T;
        }

        // 429 — лимиты WB/OpenAPI per seller; ждём дольше и повторяем
        if (attempt < maxAttempts && lastStatus === 429 && Utilities) {
            const waitMs = getRetryAfterMsFromGasResponse(response, retryDelay429DefaultMs);
            console.info(
                `[${config.logPrefix}] ${path} → 429, повтор через ${waitMs / 1000} сек (попытка ${attempt}/${maxAttempts})`,
            );
            Utilities.sleep(waitMs);
            continue;
        }

        // 5xx — повторяем запрос (Ozon иногда отдаёт временный 500)
        if (attempt < maxAttempts && lastStatus >= 500 && lastStatus < 600 && Utilities) {
            console.info(
                `[${config.logPrefix}] ${path} → ${lastStatus}, повтор через ${retryDelay5xxMs / 1000} сек (попытка ${attempt}/${maxAttempts})`,
            );
            Utilities.sleep(retryDelay5xxMs);
            continue;
        }

        handleApiError(config.logPrefix, path, lastStatus, lastData);
    }

    handleApiError(config.logPrefix, path, lastStatus, lastData);
}
