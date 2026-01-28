/**
 * Google Apps Script-версия фичи salesFunnelDailyReportWBStore.
 * Этот файл — ES2020 JS (const/let, без типов), который удобно:
 * - бандлить под GAS, или
 * - просто открыть и скопировать в редактор Apps Script.
 *
 * ЛОГИКА:
 * - Берём токен WB из Script Properties.
 * - Запрашиваем воронку продаж за вчера из WB Analytics API.
 * - Пишем результаты в два листа активной таблицы:
 *   - funnel  (Key Metrics, дописываем в конец)
 *   - stock   (Stocks, перезаписываем полностью)
 *
 * Script Properties:
 *   WB_POVAR_NA_RAYONE_TOKEN
 *   WB_LEESHOP_TOKEN
 */

/**
 * Enum магазинов WB.
 */
const WBStoreIdentifier = {
    POVAR_NA_RAYONE: 'POVAR_NA_RAYONE',
    LEESHOP: 'LEESHOP',
};

/**
 * Преобразует enum-значение в короткое имя (сейчас используется только для логов).
 */
const getStoreShortNameForGas = (storeIdentifier) => {
    switch (storeIdentifier) {
        case WBStoreIdentifier.POVAR_NA_RAYONE:
            return 'povar';
        case WBStoreIdentifier.LEESHOP:
            return 'leeshop';
        default:
            return String(storeIdentifier);
    }
};

/**
 * Человекочитаемое имя магазина для отчётов (первая колонка "Магазин").
 */
const getStoreDisplayNameForGas = (storeIdentifier) => {
    switch (storeIdentifier) {
        case WBStoreIdentifier.POVAR_NA_RAYONE:
            return 'Povar';
        case WBStoreIdentifier.LEESHOP:
            return 'LeeShop';
        default:
            return String(storeIdentifier);
    }
};

/**
 * Возвращает дату вчерашнего дня в формате YYYY-MM-DD.
 */
const getYesterdayDateIso = () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    return formatDateToIso(now);
};

/**
 * Возвращает сегодняшнюю дату в формате YYYY-MM-DD.
 */
const getCurrentDateIso = () => {
    const now = new Date();
    return formatDateToIso(now);
};

/**
 * Форматирует Date в YYYY-MM-DD.
 */
const formatDateToIso = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Достаёт Script Property или кидает ошибку.
 */
const getScriptPropertyOrThrow = (propertyKey) => {
    const scriptProperties = PropertiesService.getScriptProperties();
    const value = scriptProperties.getProperty(propertyKey);
    if (!value) {
        throw new Error(`Script Property не найден: ${propertyKey}`);
    }
    return value;
};

/**
 * Мапит магазин → ключ Script Property.
 */
const getStoreScriptPropertyKey = (storeIdentifier) => {
    switch (storeIdentifier) {
        case WBStoreIdentifier.POVAR_NA_RAYONE:
            return 'WB_POVAR_NA_RAYONE_TOKEN';
        case WBStoreIdentifier.LEESHOP:
            return 'WB_LEESHOP_TOKEN';
        default:
            throw new Error(
                `Неизвестный идентификатор магазина (Script Properties): ${storeIdentifier}`
            );
    }
};

/**
 * Получает токен WB из Script Properties.
 */
const getWBStoreTokenFromScriptProperties = (storeIdentifier) => {
    const propertyKey = getStoreScriptPropertyKey(storeIdentifier);
    return getScriptPropertyOrThrow(propertyKey);
};

/**
 * Конфиг для WB Analytics API (GAS-версия).
 */
const getWBAnalyticsConfigGas = (token) => ({
    baseUrl: 'https://seller-analytics-api.wildberries.ru',
    logPrefix: 'wb-analytics-api-gas',
    authHeaders: { Authorization: token },
});

/**
 * Универсальный запрос к WB Analytics API через UrlFetchApp.
 */
const makeApiRequestGas = (config, path, init = {}) => {
    const normalizedPath = path.charAt(0) === '/' ? path : `/${path}`;
    const url = `${config.baseUrl}${normalizedPath}`;

    const headers = {
        Accept: 'application/json',
        ...config.authHeaders,
        ...(init.headers || {}),
    };

    let payload;
    if (typeof init.payload === 'string') {
        payload = init.payload;
    } else if (init.payload !== undefined) {
        payload = JSON.stringify(init.payload);
    }

    if (payload && !headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
    }

    Logger.log('[%s] Запрос к %s', config.logPrefix, url);

    const response = UrlFetchApp.fetch(url, {
        method: init.method || 'post',
        headers,
        payload,
        muteHttpExceptions: true,
    });

    const statusCode = response.getResponseCode();
    const text = response.getContentText();

    let data;
    try {
        data = text ? JSON.parse(text) : text;
    } catch (_e) {
        data = text;
    }

    if (statusCode < 200 || statusCode >= 300) {
        const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);
        if (statusCode === 401) {
            Logger.log(
                '[%s] 401 Unauthorized - проверь токен для: %s',
                config.logPrefix,
                path
            );
        } else if (statusCode === 403) {
            Logger.log(
                '[%s] 403 Forbidden - нет доступа к: %s',
                config.logPrefix,
                path
            );
        } else {
            Logger.log(
                '[%s] Ошибка ответа: статус=%s, body=%s',
                config.logPrefix,
                statusCode,
                bodyStr
            );
        }
        throw new Error(`${config.logPrefix} API error ${statusCode}: ${bodyStr}`);
    }

    return data;
};

