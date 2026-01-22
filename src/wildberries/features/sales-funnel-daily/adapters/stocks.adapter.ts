import {
    SalesFunnelProduct,
    WBStocksRow,
} from '../types';

/**
 * Извлекает все поля для Stocks из одного товара
 * Извлекает актуальные остатки на момент запроса
 * @param item - Товар из WB Analytics API
 * @param runDate - Дата выполнения функции (момент получения данных) в формате YYYY-MM-DD
 * @returns Объект с извлеченными полями для таблицы "Остатки"
 */
function extractStocksFields(item: SalesFunnelProduct, runDate: string): WBStocksRow {
    const { product } = item;
    const { stocks } = product;

    return {
        runDate,
        vendorCode: product.vendorCode,
        stocksWb: stocks.wb,
        stocksMp: stocks.mp,
        stocksBalanceSum: stocks.balanceSum,
    };
}

/**
 * Преобразует данные воронки продаж WB в формат для CSV таблицы "Остатки"
 * @param products - Массив товаров из WB Analytics API
 * @param runDate - Дата выполнения функции (момент получения данных) в формате YYYY-MM-DD
 * @returns Массив строк для таблицы "Остатки"
 */
export function adaptSalesFunnelToStocksCSV(
    products: SalesFunnelProduct[],
    runDate: string
): WBStocksRow[] {
    return products.map((item) => extractStocksFields(item, runDate));
}
