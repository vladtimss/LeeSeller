import { makeApiRequest } from '../../common/helpers/api/api-request.helper';
import { getWBAnalyticsConfig, getWBStoreToken } from '../helpers/wb.helpers';
import { WBStoreIdentifier } from '../enums/wb-store-identifier.enum';
import {
    SalesFunnelProductsRequest,
    SalesFunnelProduct,
    SalesFunnelProductsResponse,
} from '../features/wb-funnel/wb-funnel.types';
import { ApiRequestConfig } from '../../common/helpers/api/api-request.types';

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
 * @param storeIdentifier - Идентификатор магазина WB
 * @returns Промис с ответом от сервера (обычно содержит поле message)
 * @throws Error если токен не найден или произошла ошибка при запросе
 */
export async function pingWBStore(storeIdentifier: WBStoreIdentifier): Promise<{ message?: string }> {
    const token = getWBStoreToken(storeIdentifier);
    return makeApiRequest<{ message?: string }>(getWBConfig(token), '/ping', {
        method: 'GET',
    });
}

/**
 * Получает статистику карточек товаров за период из WB Analytics API
 * API: POST /api/analytics/v3/sales-funnel/products
 * @param storeIdentifier - Идентификатор магазина WB
 * @param request - Параметры запроса (период, фильтры, пагинация и т.д.)
 * @returns Промис с массивом данных по товарам
 * @throws Error если токен не найден или произошла ошибка при запросе
 */
export async function getWBSalesFunnelProducts(
    storeIdentifier: WBStoreIdentifier,
    request: SalesFunnelProductsRequest,
): Promise<SalesFunnelProduct[]> {
    const token = getWBStoreToken(storeIdentifier);
    const config = getWBAnalyticsConfig(token);
    const path = '/api/analytics/v3/sales-funnel/products';

    const response = await makeApiRequest<SalesFunnelProductsResponse>(config, path, {
        method: 'POST',
        body: JSON.stringify(request),
    });

    // Извлекаем массив товаров из структуры { data: { products: [...] } }
    return response.data.products;
}
