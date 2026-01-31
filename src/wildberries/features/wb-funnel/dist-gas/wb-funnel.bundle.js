/**
 * Идентификаторы магазинов WB (строковые значения для CLI)
 */
var WBStoreIdentifier;
(function (WBStoreIdentifier) {
    WBStoreIdentifier['POVAR_NA_RAYONE'] = 'povar-na-rayone';
    WBStoreIdentifier['LEESHOP'] = 'leeshop';
})(WBStoreIdentifier || (WBStoreIdentifier = {}));

/**
 * Типы окружений выполнения
 */
var RuntimeEnvironment;
(function (RuntimeEnvironment) {
    /** Node.js окружение */
    RuntimeEnvironment['NODE'] = 'node';
    /** Google Apps Script окружение */
    RuntimeEnvironment['GAS'] = 'gas';
})(RuntimeEnvironment || (RuntimeEnvironment = {}));
/**
 * Определяет текущее окружение выполнения через переменную RUNTIME_ENV
 * Проверяет переменную в следующем порядке:
 * 1. process.env.RUNTIME_ENV (для Node.js)
 * 2. PropertiesService.getScriptProperties().getProperty('RUNTIME_ENV') (для Google Apps Script)
 *
 * @returns RuntimeEnvironment - текущее окружение выполнения
 * @throws Error если переменная RUNTIME_ENV не задана или имеет недопустимое значение
 */
function getRuntimeEnvironment() {
    // 1. Пробуем получить переменную из process.env (Node.js)
    // Используем globalThis и optional chaining для безопасного доступа
    // В GAS process не существует, но globalThis.process вернет undefined, а не вызовет ошибку
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const nodeEnv = globalThis.process?.env?.RUNTIME_ENV;
    if (nodeEnv === RuntimeEnvironment.NODE) {
        return RuntimeEnvironment.NODE;
    }
    if (nodeEnv === RuntimeEnvironment.GAS) {
        return RuntimeEnvironment.GAS;
    }
    // 2. Пробуем получить переменную из PropertiesService (Google Apps Script)
    try {
        // В Node.js PropertiesService не существует, поэтому обращение вызовет ReferenceError
        // Используем явное приведение типа для PropertiesService из Google Apps Script
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        const PropertiesService = globalThis.PropertiesService;
        if (PropertiesService) {
            const scriptProperties = PropertiesService.getScriptProperties();
            const gasEnv = scriptProperties.getProperty('RUNTIME_ENV');
            if (gasEnv === RuntimeEnvironment.NODE) {
                return RuntimeEnvironment.NODE;
            }
            if (gasEnv === RuntimeEnvironment.GAS) {
                return RuntimeEnvironment.GAS;
            }
        }
    } catch {
        // PropertiesService не существует (значит мы в Node.js)
        // Но если process.env тоже не сработал, значит переменная не задана
    }
    // 3. Если переменная не найдена ни в одном окружении - выбрасываем ошибку
    throw new Error(
        'Переменная окружения RUNTIME_ENV не задана. ' +
            'Установите RUNTIME_ENV=node для Node.js или RUNTIME_ENV=gas для Google Apps Script. ' +
            'В Google Apps Script используйте PropertiesService через UI настроек скрипта.',
    );
}
/**
 * Проверяет, запущен ли код в Node.js окружении
 * @returns true если окружение - Node.js, иначе false
 */
function isNode() {
    return getRuntimeEnvironment() === RuntimeEnvironment.NODE;
}
/**
 * Проверяет, запущен ли код в Google Apps Script окружении
 * @returns true если окружение - Google Apps Script, иначе false
 */
function isGoogleAppsScript() {
    return getRuntimeEnvironment() === RuntimeEnvironment.GAS;
}

const join = (...args) => args.filter(Boolean).join('/');

/**
 * Режим записи данных в файл
 */
var WriteMode;
(function (WriteMode) {
    /** Дописать в конец файла (если файл существует, читать и дописать) */
    WriteMode['APPEND'] = 'append';
    /** Перезаписать файл полностью */
    WriteMode['OVERWRITE'] = 'overwrite';
})(WriteMode || (WriteMode = {}));

/**
 * Утилиты для работы с CSV форматом
 */
/**
 * Экранирует значение для CSV (обрабатывает кавычки, запятые, переносы строк)
 * @param value - Значение для экранирования
 * @returns Экранированное значение
 */
function escapeCsvValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const str = String(value);
    // Если значение содержит кавычки, запятые или переносы строк - оборачиваем в кавычки
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        // Экранируем кавычки удвоением
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
/**
 * Преобразует строку данных в CSV формат
 * @param row - Массив значений для строки
 * @returns CSV строка
 */
function rowToCsv(row) {
    return row.map(escapeCsvValue).join(',');
}

/**
 * Формирует CSV контент из заголовков и строк данных
 */
