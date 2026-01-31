import { makeApiRequest } from '../../common/helpers/api/api-request.helper';
import { getWBAnalyticsConfig, getWBStoreToken } from '../helpers/wb.helpers';
import { WBStoreIdentifier } from '../enums/wb-store-identifier.enum';
import {
    SalesFunnelProduct,
    SalesFunnelProductsRequest,
    SalesFunnelProductsResponse,
} from '../features/wb-funnel/wb-funnel.types';
import {
    CreateReportResponse,
    ReportStatusResponse,
    StockHistoryReportRequest,
} from '../features/wb-stocks/wb-stocks.types';
import { ApiRequestConfig } from '../../common/helpers/api/api-request.types';
import { logger } from '../../common/helpers/logs/logger';
import { isGoogleAppsScript, isNode } from '../../common/helpers/runtime/runtime-env.helper';
import { buildApiUrl } from '../../common/helpers/api/api-request.common';
import fetch from 'node-fetch';

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

/**
 * Создает задачу на генерацию отчета об остатках
 * API: POST https://seller-analytics-api.wildberries.ru/api/v2/nm-report/downloads
 * @param storeIdentifier - Идентификатор магазина WB
 * @param request - Параметры запроса на создание отчета
 * @returns Промис с ответом от API (содержит id задачи)
 * @throws Error если токен не найден или произошла ошибка при запросе
 */
export async function createStockHistoryReport(
    storeIdentifier: WBStoreIdentifier,
    request: StockHistoryReportRequest,
): Promise<CreateReportResponse> {
    const token = getWBStoreToken(storeIdentifier);
    const config = getWBAnalyticsConfig(token);
    const path = '/api/v2/nm-report/downloads';

    logger.info('📋 Создание задачи на генерацию отчета об остатках (id: ' + request.id + ')');

    const response = await makeApiRequest<CreateReportResponse>(config, path, {
        method: 'POST',
        body: JSON.stringify(request),
    });

    logger.info('✅ Задача создана: ' + response.id);
    return response;
}

/**
 * Проверяет статус отчета об остатках по идентификатору задачи
 * API: GET https://seller-analytics-api.wildberries.ru/api/v2/nm-report/downloads
 * @param storeIdentifier - Идентификатор магазина WB
 * @param reportId - Идентификатор задачи на генерацию отчета
 * @returns Промис с информацией о статусе отчета
 * @throws Error если токен не найден или произошла ошибка при запросе
 */
export async function getStockReportStatus(
    storeIdentifier: WBStoreIdentifier,
    reportId: string,
): Promise<ReportStatusResponse> {
    const token = getWBStoreToken(storeIdentifier);
    const config = getWBAnalyticsConfig(token);
    const path = '/api/v2/nm-report/downloads/' + reportId;

    const response = await makeApiRequest<ReportStatusResponse>(config, path, {
        method: 'GET',
    });

    logger.info('📊 Статус отчета ' + reportId + ': ' + response.status);
    return response;
}

/**
 * Скачивает готовый отчет об остатках
 * API: GET https://seller-analytics-api.wildberries.ru/api/v2/nm-report/downloads/file/{reportId}
 * @param storeIdentifier - Идентификатор магазина WB
 * @param reportId - Идентификатор задачи на генерацию отчета
 * @returns Промис с бинарными данными файла (ZIP архив)
 * @throws Error если токен не найден или произошла ошибка при запросе
 */
export async function downloadStockReportFile(
    storeIdentifier: WBStoreIdentifier,
    reportId: string,
): Promise<ArrayBuffer> {
    const token = getWBStoreToken(storeIdentifier);
    const config = getWBAnalyticsConfig(token);
    const path = '/api/v2/nm-report/downloads/file/' + reportId;

    logger.info('📥 Скачивание отчета ' + reportId + '...');

    const response = await makeApiRequestBinary(config, path);

    logger.info('✅ Отчет скачан (размер: ' + response.byteLength + ' байт)');
    return response;
}

/**
 * Вспомогательная функция для скачивания бинарных данных
 * В Node.js использует node-fetch, в GAS - UrlFetchApp
 */
async function makeApiRequestBinary(config: ApiRequestConfig, path: string): Promise<ArrayBuffer> {
    const url = buildApiUrl(config.baseUrl, path);
    const headers: Record<string, string> = {
        ...config.authHeaders,
    };

    if (isNode()) {
        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error('HTTP error! status: ' + response.status + ', body: ' + errorText);
        }

        return await response.arrayBuffer();
    }

    if (isGoogleAppsScript()) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const UrlFetchApp = (
            globalThis as {
                UrlFetchApp?: {
                    fetch: (
                        url: string,
                        options: Record<string, unknown>,
                    ) => { getResponseCode: () => number; getBlob: () => { getBytes: () => number[] } };
                };
            }
        ).UrlFetchApp;

        if (!UrlFetchApp) {
            throw new Error('UrlFetchApp не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
        }

        const options: Record<string, unknown> = {
            method: 'GET',
            headers: headers,
            muteHttpExceptions: true,
        };

        const response = UrlFetchApp.fetch(url, options);
        const statusCode = response.getResponseCode();

        if (statusCode < 200 || statusCode >= 300) {
            throw new Error('HTTP error! status: ' + statusCode);
        }

        const blob = response.getBlob();
        const bytes = blob.getBytes();
        // Конвертируем массив байтов в ArrayBuffer
        const arrayBuffer = new ArrayBuffer(bytes.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < bytes.length; i++) {
            view[i] = bytes[i];
        }
        return arrayBuffer;
    }

    throw new Error('Не удалось определить окружение выполнения для makeApiRequestBinary');
}

/**
 * Ожидает готовности отчета об остатках
 * Проверяет статус отчета с интервалом 5 секунд, максимум 5 попыток
 * Первая проверка через 5 секунд после создания задачи
 * @param storeIdentifier - Идентификатор магазина WB
 * @param reportId - Идентификатор задачи на генерацию отчета
 * @returns Промис с информацией о статусе отчета (когда статус 'ready')
 * @throws Error если отчет не готов после 5 попыток или произошла ошибка
 */
export async function waitForStockReportReady(
    storeIdentifier: WBStoreIdentifier,
    reportId: string,
): Promise<ReportStatusResponse> {
    const maxAttempts = 5;
    const delayMs = 5000; // 5 секунд

    logger.info(
        '⏳ Ожидание готовности отчета ' +
            reportId +
            ' (максимум ' +
            maxAttempts +
            ' попыток, интервал ' +
            delayMs / 1000 +
            ' сек)...',
    );

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Ждем перед каждой проверкой (включая первую - через 5 сек после создания задачи)
        logger.info('⏳ Попытка ' + attempt + '/' + maxAttempts + ': ожидание ' + delayMs / 1000 + ' сек...');
        await sleep(delayMs);

        logger.info('🔍 Попытка ' + attempt + '/' + maxAttempts + ': проверка статуса...');
        const statusResponse = await getStockReportStatus(storeIdentifier, reportId);

        if (statusResponse.status === 'ready') {
            logger.success('✅ Отчет готов!');
            return statusResponse;
        }

        if (statusResponse.status === 'error') {
            const errorMessage = statusResponse.error || 'Неизвестная ошибка при генерации отчета';
            throw new Error('Ошибка при генерации отчета: ' + errorMessage);
        }

        logger.info('⏳ Отчет еще не готов (статус: ' + statusResponse.status + ')');
    }

    throw new Error(
        'Отчет не готов после ' + maxAttempts + ' попыток. Возможно, требуется больше времени для генерации.',
    );
}

/**
 * Вспомогательная функция для задержки
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
