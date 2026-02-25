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

    const maxAttempts = 3;
    const retryDelayMs = 2000;
    let lastStatus = 0;
    let lastData: unknown = null;
    let lastText = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let response: { getResponseCode: () => number; getContentText: () => string };
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

        // 5xx — повторяем запрос (Ozon иногда отдаёт временный 500)
        if (attempt < maxAttempts && lastStatus >= 500 && lastStatus < 600) {
            const Utilities = (
                globalThis as { Utilities?: { sleep: (ms: number) => void } }
            ).Utilities;
            if (Utilities) {
                console.info(
                    `[${config.logPrefix}] ${path} → ${lastStatus}, повтор через ${retryDelayMs / 1000} сек (попытка ${attempt}/${maxAttempts})`,
                );
                Utilities.sleep(retryDelayMs);
            }
            continue;
        }

        handleApiError(config.logPrefix, path, lastStatus, lastData);
    }

    handleApiError(config.logPrefix, path, lastStatus, lastData);
}
