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
 * Форматирует дату из формата YYYY-MM-DD в вид DD.MM.YYYY для Google Sheets.
 * Пример: '2026-01-26' → '26.01.2026'.
 */
const formatDateForDisplay = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
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
 * Порядок колонок жёстко согласован с бизнес-таблицей в Google Sheets.
 */
const WB_KEY_METRICS_HEADERS_GAS = [
    'Год',
    'Мес',
    'Неделя',
    'Артикул продавца',
    'Артикул WB',
    'Название',
    'Предмет',
    'Бренд',
    'Ярлыки',
    'Удаленный товар',
    'Рейтинг карточки',
    'Рейтинг по отзывам',
    'Дата',
    'Показы',
    'CTR',
    'Переходы в карточку',
    'Положили в корзину',
    'Добавили в отложенные',
    'Заказали, шт',
    'Заказали ВБ клуб, шт',
    'Выкупили, шт',
    'Выкупили ВБ клуб, шт',
    'Отменили, шт',
    'Отменили ВБ клуб, шт',
    'Конверсия в корзину, %',
    'Конверсия в заказ, %',
    'Процент выкупа',
    'Процент выкупа ВБ клуб',
    'Заказали на сумму, ₽',
    'Заказали на сумму ВБ клуб, ₽',
    'Выкупили на сумму, ₽',
    'Выкупили на сумму ВБ клуб, ₽',
    'Отменили на сумму, ₽',
    'Отменили на сумму ВБ клуб, ₽',
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
 * По дате (YYYY-MM-DD) считаем год, месяц и ISO-неделю (неделя начинается с понедельника).
 */
const getYearMonthWeekFromDate = (dateStr) => {
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)));

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // 1-12

    // ISO-неделя: сдвигаем дату к четвергу текущей недели и считаем недели от начала года
    const dayOfWeek = date.getUTCDay() || 7; // 1 (Mon) - 7 (Sun)
    const thursday = new Date(date);
    thursday.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);

    const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);

    return { year, month, week };
};

/**
 * Преобразует объект Key Metrics в массив для записи в таблицу
 * строго в порядке WB_KEY_METRICS_HEADERS_GAS.
 */
const salesRowToArrayGas = (row) => {
    // Внутренне работаем с ISO-датой, чтобы корректно посчитать неделю,
    // а в таблицу кладём человекочитаемый формат DD.MM.YYYY.
    const isoDate = row.date;
    const { year, month, week } = getYearMonthWeekFromDate(isoDate);
    const displayDate = formatDateForDisplay(isoDate);

    return [
        // 1–3. Год / Месяц / Неделя
        year,
        month,
        week,
        // 4–6. Артикул продавца / Артикул WB / Название
        row.vendorCode,
        row.nmId,
        row.title,
        // 7–9. Предмет / Бренд / Ярлыки
        row.subjectName,
        row.brandName,
        row.tags,
        // 10. Удаленный товар — информации нет, оставляем пустым
        '',
        // 11–12. Рейтинги
        row.productRating,
        row.feedbackRating,
        // 13. Дата (как в API)
        displayDate,
        // 14–15. Показы / CTR — API их не даёт, оставляем пустыми
        '',
        '',
        // 16–18. Переходы, корзина, отложенные
        row.openCount,
        row.cartCount,
        row.addToWishlist,
        // 19–24. Заказы / выкупы / отмены по обычным и ВБ-клубу
        row.orderCount,
        row.wbClubOrderCount,
        row.buyoutCount,
        row.wbClubBuyoutCount,
        row.cancelCount,
        row.wbClubCancelCount,
        // 25–27. Конверсии
        row.addToCartPercent,
        row.cartToOrderPercent,
        row.buyoutPercent,
        // 28. Процент выкупа ВБ клуб
        row.wbClubBuyoutPercent,
        // 29–34. Суммы заказов/выкупов/отмен
        row.orderSum,
        row.wbClubOrderSum,
        row.buyoutSum,
        row.wbClubBuyoutSum,
        row.cancelSum,
        row.wbClubCancelSum,
    ];
};

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
const extractKeyMetricsFieldsGas = (item) => {
    const { product, statistic } = item;
    const selected = statistic.selected;
    const { timeToReady, wbClub, conversions } = selected;

    return {
        nmId: product.nmId,
        title: product.title,
        vendorCode: product.vendorCode,
        brandName: product.brandName,
        // Дополнительные поля карточки, которые используем для отчёта в Google Sheets
        subjectName: product.subjectName,
        // Ярлыки приводим к строке (массив в API склеиваем через запятую)
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
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
const adaptSalesFunnelToKeyMetricsArraysGas = (products) =>
    products.map((item) => {
        const row = extractKeyMetricsFieldsGas(item);
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

    // Формируем строки для отчёта funnel (Key Metrics) за вчерашний день
    const keyMetricsArrays = adaptSalesFunnelToKeyMetricsArraysGas(products);

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    // Для каждого магазина — свой лист с данными:
    // - POVAR_NA_RAYONE → wb-funnel-povar-data
    // - LEESHOP         → wb-funnel-leeshop-data
    const storeShortName = getStoreShortNameForGas(storeIdentifier);
    const keyMetricsSheetName = `wb-funnel-${storeShortName}-data`;

    const keyMetricsSheet = getOrCreateSheetByName(spreadsheet, keyMetricsSheetName);

    Logger.log('📊 Запись Key Metrics в лист: %s', keyMetricsSheet.getName());
    appendRowsToSheet(keyMetricsSheet, WB_KEY_METRICS_HEADERS_GAS, keyMetricsArrays);

    // Логику формирования и записи stock временно отключаем — она не нужна в этой версии отчёта.

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