function buildCsvContent(headers, rows) {
    const csvLines = [];
    csvLines.push(rowToCsv(headers));
    for (const row of rows) {
        csvLines.push(rowToCsv(row));
    }
    return csvLines.join('\n') + '\n';
}
/**
 * Объединяет существующие строки с новыми для режима APPEND
 */
function mergeCsvRows(existingRows, newRows) {
    return [...existingRows, ...newRows];
}

/**
 * Получает корневую директорию проекта для Node.js окружения
 */
function getProjectRootNode() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const processObj = globalThis.process;
    if (!processObj?.cwd) {
        throw new Error('process.cwd() не доступен. Убедитесь, что код запущен в Node.js окружении.');
    }
    return processObj.cwd();
}
/**
 * Объединяет пути для Node.js окружения
 */
function joinPathNode(...paths) {
    return join(...paths);
}
/**
 * Подготавливает директорию для сохранения файлов в Node.js окружении
 */
function prepareOutputDirNode() {
    const projectRoot = getProjectRootNode();
    const outputDir = joinPathNode(projectRoot, 'data', 'output');
    return {
        pathOrId: outputDir,
        name: 'output',
    };
}
/**
 * Читает существующий CSV файл и возвращает все строки (кроме заголовков)
 */
function readCsvFileRowsNode(filePath) {
    {
        return [];
    }
}
/**
 * Записывает CSV файл с заголовками и данными для Node.js окружения
 */
function writeCsvFileNode(filePath, headers, rows, mode = WriteMode.OVERWRITE) {
    if (rows.length === 0 && mode === WriteMode.APPEND) {
        return;
    }
    if (mode === WriteMode.APPEND) {
        const existingRows = readCsvFileRowsNode();
        const allRows = mergeCsvRows(existingRows, rows);
        buildCsvContent(headers, allRows);
    } else {
        buildCsvContent(headers, rows);
    }
}

/**
 * Объединяет пути для Google Apps Script окружения
 */
function joinPathGAS(...paths) {
    return paths.filter((p) => p).join('/');
}
/**
 * Подготавливает папку для сохранения файлов в Google Apps Script окружении
 */
function prepareOutputDirGAS() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const DriveApp = globalThis.DriveApp;
    if (!DriveApp) {
        throw new Error('DriveApp не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
    }
    const rootFolder = DriveApp.getRootFolder();
    const dataFolders = rootFolder.getFoldersByName('data');
    const dataFolder = dataFolders.hasNext() ? dataFolders.next() : rootFolder.createFolder('data');
    const outputFolders = dataFolder.getFoldersByName('output');
    const outputFolder = outputFolders.hasNext() ? outputFolders.next() : dataFolder.createFolder('output');
    return {
        pathOrId: outputFolder.getId(),
        name: 'output',
    };
}
/**
 * Нормализует значение для записи в таблицу (null/undefined → '')
 */
function normalizeValueForSheet(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return value;
}
/**
 * Нормализует все строки для setValues
 */
function normalizeRowsForSheet(rows) {
    return rows.map((row) => row.map((value) => normalizeValueForSheet(value)));
}
/**
 * Возвращает лист по имени или создаёт новый
 */
