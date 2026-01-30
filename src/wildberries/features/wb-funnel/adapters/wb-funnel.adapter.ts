import { SalesFunnelProduct } from '../../sales-funnel-daily/types';
import { formatTags } from '../wb-funnel.helpers';
import { WB_FUNNEL_FIELDS } from './wb-funnel.headers.const';
import { extractMonth, extractYear, getWeekNumber } from '../../../../common/helpers/date-helpers';

/**
 * Преобразует данные воронки продаж WB в формат для CSV файла
 * Использует единый источник правды (WB_FUNNEL_FIELDS) для порядка полей
 * Сразу формирует массив значений в нужном порядке, без промежуточного объекта
 * @param products - Массив товаров из WB Analytics API
 * @returns Массив массивов значений для CSV (каждая строка - массив из 34 значений в порядке WB_FUNNEL_FIELDS)
 */
export function adaptWBFunnelToCSVFormat(products: SalesFunnelProduct[]): (string | number | null)[][] {
    return products.map((item) => {
        const { product, statistic } = item;
        const { selected } = statistic;
        const { period, wbClub, conversions } = selected;
        const date = period.start;

        // Вычисляем год, месяц и неделю из даты
        const year = extractYear(date);
        const month = extractMonth(date);
        const week = getWeekNumber(date);

        // Форматируем ярлыки
        const tagsFormatted = formatTags(product.tags as Array<{ id: number; name: string }>);

        // Формируем массив значений в порядке WB_FUNNEL_FIELDS
        // Используем switch или маппинг по field для извлечения значений
        const getValue = (field: string): string | number | null => {
            switch (field) {
                case 'year': return year;
                case 'month': return month;
                case 'week': return week;
                case 'vendorCode': return product.vendorCode;
                case 'nmId': return product.nmId;
                case 'title': return product.title;
                case 'subjectName': return product.subjectName;
                case 'brandName': return product.brandName;
                case 'tags': return tagsFormatted;
                case 'deletedProduct': return null;
                case 'productRating': return product.productRating;
                case 'feedbackRating': return product.feedbackRating;
                case 'date': return date;
                case 'views': return null;
                case 'ctr': return null;
                case 'openCount': return selected.openCount;
                case 'cartCount': return selected.cartCount;
                case 'addToWishlist': return selected.addToWishlist;
                case 'orderCount': return selected.orderCount;
                case 'wbClubOrderCount': return wbClub.orderCount;
                case 'buyoutCount': return selected.buyoutCount;
                case 'wbClubBuyoutCount': return wbClub.buyoutCount;
                case 'cancelCount': return selected.cancelCount;
                case 'wbClubCancelCount': return wbClub.cancelCount;
                case 'addToCartPercent': return conversions.addToCartPercent;
                case 'cartToOrderPercent': return conversions.cartToOrderPercent;
                case 'buyoutPercent': return conversions.buyoutPercent;
                case 'wbClubBuyoutPercent': return wbClub.buyoutPercent;
                case 'orderSum': return selected.orderSum;
                case 'wbClubOrderSum': return wbClub.orderSum;
                case 'buyoutSum': return selected.buyoutSum;
                case 'wbClubBuyoutSum': return wbClub.buyoutSum;
                case 'cancelSum': return selected.cancelSum;
                case 'wbClubCancelSum': return wbClub.cancelSum;
                default: return null;
            }
        };

        // Извлекаем значения в порядке, определенном в WB_FUNNEL_FIELDS
        return WB_FUNNEL_FIELDS.map((fieldItem) => getValue(fieldItem.field));
    });
}
