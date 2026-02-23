import { makeApiRequest } from '../../common/helpers/api/api-request.helper';
import type { OzonCredentials } from '../helpers/ozon.helpers';
import type { ApiRequestConfig } from '../../common/helpers/api/api-request.types';
import type { FboPostingListRequest, FboPostingListResponse } from '../features/ozon-fbo-orders/ozon-fbo-orders.types';
import { logger } from '../../common/helpers/logs/logger';

const OZON_API_BASE_URL = 'https://api-seller.ozon.ru';

/**
 * Конфигурация для запросов к Ozon Seller API (Client-Id + Api-Key)
 */
function getOzonApiConfig(credentials: OzonCredentials): ApiRequestConfig {
    return {
        baseUrl: OZON_API_BASE_URL,
        logPrefix: 'ozon-api',
        authHeaders: {
            'Client-Id': credentials.clientId,
            'Api-Key': credentials.apiKey,
        },
    };
}

/**
 * Запрашивает список FBO отправлений с пагинацией и возвращает все записи
 * POST /v2/posting/fbo/list
 */
export async function fetchFboPostingList(
    credentials: OzonCredentials,
    request: FboPostingListRequest,
): Promise<FboPostingListResponse> {
    const config = getOzonApiConfig(credentials);
    const path = '/v2/posting/fbo/list';

    return await makeApiRequest<FboPostingListResponse>(config, path, {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

/**
 * Собирает все FBO отправления за период: дергает API с offset пока есть данные
 */
export async function fetchAllFboPostings(
    credentials: OzonCredentials,
    filter: { since: string; to: string },
): Promise<FboPostingListResponse['result']> {
    const limit = 1000;
    let offset = 0;
    const all: FboPostingListResponse['result'] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const request: FboPostingListRequest = {
            dir: 'ASC',
            filter: {
                since: filter.since,
                to: filter.to,
                status: '',
            },
            limit,
            offset,
            translit: true,
            with: {
                analytics_data: true,
                financial_data: true,
                legal_info: false,
            },
        };

        const response = await fetchFboPostingList(credentials, request);
        const chunk = response.result ?? [];

        if (chunk.length > 0 && all.length === 0) {
            const first = chunk[0];
            const hasAnalytics = first.analytics_data !== null && first.analytics_data !== undefined;
            const hasFinancial = first.financial_data !== null && first.financial_data !== undefined;
            logger.info(
                // eslint-disable-next-line max-len
                `📡 Первое отправление: analytics_data=${hasAnalytics ? 'есть' : 'НЕТ'}, financial_data=${hasFinancial ? 'есть' : 'НЕТ'}`,
            );
        }

        if (chunk.length === 0) {
            break;
        }

        all.push(...chunk);
        logger.info(`📡 FBO list: получено ${chunk.length} отправлений (всего ${all.length})`);

        if (chunk.length < limit) {
            break;
        }

        offset += limit;
    }

    return all;
}
