import { OzonStoreIdentifier } from '../../enums/ozon-store-identifier.enum';
import { getOzonCredentials, getOzonStoreDisplayName } from '../../helpers/ozon.helpers';
import { fetchAllFboPostings } from '../../services/ozon-api-service';
import { adaptFboPostingToOrderCsvRows } from './adapters/ozon-fbo-orders.adapter';
import { getOzonOrdersCsvHeaders } from './adapters/ozon-fbo-orders.adapter';
import {
    getDefaultOrdersPeriod,
    buildOrdersPeriodFromDates,
    getOzonOrdersFilePath,
    writeOzonOrdersCsv,
} from './ozon-fbo-orders.helpers';
import { logger } from '../../../common/helpers/logs/logger';
import { isNode } from '../../../common/helpers/runtime/runtime-env.helper';
import { getWeekNumber, extractYear, extractMonth } from '../../../common/helpers/date/date-helpers';

/**
 * Выгружает заказы FBO за период и сохраняет CSV в формате orders-ozon-lee.csv
 * (те же колонки и порядок; при отсутствии данных в API — "Данных в API нет")
 * @param storeIdentifier
 * @param periodArg - Опциональный период в YYYY-MM-DD; если не передан — берётся вчера
 */
export async function ozoFboOrdersByStore(
    storeIdentifier: OzonStoreIdentifier,
    periodArg?: { since: string; to: string },
): Promise<void> {
    logger.info(`🚀 Запуск ozon-fbo-orders для ${storeIdentifier}`);

    const credentials = getOzonCredentials(storeIdentifier);
    const period = periodArg
        ? (() => {
            const p = buildOrdersPeriodFromDates(periodArg.since, periodArg.to);
            if (!p) {
                throw new Error(
                    // eslint-disable-next-line max-len
                    `Неверный период: дата начала (${periodArg.since}) должна быть раньше или равна дате конца (${periodArg.to})`,
                );
            }
            return p;
        })()
        : getDefaultOrdersPeriod();

    logger.info(`📅 Период: ${period.since.slice(0, 10)} — ${period.to.slice(0, 10)}`);

    const postings = await fetchAllFboPostings(credentials, {
        since: period.since,
        to: period.to,
    });

    if (postings.length === 0) {
        logger.info('⚠️  За период отправлений нет.');
        return;
    }

    const allRows: (string | number)[][] = [];
    for (const posting of postings) {
        const rows = adaptFboPostingToOrderCsvRows(posting);
        allRows.push(...rows);
    }

    const baseHeaders = getOzonOrdersCsvHeaders();
    const headers: string[] = [
        'Магазин',
        'Принят в обработку, год',
        'Принят в обработку, мес',
        'Принят в обработку, нед',
        'Принят в обработку, дата',
        ...baseHeaders,
    ];
    const storeName = getOzonStoreDisplayName(storeIdentifier);

    const enhancedRows: (string | number)[][] = allRows.map((row) => {
        const acceptedStr = typeof row[2] === 'string' ? (row[2] as string) : '';
        if (!acceptedStr) {
            return [storeName, '', '', '', '', ...row];
        }

        const [datePart] = acceptedStr.split(' ');
        const parts = datePart.split('.');
        if (parts.length !== 3) {
            return [storeName, '', '', '', '', ...row];
        }

        const [dayStr, monthStr, yearStr] = parts;
        const isoDate = `${yearStr}-${monthStr}-${dayStr}`;

        const year = extractYear(isoDate);
        const month = extractMonth(isoDate);
        const week = getWeekNumber(isoDate);
        const displayDate = `${dayStr}.${monthStr}.${yearStr}`;

        return [storeName, year, month, week, displayDate, ...row];
    });

    const filePathOrSheetName = getOzonOrdersFilePath(period, storeIdentifier);

    if (isNode()) {
        writeOzonOrdersCsv(filePathOrSheetName, headers, enhancedRows);
        logger.info(`✅ CSV сохранён: ${filePathOrSheetName} (${enhancedRows.length} строк)`);
    } else {
        writeOzonOrdersCsvToSheetGAS(filePathOrSheetName, headers, enhancedRows);
        logger.info(`✅ Данные записаны в лист: ${filePathOrSheetName} (${enhancedRows.length} строк)`);
    }

    logger.success('✓ Выполнение завершено успешно');
}

/**
 * Перезаписывает данные в лист Google Sheets для GAS (очистка + заголовки + строки).
 * По аналогии с wb-stocks: полная перезапись листа.
 */
function writeOzonOrdersCsvToSheetGAS(
    sheetName: string,
    headers: string[],
    rows: (string | number)[][],
): void {
    const SpreadsheetApp = (
        globalThis as {
            SpreadsheetApp?: {
                getActiveSpreadsheet: () => {
                    getSheetByName: (name: string) => {
                        getLastRow: () => number;
                        clear: () => void;
                        getRange: (
                            row: number,
                            col: number,
                            numRows: number,
                            numCols: number,
                        ) => { setValues: (values: (string | number)[][]) => void };
                    } | null;
                    insertSheet: (name: string) => {
                        getLastRow: () => number;
                        clear: () => void;
                        getRange: (
                            row: number,
                            col: number,
                            numRows: number,
                            numCols: number,
                        ) => { setValues: (values: (string | number)[][]) => void };
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

    const normalize = (v: string | number): string | number => (v === null || v === undefined ? '' : v);

    const lastRow = sheet.getLastRow();
    const lastCol = headers.length;

    // Обновляем заголовок (первая строка)
    if (headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // Если нет данных в rows — просто заголовок
    if (rows.length === 0) {
        if (lastRow > 1) {
            // очищаем все данные ниже заголовка
            sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
        }
        return;
    }

    const normalizedRows = rows.map((row) => row.map(normalize));

    // Для логики фильтрации нам нужны значения Магазин и Принят в обработку, дата
    const STORE_COL = 1; // "Магазин"
    const DATE_COL = 5; // "Принят в обработку, дата"
    const targetStore = String(normalizedRows[0][STORE_COL - 1] ?? '');
    const targetDate = String(normalizedRows[0][DATE_COL - 1] ?? '');

    const dataStartRow = 2;
    const existingLastRow = sheet.getLastRow();
    let existingRows: (string | number)[][] = [];

    if (existingLastRow >= dataStartRow) {
        const numExisting = existingLastRow - dataStartRow + 1;
        existingRows = sheet.getRange(dataStartRow, 1, numExisting, lastCol).getValues() as (string | number)[][];
    }

    const filteredExisting = existingRows.filter((row) => {
        const storeCell = String(row[STORE_COL - 1] ?? '');
        const dateCell = String(row[DATE_COL - 1] ?? '');
        return !(storeCell === targetStore && dateCell === targetDate);
    });

    const combined = [...filteredExisting, ...normalizedRows];

    // очищаем старые данные
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
