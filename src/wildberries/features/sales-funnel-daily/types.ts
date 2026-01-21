/**
 * Типы для фичи Sales Funnel Daily
 * API: https://dev.wildberries.ru/openapi/analytics/#tag/Voronka-prodazh/operation/postSalesFunnelProducts
 */

// ============================================================================
// Типы для запроса к WB API
// ============================================================================

/**
 * Период для запроса статистики
 */
export interface SalesFunnelPeriod {
    /** Дата начала периода в формате YYYY-MM-DD */
    start: string;
    /** Дата конца периода в формате YYYY-MM-DD */
    end: string;
}

/**
 * Параметры сортировки
 */
export interface OrderBy {
    /** Поле для сортировки (например, 'openCard', 'addToCart', 'orders') */
    field: string;
    /** Режим сортировки: 'asc' или 'desc' */
    mode: 'asc' | 'desc';
}

/**
 * Запрос статистики карточек товаров за период
 */
export interface SalesFunnelProductsRequest {
    /** Запрашиваемый период */
    selectedPeriod: SalesFunnelPeriod;
    /** Период для сравнения (опционально) */
    pastPeriod?: SalesFunnelPeriod;
    /** Артикулы WB, по которым нужно составить отчёт. Пустой массив = все товары */
    nmIds?: number[];
    /** Список брендов для фильтрации */
    brandNames?: string[];
    /** Список ID предметов для фильтрации */
    subjectIds?: number[];
    /** Список ID ярлыков для фильтрации */
    tagIds?: number[];
    /** Скрыть удалённые карточки товаров */
    skipDeletedNm?: boolean;
    /** Параметры сортировки */
    orderBy?: OrderBy;
    /** Количество карточек товара в ответе (максимум 1000, по умолчанию 50) */
    limit?: number;
    /** Сколько элементов пропустить (для пагинации) */
    offset?: number;
}

// ============================================================================
// Типы для ответа от WB API
// ============================================================================

/**
 * Остатки товара
 */
export interface Stocks {
    /** Остаток на складе WB */
    wb: number;
    /** Остаток на складе маркетплейса */
    mp: number;
    /** Сумма остатков */
    balanceSum: number;
}

/**
 * Информация о товаре
 */
export interface Product {
    /** Артикул WB */
    nmId: number;
    /** Название карточки товара */
    title: string;
    /** Артикул продавца */
    vendorCode: string;
    /** Название бренда */
    brandName: string;
    /** ID предмета */
    subjectId: number;
    /** Название предмета */
    subjectName: string;
    /** Теги товара */
    tags: unknown[];
    /** Оценка карточки */
    productRating: number;
    /** Оценка пользователей */
    feedbackRating: number;
    /** Остатки товара */
    stocks: Stocks;
}

/**
 * Время до готовности
 */
export interface TimeToReady {
    /** Дни */
    days: number;
    /** Часы */
    hours: number;
    /** Минуты */
    mins: number;
}

/**
 * Статистика по WB Club
 */
export interface WbClub {
    /** Количество заказов */
    orderCount: number;
    /** Сумма заказов */
    orderSum: number;
    /** Сумма выкупов */
    buyoutSum: number;
    /** Количество выкупов */
    buyoutCount: number;
    /** Сумма отмен */
    cancelSum: number;
    /** Количество отмен */
    cancelCount: number;
    /** Средняя цена */
    avgPrice: number;
    /** Процент выкупа */
    buyoutPercent: number;
    /** Среднее количество заказов в день */
    avgOrderCountPerDay: number;
}

/**
 * Конверсии
 */
export interface Conversions {
    /** Процент добавлений в корзину */
    addToCartPercent: number;
    /** Процент конверсии из корзины в заказ */
    cartToOrderPercent: number;
    /** Процент выкупа */
    buyoutPercent: number;
}

/**
 * Статистика за выбранный период (только selected, без past и comparison)
 */
export interface StatisticSelected {
    /** Период статистики */
    period: SalesFunnelPeriod;
    /** Количество открытий карточки */
    openCount: number;
    /** Количество добавлений в корзину */
    cartCount: number;
    /** Количество заказов */
    orderCount: number;
    /** Сумма заказов */
    orderSum: number;
    /** Количество выкупов */
    buyoutCount: number;
    /** Сумма выкупов */
    buyoutSum: number;
    /** Количество отмен */
    cancelCount: number;
    /** Сумма отмен */
    cancelSum: number;
    /** Средняя цена */
    avgPrice: number;
    /** Среднее количество заказов в день */
    avgOrdersCountPerDay: number;
    /** Процент доли заказов */
    shareOrderPercent: number;
    /** Количество добавлений в избранное */
    addToWishlist: number;
    /** Время до готовности */
    timeToReady: TimeToReady;
    /** Процент локализации */
    localizationPercent: number;
    /** Статистика по WB Club */
    wbClub: WbClub;
    /** Конверсии */
    conversions: Conversions;
}

/**
 * Полный ответ по товару из WB API
 */
export interface SalesFunnelProduct {
    /** Информация о товаре */
    product: Product;
    /** Статистика (используем только selected) */
    statistic: {
        selected: StatisticSelected;
        // past и comparison не используются в этой фиче
    };
}

/**
 * Структура ответа от WB Analytics API
 */
export interface SalesFunnelProductsResponse {
    data: {
        products: SalesFunnelProduct[];
    };
}

// ============================================================================
// DTO для таблиц (плоские структуры для строк)
// ============================================================================

/**
 * Строка для листа "Статистика"
 * Все поля из statistic.selected распакованы в плоскую структуру
 */
export interface WBSalesRow {
    // Базовые поля товара
    nmId: number;
    title: string;
    vendorCode: string;
    brandName: string;
    productRating: number;
    feedbackRating: number;
    // Дата периода (selected.period.start, так как start = end)
    date: string;
    // Поля из statistic.selected (плоские)
    openCount: number;
    cartCount: number;
    orderCount: number;
    orderSum: number;
    buyoutCount: number;
    buyoutSum: number;
    cancelCount: number;
    cancelSum: number;
    avgPrice: number;
    avgOrdersCountPerDay: number;
    shareOrderPercent: number;
    addToWishlist: number;
    // timeToReady распакован
    timeToReadyDays: number;
    timeToReadyHours: number;
    timeToReadyMins: number;
    localizationPercent: number;
    // wbClub распакован
    wbClubOrderCount: number;
    wbClubOrderSum: number;
    wbClubBuyoutSum: number;
    wbClubBuyoutCount: number;
    wbClubCancelSum: number;
    wbClubCancelCount: number;
    wbClubAvgPrice: number;
    wbClubBuyoutPercent: number;
    wbClubAvgOrderCountPerDay: number;
    // conversions распакованы
    addToCartPercent: number;
    cartToOrderPercent: number;
    buyoutPercent: number;
}

/**
 * Строка для листа "Остатки"
 */
export interface WBStocksRow {
    /** Дата выполнения функции (момент получения данных) */
    runDate: string;
    /** Артикул продавца */
    vendorCode: string;
    /** Остаток на складе WB */
    stocksWb: number;
    /** Остаток на складе маркетплейса */
    stocksMp: number;
    /** Сумма остатков */
    stocksBalanceSum: number;
}
