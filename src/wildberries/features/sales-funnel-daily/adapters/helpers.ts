import { WBSalesRow, WBStocksRow } from '../types';

/**
 * Преобразует объект WBSalesRow в массив значений для CSV (в порядке заголовков)
 * @param row - Объект строки данных
 * @returns Массив значений
 */
export function salesRowToArray(row: WBSalesRow): (string | number | null | undefined)[] {
    return [
        row.storeName,
        row.nmId,
        row.title,
        row.vendorCode,
        row.brandName,
        row.productRating,
        row.feedbackRating,
        row.date,
        row.openCount,
        row.cartCount,
        row.orderCount,
        row.orderSum,
        row.buyoutCount,
        row.buyoutSum,
        row.cancelCount,
        row.cancelSum,
        row.avgPrice,
        row.avgOrdersCountPerDay,
        row.shareOrderPercent,
        row.addToWishlist,
        row.timeToReadyDays,
        row.timeToReadyHours,
        row.timeToReadyMins,
        row.localizationPercent,
        row.wbClubOrderCount,
        row.wbClubOrderSum,
        row.wbClubBuyoutSum,
        row.wbClubBuyoutCount,
        row.wbClubCancelSum,
        row.wbClubCancelCount,
        row.wbClubAvgPrice,
        row.wbClubBuyoutPercent,
        row.wbClubAvgOrderCountPerDay,
        row.addToCartPercent,
        row.cartToOrderPercent,
        row.buyoutPercent,
    ];
}

/**
 * Преобразует объект WBStocksRow в массив значений для CSV (в порядке заголовков)
 * @param row - Объект строки данных
 * @returns Массив значений
 */
export function stocksRowToArray(row: WBStocksRow): (string | number | null | undefined)[] {
    return [row.storeName, row.runDate, row.vendorCode, row.stocksWb, row.stocksMp, row.stocksBalanceSum];
}
