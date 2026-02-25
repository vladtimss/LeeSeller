import { WBStoreIdentifier } from '../../enums/wb-store-identifier.enum';
import { logger } from '../../../common/helpers/logs/logger';
import {
    getPeriod,
    getPeriod28,
    SelectedPeriod,
    generateReportId,
    buildStockReportParams,
    getWBStocksFilePath,
    extractCsvFromZip,
    sleepMs,
    WB_STOCKS_REPORT_REQUEST_INTERVAL_MS,
} from './wb-stocks.helpers';
import { getRuntimeEnvironment } from '../../../common/helpers/runtime/runtime-env.helper';
import {
    createStockHistoryReport,
    waitForStockReportReady,
    downloadStockReportFile,
} from '../../services/wb-api-service';
import { StockHistoryReportRequest } from './wb-stocks.types';
import { writeCsvFile } from '../../../common/helpers/files/files.helper';
import { WriteMode } from '../../../common/helpers/files/files.types';
import { isNode } from '../../../common/helpers/runtime/runtime-env.helper';
import { getWBStoreDisplayName } from '../../helpers/wb.helpers';

/**
 * Главная функция фичи wb-stocks
 * Получает отчет об остатках из WB Analytics API и создает CSV отчет
 * @param storeIdentifier - Идентификатор магазина WB
 * @param selectedPeriod - Опциональный период для запроса. Если не указан, используется текущая дата по МСК
 * @throws Error если токен не найден или произошла ошибка при запросе к API
 */
export async function wbStocksByStore(
    storeIdentifier: WBStoreIdentifier,
    selectedPeriod?: SelectedPeriod,
): Promise<void> {
    try {
        // Проверяем окружение выполнения перед запуском фичи
        const runtimeEnv = getRuntimeEnvironment();
        logger.info('🔧 Окружение выполнения: ' + runtimeEnv);

        logger.info('🚀 Запуск wb-stocks для ' + storeIdentifier);

        // 1. Периоды: 7 дней (основной) и 28 дней (для OrdersCount/OrdersSum за 28 дней)
        const period7 = getPeriod(selectedPeriod);
        const period28 = getPeriod28(selectedPeriod);
        logger.info('📅 Период 7 дней: ' + period7.start + ' - ' + period7.end);
        logger.info('📅 Период 28 дней: ' + period28.start + ' - ' + period28.end);

        // 2. Создаём две задачи с интервалом 20 сек (лимит API)
        const reportId7 = generateReportId();
        const reportId28 = generateReportId();

        const request7: StockHistoryReportRequest = {
            id: reportId7,
            reportType: 'STOCK_HISTORY_REPORT_CSV',
            params: buildStockReportParams(period7),
        };
        const request28: StockHistoryReportRequest = {
            id: reportId28,
            reportType: 'STOCK_HISTORY_REPORT_CSV',
            params: buildStockReportParams(period28),
        };

        await createStockHistoryReport(storeIdentifier, request7);
        logger.info(
            '⏳ Ожидание ' + WB_STOCKS_REPORT_REQUEST_INTERVAL_MS / 1000 + ' сек перед вторым запросом (лимит API)...',
        );
        await sleepMs(WB_STOCKS_REPORT_REQUEST_INTERVAL_MS);
        await createStockHistoryReport(storeIdentifier, request28);

        // 3. Ожидаем готовности обоих отчётов
        await Promise.all([
            waitForStockReportReady(storeIdentifier, reportId7),
            waitForStockReportReady(storeIdentifier, reportId28),
        ]);

        // 4. Скачиваем оба отчёта и извлекаем CSV
        logger.info('📥 Скачивание отчётов...');
        const [zipBuffer7, zipBuffer28] = await Promise.all([
            downloadStockReportFile(storeIdentifier, reportId7),
            downloadStockReportFile(storeIdentifier, reportId28),
        ]);

        logger.info('📦 Извлечение CSV из ZIP...');
        const [csvContent7, csvContent28] = await Promise.all([
            extractCsvFromZip(zipBuffer7),
            extractCsvFromZip(zipBuffer28),
        ]);

        if (!csvContent7 || csvContent7.trim().length === 0) {
            logger.info('⚠️  CSV отчёта за 7 дней пуст.');
            return;
        }

        const lines7 = csvContent7.split('\n').filter((line) => line.trim() !== '');
        const lines28 = csvContent28.split('\n').filter((line) => line.trim() !== '');
        if (lines7.length === 0) {
            logger.info('⚠️  CSV за 7 дней не содержит данных.');
            return;
        }

        const headers7 = parseCsvLine(lines7[0]);
        const rows7 = lines7.slice(1).map((line) => parseCsvLine(line));
        const headers28 = lines28.length > 0 ? parseCsvLine(lines28[0]) : [];
        const rows28 = lines28.length > 1 ? lines28.slice(1).map((line) => parseCsvLine(line)) : [];

        const { headers, rows } = mergeStocksReportsWithOrders7And28(headers7, rows7, headers28, rows28);
        logger.info('📊 Получено строк данных: ' + rows.length);

        // 5. Формируем путь к файлу / имя листа и сохраняем
        const filePathOrSheetName = getWBStocksFilePath(period7, storeIdentifier);
        const storeName = getWBStoreDisplayName(storeIdentifier);

        const exportDate = new Date();
        const dd = String(exportDate.getDate()).padStart(2, '0');
        const mm = String(exportDate.getMonth() + 1).padStart(2, '0');
        const yyyy = exportDate.getFullYear();
        const hours = exportDate.getHours();
        const minutes = String(exportDate.getMinutes()).padStart(2, '0');
        const seconds = String(exportDate.getSeconds()).padStart(2, '0');
        const exportTimestamp = `${dd}.${mm}.${yyyy} ${hours}:${minutes}:${seconds}`;

        if (isNode()) {
            writeCsvFile(filePathOrSheetName, headers, rows, WriteMode.OVERWRITE);
            logger.info('✅ CSV файл сохранен: ' + filePathOrSheetName + ' (' + rows.length + ' строк)');
        } else {
            const sheetHeaders = ['Магазин', 'Дата выгрузки', ...headers];
            const allRows = rows.map((row) => [storeName, exportTimestamp, ...row]);
            writeWBStocksToSheetGAS(filePathOrSheetName, sheetHeaders, allRows, storeName);
            logger.info('✅ Данные записаны в лист: ' + filePathOrSheetName + ' (' + allRows.length + ' строк)');
        }

        logger.success('✓ Выполнение завершено успешно');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('❌ Ошибка при выполнении wb-stocks: ' + errorMessage);
        if (error instanceof Error && error.stack) {
            logger.error('Stack trace: ' + error.stack);
        }
        throw error;
    }
}

