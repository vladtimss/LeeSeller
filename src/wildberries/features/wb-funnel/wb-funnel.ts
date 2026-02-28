import { WBStoreIdentifier } from '../../enums/wb-store-identifier.enum';
import { writeCsvFile } from '../../../common/helpers/files/files.helper';
import { logger } from '../../../common/helpers/logs/logger';
import { getPeriod, SelectedPeriod, fetchWBFunnelData, getWBFunnelFilePath } from './wb-funnel.helpers';
import { adaptWBFunnelToCSVFormat } from './adapters/wb-funnel.adapter';
import { WB_FUNNEL_HEADERS } from './adapters/wb-funnel.headers.const';
import { getRuntimeEnvironment } from '../../../common/helpers/runtime/runtime-env.helper';
import { WriteMode } from '../../../common/helpers/files/files.types';
import { isNode } from '../../../common/helpers/runtime/runtime-env.helper';
import { getWBStoreDisplayName } from '../../helpers/wb.helpers';

/**
 * Главная функция фичи wb-funnel
 * Получает данные по воронке продаж из WB Analytics API и создает CSV отчет
 * @param storeIdentifier - Идентификатор магазина WB
 * @param selectedPeriod - Опциональный период для запроса. Если не указан, используется вчерашний день по МСК
 * @throws Error если токен не найден или произошла ошибка при запросе к API
 */
export async function wbFunnelByStore(
    storeIdentifier: WBStoreIdentifier,
    selectedPeriod?: SelectedPeriod,
): Promise<void> {
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

        // 4. Формируем путь к файлу / имя листа и сохраняем
        const filePathOrSheetName = getWBFunnelFilePath(period, storeIdentifier);
        const storeName = getWBStoreDisplayName(storeIdentifier);

        try {
            if (isNode()) {
                writeCsvFile(filePathOrSheetName, WB_FUNNEL_HEADERS, csvRows, WriteMode.OVERWRITE);
                logger.info(`✅ CSV файл сохранен: ${filePathOrSheetName} (${csvRows.length} строк)`);
            } else {
                const headers = ['Магазин', ...WB_FUNNEL_HEADERS];
                const enhancedRows = csvRows.map((row) => [storeName, ...row]);
                writeWBFunnelToSheetGAS(filePathOrSheetName, headers, enhancedRows, period, storeName);
                logger.info(`✅ Данные записаны в лист: ${filePathOrSheetName} (${enhancedRows.length} строк)`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`❌ Ошибка при сохранении: ${errorMessage}`);
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

/** Колонка "Дата" в листе после добавления "Магазин" (1-based). */
const WB_FUNNEL_DATE_COL = 14;

/**
 * Записывает данные воронки в лист wb-funnel-data для GAS:
 * удаляет строки по магазину за период, дописывает новые в конец.
 */
function writeWBFunnelToSheetGAS(
    sheetName: string,
    headers: string[],
    rows: (string | number | null)[][],
    period: SelectedPeriod,
    targetStore: string,
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
                            getValues: () => (string | number | Date)[][];
                            clearContent: () => void;
                        };
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
                            getValues: () => (string | number | Date)[][];
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

    const normalizeForSheet = (v: string | number | null | undefined): string | number => {
        if (v === null || v === undefined) {
            return '';
        }

        // Число → строка с запятой в качестве десятичного разделителя
        if (typeof v === 'number') {
            const str = String(v);
            return str.includes('.') ? str.replace('.', ',') : str;
        }

        const trimmed = v.trim();

        // Строка вида 10.0 / 582.00 → 10,0 / 582,00
        if (/^-?\d+\.\d+$/u.test(trimmed)) {
            return trimmed.replace('.', ',');
        }

        return v;
    };
    const lastCol = headers.length;
    const fromYmd = period.start;
    const toYmd = period.end;
    const dataStartRow = 2;

    if (headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    const normalizedRows = rows.map((row) => row.map((v) => normalizeForSheet(v)));
    const existingLastRow = sheet.getLastRow();
    let existingRows: (string | number | Date)[][] = [];

    if (existingLastRow >= dataStartRow) {
        const numExisting = existingLastRow - dataStartRow + 1;
        existingRows = sheet.getRange(dataStartRow, 1, numExisting, lastCol).getValues() as (
            | string
            | number
            | Date
        )[][];
    }

    const toYmdFromCell = (value: string | number | Date): string | null => {
        if (value instanceof Date) {
            return value.toISOString().slice(0, 10);
        }
        const str = String(value).trim();
        if (!str) {
            return null;
        }
        const m = str.match(/^(\d{2})[.-](\d{2})[.-](\d{4})$/u);
        if (m) {
            const [, dd, mm, yyyy] = m;
            return `${yyyy}-${mm}-${dd}`;
        }
        if (/^\d{4}-\d{2}-\d{2}$/u.test(str)) {
            return str;
        }
        return null;
    };

    const filteredExisting = existingRows.filter((row) => {
        const storeCell = String(row[0] ?? '').trim();
        const rawDate = row[WB_FUNNEL_DATE_COL - 1];
        const ymd = rawDate !== null ? toYmdFromCell(rawDate) : null;
        if (!storeCell || !ymd) {
            return true;
        }
        if (storeCell !== targetStore) {
            return true;
        }
        return ymd < fromYmd || ymd > toYmd;
    });

    const combined = [...filteredExisting, ...normalizedRows] as (string | number)[][];

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
export function runPovarFunnel(): Promise<void> {
    return wbFunnelByStore(WBStoreIdentifier.POVAR_NA_RAYONE);
}

export function runLeeshopFunnel(): Promise<void> {
    return wbFunnelByStore(WBStoreIdentifier.LEESHOP);
}
