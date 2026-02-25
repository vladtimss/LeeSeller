import { WBStoreIdentifier } from '../../enums/wb-store-identifier.enum';
import { logger } from '../../../common/helpers/logs/logger';
import {
    getPeriod,
    SelectedPeriod,
    generateReportId,
    buildStockReportParams,
    getWBStocksFilePath,
    extractCsvFromZip,
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

        // 1. Определяем период: если не передан, используем текущую дату по МСК
        const period = getPeriod(selectedPeriod);
        logger.info('📅 Получение данных за период: ' + period.start + ' - ' + period.end);

        // 2. Генерируем UUID для задачи
        const reportId = generateReportId();
        logger.info('🆔 ID задачи: ' + reportId);

        // 3. Формируем параметры запроса
        const params = buildStockReportParams(period);

        // 4. Создаем задачу на генерацию отчета
        const request: StockHistoryReportRequest = {
            id: reportId,
            reportType: 'STOCK_HISTORY_REPORT_CSV',
            params: params,
        };

        await createStockHistoryReport(storeIdentifier, request);

        // 5. Ожидаем готовности отчета (проверка каждые 5 сек, максимум 5 попыток)
        await waitForStockReportReady(storeIdentifier, reportId);

        // 6. Скачиваем отчет (ZIP архив)
        logger.info('📥 Скачивание отчета...');
        const zipBuffer = await downloadStockReportFile(storeIdentifier, reportId);

        // 7. Извлекаем CSV из ZIP архива
        logger.info('📦 Извлечение CSV из ZIP...');
        const csvContent = await extractCsvFromZip(zipBuffer);

        if (!csvContent || csvContent.trim().length === 0) {
            logger.info('⚠️  CSV файл пуст. Возможно, данных нет.');
            return;
        }

        // 8. Парсим CSV для получения заголовков и данных
        const csvLines = csvContent.split('\n').filter((line) => line.trim() !== '');
        if (csvLines.length === 0) {
            logger.info('⚠️  CSV файл не содержит данных.');
            return;
        }

        // Первая строка - заголовки
        const headers = parseCsvLine(csvLines[0]);
        // Остальные строки - данные
        const rows = csvLines.slice(1).map((line) => parseCsvLine(line));

        logger.info('📊 Получено строк данных: ' + rows.length);

        // 9. Формируем путь к файлу и сохраняем CSV
        const filePath = getWBStocksFilePath(period, storeIdentifier);
        if (isNode()) {
            // Для Node.js сохраняем как есть в файл
            writeCsvFile(filePath, headers, rows, WriteMode.OVERWRITE);
            logger.info('✅ CSV файл сохранен: ' + filePath + ' (' + rows.length + ' строк)');
        } else {
            // Для GAS перезаписываем лист полностью
            writeCsvFileOverwriteGAS(filePath, headers, rows);
            logger.info('✅ CSV данные сохранены в лист: ' + filePath + ' (' + rows.length + ' строк)');
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
 * Перезаписывает данные в Google Sheets лист для GAS окружения
 * Полностью очищает лист и записывает новые данные
 */
function writeCsvFileOverwriteGAS(
    sheetName: string,
    headers: string[],
    rows: (string | number | null | undefined)[][],
): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const SpreadsheetApp = (
        globalThis as {
            SpreadsheetApp?: {
                getActiveSpreadsheet: () => {
                    getSheetByName: (name: string) => {
                        getName: () => string;
                        getLastRow: () => number;
                        getMaxRows: () => number;
                        clear: () => void;
                        getRange: (
                            row: number,
                            col: number,
                            numRows: number,
                            numCols: number,
                        ) => { setValues: (values: (string | number)[][]) => void };
                    } | null;
                    insertSheet: (name: string) => {
                        getName: () => string;
                        getLastRow: () => number;
                        getMaxRows: () => number;
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

    // Получаем или создаем лист
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
    } else {
        // Очищаем существующий лист (как в dist: clear — содержимое и формат, строки остаются)
        const lastRow = sheet.getLastRow();
        if (lastRow > 0) {
            sheet.clear();
        }
    }

    // Нормализуем данные для записи
    const normalizeValue = (value: string | number | null | undefined): string | number => {
        if (value === null || value === undefined) {
            return '';
        }
        return value;
    };

    const normalizedRows = rows.map((row) => row.map((value) => normalizeValue(value)));

    // Записываем заголовки
    if (headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // Записываем данные
    if (normalizedRows.length > 0) {
        sheet.getRange(2, 1, normalizedRows.length, headers.length).setValues(normalizedRows);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const Logger = (globalThis as { Logger?: { log: (message: string, ...args: unknown[]) => void } }).Logger;
    if (Logger) {
        Logger.log('✅ Данные успешно перезаписаны в лист: ' + sheet.getName());
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
