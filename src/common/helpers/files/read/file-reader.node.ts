import * as fs from 'fs';
import { parseCsvContent } from './file-reader.common';

/**
 * Читает существующий CSV файл и возвращает все строки (кроме заголовков)
 * @param filePath - Полный путь к файлу
 * @returns Массив строк данных (без заголовков) или пустой массив, если файл не существует
 */
export function readCsvFileRowsNode(filePath: string): (string | number | null | undefined)[][] {
    if (!fs.existsSync(filePath)) {
        return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return parseCsvContent(content);
}