/**
 * Вызывает WB Analytics API /api/analytics/v3/sales-funnel/products.
 */
const getWBSalesFunnelProductsGas = (token, request) => {
    const config = getWBAnalyticsConfigGas(token);
    const path = '/api/analytics/v3/sales-funnel/products';
    const response = makeApiRequestGas(config, path, {
        method: 'post',
        payload: JSON.stringify(request),
    });
    return response.data.products;
};

/**
 * Заголовки для листа funnel (Key Metrics).
 */
const WB_KEY_METRICS_HEADERS_GAS = [
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
 * Заголовки для листа stock (Stocks).
 */
const WB_STOCKS_HEADERS_GAS = [
    'Магазин',
    'Дата',
    'Артикул продавца',
    'Остаток WB',
    'Остаток MP',
    'Сумма остатков',
];

/**
 * Преобразует объект Key Metrics в массив для записи в таблицу.
 */
const salesRowToArrayGas = (row) => [
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

/**
 * Преобразует объект Stocks в массив для записи в таблицу.
 */
const stocksRowToArrayGas = (row) => [
    row.storeName,
    row.runDate,
    row.vendorCode,
    row.stocksWb,
    row.stocksMp,
    row.stocksBalanceSum,
];

/**
 * Извлекает Key Metrics из одного товара.
 */
const extractKeyMetricsFieldsGas = (item, storeName) => {
    const { product, statistic } = item;
    const selected = statistic.selected;
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
};

/**
 * Преобразует массив товаров в массивы строк для листа funnel.
 */
const adaptSalesFunnelToKeyMetricsArraysGas = (products, storeName) =>
    products.map((item) => {
        const row = extractKeyMetricsFieldsGas(item, storeName);
        return salesRowToArrayGas(row);
    });

/**
 * Извлекает данные об остатках (без runDate).
 */
const extractStocksFieldsGas = (item, storeName) => {
    const { product } = item;
    const { stocks } = product;
    return {
        storeName,
        vendorCode: product.vendorCode,
        stocksWb: stocks.wb,
        stocksMp: stocks.mp,
        stocksBalanceSum: stocks.balanceSum,
    };
};

/**
 * Создаёт полный объект StocksRow.
 */
const createStocksRowGas = (extractedData, runDate) => ({
    runDate,
    storeName: extractedData.storeName,
    vendorCode: extractedData.vendorCode,
    stocksWb: extractedData.stocksWb,
    stocksMp: extractedData.stocksMp,
    stocksBalanceSum: extractedData.stocksBalanceSum,
});

/**
 * Преобразует массив товаров в массивы строк для листа stock.
 */
const adaptSalesFunnelToStocksArraysGas = (products, runDate, storeName) =>
    products.map((item) => {
        const extracted = extractStocksFieldsGas(item, storeName);
        const row = createStocksRowGas(extracted, runDate);
        return stocksRowToArrayGas(row);
    });

/**
 * Нормализует значение для записи в таблицу (null/undefined → '').
 */
const normalizeValueForSheet = (value) => {
    if (value === null || value === undefined) return '';
    return value;
};

/**
 * Нормализует все строки для setValues.
 */
const normalizeRowsForSheet = (rows) =>
    rows.map((row) => row.map((value) => normalizeValueForSheet(value)));

/**
 * Возвращает лист по имени или создаёт новый.
 */
const getOrCreateSheetByName = (spreadsheet, sheetName) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (sheet) return sheet;
    Logger.log('Создаём новый лист: %s', sheetName);
    return spreadsheet.insertSheet(sheetName);
};

/**
 * Обеспечивает наличие заголовков в первой строке.
 */
const ensureSheetHeaders = (sheet, headers) => {
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
};

/**
 * Дописывает строки в конец листа (для funnel).
 */
const appendRowsToSheet = (sheet, headers, rows) => {
    ensureSheetHeaders(sheet, headers);
    if (!rows.length) return;

    const normalized = normalizeRowsForSheet(rows);
    const startRow = sheet.getLastRow() + 1;
    const numRows = normalized.length;
    const numCols = headers.length;

    sheet.getRange(startRow, 1, numRows, numCols).setValues(normalized);
};

/**
 * Полностью перезаписывает лист (для stock).
 */
const overwriteSheetWithRows = (sheet, headers, rows) => {
    sheet.clearContents();
    const normalized = normalizeRowsForSheet(rows);
    const allRows = [headers, ...normalized];
    if (!allRows.length) return;

    const numRows = allRows.length;
    const numCols = headers.length;
    sheet.getRange(1, 1, numRows, numCols).setValues(allRows);
};

/**
 * Обновляет в листе stock только строки конкретного магазина:
 * - находит все существующие строки и убирает те, где первая колонка = storeName,
 * - добавляет свежие строки для этого магазина,
 * - сохраняет строки других магазинов как есть.
 */
const overwriteStoreRowsInStockSheet = (sheet, headers, rows, storeName) => {
    // Гарантируем наличие заголовков
    ensureSheetHeaders(sheet, headers);

    const numCols = headers.length;
    const lastRow = sheet.getLastRow();

    // Читаем существующие данные (без строки заголовков)
    let existingData = [];
    if (lastRow > 1) {
        existingData = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
    }

    // Оставляем только строки других магазинов
    const otherStoresRows = existingData.filter((row) => row[0] !== storeName);

    // Нормализуем новые строки для текущего магазина
    const normalizedNewRows = normalizeRowsForSheet(rows);

    // Собираем итоговые строки: сначала другие магазины, потом обновлённый текущий
    const allRows = [...otherStoresRows, ...normalizedNewRows];

    // Очищаем старые данные (но не заголовки)
    if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, numCols).clearContent();
    }

    // Если есть данные — записываем их начиная со второй строки
    if (allRows.length > 0) {
        sheet.getRange(2, 1, allRows.length, numCols).setValues(allRows);
    }
};

