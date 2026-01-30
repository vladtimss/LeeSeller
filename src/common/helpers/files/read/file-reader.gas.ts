import { parseCsvContent } from './file-reader.common';

/**
 * Читает существующий CSV файл из Google Drive и возвращает все строки (кроме заголовков)
 * @param fileName - Имя файла в Google Drive
 * @returns Массив строк данных (без заголовков) или пустой массив, если файл не существует
 */
export function readCsvFileRowsGAS(fileName: string): (string | number | null | undefined)[][] {
    // Получаем DriveApp из глобального контекста GAS
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

    const file = files.next();
    const blob = file.getBlob();
    const content = blob.getDataAsString();

    return parseCsvContent(content);
}