function getOrCreateSheetByName(spreadsheet, sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (sheet) {
        return sheet;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const Logger = globalThis.Logger;
    if (Logger) {
        Logger.log(`Создаём новый лист: ${sheetName}`);
    }
    return spreadsheet.insertSheet(sheetName);
}
/**
 * Обеспечивает наличие заголовков в первой строке
 */
function ensureSheetHeaders(sheet, headers) {
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
}
/**
 * Дописывает строки в конец листа (для funnel)
 */
function appendRowsToSheet(sheet, headers, rows) {
    ensureSheetHeaders(sheet, headers);
    if (!rows.length) {
        return;
    }
    const normalized = normalizeRowsForSheet(rows);
    const startRow = sheet.getLastRow() + 1;
    const numRows = normalized.length;
    const numCols = headers.length;
    sheet.getRange(startRow, 1, numRows, numCols).setValues(normalized);
}
/**
 * Записывает данные в Google Sheets лист с заголовками для GAS окружения
 * В GAS работаем с активной таблицей через SpreadsheetApp, а не с файлами в Drive
 */
function writeCsvFileGAS(
    sheetName, // Имя листа (например, 'wb-funnel-povar-data')
    headers,
    rows,
    mode = WriteMode.OVERWRITE,
) {
    if (rows.length === 0 && mode === WriteMode.APPEND) {
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const SpreadsheetApp = globalThis.SpreadsheetApp;
    if (!SpreadsheetApp) {
        throw new Error('SpreadsheetApp не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
    }
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
        throw new Error(
            'Не удалось получить активную таблицу. Убедитесь, что скрипт привязан к Google Sheets таблице.',
        );
    }
    const sheet = getOrCreateSheetByName(spreadsheet, sheetName);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const Logger = globalThis.Logger;
    if (Logger) {
        Logger.log('📊 Запись данных в лист: %s', sheet.getName());
        Logger.log('📊 Количество строк для записи: %s', rows.length);
    }
    // Всегда дописываем в конец (как в примере пользователя)
    try {
        appendRowsToSheet(sheet, headers, rows);
        if (Logger) {
            Logger.log('✅ Данные успешно записаны в лист: %s', sheet.getName());
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (Logger) {
            Logger.log('❌ Ошибка при записи данных в лист: %s', errorMessage);
        }
        throw new Error(`Ошибка при записи данных в лист ${sheetName}: ${errorMessage}`);
    }
}

/**
 * Объединяет пути
 */
function joinPath(...paths) {
    if (isNode()) {
        return joinPathNode(...paths);
    }
    if (isGoogleAppsScript()) {
        return joinPathGAS(...paths);
    }
    throw new Error('Не удалось определить окружение выполнения для joinPath');
}
/**
 * Подготавливает директорию/папку для сохранения файлов
 */
function prepareOutputDir() {
    if (isNode()) {
        return prepareOutputDirNode();
    }
    if (isGoogleAppsScript()) {
        return prepareOutputDirGAS();
    }
    throw new Error('Не удалось определить окружение выполнения для prepareOutputDir');
}
/**
 * Записывает CSV файл с заголовками и данными
 */
function writeCsvFile(filePathOrName, headers, rows, mode = WriteMode.OVERWRITE) {
    if (isNode()) {
        writeCsvFileNode(filePathOrName, headers, rows, mode);
    } else if (isGoogleAppsScript()) {
        writeCsvFileGAS(filePathOrName, headers, rows, mode);
    } else {
        throw new Error('Не удалось определить окружение выполнения для writeCsvFile');
    }
}

/**
 * ANSI коды для цветного вывода в консоль
 */
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
};
/**
 * Утилита для красивого логирования в консоль для Node.js окружения
 * Поддерживает цветной вывод с использованием ANSI кодов
 */
const loggerNode = {
    /**
     * Информационное сообщение (голубой цвет)
     */
    info: (message) => {
        console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
    },
    /**
     * Успешное выполнение (зеленый цвет, жирный)
     */
    success: (message) => {
        console.log(`${colors.green}${colors.bright}${message}${colors.reset}`);
    },
    /**
     * Ошибка (красный цвет, жирный)
     */
    error: (message) => {
        console.log(`${colors.red}${colors.bright}${message}${colors.reset}`);
    },
};

/**
 * Утилита для логирования в Google Apps Script окружении
 * Использует Logger.log() для вывода сообщений (видно в Execution Transcript)
 * Цветной вывод не поддерживается в GAS
 */
const loggerGAS = {
    /**
     * Информационное сообщение
     */
    info: (message) => {
        // Используем Logger.log() если доступен, иначе console.log()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const Logger = globalThis.Logger;
        if (Logger) {
            Logger.log(`ℹ ${message}`);
        } else {
            console.log(`ℹ ${message}`);
        }
    },
    /**
     * Успешное выполнение
     */
    success: (message) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const Logger = globalThis.Logger;
        if (Logger) {
            Logger.log(`✓ ${message}`);
        } else {
            console.log(`✓ ${message}`);
        }
    },
    /**
     * Ошибка
     */
    error: (message) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const Logger = globalThis.Logger;
        if (Logger) {
            Logger.log(`✗ ${message}`);
        } else {
            console.log(`✗ ${message}`);
        }
    },
};

/**
 * Утилита для логирования
 * Автоматически определяет окружение выполнения и использует соответствующую реализацию:
 * - Node.js: использует цветной вывод с ANSI кодами
 * - Google Apps Script: использует Logger.log() или console.log() без цветов
 */
const logger = {
    /**
     * Информационное сообщение
     */
    info: (message) => {
        if (isNode()) {
            loggerNode.info(message);
        } else if (isGoogleAppsScript()) {
            loggerGAS.info(message);
        } else {
            // Fallback на обычный console.log
            console.log(`ℹ ${message}`);
        }
    },
    /**
     * Успешное выполнение
     */
    success: (message) => {
        if (isNode()) {
            loggerNode.success(message);
        } else if (isGoogleAppsScript()) {
            loggerGAS.success(message);
        } else {
            // Fallback на обычный console.log
            console.log(`✓ ${message}`);
        }
    },
    /**
     * Ошибка
     */
    error: (message) => {
        if (isNode()) {
            loggerNode.error(message);
        } else if (isGoogleAppsScript()) {
            loggerGAS.error(message);
        } else {
            // Fallback на обычный console.log
            console.log(`✗ ${message}`);
        }
    },
};

/**
 * Утилиты для работы с датами
 */
/**
 * Получает вчерашнюю дату в формате YYYY-MM-DD
 * @returns Дата вчерашнего дня
 */
/**
 * Извлекает год из даты в формате YYYY-MM-DD
 * @param date - Дата в формате YYYY-MM-DD
 * @returns Год (число)
 */
