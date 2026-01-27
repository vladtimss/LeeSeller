import type { ApiRequestConfig } from './client.interface';
import type { ApiRequestInit } from './api.types';

interface PreparedRequest {
    headers: Record<string, string>;
    bodySerialized: string | undefined;
}

type LogFn = (message?: unknown, ...optionalParams: unknown[]) => void;

/**
 * Подготавливает заголовки и тело запроса с учётом JSON-сериализации.
 * Логика общая для Node и GAS.
 */
export function buildHeadersAndBody(
    config: ApiRequestConfig,
    init: ApiRequestInit,
    logError: LogFn
): PreparedRequest {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...config.authHeaders,
        ...(init.headers ?? {}),
    };

    let bodySerialized: string | undefined;
    const body = init.body;

    if (body !== undefined && !(headers['Content-Type'] || headers['content-type'])) {
        headers['Content-Type'] = 'application/json';
    }

    if (body !== undefined && typeof body !== 'string') {
        try {
            bodySerialized = JSON.stringify(body);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logError(`[${config.logPrefix}] JSON.stringify failed:`, errorMessage);
            bodySerialized = String(body);
        }
    } else if (typeof body === 'string') {
        bodySerialized = body;
    }

    return {
        headers,
        bodySerialized,
    };
}

/**
 * Унифицированная обработка HTTP-ответа:
 * - парсинг JSON при возможности
 * - логирование ошибок по статус-коду
 * - выбрасывание Error при неуспешном статусе
 */
export function parseResponseOrThrow<T>(
    config: ApiRequestConfig,
    path: string,
    statusCode: number,
    text: string,
    logError: LogFn
): T {
    let data: T | string;

    try {
        data = text ? (JSON.parse(text) as T) : (text as unknown as T);
    } catch {
        data = text;
    }

    const ok = statusCode >= 200 && statusCode < 300;

    if (!ok) {
        const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);

        if (statusCode === 401) {
            logError(`[${config.logPrefix}] 401 Unauthorized - проверьте токен для: ${path}`);
        } else if (statusCode === 403) {
            logError(`[${config.logPrefix}] 403 Forbidden - нет доступа к: ${path}`);
        } else {
            logError(`[${config.logPrefix}] error response:`, { status: statusCode, body: bodyStr });
        }

        throw new Error(`${config.logPrefix} API error ${statusCode}: ${bodyStr}`);
    }

    return data as T;
}

