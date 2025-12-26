import fetch from 'node-fetch';

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
 * Универсальный запрос к любому API
 * Обрабатывает формирование URL, сериализацию body, обработку ошибок
 * @param config - Конфигурация API (baseUrl, logPrefix, authHeaders)
 * @param path - Путь к эндпоинту (например, '/ping')
 * @param init - Дополнительные опции запроса (method, body, headers и т.д.)
 * @returns Промис с данными ответа от API
 * @throws Error при ошибках сети или API (401, 403, и т.д.)
 */
export async function makeApiRequest<T = unknown>(
    config: ApiRequestConfig,
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${config.baseUrl}${normalizedPath}`;

    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...config.authHeaders,
        ...(init.headers ? (init.headers as Record<string, string>) : {}),
    };

    let body = init.body;
    if (body !== undefined && !(headers['Content-Type'] || headers['content-type'])) {
        headers['Content-Type'] = 'application/json';
    }

    if (body !== undefined && typeof body !== 'string') {
        try {
            body = JSON.stringify(body);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[${config.logPrefix}] JSON.stringify failed:`, errorMessage);
            // Если сериализация упала — оставим как есть
        }
    }

    let res: Awaited<ReturnType<typeof fetch>>;

    try {
        res = await fetch(url, { ...init, headers, body: body as string | undefined });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${config.logPrefix}] fetch error:`, errorMessage);
        throw new Error(`${config.logPrefix} fetch failed: ${errorMessage}`);
    }

    const text = await res.text().catch(() => '');

    let data: T;
    try {
        data = text ? (JSON.parse(text) as T) : (text as T);
    } catch {
        data = text as T;
    }

    if (!res.ok) {
        const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);

        if (res.status === 401) {
            console.error(`[${config.logPrefix}] 401 Unauthorized - проверьте токен для: ${path}`);
        } else if (res.status === 403) {
            console.error(`[${config.logPrefix}] 403 Forbidden - нет доступа к: ${path}`);
        } else {
            console.error(`[${config.logPrefix}] error response:`, { status: res.status, body: bodyStr });
        }

        throw new Error(`${config.logPrefix} API error ${res.status}: ${bodyStr}`);
    }

    return data;
}

