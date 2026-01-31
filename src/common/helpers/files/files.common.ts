import { rowToCsv } from './csv-helpers';

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
 * Парсит CSV контент в массив строк данных (без заголовков)
 */
export function parseCsvContent(content: string): (string | number | null | undefined)[][] {
    const lines = content.split('\n').filter((line) => line.trim() !== '');

    if (lines.length <= 1) {
        return [];
    }

    return lines.slice(1).map((line) => parseCsvLine(line));
}

/**
 * Формирует CSV контент из заголовков и строк данных
 */
export function buildCsvContent(
    headers: string[],
    rows: (string | number | null | undefined)[][],
): string {
    const csvLines: string[] = [];
    csvLines.push(rowToCsv(headers));

    for (const row of rows) {
        csvLines.push(rowToCsv(row));
    }

    return csvLines.join('\n') + '\n';
}

/**
 * Объединяет существующие строки с новыми для режима APPEND
 */
export function mergeCsvRows(
    existingRows: (string | number | null | undefined)[][],
    newRows: (string | number | null | undefined)[][],
): (string | number | null | undefined)[][] {
    return [...existingRows, ...newRows];
}
