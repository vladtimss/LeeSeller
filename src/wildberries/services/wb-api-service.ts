import { makeApiRequest } from '../../common/helpers/api/api-request.helper';
import { getWBAnalyticsConfig, getWBStoreToken } from '../helpers/wb.helpers';
import { WBStoreIdentifier } from '../enums/wb-store-identifier.enum';
import {
    SalesFunnelProduct,
    SalesFunnelProductsRequest,
    SalesFunnelProductsResponse,
} from '../features/wb-funnel/wb-funnel.types';
import {
    ApiReportItem,
    CreateReportResponse,
    ReportStatus,
    ReportStatusResponse,
    ReportsListResponse,
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

    // API может вернуть ответ без id, используем id из запроса
    const reportId = response.id || request.id;
    logger.info('✅ Задача создана: ' + reportId);
    return {
        id: reportId,
        status: response.status,
    };
}

/**
 * Интервал между опросами списка отчётов (реже — меньше 429 per seller).
 * Один GET за такт уже снижает нагрузку вдвое vs два параллельных wait.
 */
const STOCK_REPORT_POLL_INTERVAL_MS = 12000;
/**
 * Максимум опросов: суммарный sleep ограничен с запасом под лимит GAS ~6 мин на весь run
 * (создание отчётов, скачивание ZIP, запись в таблицу).
 */
const STOCK_REPORT_POLL_MAX_ATTEMPTS = 16;

const NM_REPORT_DOWNLOADS_PATH = '/api/v2/nm-report/downloads';

/**
 * Один GET списка задач nm-report (используем и для одного, и для двух отчётов за такт).
 */
async function fetchNmReportDownloadsList(storeIdentifier: WBStoreIdentifier): Promise<ApiReportItem[]> {
    const token = getWBStoreToken(storeIdentifier);
    const config = getWBAnalyticsConfig(token);
    const response = await makeApiRequest<ReportsListResponse>(config, NM_REPORT_DOWNLOADS_PATH, {
        method: 'GET',
    });
    return response.data || [];
}

/**
 * Преобразует статус из API в нормализованный статус
 */
function normalizeReportStatus(apiStatus: string): ReportStatus {
    switch (apiStatus) {
        case 'SUCCESS':
            return 'ready';
        case 'PROCESSING':
            return 'processing';
        case 'ERROR':
            return 'error';
        case 'PENDING':
            return 'pending';
        default:
            return 'pending';
    }
}

/**
 * Проверяет статус отчета об остатках по идентификатору задачи
 * API: GET https://seller-analytics-api.wildberries.ru/api/v2/nm-report/downloads
 * API возвращает объект с полем data, содержащим массив всех отчетов, нужно найти нужный по id
 * @param storeIdentifier - Идентификатор магазина WB
 * @param reportId - Идентификатор задачи на генерацию отчета
 * @returns Промис с информацией о статусе отчета
 * @throws Error если токен не найден, отчет не найден или произошла ошибка при запросе
 */
export async function getStockReportStatus(
    storeIdentifier: WBStoreIdentifier,
    reportId: string,
): Promise<ReportStatusResponse> {
    const reports = await fetchNmReportDownloadsList(storeIdentifier);

    // Ищем отчет с нужным id
    const report = reports.find((r) => r.id === reportId);

    if (!report) {
        throw new Error('Отчет с id ' + reportId + ' не найден в списке отчетов');
    }

    // Преобразуем статус из API в нормализованный
    const normalizedStatus = normalizeReportStatus(report.status);

    logger.info('📊 Статус отчета ' + reportId + ': ' + normalizedStatus + ' (API: ' + report.status + ')');

    return {
        id: report.id,
        status: normalizedStatus,
    };
}

/**
 * Ожидает готовности двух отчётов об остатках, делая один GET списка за итерацию (вдвое меньше нагрузки на лимит WB per seller).
 */
