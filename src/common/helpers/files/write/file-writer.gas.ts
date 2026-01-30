import { WriteMode } from './file-writer.types';
import { buildCsvContent, mergeCsvRows } from './file-writer.common';
import { readCsvFileRowsGAS } from '../read/file-reader.gas';

/**
 * Записывает CSV файл в Google Drive с заголовками и данными для GAS окружения
 * Использует DriveApp для создания/обновления CSV файла
 * @param fileName - Имя файла в Google Drive (будет создан или обновлен)
 * @param headers - Массив заголовков колонок
 * @param rows - Массив строк данных (каждая строка - массив значений)
 * @param mode - Режим записи: APPEND (дописать в конец) или OVERWRITE (перезаписать)
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

    // Получаем DriveApp из глобального контекста GAS
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const DriveApp = (
        globalThis as {
            DriveApp?: {
                getFilesByName: (name: string) => {
                    hasNext: () => boolean;
                    next: () => { setContent: (content: string) => void; getId: () => string };
                };
                createFile: (name: string, content: string, mimeType: string) => { getId: () => string };
                getRootFolder: () => { getId: () => string };
            };
        }
    ).DriveApp;

    if (!DriveApp) {
        throw new Error('DriveApp не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
    }

    let csvContent: string;

    if (mode === WriteMode.APPEND) {
        // Читаем существующие данные (без заголовков)
        const existingRows = readCsvFileRowsGAS(fileName);
        // Объединяем существующие и новые строки
        const allRows = mergeCsvRows(existingRows, rows);
        // Формируем CSV контент
        csvContent = buildCsvContent(headers, allRows);
    } else {
        // Формируем CSV контент только из новых строк
        csvContent = buildCsvContent(headers, rows);
    }

    // Ищем существующий файл
    const files = DriveApp.getFilesByName(fileName);

    if (files.hasNext()) {
        // Файл существует - обновляем его
        const file = files.next();
        file.setContent(csvContent);
    } else {
        // Файл не существует - создаем новый
        DriveApp.createFile(fileName, csvContent, 'text/csv');
    }
}
