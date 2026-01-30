import * as fs from 'fs';
import { WriteMode } from './file-writer.types';
import { buildCsvContent, mergeCsvRows } from './file-writer.common';
import { readCsvFileRowsNode } from '../read/file-reader.node';

/**
 * Записывает CSV файл с заголовками и данными для Node.js окружения
 * Использует fs.writeFileSync для записи файла
 * @param filePath - Полный путь к файлу
 * @param headers - Массив заголовков колонок
 * @param rows - Массив строк данных (каждая строка - массив значений)
 * @param mode - Режим записи: APPEND (дописать в конец) или OVERWRITE (перезаписать)
 */
export function writeCsvFileNode(
    filePath: string,
    headers: string[],
    rows: (string | number | null | undefined)[][],
    mode: WriteMode = WriteMode.OVERWRITE,
): void {
    if (rows.length === 0 && mode === WriteMode.APPEND) {
        return;
    }

    let csvContent: string;

    if (mode === WriteMode.APPEND) {
        // Читаем существующие данные (без заголовков)
        const existingRows = readCsvFileRowsNode(filePath);
        // Объединяем существующие и новые строки
        const allRows = mergeCsvRows(existingRows, rows);
        // Формируем CSV контент
        csvContent = buildCsvContent(headers, allRows);
    } else {
        // Формируем CSV контент только из новых строк
        csvContent = buildCsvContent(headers, rows);
    }

    // Записываем файл
    fs.writeFileSync(filePath, csvContent, 'utf-8');
}
