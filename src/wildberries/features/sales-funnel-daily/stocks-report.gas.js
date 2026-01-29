/**
 * Google Apps Script-версия фичи для получения остатков товаров WB.
 * Этот файл — ES2020 JS (const/let, без типов), который удобно:
 * - бандлить под GAS, или
 * - просто открыть и скопировать в редактор Apps Script.
 *
 * ЛОГИКА:
 * - Берём токен WB из Script Properties.
 * - Запрашиваем остатки через Statistics API WB.
 * - Пишем результаты в листы активной таблицы:
 *   - wb-povar-stocks  (для POVAR_NA_RAYONE, полностью перезаписываем)
 *   - wb-leeshop-stocks (для LEESHOP, полностью перезаписываем)
 *
 * API: GET https://statistics-api.wildberries.ru/api/v1/supplier/stocks?dateFrom=2019-06-20
 * Для получения всех остатков указываем максимально раннюю дату (2019-06-20).
 *
 * Script Properties:
 *   WB_POVAR_NA_RAYONE_TOKEN
 *   WB_LEESHOP_TOKEN
 */

/**
 * Преобразует идентификатор магазина в короткое имя для названий листов.
 * Используем строки напрямую, чтобы избежать конфликта с другими файлами GAS.
 */
const getStocksStoreShortName = (storeIdentifier) => {
    if (storeIdentifier === 'POVAR_NA_RAYONE') {
        return 'povar';
    }
    if (storeIdentifier === 'LEESHOP') {
        return 'leeshop';
    }
    return String(storeIdentifier);
};

/**
 * Достаёт Script Property или кидает ошибку (для остатков).
 */
const getStocksScriptPropertyOrThrow = (propertyKey) => {
    const scriptProperties = PropertiesService.getScriptProperties();
    const value = scriptProperties.getProperty(propertyKey);
    if (!value) {
        throw new Error(`Script Property не найден: ${propertyKey}`);
    }
    return value;
};

/**
 * Мапит магазин → ключ Script Property (для остатков).
 */
const getStocksStoreScriptPropertyKey = (storeIdentifier) => {
    if (storeIdentifier === 'POVAR_NA_RAYONE') {
        return 'WB_POVAR_NA_RAYONE_TOKEN';
    }
    if (storeIdentifier === 'LEESHOP') {
        return 'WB_LEESHOP_TOKEN';
    }
    throw new Error(
        `Неизвестный идентификатор магазина (Script Properties): ${storeIdentifier}`
    );
};

/**
 * Получает токен WB из Script Properties (для остатков).
 */
const getStocksWBStoreToken = (storeIdentifier) => {
    const propertyKey = getStocksStoreScriptPropertyKey(storeIdentifier);
    return getStocksScriptPropertyOrThrow(propertyKey);
};

/**
 * Базовый URL для Statistics API WB (для остатков).
 */
const WB_STATISTICS_API_BASE_URL = 'https://statistics-api.wildberries.ru';

/**
 * Универсальный GET-запрос к Statistics API через UrlFetchApp.
 * Для остатков используется GET-метод с query-параметрами.
 */
const makeGetRequestGas = (url, token) => {
    const headers = {
        Accept: 'application/json',
        Authorization: token,
    };

    Logger.log('[stocks-api] Запрос к %s', url);

    const response = UrlFetchApp.fetch(url, {
        method: 'get',
        headers,
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
            Logger.log('[stocks-api] 401 Unauthorized - проверь токен');
        } else if (statusCode === 403) {
            Logger.log('[stocks-api] 403 Forbidden - нет доступа');
        } else {
            Logger.log('[stocks-api] Ошибка ответа: статус=%s, body=%s', statusCode, bodyStr);
        }
        throw new Error(`stocks-api API error ${statusCode}: ${bodyStr}`);
    }

    return data;
};

/**
 * Получает остатки товаров через Statistics API WB.
 * Используем максимально раннюю дату (2019-06-20), чтобы получить все остатки.
 *
 * @param token - Токен авторизации для WB API
 * @returns Массив объектов с остатками (структура Root2 из документации)
 */
const getWBStocksGas = (token) => {
    // Для получения полного остатка указываем максимально раннее значение (2019-06-20)
    const dateFrom = '2019-06-20';
    const url = `${WB_STATISTICS_API_BASE_URL}/api/v1/supplier/stocks?dateFrom=${dateFrom}`;

    const stocks = makeGetRequestGas(url, token);
    return stocks;
};

/**
 * Заголовки колонок для листа остатков.
 * Порядок соответствует полям из Root2 интерфейса.
 */
const WB_STOCKS_HEADERS = [
    'Дата последнего изменения',
    'Название склада',
    'Артикул продавца',
    'Артикул WB',
    'Штрихкод',
    'Количество',
    'В пути к клиенту',
    'В пути от клиента',
    'Количество полное',
    'Категория',
    'Предмет',
    'Бренд',
    'Технический размер',
    'Цена',
    'Скидка',
    'Поставка',
    'Реализация',
    'Код склада',
];

