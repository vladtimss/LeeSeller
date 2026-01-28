import {
    SalesFunnelProduct,
    WBSalesRow,
} from '../types';
import { salesRowToArray } from './helpers';

/**
 * Извлекает все поля для Key Metrics из одного товара
 * Извлекает только statistic.selected (без past и comparison)
 * Распаковывает все вложенные объекты в плоские поля
 * @param item - Товар из WB Analytics API
 * @param storeName - Человекочитаемое название магазина (например, 'Povar', 'LeeShop')
 * @returns Объект с извлеченными полями для таблицы "Статистика"
 */
function extractKeyMetricsFields(item: SalesFunnelProduct, storeName: string): WBSalesRow {
    const { product, statistic } = item;
    const { selected } = statistic;
    const { timeToReady, wbClub, conversions } = selected;

    return {
        // Магазин (добавляем отдельной колонкой)
        storeName,
        // Базовые поля товара
        nmId: product.nmId,
        title: product.title,
        vendorCode: product.vendorCode,
        brandName: product.brandName,
        productRating: product.productRating,
        feedbackRating: product.feedbackRating,
        // Дата периода (selected.period.start, так как start = end)
        date: selected.period.start,
        // Поля из statistic.selected (плоские)
        openCount: selected.openCount,
        cartCount: selected.cartCount,
        orderCount: selected.orderCount,
        orderSum: selected.orderSum,
        buyoutCount: selected.buyoutCount,
        buyoutSum: selected.buyoutSum,
        cancelCount: selected.cancelCount,
        cancelSum: selected.cancelSum,
        avgPrice: selected.avgPrice,
        avgOrdersCountPerDay: selected.avgOrdersCountPerDay,
        shareOrderPercent: selected.shareOrderPercent,
        addToWishlist: selected.addToWishlist,
        // timeToReady распакован
        timeToReadyDays: timeToReady.days,
        timeToReadyHours: timeToReady.hours,
        timeToReadyMins: timeToReady.mins,
        localizationPercent: selected.localizationPercent,
        // wbClub распакован
        wbClubOrderCount: wbClub.orderCount,
        wbClubOrderSum: wbClub.orderSum,
        wbClubBuyoutSum: wbClub.buyoutSum,
        wbClubBuyoutCount: wbClub.buyoutCount,
        wbClubCancelSum: wbClub.cancelSum,
        wbClubCancelCount: wbClub.cancelCount,
        wbClubAvgPrice: wbClub.avgPrice,
        wbClubBuyoutPercent: wbClub.buyoutPercent,
        wbClubAvgOrderCountPerDay: wbClub.avgOrderCountPerDay,
        // conversions распакованы
        addToCartPercent: conversions.addToCartPercent,
        cartToOrderPercent: conversions.cartToOrderPercent,
        buyoutPercent: conversions.buyoutPercent,
    };
}

/**
 * Преобразует данные воронки продаж WB в формат для CSV таблицы "Статистика" (Key Metrics)
 * Возвращает массивы значений, готовые для записи в CSV без дополнительных преобразований
 * @param products - Массив товаров из WB Analytics API
 * @param storeName - Человекочитаемое название магазина (например, 'Povar', 'LeeShop')
 * @returns Массив массивов значений для CSV (каждая строка - массив значений)
 */
export function adaptSalesFunnelToKeyMetricsCSV(
    products: SalesFunnelProduct[],
    storeName: string
): (string | number | null | undefined)[][] {
    return products.map((item) => {
        const row = extractKeyMetricsFields(item, storeName);
        return salesRowToArray(row);
    });
}
