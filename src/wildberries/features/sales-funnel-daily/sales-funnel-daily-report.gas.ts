/**
 * Google Apps Script-версия фичи `salesFunnelDailyReportWBStore`.
 *
 * ИДЕЯ:
 * - Получаем данные из WB Analytics API по воронке продаж за вчерашний день.
 * - Конвертируем их в два набора строк:
 *   - Key Metrics (статистика продаж по карточкам).
 *   - Stocks (остатки по складам).
 * - Записываем данные в Google Sheets (в активную таблицу).
 *
 * ОТЛИЧИЯ ОТ Node-версии:
 * - НЕТ работы с файловой системой (`fs`, `path`, `process.cwd()`).
 * - НЕТ .env — токены берём из Script Properties.
 * - ВМЕСТО `node-fetch` / `makeApiRequest` используется `UrlFetchApp`.
 * - ВМЕСТО `logger` используется `Logger`.
 *
 * КАК ИСПОЛЬЗОВАТЬ В GOOGLE APPS SCRIPT:
 * 1. Создай проект Apps Script, подключенный к нужной Google-таблице.
 * 2. В Script Properties добавь токены (см. функцию `getWBStoreTokenFromScriptProperties` ниже).
 * 3. Вставь содержимое этого файла в редактор (или добавь через clasp / bundler).
 * 4. Запускай функцию `salesFunnelDailyReportWBStoreGas` с нужным `storeIdentifierRaw`.
 */

// =============================================================================
// Минимальные декларации типов/глобалов GAS, чтобы файл компилился в обычном TS
// (в самом Google Apps Script эти объявления игнорируются, т.к. там уже есть окружение).
// =============================================================================

/**
 * Минимальные типы для работы с UrlFetchApp и SpreadsheetApp.
 * Они не претендуют на полноту, а только описывают то, что реально используется ниже.
 */
declare namespace GoogleAppsScript {
    namespace URL_Fetch {
        interface URLFetchRequestOptions {
            method?: string;
            contentType?: string;
            headers?: Record<string, string>;
            payload?: string;
            muteHttpExceptions?: boolean;
        }

        interface HTTPResponse {
            getResponseCode(): number;
            getContentText(): string;
        }
    }

    namespace Spreadsheet {
        interface Range {
            setValues(values: (string | number)[][]): Range;
            clearContent(): Range;
        }

        interface Sheet {
            getName(): string;
            getLastRow(): number;
            getRange(row: number, column: number, numRows?: number, numColumns?: number): Range;
            clearContents(): Sheet;
        }

        interface Spreadsheet {
            getSheetByName(name: string): Sheet | null;
            insertSheet(name: string): Sheet;
        }
    }
}

/**
 * Глобалы из Google Apps Script, которые используются в этом файле.
 * В среде Apps Script они уже существуют, здесь мы просто даём TS-типизацию.
 */
declare const UrlFetchApp: {
    fetch(
        url: string,
        params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions,
    ): GoogleAppsScript.URL_Fetch.HTTPResponse;
};

declare const SpreadsheetApp: {
    getActiveSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet;
};

declare const Logger: {
    log(message: string, ...values: unknown[]): void;
};

declare const PropertiesService: {
    getScriptProperties(): {
        getProperty(key: string): string | null;
    };
};

// =============================================================================
// Типы, аналогичные `src/wildberries/features/sales-funnel-daily/types.ts`
// (скопированы и упрощены, чтобы файл был полностью автономным).
// =============================================================================

/**
 * Период для запроса статистики.
 */
interface SalesFunnelPeriod {
    /** Дата начала периода в формате YYYY-MM-DD */
    start: string;
    /** Дата конца периода в формате YYYY-MM-DD */
    end: string;
}

/**
 * Параметры сортировки.
 */
interface OrderBy {
    /** Поле для сортировки (например, 'openCard', 'addToCart', 'orders') */
    field: string;
    /** Режим сортировки: 'asc' или 'desc' */
    mode: 'asc' | 'desc';
}

/**
 * Запрос статистики карточек товаров за период.
 */