/** Имена колонок заказов в отчёте WB (переименуем в *, 7 и добавим *, 28). */
const ORDERS_COUNT_HEADER = 'OrdersCount';
const ORDERS_SUM_HEADER = 'OrdersSum';
/** Ключ для ВПР: одна строка = один артикул на одном складе. */
const KEY_HEADERS = ['VendorCode', 'RegionName', 'OfficeName'] as const;

/**
 * Сливает отчёт за 7 дней (основа) с отчётом за 28 дней: переименовывает OrdersCount/OrdersSum в *, 7,
 * подтягивает из отчёта за 28 дней OrdersCount и OrdersSum по ключу VendorCode + RegionName + OfficeName (как ВПР).
 */
function mergeStocksReportsWithOrders7And28(
    headers7: string[],
    rows7: string[][],
    headers28: string[],
    rows28: string[][],
): { headers: string[]; rows: string[][] } {
    const idxOrdersCount28 = headers28.indexOf(ORDERS_COUNT_HEADER);
    const idxOrdersSum28 = headers28.indexOf(ORDERS_SUM_HEADER);

    const idxKey7 = KEY_HEADERS.map((name) => headers7.indexOf(name));
    const idxKey28 = KEY_HEADERS.map((name) => headers28.indexOf(name));

    const keyComplete =
        idxKey7.every((i) => i >= 0) && idxKey28.every((i) => i >= 0) && idxOrdersCount28 >= 0 && idxOrdersSum28 >= 0;

    const map28ByKey = new Map<string, [string, string]>();
    if (keyComplete) {
        for (const row of rows28) {
            const key = idxKey28.map((i) => row[i] ?? '').join('\t');
            const count = row[idxOrdersCount28] ?? '';
            const sum = row[idxOrdersSum28] ?? '';
            map28ByKey.set(key, [count, sum]);
        }
    }

    const newHeaders = headers7.map((h) => {
        if (h === ORDERS_COUNT_HEADER) {
            return 'OrdersCount, 7';
        }
        if (h === ORDERS_SUM_HEADER) {
            return 'OrdersSum, 7';
        }
        return h;
    });
    newHeaders.push('OrdersCount, 28', 'OrdersSum, 28');

    const newRows: string[][] = [];
    for (const row7 of rows7) {
        let count28 = '';
        let sum28 = '';
        if (keyComplete) {
            const key = idxKey7.map((i) => row7[i] ?? '').join('\t');
            const pair = map28ByKey.get(key);
            if (pair) {
                count28 = pair[0];
                sum28 = pair[1];
            }
        }
        newRows.push([...row7, count28, sum28]);
    }

    return { headers: newHeaders, rows: newRows };
}

