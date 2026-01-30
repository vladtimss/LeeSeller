import { rowToCsv } from '../../csv-helpers';

/**
 * Формирует CSV контент из заголовков и строк данных
 * @param headers - Массив заголовков колонок
 * @param rows - Массив строк данных
 * @returns CSV контент (строка)
 */
export function buildCsvContent(headers: string[], rows: (string | number | null | undefined)[][]): string {
    const csvLines: string[] = [];

    // Добавляем заголовки
    csvLines.push(rowToCsv(headers));

    // Добавляем строки данных
    for (const row of rows) {
        csvLines.push(rowToCsv(row));
    }

    return csvLines.join('\n') + '\n';
}

/**
 * Объединяет существующие строки с новыми для режима APPEND
 * @param existingRows - Существующие строки (без заголовков)
 * @param newRows - Новые строки для добавления
 * @returns Объединенный массив строк
 */
export function mergeCsvRows(
    existingRows: (string | number | null | undefined)[][],
    newRows: (string | number | null | undefined)[][],
): (string | number | null | undefined)[][] {
    return [...existingRows, ...newRows];
}
