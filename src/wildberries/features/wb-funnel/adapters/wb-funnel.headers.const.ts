/**
 * Структура данных для CSV файла воронки продаж WB
 * Единый источник правды для порядка полей и заголовков
 */

/**
 * Поля CSV строки воронки продаж
 */
export interface WBFunnelCSVRow {
    year: number;
    month: number;
    week: number;
    vendorCode: string;
    nmId: number;
    title: string;
    subjectName: string;
    brandName: string;
    tags: string;
    deletedProduct: null;
    productRating: number;
    feedbackRating: number;
    date: string;
    views: null;
    ctr: null;
    openCount: number;
    cartCount: number;
    addToWishlist: number;
    orderCount: number;
    wbClubOrderCount: number;
    buyoutCount: number;
    wbClubBuyoutCount: number;
    cancelCount: number;
    wbClubCancelCount: number;
    addToCartPercent: number;
    cartToOrderPercent: number;
    buyoutPercent: number;
    wbClubBuyoutPercent: number;
    orderSum: number;
    wbClubOrderSum: number;
    buyoutSum: number;
    wbClubBuyoutSum: number;
    cancelSum: number;
    wbClubCancelSum: number;
}

/**
 * Массив полей и заголовков в нужном порядке
 * Единый источник правды для адаптера и генерации заголовков
 */
export const WB_FUNNEL_FIELDS: Array<{ field: keyof WBFunnelCSVRow; header: string }> = [
    { field: 'year', header: 'Год' },
    { field: 'month', header: 'Мес' },
    { field: 'week', header: 'Неделя' },
    { field: 'vendorCode', header: 'Артикул продавца' },
    { field: 'nmId', header: 'Артикул WB' },
    { field: 'title', header: 'Название' },
    { field: 'subjectName', header: 'Предмет' },
    { field: 'brandName', header: 'Бренд' },
    { field: 'tags', header: 'Ярлыки' },
    { field: 'deletedProduct', header: 'Удаленный товар' },
    { field: 'productRating', header: 'Рейтинг карточки' },
    { field: 'feedbackRating', header: 'Рейтинг по отзывам' },
    { field: 'date', header: 'Дата' },
    { field: 'views', header: 'Показы' },
    { field: 'ctr', header: 'CTR' },
    { field: 'openCount', header: 'Переходы в карточку' },
    { field: 'cartCount', header: 'Положили в корзину' },
    { field: 'addToWishlist', header: 'Добавили в отложенные' },
    { field: 'orderCount', header: 'Заказали, шт' },
    { field: 'wbClubOrderCount', header: 'Заказали ВБ клуб, шт' },
    { field: 'buyoutCount', header: 'Выкупили, шт' },
    { field: 'wbClubBuyoutCount', header: 'Выкупили ВБ клуб, шт' },
    { field: 'cancelCount', header: 'Отменили, шт' },
    { field: 'wbClubCancelCount', header: 'Отменили ВБ клуб, шт' },
    { field: 'addToCartPercent', header: 'Конверсия в корзину, %' },
    { field: 'cartToOrderPercent', header: 'Конверсия в заказ, %' },
    { field: 'buyoutPercent', header: 'Процент выкупа' },
    { field: 'wbClubBuyoutPercent', header: 'Процент выкупа ВБ клуб' },
    { field: 'orderSum', header: 'Заказали на сумму, ₽' },
    { field: 'wbClubOrderSum', header: 'Заказали на сумму ВБ клуб, ₽' },
    { field: 'buyoutSum', header: 'Выкупили на сумму, ₽' },
    { field: 'wbClubBuyoutSum', header: 'Выкупили на сумму ВБ клуб, ₽' },
    { field: 'cancelSum', header: 'Отменили на сумму, ₽' },
    { field: 'wbClubCancelSum', header: 'Отменили на сумму ВБ клуб, ₽' },
];

/**
 * Заголовки колонок для CSV файла (генерируются из WB_FUNNEL_FIELDS)
 */
export const WB_FUNNEL_HEADERS: string[] = WB_FUNNEL_FIELDS.map((item) => item.header);
