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
    OzonOrdersPeriod,
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
        const displayDate = `${dayStr}-${monthStr}-${yearStr}`;

        return [storeName, year, month, week, displayDate, ...row];
    });

    const filePathOrSheetName = getOzonOrdersFilePath(period, storeIdentifier);

    if (isNode()) {
        writeOzonOrdersCsv(filePathOrSheetName, headers, enhancedRows);
        logger.info(`✅ CSV сохранён: ${filePathOrSheetName} (${enhancedRows.length} строк)`);
    } else {
        writeOzonOrdersCsvToSheetGAS(filePathOrSheetName, headers, enhancedRows, period);
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
    period: OzonOrdersPeriod,
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
                        ) => {
                            setValues: (values: (string | number)[][]) => void;
                            getValues: () => (string | number)[][];
                            clearContent: () => void;
                            sort: (
                                spec: { column: number; ascending: boolean } | { column: number; ascending: boolean }[],
                            ) => void;
                        };
                        deleteRows: (rowPosition: number, howMany: number) => void;
                    } | null;
                    insertSheet: (name: string) => {
                        getLastRow: () => number;
                        clear: () => void;
                        getRange: (
                            row: number,
                            col: number,
                            numRows: number,
                            numCols: number,
                        ) => {
                            setValues: (values: (string | number)[][]) => void;
                            getValues: () => (string | number)[][];
                            clearContent: () => void;
                            sort: (
                                spec: { column: number; ascending: boolean } | { column: number; ascending: boolean }[],
                            ) => void;
                        };
                        deleteRows: (rowPosition: number, howMany: number) => void;
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

    const normalizeForSheet = (v: string | number): string | number => {
        if (v === null || v === undefined) {
            return '';
        }

        if (typeof v === 'number') {
            const str = String(v);
            return str.includes('.') ? str.replace('.', ',') : str;
        }

        const trimmed = v.trim();
        if (/^-?\d+\.\d+$/u.test(trimmed)) {
            return trimmed.replace('.', ',');
        }

        return v;
    };
    const lastCol = headers.length;

    // Обновляем заголовок (первая строка)
    if (headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // Если нет данных в rows — просто заголовок
    const lastRow = sheet.getLastRow();
    if (rows.length === 0) {
        if (lastRow > 1) {
            // очищаем все данные ниже заголовка
            sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
        }
        return;
    }

    const normalizedRows = rows.map((row) => row.map(normalizeForSheet));

    const STORE_COL = 1; // "Магазин"
    const DATE_COL = 5; // "Принят в обработку, дата"
    const targetStore = String(normalizedRows[0][STORE_COL - 1] ?? '').trim();

    const fromYmd = period.since.slice(0, 10); // YYYY-MM-DD
    const toYmd = period.to.slice(0, 10); // YYYY-MM-DD

    const toYmdFromCell = (value: string | number | Date): string | null => {
        if (value instanceof Date) {
            return value.toISOString().slice(0, 10);
        }
        const str = String(value).trim();
        if (!str) {
            return null;
        }
        // Форматы DD.MM.YYYY или DD-MM-YYYY
        const m = str.match(/^(\d{2})[.-](\d{2})[.-](\d{4})$/u);
        if (m) {
            const [, dd, mm, yyyy] = m;
            return `${yyyy}-${mm}-${dd}`;
        }
        // Уже YYYY-MM-DD
        const mIso = str.match(/^\d{4}-\d{2}-\d{2}$/u);
        if (mIso) {
            return str;
        }
        return null;
    };

    const dataStartRow = 2;
    const existingLastRow = sheet.getLastRow();
    const rowsToDelete: number[] = [];

    if (existingLastRow >= dataStartRow) {
        const numExisting = existingLastRow - dataStartRow + 1;
        sheet.getRange(dataStartRow, 1, numExisting, lastCol).sort([
            { column: STORE_COL, ascending: true },
            { column: DATE_COL, ascending: true },
        ]);
        const colStore = sheet.getRange(dataStartRow, STORE_COL, numExisting, 1).getValues() as (
            | string
            | number
            | Date
        )[][];
        const colDate = sheet.getRange(dataStartRow, DATE_COL, numExisting, 1).getValues() as (
            | string
            | number
            | Date
        )[][];
        for (let i = 0; i < numExisting; i++) {
            const storeCell = String(colStore[i][0] ?? '').trim();
            const rawDateCell = colDate[i][0];
            const ymd = rawDateCell !== null && rawDateCell !== undefined ? toYmdFromCell(rawDateCell) : null;
            if (!storeCell || !ymd || storeCell !== targetStore) {
                continue;
            }
            if (ymd >= fromYmd && ymd <= toYmd) {
                rowsToDelete.push(dataStartRow + i);
            }
        }
    }

    const Logger = (globalThis as { Logger?: { log: (message: string) => void } }).Logger;

    if (rowsToDelete.length === 0) {
        if (Logger) {
            Logger.log(
                // eslint-disable-next-line max-len
                `📋 Данных за период ${fromYmd}–${toYmd} в листе нет — дописываем в конец (${normalizedRows.length} строк)`,
            );
        }
        if (headers.length > 0) {
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        }
        if (normalizedRows.length > 0) {
            const startRow = existingLastRow >= dataStartRow ? existingLastRow + 1 : dataStartRow;
            sheet.getRange(startRow, 1, normalizedRows.length, lastCol).setValues(normalizedRows);
        }
        if (Logger) {
            Logger.log('✅ Данные записаны в лист: ' + sheetName);
        }
        return;
    }

    if (Logger) {
        Logger.log(
            `🔄 Найдено строк за период (дубликаты): ${rowsToDelete.length}. Удаляем пачками, затем дописываем ${normalizedRows.length} новых строк.`,
        );
    }
    const sortedDesc = [...rowsToDelete].sort((a, b) => b - a);
    const runs: { startRow: number; count: number }[] = [];
    for (let i = 0; i < sortedDesc.length; i++) {
        const row = sortedDesc[i];
        if (runs.length > 0 && runs[runs.length - 1].startRow === row + 1) {
            runs[runs.length - 1].startRow = row;
            runs[runs.length - 1].count += 1;
        } else {
            runs.push({ startRow: row, count: 1 });
        }
    }
    for (const { startRow, count } of runs) {
        sheet.deleteRows(startRow, count);
    }

    const startRow = existingLastRow - rowsToDelete.length + 1;
    if (normalizedRows.length > 0) {
        sheet.getRange(startRow, 1, normalizedRows.length, lastCol).setValues(normalizedRows);
    }

    if (Logger) {
        Logger.log('✅ Данные записаны в лист: ' + sheetName);
    }
}
