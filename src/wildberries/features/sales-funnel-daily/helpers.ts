import { getWBSalesFunnelProducts } from './wb-analytics-service';
import { adaptSalesFunnelToKeyMetricsCSV } from './adapters/key-metrics.adapter';
import { adaptSalesFunnelToStocksCSV } from './adapters/stocks.adapter';
import { WB_KEY_METRICS_HEADERS, WB_STOCKS_HEADERS } from './adapters/csv-headers.const';
import { sheetWriterNode } from '../../../common/sheets/writer.node';
import { SalesFunnelProductsRequest, SalesFunnelProduct } from './types';
import { logger } from '../../../common/utils/logger';
import { getCurrentDate } from '../../../common/helpers/date-helpers';
import { WBStoreIdentifier } from '../../enums/wb-store-identifier.enum';

/**
 * Преобразует идентификатор магазина в короткое название для файлов
 * @param storeIdentifier - Идентификатор магазина из enum
 * @returns Короткое название магазина
 */
function getStoreShortName(storeIdentifier: WBStoreIdentifier): string {
    switch (storeIdentifier) {
        case WBStoreIdentifier.POVAR_NA_RAYONE:
            return 'povar';
        case WBStoreIdentifier.LEESHOP:
            return 'leeshop';
        default:
            return storeIdentifier;
    }
}

/**
 * Получает данные из WB Analytics API за указанный период
 * @param token - Токен авторизации
 * @param date - Дата периода в формате YYYY-MM-DD
 * @returns Массив товаров из WB Analytics API
 */
export async function fetchWBData(token: string, date: string): Promise<SalesFunnelProduct[]> {
    const request: SalesFunnelProductsRequest = {
        selectedPeriod: {
            start: date,
            end: date,
        },
        nmIds: [], // Пустой массив = все товары
        limit: 1000, // Максимальное количество товаров
        offset: 0,
    };

    logger.info('📡 Запрос к WB Analytics API...');
    const products = await getWBSalesFunnelProducts(token, request);
    logger.info(`✅ Получено товаров: ${products.length}`);

    return products;
}

/**
 * Возвращает базовое имя для файла/листа отчёта Key Metrics
 * (без идентификатора магазина, он добавляется sheetWriterNode через storeIdentifier)
 */
function getKeyMetricsSheetBaseName(date: string): string {
    return `wb-key-metrics-${date}`;
}

/**
 * Возвращает базовое имя для файла/листа отчёта Stocks
 */
function getStocksSheetBaseName(runDate: string): string {
    return `wb-stocks-${runDate}`;
}

/**
 * Создает отчет по Key Metrics (статистика продаж)
 * @param products - Массив товаров из WB Analytics API
 * @param date - Дата периода в формате YYYY-MM-DD
 * @param storeIdentifier - Идентификатор магазина WB
 */
export function createKeyMetricsReport(
    products: SalesFunnelProduct[],
    date: string,
    storeIdentifier: WBStoreIdentifier
): void {
    logger.info('📊 Создание отчета Key Metrics...');

    // Адаптируем данные для CSV (получаем массивы, готовые для записи)
    const keyMetricsArrays = adaptSalesFunnelToKeyMetricsCSV(products);

    const storeShortName = getStoreShortName(storeIdentifier);

    sheetWriterNode.write({
        sheetName: getKeyMetricsSheetBaseName(date),
        headers: WB_KEY_METRICS_HEADERS,
        rows: keyMetricsArrays,
        storeIdentifier: storeShortName,
        mode: 'append',
    });

    logger.info(
        `✅ Key Metrics записаны (режим append) для магазина ${storeShortName}: ${keyMetricsArrays.length} строк`
    );
}

/**
 * Создает отчет по Stocks (остатки)
 * @param products - Массив товаров из WB Analytics API
 * @param storeIdentifier - Идентификатор магазина WB
 */
export function createStocksReport(
    products: SalesFunnelProduct[],
    storeIdentifier: WBStoreIdentifier
): void {
    logger.info('📦 Создание отчета Stocks...');

    // Получаем дату выполнения функции (момент получения данных)
    const runDate = getCurrentDate();

    // Адаптируем данные для CSV (получаем массивы, готовые для записи)
    const stocksArrays = adaptSalesFunnelToStocksCSV(products, runDate);

    const storeShortName = getStoreShortName(storeIdentifier);

    sheetWriterNode.write({
        sheetName: getStocksSheetBaseName(runDate),
        headers: WB_STOCKS_HEADERS,
        rows: stocksArrays,
        storeIdentifier: storeShortName,
        mode: 'overwrite',
    });

    logger.info(
        `✅ Stocks записаны (режим overwrite) для магазина ${storeShortName}: ${stocksArrays.length} строк`
    );
}