function extractYear(date) {
    return parseInt(date.split('-')[0], 10);
}
/**
 * Извлекает месяц из даты в формате YYYY-MM-DD
 * @param date - Дата в формате YYYY-MM-DD
 * @returns Месяц (число от 1 до 12)
 */
function extractMonth(date) {
    return parseInt(date.split('-')[1], 10);
}
/**
 * Вычисляет номер недели года для даты (неделя начинается с понедельника)
 * Первая неделя - это неделя, содержащая 1 января
 * @param date - Дата в формате YYYY-MM-DD
 * @returns Номер недели (от 1 до 53)
 */
function getWeekNumber(date) {
    const dateObj = new Date(date + 'T00:00:00');
    const year = dateObj.getFullYear();
    // Находим день недели для 1 января (0 = воскресенье, 1 = понедельник, ..., 6 = суббота)
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay();
    // Вычисляем смещение до первого понедельника года
    // Если 1 января - понедельник (1): первый понедельник = 1 января (смещение 0)
    // Если 1 января - вторник (2): первый понедельник = 31 декабря прошлого года (смещение -1)
    // Если 1 января - среда (3): первый понедельник = 30 декабря прошлого года (смещение -2)
    // ...
    // Если 1 января - воскресенье (0): первый понедельник = 2 января (смещение 1)
    let daysToMonday;
    if (jan1Day === 0) {
        // Воскресенье - первый понедельник на следующий день
        daysToMonday = 1;
    } else if (jan1Day === 1) {
        // Понедельник - первый понедельник сегодня
        daysToMonday = 0;
    } else {
        // Вторник-суббота - первый понедельник в прошлом году
        daysToMonday = -(jan1Day - 1);
    }
    const firstMonday = new Date(year, 0, 1 + daysToMonday);
    // Вычисляем разницу в днях между датой и первым понедельником
    const diffTime = dateObj.getTime() - firstMonday.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    // Если дата до первого понедельника, это последняя неделя прошлого года
    if (diffDays < 0) {
        // Рекурсивно вычисляем для последнего дня прошлого года
        const lastDayOfPrevYear = new Date(year - 1, 11, 31);
        const lastDayStr = `${lastDayOfPrevYear.getFullYear()}-12-31`;
        return getWeekNumber(lastDayStr);
    }
    // Номер недели = (разница в днях / 7) + 1
    return Math.floor(diffDays / 7) + 1;
}
/**
 * Получает вчерашнюю дату по московскому времени (UTC+3) в формате YYYY-MM-DD
 * @returns Дата вчерашнего дня по МСК
 */
