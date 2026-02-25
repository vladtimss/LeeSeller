import { OzonStoreIdentifier } from '../../enums/ozon-store-identifier.enum';
import { getOzonCredentials } from '../../helpers/ozon.helpers';
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

    const headers = getOzonOrdersCsvHeaders();
    const filePathOrSheetName = getOzonOrdersFilePath(period, storeIdentifier);

    if (isNode()) {
        writeOzonOrdersCsv(filePathOrSheetName, headers, allRows);
        logger.info(`✅ CSV сохранён: ${filePathOrSheetName} (${allRows.length} строк)`);
    } else {
        writeOzonOrdersCsvToSheetGAS(filePathOrSheetName, headers, allRows);
        logger.info(`✅ Данные записаны в лист: ${filePathOrSheetName} (${allRows.length} строк)`);
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
    } else {
        const lastRow = sheet.getLastRow();
        if (lastRow > 0) {
            sheet.clear();
        }
    }

    const normalize = (v: string | number): string | number => (v === null || v === undefined ? '' : v);
    const normalizedRows = rows.map((row) => row.map(normalize));

    if (headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    if (normalizedRows.length > 0) {
        sheet.getRange(2, 1, normalizedRows.length, headers.length).setValues(normalizedRows);
    }

    const Logger = (globalThis as { Logger?: { log: (message: string) => void } }).Logger;
    if (Logger) {
        Logger.log('✅ Данные записаны в лист: ' + sheetName);
    }
}
