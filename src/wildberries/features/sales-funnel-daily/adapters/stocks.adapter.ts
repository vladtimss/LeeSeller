import {
    SalesFunnelProduct,
    WBStocksRow,
} from '../types';

/**
 * Извлекает данные об остатках из одного товара (без runDate)
 * @param item - Товар из WB Analytics API
 * @returns Объект с извлеченными данными об остатках (без runDate)
 */
export function extractStocksFields(item: SalesFunnelProduct): Omit<WBStocksRow, 'runDate'> {
    const { product } = item;
    const { stocks } = product;

    return {
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
export function createStocksRow(
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
 * @param products - Массив товаров из WB Analytics API
 * @param runDate - Дата выполнения функции в формате YYYY-MM-DD
 * @returns Массив строк для таблицы "Остатки"
 */
export function adaptSalesFunnelToStocksCSV(
    products: SalesFunnelProduct[],
    runDate: string
): WBStocksRow[] {
    return products.map((item) => {
        const extracted = extractStocksFields(item);
        return createStocksRow(extracted, runDate);
    });
}