function getYesterdayDateMoscow() {
    const now = new Date();
    // Получаем текущее время в UTC
    const utcTime = now.getTime();
    // Добавляем 3 часа (МСК = UTC+3)
    const moscowTime = utcTime + 3 * 60 * 60 * 1000;
    // Создаем дату в МСК
    const moscowDate = new Date(moscowTime);
    // Вычитаем 1 день
    moscowDate.setDate(moscowDate.getDate() - 1);
    // Форматируем в YYYY-MM-DD
    const year = moscowDate.getUTCFullYear();
    const month = String(moscowDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(moscowDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Получает переменную окружения для Node.js окружения
 * Использует process.env после инициализации dotenv
 * @param key - Ключ переменной окружения
 * @returns Значение переменной окружения или undefined, если не найдена
 */
function getEnvVariableNode(key) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return globalThis.process?.env?.[key];
}

/**
 * Получает переменную окружения для Google Apps Script окружения
 * Использует PropertiesService.getScriptProperties().getProperty()
 * @param key - Ключ переменной окружения
 * @returns Значение переменной окружения или null, если не найдена
 */
function getEnvVariableGAS(key) {
    // Получаем PropertiesService из глобального контекста GAS
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const PropertiesService = globalThis.PropertiesService;
    if (!PropertiesService) {
        throw new Error('PropertiesService не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
    }
    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty(key);
}

/**
 * Получает переменную окружения
 * Автоматически определяет окружение выполнения и использует соответствующую реализацию:
 * - Node.js: использует process.env (после инициализации dotenv)
 * - Google Apps Script: использует PropertiesService.getScriptProperties().getProperty()
 *
 * @param key - Ключ переменной окружения
 * @returns Значение переменной окружения или undefined/null, если не найдена
 * @throws Error если переменная не найдена и требуется обязательное значение
 */
function getEnvVariable(key) {
    if (isNode()) {
        return getEnvVariableNode(key);
    }
    if (isGoogleAppsScript()) {
        return getEnvVariableGAS(key);
    }
    // Это не должно произойти, так как getRuntimeEnvironment() выбрасывает ошибку, если окружение не определено
    throw new Error('Не удалось определить окружение выполнения для getEnvVariable');
}
/**
 * Получает переменную окружения с обязательной проверкой наличия
 * @param key - Ключ переменной окружения
 * @returns Значение переменной окружения
 * @throws Error если переменная не найдена
 */
function getEnvVariableRequired(key) {
    const value = getEnvVariable(key);
    if (!value) {
        throw new Error(`Переменная окружения "${key}" не найдена`);
    }
    return value;
}

/**
 * Базовый URL для Wildberries Seller Analytics API
 */
const WB_ANALYTICS_API_BASE_URL = 'https://seller-analytics-api.wildberries.ru';
/**
 * Преобразует идентификатор магазина (из CLI аргументов) в ключ для переменной окружения .env
 * @param storeIdentifier - Идентификатор магазина из enum (например, 'povar-na-rayone')
 * @returns Ключ для переменной окружения (например, 'WB_POVAR_NA_RAYONE_TOKEN')
 * @throws Error если передан неизвестный идентификатор магазина
 */
function getStoreEnvKey(storeIdentifier) {
    switch (storeIdentifier) {
        case WBStoreIdentifier.POVAR_NA_RAYONE:
            return 'WB_POVAR_NA_RAYONE_TOKEN';
        case WBStoreIdentifier.LEESHOP:
            return 'WB_LEESHOP_TOKEN';
        default:
            throw new Error(`Неизвестный идентификатор магазина: ${storeIdentifier}`);
    }
}
/**
 * Извлекает токен WB из переменных окружения по идентификатору магазина
 * Использует getEnvVariableRequired для получения значения (работает и в Node.js, и в GAS)
 * @param storeIdentifier - Идентификатор магазина WB из enum
 * @returns Токен авторизации для WB API
 * @throws Error если токен не найден
 */
function getWBStoreToken(storeIdentifier) {
    const envKey = getStoreEnvKey(storeIdentifier);
    return getEnvVariableRequired(envKey);
}
/**
 * Создает полную конфигурацию для WB Analytics API с токеном
 * @param token - Токен авторизации для WB API (тот же токен, что и для обычного API)
 * @returns Полная конфигурация для API запроса к Analytics API
 */
function getWBAnalyticsConfig(token) {
    return {
        baseUrl: WB_ANALYTICS_API_BASE_URL,
        logPrefix: 'wb-analytics-api',
        authHeaders: {
            Authorization: token,
        },
    };
}
/**
 * Преобразует идентификатор магазина в короткое название для файлов
 * @param storeIdentifier - Идентификатор магазина из enum
 * @returns Короткое название магазина
 */
function getStoreShortName(storeIdentifier) {
    switch (storeIdentifier) {
        case WBStoreIdentifier.POVAR_NA_RAYONE:
            return 'povar';
        case WBStoreIdentifier.LEESHOP:
            return 'leeshop';
        default:
            return storeIdentifier;
    }
}

const fetch = {};

/**
 * Формирует полный URL из baseUrl и path
 * @param baseUrl - Базовый URL API
 * @param path - Путь к эндпоинту
 * @returns Полный URL
 */
function buildApiUrl(baseUrl, path) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
}
/**
 * Формирует заголовки запроса, объединяя authHeaders из конфига и headers из init
 * @param config - Конфигурация API
 * @param init - Опции запроса
 * @returns Объект с заголовками
 */
function buildRequestHeaders(config, init) {
    return {
        Accept: 'application/json',
        ...config.authHeaders,
        ...(init.headers ? init.headers : {}),
    };
}
/**
 * Сериализует body в строку, если это необходимо
 * @param body - Тело запроса (может быть строкой или объектом)
 * @param logPrefix - Префикс для логирования ошибок
 * @returns Сериализованное тело запроса или undefined
 * @throws Error если не удалось сериализовать объект
 */
function serializeRequestBody(body, logPrefix) {
    if (body === undefined) {
        return undefined;
    }
    if (typeof body === 'string') {
        return body;
    }
    try {
        return JSON.stringify(body);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${logPrefix}] JSON.stringify failed:`, errorMessage);
        throw new Error(`${logPrefix} JSON.stringify failed: ${errorMessage}`);
    }
}
/**
 * Устанавливает Content-Type: application/json, если он не указан и есть body
 * @param headers - Заголовки запроса
 * @param hasBody - Есть ли тело запроса
 */
function ensureContentType(headers, hasBody) {
    if (hasBody && !(headers['Content-Type'] || headers['content-type'])) {
        headers['Content-Type'] = 'application/json';
    }
}
/**
 * Обрабатывает ошибку API запроса
 * Логирует ошибку и выбрасывает исключение с понятным сообщением
 * @param logPrefix - Префикс для логирования
 * @param path - Путь к эндпоинту
 * @param statusCode - HTTP статус код
 * @param data - Данные ответа (для формирования сообщения об ошибке)
 */
function handleApiError(logPrefix, path, statusCode, data) {
    const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);
    if (statusCode === 401) {
        console.error(`[${logPrefix}] 401 Unauthorized - проверьте токен для: ${path}`);
    } else if (statusCode === 403) {
        console.error(`[${logPrefix}] 403 Forbidden - нет доступа к: ${path}`);
    } else {
        console.error(`[${logPrefix}] error response:`, { status: statusCode, body: bodyStr });
    }
    throw new Error(`${logPrefix} API error ${statusCode}: ${bodyStr}`);
}
/**
 * Парсит ответ API в нужный тип
 * @param text - Текст ответа
 * @returns Распарсенные данные или текст, если парсинг не удался
 */
function parseApiResponse(text) {
    try {
        return text ? JSON.parse(text) : text;
    } catch {
        return text;
    }
}

/**
 * Универсальный запрос к любому API для Node.js окружения
 * Использует node-fetch для выполнения HTTP запросов
 * Обрабатывает формирование URL, сериализацию body, обработку ошибок
 * @param config - Конфигурация API (baseUrl, logPrefix, authHeaders)
 * @param path - Путь к эндпоинту (например, '/ping')
 * @param init - Дополнительные опции запроса (method, body, headers и т.д.)
 * @returns Промис с данными ответа от API
 * @throws Error при ошибках сети или API (401, 403, и т.д.)
 */
async function makeApiRequestNode(config, path, init = {}) {
    const url = buildApiUrl(config.baseUrl, path);
    const headers = buildRequestHeaders(config, init);
    // Сериализуем body
    const body = serializeRequestBody(init.body, config.logPrefix);
    ensureContentType(headers, body !== undefined);
    let res;
    try {
        // Формируем опции для node-fetch
        const fetchOptions = {
            method: init.method || 'GET',
            headers: headers,
            body: body,
        };
        res = await fetch(url, fetchOptions);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${config.logPrefix}] fetch error:`, errorMessage);
        throw new Error(`${config.logPrefix} fetch failed: ${errorMessage}`);
    }
    const text = await res.text().catch(() => '');
    const data = parseApiResponse(text);
    if (!res.ok) {
        handleApiError(config.logPrefix, path, res.status, data);
    }
    return data;
}

