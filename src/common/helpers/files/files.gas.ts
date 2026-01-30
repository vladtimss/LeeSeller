import { WriteMode, OutputDirResult } from './files.types';
import { buildCsvContent, mergeCsvRows, parseCsvContent } from './files.common';

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
 * Записывает CSV файл в Google Drive с заголовками и данными для GAS окружения
 */
export function writeCsvFileGAS(
    fileName: string,
    headers: string[],
    rows: (string | number | null | undefined)[][],
    mode: WriteMode = WriteMode.OVERWRITE,
): void {
    if (rows.length === 0 && mode === WriteMode.APPEND) {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const DriveApp = (
        globalThis as {
            DriveApp?: {
                getFilesByName: (name: string) => {
                    hasNext: () => boolean;
                    next: () => { setContent: (content: string) => void };
                };
                createFile: (name: string, content: string, mimeType: string) => void;
            };
        }
    ).DriveApp;

    if (!DriveApp) {
        throw new Error('DriveApp не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
    }

    let csvContent: string;

    if (mode === WriteMode.APPEND) {
        const existingRows = readCsvFileRowsGAS(fileName);
        const allRows = mergeCsvRows(existingRows, rows);
        csvContent = buildCsvContent(headers, allRows);
    } else {
        csvContent = buildCsvContent(headers, rows);
    }

    const files = DriveApp.getFilesByName(fileName);

    if (files.hasNext()) {
        files.next().setContent(csvContent);
    } else {
        DriveApp.createFile(fileName, csvContent, 'text/csv');
    }
}