/**
 * Парсит строку в enum WBStoreIdentifier.
 */
const parseStoreIdentifierGas = (storeIdentifierRaw) => {
    if (storeIdentifierRaw === WBStoreIdentifier.POVAR_NA_RAYONE) {
        return WBStoreIdentifier.POVAR_NA_RAYONE;
    }
    if (storeIdentifierRaw === WBStoreIdentifier.LEESHOP) {
        return WBStoreIdentifier.LEESHOP;
    }
    throw new Error(
        `Неизвестный идентификатор магазина (GAS): ${storeIdentifierRaw}. ` +
        `Ожидались: ${Object.values(WBStoreIdentifier).join(', ')}`
    );
};

/**
 * Главная функция для GAS.
 * Пример: salesFunnelDailyReportWBStoreGas('POVAR_NA_RAYONE');
 */
const salesFunnelDailyReportWBStoreGas = (storeIdentifierRaw) => {
    Logger.log('🚀 Запуск Sales Funnel Daily (GAS)');

    const storeIdentifier = parseStoreIdentifierGas(storeIdentifierRaw);
    const storeDisplayName = getStoreDisplayNameForGas(storeIdentifier);
    const token = getWBStoreTokenFromScriptProperties(storeIdentifier);

    const yesterdayDate = getYesterdayDateIso();
    Logger.log('📅 Период: %s - %s', yesterdayDate, yesterdayDate);

    const request = {
        selectedPeriod: { start: yesterdayDate, end: yesterdayDate },
        nmIds: [],
        limit: 1000,
        offset: 0,
    };

    const products = getWBSalesFunnelProductsGas(token, request);
    Logger.log('✅ Получено товаров: %s', products.length);

    if (!products.length) {
        Logger.log('⚠️  Данных нет. Возможно, за этот период нет статистики.');
        return;
    }

    const keyMetricsArrays = adaptSalesFunnelToKeyMetricsArraysGas(products, storeDisplayName);
    const runDate = getCurrentDateIso();
    const stocksArrays = adaptSalesFunnelToStocksArraysGas(products, runDate, storeDisplayName);

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    // Листы строго с именами funnel и stock
    const keyMetricsSheetName = 'funnel';
    const stocksSheetName = 'stock';

    const keyMetricsSheet = getOrCreateSheetByName(spreadsheet, keyMetricsSheetName);
    const stocksSheet = getOrCreateSheetByName(spreadsheet, stocksSheetName);

    Logger.log('📊 Запись Key Metrics в лист: %s', keyMetricsSheet.getName());
    appendRowsToSheet(keyMetricsSheet, WB_KEY_METRICS_HEADERS_GAS, keyMetricsArrays);

    Logger.log('📦 Запись Stocks (overwrite) в лист: %s', stocksSheet.getName());
    overwriteStoreRowsInStockSheet(stocksSheet, WB_STOCKS_HEADERS_GAS, stocksArrays, storeDisplayName);

    Logger.log('✓ Выполнение завершено успешно (GAS)');
};

/**
 * Примеры обёрток под конкретные магазины
 * (запускать их удобнее из меню IDE Apps Script).
 */
const runPovar = () => {
    salesFunnelDailyReportWBStoreGas('POVAR_NA_RAYONE');
};

const runLeeshop = () => {
    salesFunnelDailyReportWBStoreGas('LEESHOP');
};


