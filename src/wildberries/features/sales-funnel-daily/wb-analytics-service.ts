import { makeApiRequest } from '../../../common/utils/api-request.util';
import { getWBAnalyticsConfig } from '../../helpers/wb.helpers';
import {
    SalesFunnelProductsRequest,
    SalesFunnelProduct,
    SalesFunnelProductsResponse,
} from './types';

/**
 * Получает статистику карточек товаров за период из WB Analytics API
 * API: POST /api/analytics/v3/sales-funnel/products
 * @param token - Токен авторизации для WB API
 * @param request - Параметры запроса (период, фильтры, пагинация и т.д.)
 * @returns Промис с массивом данных по товарам
 * @throws Error если токен невалиден или произошла ошибка при запросе
 */
export async function getWBSalesFunnelProducts(
    token: string,
    request: SalesFunnelProductsRequest
): Promise<SalesFunnelProduct[]> {
    const config = getWBAnalyticsConfig(token);
    const path = '/api/analytics/v3/sales-funnel/products';

    const response = await makeApiRequest<SalesFunnelProductsResponse>(config, path, {
        method: 'POST',
        body: JSON.stringify(request),
    });

    // Извлекаем массив товаров из структуры { data: { products: [...] } }
    return response.data.products;
}