/**
 * Парсит строку CSV в массив значений
 * Обрабатывает кавычки, экранированные кавычки, запятые внутри кавычек
 */
function parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current);
    return values;
}

/**
 * Записывает данные остатков в лист wb-stocks-data для GAS: удаляет строки по магазину, дописывает новые в конец.
 */
function writeWBStocksToSheetGAS(
    sheetName: string,
    headers: string[],
    rows: (string | number | null | undefined)[][],
    targetStore: string,
): void {
    const SpreadsheetApp = (
        globalThis as {
            SpreadsheetApp?: {
                getActiveSpreadsheet: () => {
                    getSheetByName: (name: string) => {
                        getLastRow: () => number;
                        getRange: (
                            row: number,
                            col: number,
                            numRows: number,
                            numCols: number,
                        ) => {
                            setValues: (values: (string | number)[][]) => void;
                            getValues: () => (string | number)[][];
                            clearContent: () => void;
                        };
                    } | null;
                    insertSheet: (name: string) => {
                        getLastRow: () => number;
                        getRange: (
                            row: number,
                            col: number,
                            numRows: number,
                            numCols: number,
                        ) => {
                            setValues: (values: (string | number)[][]) => void;
                            getValues: () => (string | number)[][];
                            clearContent: () => void;
                        };
                    };
                };
            };
        }
    ).SpreadsheetApp;

    if (!SpreadsheetApp) {
        throw new Error('SpreadsheetApp не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
        throw new Error(
            'Не удалось получить активную таблицу. Убедитесь, что скрипт привязан к Google Sheets таблице.',
        );
    }

    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
    }

    const normalize = (v: string | number | null | undefined): string | number =>
        v === null || v === undefined ? '' : v;
    const lastCol = headers.length;
    const dataStartRow = 2;

    if (headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    const normalizedRows = rows.map((row) => row.map((v) => normalize(v))) as (string | number)[][];
    const existingLastRow = sheet.getLastRow();
    let existingRows: (string | number)[][] = [];

    if (existingLastRow >= dataStartRow) {
        const numExisting = existingLastRow - dataStartRow + 1;
        existingRows = sheet.getRange(dataStartRow, 1, numExisting, lastCol).getValues() as (string | number)[][];
    }

    const filteredExisting = existingRows.filter((row) => {
        const storeCell = String(row[0] ?? '').trim();
        if (!storeCell) {
            return true;
        }
        return storeCell !== targetStore;
    });

    const combined = [...filteredExisting, ...normalizedRows];

    if (existingLastRow >= dataStartRow) {
        const numExisting = existingLastRow - dataStartRow + 1;
        sheet.getRange(dataStartRow, 1, numExisting, lastCol).clearContent();
    }

    if (combined.length > 0) {
        sheet.getRange(dataStartRow, 1, combined.length, lastCol).setValues(combined);
    }

    const Logger = (globalThis as { Logger?: { log: (message: string) => void } }).Logger;
    if (Logger) {
        Logger.log('✅ Данные записаны в лист: ' + sheetName);
    }
}

/**
 * Обертки для удобного вызова из Google Apps Script
 * Примеры обёрток под конкретные магазины
 * (запускать их удобнее из меню IDE Apps Script).
 */
export function runPovarStocks(): Promise<void> {
    return wbStocksByStore(WBStoreIdentifier.POVAR_NA_RAYONE);
}

export function runLeeshopStocks(): Promise<void> {
    return wbStocksByStore(WBStoreIdentifier.LEESHOP);
}