/**
 * Универсальный запрос к любому API для Google Apps Script окружения
 * Использует UrlFetchApp.fetch() для выполнения HTTP запросов
 * Обрабатывает формирование URL, сериализацию body, обработку ошибок
 * @param config - Конфигурация API (baseUrl, logPrefix, authHeaders)
 * @param path - Путь к эндпоинту (например, '/ping')
 * @param init - Дополнительные опции запроса (method, body, headers и т.д.)
 * @returns Промис с данными ответа от API
 * @throws Error при ошибках сети или API (401, 403, и т.д.)
 */
async function makeApiRequestGAS(config, path, init = {}) {
    const url = buildApiUrl(config.baseUrl, path);
    const headers = buildRequestHeaders(config, init);
    // Получаем UrlFetchApp из глобального контекста GAS
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const UrlFetchApp = globalThis.UrlFetchApp;
    if (!UrlFetchApp) {
        throw new Error('UrlFetchApp не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
    }
    // Сериализуем body
    const payload = serializeRequestBody(init.body, config.logPrefix);
    ensureContentType(headers, payload !== undefined);
    // Формируем опции для UrlFetchApp
    const options = {
        method: init.method || 'GET',
        headers: headers,
        muteHttpExceptions: true, // Чтобы не выбрасывать исключения при ошибках HTTP
    };
    if (payload !== undefined) {
        options.payload = payload;
    }
    let response;
    try {
        response = UrlFetchApp.fetch(url, options);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${config.logPrefix}] UrlFetchApp.fetch error:`, errorMessage);
        throw new Error(`${config.logPrefix} fetch failed: ${errorMessage}`);
    }
    const statusCode = response.getResponseCode();
    const text = response.getContentText();
    const data = parseApiResponse(text);
    // Проверяем статус ответа (UrlFetchApp возвращает код даже при ошибках, если muteHttpExceptions = true)
    if (statusCode < 200 || statusCode >= 300) {
        handleApiError(config.logPrefix, path, statusCode, data);
    }
    return data;
}

/**
 * Универсальный запрос к любому API
 * Автоматически определяет окружение выполнения и использует соответствующую реализацию:
 * - Node.js: использует node-fetch
 * - Google Apps Script: использует UrlFetchApp.fetch()
 *
 * Обрабатывает формирование URL, сериализацию body, обработку ошибок
 * @param config - Конфигурация API (baseUrl, logPrefix, authHeaders)
 * @param path - Путь к эндпоинту (например, '/ping')
 * @param init - Дополнительные опции запроса (method, body, headers и т.д.)
 * @returns Промис с данными ответа от API
 * @throws Error при ошибках сети или API (401, 403, и т.д.)
 */
async function makeApiRequest(config, path, init = {}) {
    if (isNode()) {
        return makeApiRequestNode(config, path, init);
    }
    if (isGoogleAppsScript()) {
        return makeApiRequestGAS(config, path, init);
    }
    // Это не должно произойти, так как getRuntimeEnvironment() выбрасывает ошибку, если окружение не определено
    throw new Error('Не удалось определить окружение выполнения для makeApiRequest');
}

/**
 * Получает статистику карточек товаров за период из WB Analytics API
 * API: POST /api/analytics/v3/sales-funnel/products
 * @param storeIdentifier - Идентификатор магазина WB
 * @param request - Параметры запроса (период, фильтры, пагинация и т.д.)
 * @returns Промис с массивом данных по товарам
 * @throws Error если токен не найден или произошла ошибка при запросе
 */
async function getWBSalesFunnelProducts(storeIdentifier, request) {
    const token = getWBStoreToken(storeIdentifier);
    const config = getWBAnalyticsConfig(token);
    const path = '/api/analytics/v3/sales-funnel/products';
    const response = await makeApiRequest(config, path, {
        method: 'POST',
        body: JSON.stringify(request),
    });
    // Извлекаем массив товаров из структуры { data: { products: [...] } }
    return response.data.products;
}

/**
 * Определяет период для запроса: если не передан, использует вчерашний день по МСК
 * @param selectedPeriod - Опциональный период для запроса
 * @returns Период для запроса (start и end одинаковые, если не указано иное)
 */
function getPeriod(selectedPeriod) {
    if (selectedPeriod) {
        return selectedPeriod;
    }
    const yesterdayDate = getYesterdayDateMoscow();
    return {
        start: yesterdayDate,
        end: yesterdayDate,
    };
}
/**
 * Форматирует массив ярлыков товара в строку
 * @param tags - Массив ярлыков товара
 * @returns Строка с названиями ярлыков, разделенными запятой
 */
function formatTags(tags) {
    if (!tags || tags.length === 0) {
        return '';
    }
    return tags.map((tag) => tag.name).join(', ');
}
/**
 * Получает данные по воронке продаж из WB Analytics API за указанный период
 * Инкапсулирует логику формирования запроса и получения данных
 * @param storeIdentifier - Идентификатор магазина WB
 * @param period - Период для запроса
 * @returns Промис с массивом данных по товарам
 * @throws Error если токен не найден или произошла ошибка при запросе к API
 */
async function fetchWBFunnelData(storeIdentifier, period) {
    // 1. Подготавливаем запрос к API
    const request = {
        selectedPeriod: {
            start: period.start,
            end: period.end,
        },
        nmIds: [], // Пустой массив = все товары
        limit: 1000, // Максимальное количество товаров
        offset: 0,
    };
    // 2. Получаем данные из WB Analytics API через единый сервис
    logger.info('📡 Запрос к WB Analytics API...');
    const products = await getWBSalesFunnelProducts(storeIdentifier, request);
    logger.info(`✅ Получено товаров: ${products.length}`);
    return products;
}
/**
 * Формирует полный путь к файлу CSV отчета воронки продаж
 * Подготавливает директорию и формирует путь: wb-funnel-YYYY-MM-DD-store.csv
 * @param period - Период для запроса
 * @param storeIdentifier - Идентификатор магазина WB
 * @returns Полный путь к файлу
 */
function getWBFunnelFilePath(period, storeIdentifier) {
    // Подготавливаем директорию для сохранения файла
    const outputDirResult = prepareOutputDir();
    // Формируем имя файла: wb-funnel-YYYY-MM-DD-store.csv
    const storeShortName = getStoreShortName(storeIdentifier);
    const fileName = `wb-funnel-${period.start}-${storeShortName}.csv`;
    // Возвращаем полный путь (Node.js) или имя листа (GAS)
    // В GAS работаем с Google Sheets, поэтому возвращаем имя листа
    // В Node.js pathOrId - это путь к директории, объединяем с именем файла
    if (isNode()) {
        return joinPath(outputDirResult.pathOrId, fileName);
    } else {
        // В GAS возвращаем имя листа в формате: wb-funnel-{storeShortName}-data
        // (без даты и расширения, так как данные дописываются в один лист)
        return `wb-funnel-${storeShortName}-data`;
    }
}

/**
 * Структура данных для CSV файла воронки продаж WB
 * Единый источник правды для порядка полей и заголовков
 */
/**
 * Массив полей и заголовков в нужном порядке
 * Единый источник правды для адаптера и генерации заголовков
 */
const WB_FUNNEL_FIELDS = [
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
const WB_FUNNEL_HEADERS = WB_FUNNEL_FIELDS.map((item) => item.header);

/**
 * Преобразует данные воронки продаж WB в формат для CSV файла
 * Использует единый источник правды (WB_FUNNEL_FIELDS) для порядка полей
 * Сразу формирует массив значений в нужном порядке, без промежуточного объекта
 * @param products - Массив товаров из WB Analytics API
 * @returns Массив массивов значений для CSV (каждая строка - массив из 34 значений в порядке WB_FUNNEL_FIELDS)
 */
function adaptWBFunnelToCSVFormat(products) {
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
        const tagsFormatted = formatTags(product.tags);
        // Формируем массив значений в порядке WB_FUNNEL_FIELDS
        // Используем switch или маппинг по field для извлечения значений
        const getValue = (field) => {
            switch (field) {
                case 'year':
                    return year;
                case 'month':
                    return month;
                case 'week':
                    return week;
                case 'vendorCode':
                    return product.vendorCode;
                case 'nmId':
                    return product.nmId;
                case 'title':
                    return product.title;
                case 'subjectName':
                    return product.subjectName;
                case 'brandName':
                    return product.brandName;
                case 'tags':
                    return tagsFormatted;
                case 'deletedProduct':
                    return null;
                case 'productRating':
                    return product.productRating;
                case 'feedbackRating':
                    return product.feedbackRating;
                case 'date':
                    return date;
                case 'views':
                    return null;
                case 'ctr':
                    return null;
                case 'openCount':
                    return selected.openCount;
                case 'cartCount':
                    return selected.cartCount;
                case 'addToWishlist':
                    return selected.addToWishlist;
                case 'orderCount':
                    return selected.orderCount;
                case 'wbClubOrderCount':
                    return wbClub.orderCount;
                case 'buyoutCount':
                    return selected.buyoutCount;
                case 'wbClubBuyoutCount':
                    return wbClub.buyoutCount;
                case 'cancelCount':
                    return selected.cancelCount;
                case 'wbClubCancelCount':
                    return wbClub.cancelCount;
                case 'addToCartPercent':
                    return conversions.addToCartPercent;
                case 'cartToOrderPercent':
                    return conversions.cartToOrderPercent;
                case 'buyoutPercent':
                    return conversions.buyoutPercent;
                case 'wbClubBuyoutPercent':
                    return wbClub.buyoutPercent;
                case 'orderSum':
                    return selected.orderSum;
                case 'wbClubOrderSum':
                    return wbClub.orderSum;
                case 'buyoutSum':
                    return selected.buyoutSum;
                case 'wbClubBuyoutSum':
                    return wbClub.buyoutSum;
                case 'cancelSum':
                    return selected.cancelSum;
                case 'wbClubCancelSum':
                    return wbClub.cancelSum;
                default:
                    return null;
            }
        };
        // Извлекаем значения в порядке, определенном в WB_FUNNEL_FIELDS
        return WB_FUNNEL_FIELDS.map((fieldItem) => getValue(fieldItem.field));
    });
}

/**
 * Главная функция фичи wb-funnel
 * Получает данные по воронке продаж из WB Analytics API и создает CSV отчет
 * @param storeIdentifier - Идентификатор магазина WB
 * @param selectedPeriod - Опциональный период для запроса. Если не указан, используется вчерашний день по МСК
 * @throws Error если токен не найден или произошла ошибка при запросе к API
 */
async function wbFunnelByStore(storeIdentifier, selectedPeriod) {
    try {
        // Проверяем окружение выполнения перед запуском фичи
        const runtimeEnv = getRuntimeEnvironment();
        logger.info(`🔧 Окружение выполнения: ${runtimeEnv}`);
        logger.info(`🚀 Запуск wb-funnel для ${storeIdentifier}`);
        // 1. Определяем период: если не передан, используем вчерашний день по МСК
        const period = getPeriod(selectedPeriod);
        logger.info(`📅 Получение данных за период: ${period.start} - ${period.end}`);
        // 2. Получаем данные из WB Analytics API
        const products = await fetchWBFunnelData(storeIdentifier, period);
        if (products.length === 0) {
            logger.info('⚠️  Данных нет. Возможно, за этот период нет статистики.');
            return;
        }
        // 3. Преобразуем данные в формат CSV
        logger.info('📊 Преобразование данных для CSV...');
        const csvRows = adaptWBFunnelToCSVFormat(products);
        // 4. Формируем путь к файлу и сохраняем CSV
        const filePath = getWBFunnelFilePath(period, storeIdentifier);
        try {
            writeCsvFile(filePath, WB_FUNNEL_HEADERS, csvRows, WriteMode.OVERWRITE);
            logger.info(`✅ CSV файл сохранен: ${filePath} (${csvRows.length} строк)`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`❌ Ошибка при сохранении файла: ${errorMessage}`);
            throw error;
        }
        logger.success('✓ Выполнение завершено успешно');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`❌ Ошибка при выполнении wb-funnel: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
            logger.error(`Stack trace: ${error.stack}`);
        }
        throw error;
    }
}
/**
 * Обертки для удобного вызова из Google Apps Script
 * Примеры обёрток под конкретные магазины
 * (запускать их удобнее из меню IDE Apps Script).
 */
function runPovar() {
    return wbFunnelByStore(WBStoreIdentifier.POVAR_NA_RAYONE);
}
function runLeeshop() {
    return wbFunnelByStore(WBStoreIdentifier.LEESHOP);
}
