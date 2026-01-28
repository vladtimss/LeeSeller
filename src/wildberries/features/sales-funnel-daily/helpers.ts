import * as path from 'path';
import * as fs from 'fs';
import { getWBSalesFunnelProducts } from './wb-analytics-service';
import { adaptSalesFunnelToKeyMetricsCSV } from './adapters/key-metrics.adapter';
import { adaptSalesFunnelToStocksCSV } from './adapters/stocks.adapter';
import { WB_KEY_METRICS_HEADERS, WB_STOCKS_HEADERS } from './adapters/csv-headers.const';
import { writeCsvFile, WriteMode } from '../../../integrations/google-sheets/google-sheets-client';
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
 * Преобразует идентификатор магазина в человекочитаемое имя для отчётов
 * (первая колонка "Магазин" в CSV/таблицах).
 * @param storeIdentifier - Идентификатор магазина из enum
 * @returns Название магазина для отображения (например, 'Povar', 'LeeShop')
 */
function getStoreDisplayName(storeIdentifier: WBStoreIdentifier): string {
    switch (storeIdentifier) {
        case WBStoreIdentifier.POVAR_NA_RAYONE:
            return 'Povar';
        case WBStoreIdentifier.LEESHOP:
            return 'LeeShop';
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
 * Подготавливает директорию для сохранения файлов
 * Создает директорию data/output, если её нет
 * @returns Путь к директории output
 */
export function prepareOutputDir(): string {
    const projectRoot = process.cwd();
    const outputDir = path.join(projectRoot, 'data', 'output');

    // Создаем директорию, если её нет
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    return outputDir;
}

/**
 * Создает отчет по Key Metrics (статистика продаж)
 * @param products - Массив товаров из WB Analytics API
 * @param date - Дата периода в формате YYYY-MM-DD
 * @param outputDir - Директория для сохранения файла
 * @param storeIdentifier - Идентификатор магазина WB
 */
export function createKeyMetricsReport(
    products: SalesFunnelProduct[],
    date: string,
    outputDir: string,
    storeIdentifier: WBStoreIdentifier
): void {
    logger.info('📊 Создание отчета Key Metrics...');

    // Адаптируем данные для CSV (получаем массивы, готовые для записи)
    const storeDisplayName = getStoreDisplayName(storeIdentifier);
    const keyMetricsArrays = adaptSalesFunnelToKeyMetricsCSV(products, storeDisplayName);

    // Получаем короткое название магазина для имени файла
    const storeShortName = getStoreShortName(storeIdentifier);

    // Определяем путь к файлу (с коротким названием магазина через точку)
    const filePath = path.join(outputDir, `wb-key-metrics-${date}.${storeShortName}.csv`);

    // Записываем CSV файл (дописываем в конец, если файл существует)
    writeCsvFile(filePath, WB_KEY_METRICS_HEADERS, keyMetricsArrays, WriteMode.APPEND);
    logger.info(`✅ Key Metrics записаны: ${filePath} (${keyMetricsArrays.length} строк)`);
}

/**
 * Создает отчет по Stocks (остатки)
 * @param products - Массив товаров из WB Analytics API
 * @param outputDir - Директория для сохранения файла
 * @param storeIdentifier - Идентификатор магазина WB
 */
export function createStocksReport(
    products: SalesFunnelProduct[],
    outputDir: string,
    storeIdentifier: WBStoreIdentifier
): void {
    logger.info('📦 Создание отчета Stocks...');

    // Получаем дату выполнения функции (момент получения данных)
    const runDate = getCurrentDate();

    // Адаптируем данные для CSV (получаем массивы, готовые для записи)
    const storeDisplayName = getStoreDisplayName(storeIdentifier);
    const stocksArrays = adaptSalesFunnelToStocksCSV(products, runDate, storeDisplayName);

    // Получаем короткое название магазина для имени файла
    const storeShortName = getStoreShortName(storeIdentifier);

    // Определяем путь к файлу (с коротким названием магазина через точку)
    const filePath = path.join(outputDir, `wb-stocks-${runDate}.${storeShortName}.csv`);

    // Записываем CSV файл (перезаписываем полностью)
    writeCsvFile(filePath, WB_STOCKS_HEADERS, stocksArrays, WriteMode.OVERWRITE);
    logger.info(`✅ Stocks записаны: ${filePath} (${stocksArrays.length} строк)`);
}