/**
 * Преобразует объект остатка (Root2) в массив значений для записи в таблицу.
 * Порядок соответствует заголовкам WB_STOCKS_HEADERS.
 */
const stockRowToArray = (stock) => [
    stock.lastChangeDate || '',
    stock.warehouseName || '',
    stock.supplierArticle || '',
    stock.nmId || '',
    stock.barcode || '',
    stock.quantity || 0,
    stock.inWayToClient || 0,
    stock.inWayFromClient || 0,
    stock.quantityFull || 0,
    stock.category || '',
    stock.subject || '',
    stock.brand || '',
    stock.techSize || '',
    stock.Price || 0,
    stock.Discount || 0,
    stock.isSupply ? 'Да' : 'Нет',
    stock.isRealization ? 'Да' : 'Нет',
    stock.SCCode || '',
];

/**
 * Нормализует значение для записи в таблицу (null/undefined → '') для остатков.
 */
const normalizeStocksValueForSheet = (value) => {
    if (value === null || value === undefined) return '';
    return value;
};

/**
 * Нормализует все строки для setValues (для остатков).
 */
const normalizeStocksRowsForSheet = (rows) =>
    rows.map((row) => row.map((value) => normalizeStocksValueForSheet(value)));

/**
 * Возвращает лист по имени или создаёт новый (для остатков).
 */
const getOrCreateStocksSheetByName = (spreadsheet, sheetName) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (sheet) return sheet;
    Logger.log('Создаём новый лист: %s', sheetName);
    return spreadsheet.insertSheet(sheetName);
};

/**
 * Полностью перезаписывает лист остатками (overwrite).
 * Очищает лист и записывает заголовки + свежие данные.
 */
const overwriteSheetWithStocks = (sheet, headers, stocks) => {
    // Полностью очищаем содержимое листа
    sheet.clearContents();

    if (!stocks || stocks.length === 0) {
        // Если данных нет — записываем только заголовки
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        Logger.log('⚠️  Остатков нет, записаны только заголовки');
        return;
    }

    // Преобразуем остатки в массивы строк
    const rows = stocks.map((stock) => stockRowToArray(stock));
    const normalizedRows = normalizeStocksRowsForSheet(rows);

    // Собираем все строки: заголовки + данные
    const allRows = [headers, ...normalizedRows];

    const numRows = allRows.length;
    const numCols = headers.length;

    // Записываем всё начиная с первой строки
    sheet.getRange(1, 1, numRows, numCols).setValues(allRows);
};

/**
 * Парсит строку в идентификатор магазина (для остатков).
 */
const parseStocksStoreIdentifier = (storeIdentifierRaw) => {
    if (storeIdentifierRaw === 'POVAR_NA_RAYONE' || storeIdentifierRaw === 'LEESHOP') {
        return storeIdentifierRaw;
    }
    throw new Error(
        `Неизвестный идентификатор магазина (GAS): ${storeIdentifierRaw}. ` +
        `Ожидались: POVAR_NA_RAYONE, LEESHOP`
    );
};

/**
 * Главная функция для получения и записи остатков WB в Google Sheets.
 * Пример: getWBStocksGas('POVAR_NA_RAYONE');
 *
 * ЛОГИКА:
 * 1. Парсим идентификатор магазина.
 * 2. Получаем токен из Script Properties.
 * 3. Делаем GET-запрос к Statistics API для получения остатков.
 * 4. Полностью перезаписываем лист с остатками (overwrite).
 */
const getWBStocksReportGas = (storeIdentifierRaw) => {
    Logger.log('🚀 Запуск получения остатков WB (GAS)');

    const storeIdentifier = parseStocksStoreIdentifier(storeIdentifierRaw);
    const token = getStocksWBStoreToken(storeIdentifier);

    Logger.log('📡 Запрос остатков через Statistics API...');

    const stocks = getWBStocksGas(token);
    Logger.log('✅ Получено записей об остатках: %s', stocks.length);

    if (!stocks || stocks.length === 0) {
        Logger.log('⚠️  Остатков нет. Возможно, товаров нет на складах.');
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const storeShortName = getStocksStoreShortName(storeIdentifier);
    const sheetName = `wb-${storeShortName}-stocks`;

    const sheet = getOrCreateStocksSheetByName(spreadsheet, sheetName);

    Logger.log('📦 Запись остатков (overwrite) в лист: %s', sheet.getName());
    overwriteSheetWithStocks(sheet, WB_STOCKS_HEADERS, stocks);

    Logger.log('✓ Выполнение завершено успешно (GAS)');
};

/**
 * Примеры обёрток под конкретные магазины
 * (запускать их удобнее из меню IDE Apps Script).
 */
const runPovarStocks = () => {
    getWBStocksReportGas('POVAR_NA_RAYONE');
};

const runLeeshopStocks = () => {
    getWBStocksReportGas('LEESHOP');
};