export async function waitForBothStockReportsReady(
    storeIdentifier: WBStoreIdentifier,
    reportIdA: string,
    reportIdB: string,
): Promise<void> {
    const delayMs = STOCK_REPORT_POLL_INTERVAL_MS;
    const maxAttempts = STOCK_REPORT_POLL_MAX_ATTEMPTS;

    logger.info(
        '⏳ Ожидание готовности двух отчётов (один запрос статуса за такт, интервал ' +
            delayMs / 1000 +
            ' сек, до ' +
            maxAttempts +
            ' попыток)...',
    );

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        logger.info('⏳ Попытка ' + attempt + '/' + maxAttempts + ': пауза ' + delayMs / 1000 + ' сек...');
        await sleep(delayMs);

        logger.info('🔍 Проверка статуса обоих отчётов одним запросом к API...');
        const reports = await fetchNmReportDownloadsList(storeIdentifier);
        const reportA = reports.find((r) => r.id === reportIdA);
        const reportB = reports.find((r) => r.id === reportIdB);

        if (!reportA) {
            throw new Error('Отчет с id ' + reportIdA + ' не найден в списке отчетов');
        }
        if (!reportB) {
            throw new Error('Отчет с id ' + reportIdB + ' не найден в списке отчетов');
        }

        const statusA = normalizeReportStatus(reportA.status);
        const statusB = normalizeReportStatus(reportB.status);
        logger.info(
            '📊 Статусы: ' +
                reportIdA +
                ' → ' +
                statusA +
                ' (API: ' +
                reportA.status +
                '); ' +
                reportIdB +
                ' → ' +
                statusB +
                ' (API: ' +
                reportB.status +
                ')',
        );

        if (statusA === 'error' || statusB === 'error') {
            throw new Error(
                'Ошибка при генерации отчета: один из отчётов в статусе ERROR (проверьте кабинет WB).',
            );
        }

        if (statusA === 'ready' && statusB === 'ready') {
            logger.success('✅ Оба отчёта готовы');
            return;
        }

        logger.info('⏳ Ещё не оба готовы (ожидаем дальше)');
    }

    throw new Error(
        'Отчеты не готовы после ' +
            maxAttempts +
            ' попыток (~' +
            Math.round((maxAttempts * delayMs) / 60000) +
            ' мин). Возможно, WB долго генерирует отчёты — попробуйте позже.',
    );
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

const BINARY_REQUEST_MAX_ATTEMPTS = 6;
const BINARY_REQUEST_RETRY_DELAY_MS = 3000;
const BINARY_REQUEST_RETRY_429_MS = 10000;

/**
 * Вспомогательная функция для скачивания бинарных данных с retry при 5xx
 * В Node.js использует node-fetch, в GAS - UrlFetchApp
 */
async function makeApiRequestBinary(config: ApiRequestConfig, path: string): Promise<ArrayBuffer> {
    const url = buildApiUrl(config.baseUrl, path);
    const headers: Record<string, string> = {
        ...config.authHeaders,
    };

    if (isNode()) {
        return makeApiRequestBinaryNode(url, headers, path);
    }

    if (isGoogleAppsScript()) {
        return makeApiRequestBinaryGAS(url, headers, path);
    }

    throw new Error('Не удалось определить окружение выполнения для makeApiRequestBinary');
}

async function makeApiRequestBinaryNode(
    url: string,
    headers: Record<string, string>,
    path: string,
): Promise<ArrayBuffer> {
    let lastStatus = 0;

    for (let attempt = 1; attempt <= BINARY_REQUEST_MAX_ATTEMPTS; attempt++) {
        const response = await fetch(url, { method: 'GET', headers });
        lastStatus = response.status;

        if (response.ok) {
            return await response.arrayBuffer();
        }

        if (attempt < BINARY_REQUEST_MAX_ATTEMPTS && lastStatus === 429) {
            logger.info(
                '⚠️ ' + path + ' → 429, повтор через ' + BINARY_REQUEST_RETRY_429_MS / 1000 +
                ' сек (попытка ' + attempt + '/' + BINARY_REQUEST_MAX_ATTEMPTS + ')',
            );
            await new Promise((resolve) => setTimeout(resolve, BINARY_REQUEST_RETRY_429_MS));
            continue;
        }

        if (attempt < BINARY_REQUEST_MAX_ATTEMPTS && lastStatus >= 500 && lastStatus < 600) {
            logger.info(
                '⚠️ ' + path + ' → ' + lastStatus +
                ', повтор через ' + BINARY_REQUEST_RETRY_DELAY_MS / 1000 +
                ' сек (попытка ' + attempt + '/' + BINARY_REQUEST_MAX_ATTEMPTS + ')',
            );
            await new Promise((resolve) => setTimeout(resolve, BINARY_REQUEST_RETRY_DELAY_MS));
            continue;
        }

        const errorText = await response.text().catch(() => '');
        throw new Error('HTTP error! status: ' + lastStatus + ', body: ' + errorText);
    }

    throw new Error('HTTP error! status: ' + lastStatus + ' после ' + BINARY_REQUEST_MAX_ATTEMPTS + ' попыток');
}

