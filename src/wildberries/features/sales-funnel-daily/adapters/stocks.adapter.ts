import {
    SalesFunnelProduct,
    WBStocksRow,
} from '../types';
import { stocksRowToArray } from './helpers';

/**
 * Извлекает данные об остатках из одного товара (без runDate)
 * @param item - Товар из WB Analytics API
 * @param storeName - Человекочитаемое название магазина (например, 'Povar', 'LeeShop')
 * @returns Объект с извлеченными данными об остатках (без runDate)
 */
function extractStocksFields(item: SalesFunnelProduct, storeName: string): Omit<WBStocksRow, 'runDate'> {
    const { product } = item;
    const { stocks } = product;

    return {
        storeName,
        vendorCode: product.vendorCode,
        stocksWb: stocks.wb,
        stocksMp: stocks.mp,
        stocksBalanceSum: stocks.balanceSum,
    };
}

/**
 * Создает полный объект WBStocksRow из извлеченных данных и даты выполнения
 * @param extractedData - Извлеченные данные об остатках (без runDate)
 * @param runDate - Дата выполнения функции (момент получения данных) в формате YYYY-MM-DD
 * @returns Полный объект WBStocksRow
 */
function createStocksRow(
    extractedData: Omit<WBStocksRow, 'runDate'>,
    runDate: string
): WBStocksRow {
    return {
        ...extractedData,
        runDate,
    };
}

/**
 * Преобразует данные воронки продаж WB в формат для CSV таблицы "Остатки"
 * Возвращает массивы значений, готовые для записи в CSV без дополнительных преобразований
 * @param products - Массив товаров из WB Analytics API
 * @param runDate - Дата выполнения функции в формате YYYY-MM-DD
 * @param storeName - Человекочитаемое название магазина (например, 'Povar', 'LeeShop')
 * @returns Массив массивов значений для CSV (каждая строка - массив значений)
 */
export function adaptSalesFunnelToStocksCSV(
    products: SalesFunnelProduct[],
    runDate: string,
    storeName: string
): (string | number | null | undefined)[][] {
    return products.map((item) => {
        const extracted = extractStocksFields(item, storeName);
        const row = createStocksRow(extracted, runDate);
        return stocksRowToArray(row);
    });
}
