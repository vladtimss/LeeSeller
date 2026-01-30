import { isNode, isGoogleAppsScript } from '../runtime-env.helper';
import { makeApiRequestNode } from './api-request.node';
import { makeApiRequestGAS } from './api-request.gas';
import { ApiRequestConfig, ApiRequestInit } from './api-request.types';

/**
 * Универсальный запрос к любому API
 * Автоматически определяет окружение выполнения и использует соответствующую реализацию:
 * - Node.js: использует node-fetch
 * - Google Apps Script: использует UrlFetchApp.fetch()
 *
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
    init: ApiRequestInit = {},
): Promise<T> {
    if (isNode()) {
        return makeApiRequestNode<T>(config, path, init);
    }

    if (isGoogleAppsScript()) {
        return makeApiRequestGAS<T>(config, path, init);
    }

    // Это не должно произойти, так как getRuntimeEnvironment() выбрасывает ошибку, если окружение не определено
    throw new Error('Не удалось определить окружение выполнения для makeApiRequest');
}
