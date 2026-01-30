import { WriteMode, OutputDirResult } from './files.types';
import { parseCsvContent } from './files.common';

/**
 * Получает корневую папку проекта для Google Apps Script окружения
 */
export function getProjectRootGAS(): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const DriveApp = (
        globalThis as {
            DriveApp?: {
                getRootFolder: () => { getId: () => string };
            };
        }
    ).DriveApp;

    if (!DriveApp) {
        throw new Error('DriveApp не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
    }

    return DriveApp.getRootFolder().getId();
}

/**
 * Объединяет пути для Google Apps Script окружения
 */
export function joinPathGAS(...paths: string[]): string {
    return paths.filter((p) => p).join('/');
}

/**
 * Подготавливает папку для сохранения файлов в Google Apps Script окружении
 */
export function prepareOutputDirGAS(): OutputDirResult {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const DriveApp = (
        globalThis as {
            DriveApp?: {
                getRootFolder: () => {
                    getFoldersByName: (name: string) => {
                        hasNext: () => boolean;
                        next: () => {
                            getFoldersByName: (name: string) => {
                                hasNext: () => boolean;
                                next: () => { getId: () => string };
                            };
                            createFolder: (name: string) => { getId: () => string };
                        };
                    };
                    createFolder: (name: string) => {
                        getFoldersByName: (name: string) => {
                            hasNext: () => boolean;
                            next: () => { getId: () => string };
                        };
                        createFolder: (name: string) => { getId: () => string };
                    };
                };
            };
        }
    ).DriveApp;

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
 * Читает существующий CSV файл из Google Drive и возвращает все строки (кроме заголовков)
 */
export function readCsvFileRowsGAS(fileName: string): (string | number | null | undefined)[][] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const DriveApp = (
        globalThis as {
            DriveApp?: {
                getFilesByName: (name: string) => {
                    hasNext: () => boolean;
                    next: () => { getBlob: () => { getDataAsString: () => string } };
                };
            };
        }
    ).DriveApp;

    if (!DriveApp) {
        throw new Error('DriveApp не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
    }

    const files = DriveApp.getFilesByName(fileName);

    if (!files.hasNext()) {
        return [];
    }

    const content = files.next().getBlob().getDataAsString();
    return parseCsvContent(content);
}

/**
 * Нормализует значение для записи в таблицу (null/undefined → '')
 */
function normalizeValueForSheet(value: string | number | null | undefined): string | number {
    if (value === null || value === undefined) {
        return '';
    }
    return value;
}

/**
 * Нормализует все строки для setValues
 */
function normalizeRowsForSheet(rows: (string | number | null | undefined)[][]): (string | number)[][] {
    return rows.map((row) => row.map((value) => normalizeValueForSheet(value)));
}

/**
 * Возвращает лист по имени или создаёт новый
 */
function getOrCreateSheetByName(
    spreadsheet: {
        getSheetByName: (name: string) => { getName: () => string } | null;
        insertSheet: (name: string) => { getName: () => string };
    },
    sheetName: string,
): {
    getName: () => string;
    getLastRow: () => number;
    getRange: (
        row: number,
        col: number,
        numRows: number,
        numCols: number,
    ) => { setValues: (values: (string | number)[][]) => void };
} {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (sheet) {
        return sheet as {
            getName: () => string;
            getLastRow: () => number;
            getRange: (
                row: number,
                col: number,
                numRows: number,
                numCols: number,
            ) => { setValues: (values: (string | number)[][]) => void };
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const Logger = (globalThis as { Logger?: { log: (message: string) => void } }).Logger;
    if (Logger) {
        Logger.log(`Создаём новый лист: ${sheetName}`);
    }
    return spreadsheet.insertSheet(sheetName) as {
        getName: () => string;
        getLastRow: () => number;
        getRange: (
            row: number,
            col: number,
            numRows: number,
            numCols: number,
        ) => { setValues: (values: (string | number)[][]) => void };
    };
}

/**
 * Обеспечивает наличие заголовков в первой строке
 */
function ensureSheetHeaders(
    sheet: {
        getLastRow: () => number;
        getRange: (
            row: number,
            col: number,
            numRows: number,
            numCols: number,
        ) => { setValues: (values: (string | number)[][]) => void };
    },
    headers: string[],
): void {
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
}

/**
 * Дописывает строки в конец листа (для funnel)
 */
function appendRowsToSheet(
    sheet: {
        getLastRow: () => number;
        getRange: (
            row: number,
            col: number,
            numRows: number,
            numCols: number,
        ) => { setValues: (values: (string | number)[][]) => void };
    },
    headers: string[],
    rows: (string | number | null | undefined)[][],
): void {
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
export function writeCsvFileGAS(
    sheetName: string, // Имя листа (например, 'wb-funnel-povar-data')
    headers: string[],
    rows: (string | number | null | undefined)[][],
    mode: WriteMode = WriteMode.OVERWRITE,
): void {
    if (rows.length === 0 && mode === WriteMode.APPEND) {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const SpreadsheetApp = (
        globalThis as {
            SpreadsheetApp?: {
                getActiveSpreadsheet: () => {
                    getSheetByName: (name: string) => { getName: () => string } | null;
                    insertSheet: (name: string) => { getName: () => string };
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

    const sheet = getOrCreateSheetByName(spreadsheet, sheetName);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const Logger = (globalThis as { Logger?: { log: (message: string, ...args: unknown[]) => void } }).Logger;
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