interface SalesFunnelProductsRequest {
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

/**
 * Остатки товара.
 */
interface Stocks {
    /** Остаток на складе WB */
    wb: number;
    /** Остаток на складе маркетплейса */
    mp: number;
    /** Сумма остатков */
    balanceSum: number;
}

/**
 * Информация о товаре.
 */
interface Product {
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
    /** Теги товара (в этой фиче не используются, оставляем как unknown[]) */
    tags: unknown[];
    /** Оценка карточки */
    productRating: number;
    /** Оценка пользователей */
    feedbackRating: number;
    /** Остатки товара */
    stocks: Stocks;
}

/**
 * Время до готовности.
 */
interface TimeToReady {
    /** Дни */
    days: number;
    /** Часы */
    hours: number;
    /** Минуты */
    mins: number;
}

/**
 * Статистика по WB Club.
 */
interface WbClub {
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
 * Конверсии.
 */
interface Conversions {
    /** Процент добавлений в корзину */
    addToCartPercent: number;
    /** Процент конверсии из корзины в заказ */
    cartToOrderPercent: number;
    /** Процент выкупа */
    buyoutPercent: number;
}

/**
 * Статистика за выбранный период (только selected, без past и comparison).
 */
interface StatisticSelected {
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
 * Полный ответ по товару из WB API.
 */
interface SalesFunnelProduct {
    /** Информация о товаре */
    product: Product;
    /** Статистика (используем только selected) */
    statistic: {
        selected: StatisticSelected;
    };
}

/**
 * Структура ответа от WB Analytics API.
 */
interface SalesFunnelProductsResponse {
    data: {
        products: SalesFunnelProduct[];
    };
}

/**
 * Строка для таблицы "Статистика" (Key Metrics).
 * Порядок полей соответствует `WB_KEY_METRICS_HEADERS`.
 */
interface WBSalesRow {
    /** Человекочитаемое название магазина (например, 'Povar', 'LeeShop') */
    storeName: string;
    // Базовые поля товара
    nmId: number;
    title: string;
    vendorCode: string;
    brandName: string;
    productRating: number;
    feedbackRating: number;
    // Дата периода
    date: string;
    // Плоские поля статистики
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
    // timeToReady
    timeToReadyDays: number;
    timeToReadyHours: number;
    timeToReadyMins: number;
    localizationPercent: number;
    // wbClub
    wbClubOrderCount: number;
    wbClubOrderSum: number;
    wbClubBuyoutSum: number;
    wbClubBuyoutCount: number;
    wbClubCancelSum: number;
    wbClubCancelCount: number;
    wbClubAvgPrice: number;
    wbClubBuyoutPercent: number;
    wbClubAvgOrderCountPerDay: number;
    // conversions
    addToCartPercent: number;
    cartToOrderPercent: number;
    buyoutPercent: number;
}

/**
 * Строка для таблицы "Остатки" (Stocks).
 * Порядок полей соответствует `WB_STOCKS_HEADERS`.
 */
interface WBStocksRow {
    /** Человекочитаемое название магазина (например, 'Povar', 'LeeShop') */
    storeName: string;
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

// =============================================================================
// Enum и константы для магазинов WB (упрощённая версия из проекта).
// =============================================================================

/**
 * Идентификатор магазина WB.
 * Значения должны совпадать с тем, как ты будешь их передавать в GAS.
 */
enum WBStoreIdentifier {
    POVAR_NA_RAYONE = 'POVAR_NA_RAYONE',
    LEESHOP = 'LEESHOP',
}

/**
 * Преобразует идентификатор магазина в короткое имя (для названий листов).
 */
function getStoreShortNameForGas(storeIdentifier: WBStoreIdentifier): string {
    switch (storeIdentifier) {
        case WBStoreIdentifier.POVAR_NA_RAYONE:
            return 'povar';
        case WBStoreIdentifier.LEESHOP:
            return 'leeshop';
        default:
            // fallback — просто вернуть строковое значение enum
            return storeIdentifier;
    }
}

/**
 * Преобразует идентификатор магазина в человекочитаемое имя для отчётов в GAS
 * (первая колонка "Магазин" в листах funnel/stock).
 */
function getStoreDisplayNameForGas(storeIdentifier: WBStoreIdentifier): string {
    switch (storeIdentifier) {
        case WBStoreIdentifier.POVAR_NA_RAYONE:
            return 'Povar';
        case WBStoreIdentifier.LEESHOP:
            return 'LeeShop';
        default:
            return storeIdentifier;
    }
}

// =============================================================================
// Константы заголовков (аналог `csv-headers.const.ts`)
// =============================================================================

/**
 * Заголовки колонок для листа "Статистика" (Key Metrics).
 * Порядок соответствует полям интерфейса `WBSalesRow`.
 */
const WB_KEY_METRICS_HEADERS_GAS: string[] = [
    'Магазин',
    'Артикул WB',
    'Название карточки товара',
    'Артикул продавца',
    'Бренд',
    'Оценка карточки',
    'Оценка пользователей',
    'Дата',
    'Открытий карточки',
    'Добавлений в корзину',
    'Заказов',
    'Сумма заказов',
    'Выкупов',
    'Сумма выкупов',
    'Отмен',
    'Сумма отмен',
    'Средняя цена',
    'Среднее количество заказов в день',
    'Процент доли заказов',
    'Добавлений в избранное',
    'Время до готовности (дни)',
    'Время до готовности (часы)',
    'Время до готовности (минуты)',
    'Процент локализации',
    'WB Club: Заказов',
    'WB Club: Сумма заказов',
    'WB Club: Сумма выкупов',
    'WB Club: Выкупов',
    'WB Club: Сумма отмен',
    'WB Club: Отмен',
    'WB Club: Средняя цена',
    'WB Club: Процент выкупа',
    'WB Club: Среднее количество заказов в день',
    'Конверсия: Добавлений в корзину (%)',
    'Конверсия: Из корзины в заказ (%)',
    'Конверсия: Выкупа (%)',
];

/**
 * Заголовки колонок для листа "Остатки" (Stocks).
 * Порядок соответствует полям интерфейса `WBStocksRow`.
 */
const WB_STOCKS_HEADERS_GAS: string[] = [
    'Магазин',
    'Дата',
    'Артикул продавца',
    'Остаток WB',
    'Остаток MP',
    'Сумма остатков',
];

// =============================================================================
// Утилиты для дат (без зависимости от `date-helpers.ts`)
// =============================================================================

/**
 * Возвращает дату вчерашнего дня в формате YYYY-MM-DD (локальное время).
 * Аналог `getYesterdayDate` из проекта, но без зависимости от Node.
 */
function getYesterdayDateIso(): string {
    const now = new Date();
    // Вычитаем 1 день
    now.setDate(now.getDate() - 1);
    return formatDateToIso(now);
}

/**
 * Возвращает сегодняшнюю дату в формате YYYY-MM-DD (локальное время).
 * Аналог `getCurrentDate` из проекта.
 */
function getCurrentDateIso(): string {
    const now = new Date();
    return formatDateToIso(now);
}

/**
 * Форматирует JS Date в строку формата YYYY-MM-DD.
 */
function formatDateToIso(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// =============================================================================
// Работа с Script Properties (хранилище токенов WB в Apps Script).
// =============================================================================

/**
 * Универсальный хелпер: достаёт значение из Script Properties или кидает ошибку.
 * Это аналог `process.env[...]` + проверка на наличие.
 */
function getScriptPropertyOrThrow(propertyKey: string): string {
    const scriptProperties = PropertiesService.getScriptProperties();
    const value = scriptProperties.getProperty(propertyKey);

    if (!value) {
        throw new Error(`Script Property не найден: ${propertyKey}`);
    }

    return value;
}

/**
 * Преобразует идентификатор магазина в ключ Script Property, где хранится токен.
 * Значения должны совпадать с тем, как ты создашь Properties в Apps Script UI.
 *
 * Примеры:
 * - WB_POVAR_NA_RAYONE_TOKEN
 * - WB_LEESHOP_TOKEN
 */
function getStoreScriptPropertyKey(storeIdentifier: WBStoreIdentifier): string {
    switch (storeIdentifier) {
        case WBStoreIdentifier.POVAR_NA_RAYONE:
            return 'WB_POVAR_NA_RAYONE_TOKEN';
        case WBStoreIdentifier.LEESHOP:
            return 'WB_LEESHOP_TOKEN';
        default:
            throw new Error(`Неизвестный идентификатор магазина (Script Properties): ${storeIdentifier}`);
    }
}

/**
 * Извлекает токен WB из Script Properties по идентификатору магазина.
 * Это GAS-аналог `getWBStoreToken` из Node-версии.
 */
function getWBStoreTokenFromScriptProperties(storeIdentifier: WBStoreIdentifier): string {
    const propertyKey = getStoreScriptPropertyKey(storeIdentifier);
    return getScriptPropertyOrThrow(propertyKey);
}

// =============================================================================
// HTTP-утилита для работы с WB Analytics API на базе UrlFetchApp.
// =============================================================================

/**
 * Конфигурация для API запроса (аналог `ApiRequestConfig`).
 */
interface ApiRequestConfigGas {
    /** Базовый URL API (например, 'https://seller-analytics-api.wildberries.ru') */
    baseUrl: string;
    /** Префикс для логирования (например, 'wb-analytics-api') */
    logPrefix: string;
    /** Заголовки авторизации */
    authHeaders: Record<string, string>;
}

/**
 * Универсальный запрос к WB Analytics API через UrlFetchApp.
 * Это упрощённый аналог `makeApiRequest` из Node-версии.
 *
 * ВАЖНО:
 * - Работает синхронно (как и UrlFetchApp в GAS).
 * - Бросает ошибки при неуспешных HTTP статусах.
 */
function makeApiRequestGas<T>(
    config: ApiRequestConfigGas,
    path: string,
    init: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {},
): T {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${config.baseUrl}${normalizedPath}`;

    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...config.authHeaders,
        ...(init.headers ?? {}),
    };

    let payload: string | undefined;

    if (typeof init.payload === 'string') {
        // Если уже строка — используем как есть
        payload = init.payload;
    } else if (init.payload !== undefined) {
        // Если что-то другое — сериализуем в JSON
        payload = JSON.stringify(init.payload);
    }

    if (payload && !headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
    }

    Logger.log('[%s] Запрос к %s', config.logPrefix, url);

    const response = UrlFetchApp.fetch(url, {
        ...init,
        headers,
        payload,
        muteHttpExceptions: true,
    });

    const statusCode = response.getResponseCode();
    const text = response.getContentText();

    let data: T;
    try {
        data = text ? (JSON.parse(text) as T) : (text as unknown as T);
    } catch (_error) {
        data = text as unknown as T;
    }

    if (statusCode < 200 || statusCode >= 300) {
        const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);

        if (statusCode === 401) {
            Logger.log('[%s] 401 Unauthorized - проверь токен для: %s', config.logPrefix, path);
        } else if (statusCode === 403) {
            Logger.log('[%s] 403 Forbidden - нет доступа к: %s', config.logPrefix, path);
        } else {
            Logger.log('[%s] Ошибка ответа: статус=%s, body=%s', config.logPrefix, statusCode, bodyStr);
        }

        throw new Error(`${config.logPrefix} API error ${statusCode}: ${bodyStr}`);
    }

    return data;
}

/**
 * Базовый URL для Wildberries Seller Analytics API.
 * То же самое значение, что и в Node-версии (`WB_ANALYTICS_API_BASE_URL`).
 */
const WB_ANALYTICS_API_BASE_URL_GAS = 'https://seller-analytics-api.wildberries.ru';

/**
 * Создаёт конфигурацию для WB Analytics API с токеном (GAS-версия).
 */
function getWBAnalyticsConfigGas(token: string): ApiRequestConfigGas {
    return {
        baseUrl: WB_ANALYTICS_API_BASE_URL_GAS,
        logPrefix: 'wb-analytics-api-gas',
        authHeaders: {
            Authorization: token,
        },
    };
}

/**
 * Получает статистику карточек товаров за период из WB Analytics API (GAS-версия).
 * Аналог `getWBSalesFunnelProducts` из Node-версии.
 */
function getWBSalesFunnelProductsGas(token: string, request: SalesFunnelProductsRequest): SalesFunnelProduct[] {
    const config = getWBAnalyticsConfigGas(token);
    const path = '/api/analytics/v3/sales-funnel/products';

    const response = makeApiRequestGas<SalesFunnelProductsResponse>(config, path, {
        method: 'post',
        payload: JSON.stringify(request),
    });

    return response.data.products;
}

// =============================================================================
// Адаптеры данных (аналог `key-metrics.adapter.ts` и `stocks.adapter.ts` + helpers).
// =============================================================================

/**
 * Преобразует объект WBSalesRow в массив значений для таблицы (в порядке заголовков).
 */
function salesRowToArrayGas(row: WBSalesRow): (string | number | null)[] {
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
 * Преобразует объект WBStocksRow в массив значений для таблицы (в порядке заголовков).
 */
function stocksRowToArrayGas(row: WBStocksRow): (string | number | null)[] {
    return [row.storeName, row.runDate, row.vendorCode, row.stocksWb, row.stocksMp, row.stocksBalanceSum];
}

/**
 * Извлекает все поля для Key Metrics из одного товара.
 * Используем только `statistic.selected`.
 */
function extractKeyMetricsFieldsGas(item: SalesFunnelProduct, storeName: string): WBSalesRow {
    const { product, statistic } = item;
    const { selected } = statistic;
    const { timeToReady, wbClub, conversions } = selected;

    return {
        storeName,
        nmId: product.nmId,
        title: product.title,
        vendorCode: product.vendorCode,
        brandName: product.brandName,
        productRating: product.productRating,
        feedbackRating: product.feedbackRating,
        date: selected.period.start,
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
        timeToReadyDays: timeToReady.days,
        timeToReadyHours: timeToReady.hours,
        timeToReadyMins: timeToReady.mins,
        localizationPercent: selected.localizationPercent,
        wbClubOrderCount: wbClub.orderCount,
        wbClubOrderSum: wbClub.orderSum,
        wbClubBuyoutSum: wbClub.buyoutSum,
        wbClubBuyoutCount: wbClub.buyoutCount,
        wbClubCancelSum: wbClub.cancelSum,
        wbClubCancelCount: wbClub.cancelCount,
        wbClubAvgPrice: wbClub.avgPrice,
        wbClubBuyoutPercent: wbClub.buyoutPercent,
        wbClubAvgOrderCountPerDay: wbClub.avgOrderCountPerDay,
        addToCartPercent: conversions.addToCartPercent,
        cartToOrderPercent: conversions.cartToOrderPercent,
        buyoutPercent: conversions.buyoutPercent,
    };
}

/**
 * Преобразует данные воронки продаж WB в формат для таблицы "Статистика".
 * Возвращает массивы значений, готовые для записи в Google Sheets.
 */
function adaptSalesFunnelToKeyMetricsArraysGas(
    products: SalesFunnelProduct[],
    storeName: string,
): (string | number | null)[][] {
    return products.map((item) => {
        const row = extractKeyMetricsFieldsGas(item, storeName);
        return salesRowToArrayGas(row);
    });
}

/**
 * Извлекает данные об остатках из одного товара (без runDate).
 */
function extractStocksFieldsGas(item: SalesFunnelProduct, storeName: string): Omit<WBStocksRow, 'runDate'> {
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
 * Создаёт полный объект WBStocksRow из извлечённых данных и даты выполнения.
 */
function createStocksRowGas(extractedData: Omit<WBStocksRow, 'runDate'>, runDate: string): WBStocksRow {
    return {
        ...extractedData,
        runDate,
    };
}

/**
 * Преобразует данные воронки продаж WB в формат для таблицы "Остатки".
 * Возвращает массивы значений, готовые для записи в Google Sheets.
 */
function adaptSalesFunnelToStocksArraysGas(
    products: SalesFunnelProduct[],
    runDate: string,
    storeName: string,
): (string | number | null)[][] {
    return products.map((item) => {
        const extracted = extractStocksFieldsGas(item, storeName);
        const row = createStocksRowGas(extracted, runDate);
        return stocksRowToArrayGas(row);
    });
}

// =============================================================================
// Работа с Google Sheets: получение/создание листов и запись данных.
// =============================================================================

/**
 * Нормализует значение для записи в Google Sheets:
 * - null и undefined превращает в пустую строку,
 * - числа и строки оставляет как есть.
 */
function normalizeValueForSheet(value: string | number | null | undefined): string | number {
    if (value === null || value === undefined) {
        return '';
    }
    return value;
}

/**
 * Преобразует массив строк данных к формату, который понимает `Range.setValues`.
 */
function normalizeRowsForSheet(rows: (string | number | null | undefined)[][]): (string | number)[][] {
    return rows.map((row) => row.map((value) => normalizeValueForSheet(value)));
}

/**
 * Находит существующий лист по имени или создаёт новый.
 */
function getOrCreateSheetByName(
    spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
    sheetName: string,
): GoogleAppsScript.Spreadsheet.Sheet {
    const existingSheet = spreadsheet.getSheetByName(sheetName);
    if (existingSheet) {
        return existingSheet;
    }

    Logger.log('Создаём новый лист: %s', sheetName);
    return spreadsheet.insertSheet(sheetName);
}

/**
 * Обеспечивает наличие заголовков в верхней строке листа.
 * Если лист пустой — записывает заголовки в первую строку.
 */
function ensureSheetHeaders(sheet: GoogleAppsScript.Spreadsheet.Sheet, headers: string[]): void {
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
        const headerRow = [headers];
        sheet.getRange(1, 1, 1, headers.length).setValues(headerRow);
    }
}

/**
 * Дописывает строки в конец листа (используется для Key Metrics).
 */
function appendRowsToSheet(
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
    headers: string[],
    rows: (string | number | null | undefined)[][],
): void {
    ensureSheetHeaders(sheet, headers);

    if (rows.length === 0) {
        return;
    }

    const normalizedRows = normalizeRowsForSheet(rows);
    const startRow = sheet.getLastRow() + 1;
    const numRows = normalizedRows.length;
    const numCols = headers.length;

    sheet.getRange(startRow, 1, numRows, numCols).setValues(normalizedRows);
}

/**
 * Перезаписывает лист полностью (используется для Stocks).
 * Семантика аналогична `WriteMode.OVERWRITE` из Node-версии:
 * - перед записью очищаем лист,
 * - записываем заголовки и свежие данные.
 */
function overwriteSheetWithRows(
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
    headers: string[],
    rows: (string | number | null | undefined)[][],
): void {
    // Полностью очищаем содержимое листа
    sheet.clearContents();

    const normalizedRows = normalizeRowsForSheet(rows);
    const allRows: (string | number)[][] = [headers, ...normalizedRows];

    if (allRows.length === 0) {
        return;
    }

    const numRows = allRows.length;
    const numCols = headers.length;

    sheet.getRange(1, 1, numRows, numCols).setValues(allRows);
}

// =============================================================================
// Главная функция фичи для Google Apps Script
// =============================================================================

/**
 * Главная функция фичи Sales Funnel Daily для Google Apps Script.
 *
 * ЛОГИКА:
 * 1. Парсим идентификатор магазина из строки (`storeIdentifierRaw`).
 * 2. Получаем токен WB из Script Properties.
 * 3. Вычисляем вчерашнюю дату (период отчёта).
 * 4. Делаем запрос к WB Analytics API и получаем массив товаров.
 * 5. Если данных нет — логируем и выходим.
 * 6. Формируем строки для Key Metrics и Stocks.
 * 7. Записываем данные в Google Sheets:
 *    - Key Metrics: дописываем в конец листа (append).
 *    - Stocks: перезаписываем лист полностью.
 *
 * ПАРАМЕТРЫ:
 * - storeIdentifierRaw — строка, которая должна совпадать со значением enum `WBStoreIdentifier`
 *   (например, 'POVAR_NA_RAYONE' или 'LEESHOP').
 *
 * Пример использования в GAS:
 *   salesFunnelDailyReportWBStoreGas('POVAR_NA_RAYONE');
 */
function salesFunnelDailyReportWBStoreGas(storeIdentifierRaw: string): void {
    Logger.log('🚀 Запуск Sales Funnel Daily (GAS)');

    // 1. Парсим идентификатор магазина
    const storeIdentifier = parseStoreIdentifierGas(storeIdentifierRaw);

    // 2. Получаем токен из Script Properties
    const token = getWBStoreTokenFromScriptProperties(storeIdentifier);

    // 3. Вычисляем вчерашнюю дату
    const yesterdayDate = getYesterdayDateIso();
    Logger.log('📅 Получение данных за период: %s - %s', yesterdayDate, yesterdayDate);

    // 4. Получаем данные из WB Analytics API
    const request: SalesFunnelProductsRequest = {
        selectedPeriod: {
            start: yesterdayDate,
            end: yesterdayDate,
        },
        nmIds: [], // Пустой массив = все товары
        limit: 1000, // Максимальное количество товаров
        offset: 0,
    };

    const products = getWBSalesFunnelProductsGas(token, request);
    Logger.log('✅ Получено товаров: %s', products.length);

    // 5. Если данных нет — выходим
    if (products.length === 0) {
        Logger.log('⚠️  Данных нет. Возможно, за этот период нет статистики.');
        return;
    }

    // 6. Формируем строки для Key Metrics и Stocks
    const storeDisplayName = getStoreDisplayNameForGas(storeIdentifier);
    const keyMetricsArrays = adaptSalesFunnelToKeyMetricsArraysGas(products, storeDisplayName);
    const runDate = getCurrentDateIso();
    const stocksArrays = adaptSalesFunnelToStocksArraysGas(products, runDate, storeDisplayName);

    // 7. Записываем данные в Google Sheets
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    // Имена листов в Google-таблице.
    // ВАЖНО: ты писал, что у тебя листы называются `funnel` и `stock`,
    // поэтому здесь мы жёстко используем эти имена.
    const keyMetricsSheetName = 'funnel';
    const stocksSheetName = 'stock';

    const keyMetricsSheet = getOrCreateSheetByName(spreadsheet, keyMetricsSheetName);
    const stocksSheet = getOrCreateSheetByName(spreadsheet, stocksSheetName);

    // Key Metrics — дописываем в конец листа
    Logger.log('📊 Запись Key Metrics в лист: %s', keyMetricsSheet.getName());
    appendRowsToSheet(keyMetricsSheet, WB_KEY_METRICS_HEADERS_GAS, keyMetricsArrays);

    // Stocks — перезаписываем целиком (семантика OVERWRITE)
    Logger.log('📦 Запись Stocks в лист (overwrite): %s', stocksSheet.getName());
    overwriteSheetWithRows(stocksSheet, WB_STOCKS_HEADERS_GAS, stocksArrays);

    Logger.log('✓ Выполнение завершено успешно (GAS)');
}

/**
 * Парсит строку в enum `WBStoreIdentifier`, чтобы избежать использования "магических строк".
 * Если передано неизвестное значение — кидаем понятную ошибку.
 */
function parseStoreIdentifierGas(storeIdentifierRaw: string): WBStoreIdentifier {
    if (storeIdentifierRaw === WBStoreIdentifier.POVAR_NA_RAYONE) {
        return WBStoreIdentifier.POVAR_NA_RAYONE;
    }

    if (storeIdentifierRaw === WBStoreIdentifier.LEESHOP) {
        return WBStoreIdentifier.LEESHOP;
    }

    throw new Error(
        `Неизвестный идентификатор магазина (GAS): ${storeIdentifierRaw}. ` +
            `Ожидались значения: ${Object.values(WBStoreIdentifier).join(', ')}`,
    );
}
