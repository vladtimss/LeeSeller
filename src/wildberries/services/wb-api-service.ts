import { makeApiRequest, ApiRequestConfig } from '../../common/utils/api-request.util';

/**
 * Базовый URL для Wildberries API
 */
const WB_API_BASE_URL = 'https://common-api.wildberries.ru';

/**
 * Создает полную конфигурацию для WB API с токеном
 * @param token - Токен авторизации для WB API
 * @returns Полная конфигурация для API запроса
 */
function getWBConfig(token: string): ApiRequestConfig {
    return {
        baseUrl: WB_API_BASE_URL,
        logPrefix: 'wb-api',
        authHeaders: {
            Authorization: token,
        },
    };
}

/**
 * Проверка подключения к WB API
 * Выполняет GET запрос к /ping эндпоинту для проверки валидности токена
 * @param token - Токен авторизации для WB API
 * @returns Промис с ответом от сервера (обычно содержит поле message)
 * @throws Error если токен невалиден или произошла ошибка при запросе
 */
export async function pingWB(token: string): Promise<{ message?: string }> {
    return makeApiRequest<{ message?: string }>(getWBConfig(token), '/ping', {
        method: 'GET',
    });
}
