import fetch from 'node-fetch';

/**
 * Базовый URL для Wildberries API
 */
const WB_API_BASE_URL = 'https://common-api.wildberries.ru';

/**
 * Универсальный запрос к Wildberries API
 */
async function apiRequest<T = unknown>(
    token: string,
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${WB_API_BASE_URL}${normalizedPath}`;

    const headers: Record<string, string> = {
        Authorization: token,
        Accept: 'application/json',
        ...(init.headers ? (init.headers as Record<string, string>) : {}),
    };

    let body = init.body;
    if (body !== undefined && !(headers['Content-Type'] || headers['content-type'])) {
        headers['Content-Type'] = 'application/json';
    }

    if (body !== undefined && typeof body !== 'string') {
        try {
            body = JSON.stringify(body);
        } catch (e) {
            // Если сериализация упала — оставим как есть
        }
    }

    let res: Awaited<ReturnType<typeof fetch>>;

    try {
        res = await fetch(url, { ...init, headers, body: body as string | undefined });
    } catch (err) {
        console.error('[wb-api] fetch error:', err);
        throw new Error(`WB API fetch failed: ${(err as Error).message}`);
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
            console.error(`[wb-api] 401 Unauthorized - проверьте токен для: ${path}`);
        } else if (res.status === 403) {
            console.error(`[wb-api] 403 Forbidden - нет доступа к: ${path}`);
        } else {
            console.error('[wb-api] error response:', { status: res.status, body: bodyStr });
        }

        throw new Error(`WB API error ${res.status}: ${bodyStr}`);
    }

    return data;
}

/**
 * Проверка подключения к WB API
 * Возвращает ответ от API
 */
export async function pingWB(token: string): Promise<{ message?: string }> {
    return apiRequest<{ message?: string }>(token, '/ping', {
        method: 'GET',
    });
}