async function makeApiRequestBinaryGAS(
    url: string,
    headers: Record<string, string>,
    path: string,
): Promise<ArrayBuffer> {
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

    let lastStatus = 0;

    for (let attempt = 1; attempt <= BINARY_REQUEST_MAX_ATTEMPTS; attempt++) {
        const response = UrlFetchApp.fetch(url, options);
        lastStatus = response.getResponseCode();

        if (lastStatus >= 200 && lastStatus < 300) {
            const blob = response.getBlob();
            const bytes = blob.getBytes();
            const arrayBuffer = new ArrayBuffer(bytes.length);
            const view = new Uint8Array(arrayBuffer);
            for (let i = 0; i < bytes.length; i++) {
                view[i] = bytes[i];
            }
            return arrayBuffer;
        }

        if (attempt < BINARY_REQUEST_MAX_ATTEMPTS && lastStatus === 429) {
            const Utilities = (
                globalThis as { Utilities?: { sleep: (ms: number) => void } }
            ).Utilities;
            if (Utilities) {
                logger.info(
                    '⚠️ ' + path + ' → 429, повтор через ' + BINARY_REQUEST_RETRY_429_MS / 1000 +
                    ' сек (попытка ' + attempt + '/' + BINARY_REQUEST_MAX_ATTEMPTS + ')',
                );
                Utilities.sleep(BINARY_REQUEST_RETRY_429_MS);
            }
            continue;
        }

        if (attempt < BINARY_REQUEST_MAX_ATTEMPTS && lastStatus >= 500 && lastStatus < 600) {
            const Utilities = (
                globalThis as { Utilities?: { sleep: (ms: number) => void } }
            ).Utilities;
            if (Utilities) {
                logger.info(
                    '⚠️ ' + path + ' → ' + lastStatus +
                    ', повтор через ' + BINARY_REQUEST_RETRY_DELAY_MS / 1000 +
                    ' сек (попытка ' + attempt + '/' + BINARY_REQUEST_MAX_ATTEMPTS + ')',
                );
                Utilities.sleep(BINARY_REQUEST_RETRY_DELAY_MS);
            }
            continue;
        }

        throw new Error('HTTP error! status: ' + lastStatus);
    }

    throw new Error('HTTP error! status: ' + lastStatus + ' после ' + BINARY_REQUEST_MAX_ATTEMPTS + ' попыток');
}

/**
 * Ожидает готовности одного отчёта (для сценариев вне пары 7+28 дней).
 * Интервал и число попыток совпадают с {@link waitForBothStockReportsReady}.
 */
export async function waitForStockReportReady(
    storeIdentifier: WBStoreIdentifier,
    reportId: string,
): Promise<ReportStatusResponse> {
    const maxAttempts = STOCK_REPORT_POLL_MAX_ATTEMPTS;
    const delayMs = STOCK_REPORT_POLL_INTERVAL_MS;

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
        'Отчет не готов после ' +
            maxAttempts +
            ' попыток (~' +
            Math.round((maxAttempts * delayMs) / 60000) +
            ' мин). Возможно, требуется больше времени для генерации.',
    );
}

/**
 * Вспомогательная функция для задержки
 * В Node.js использует setTimeout, в GAS - Utilities.sleep()
 */
function sleep(ms: number): Promise<void> {
    if (isNode()) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // GAS окружение
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const Utilities = (
        globalThis as {
            Utilities?: {
                sleep: (milliseconds: number) => void;
            };
        }
    ).Utilities;

    if (!Utilities) {
        throw new Error('Utilities не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
    }

    // Utilities.sleep() синхронный, но оборачиваем в Promise для совместимости с async/await
    return new Promise((resolve) => {
        Utilities.sleep(ms);
        resolve();
    });
}
