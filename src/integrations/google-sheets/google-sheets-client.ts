import * as fs from 'fs';
import { escapeCsvValue, rowToCsv } from '../../common/utils/csv-helpers';

/**
 * Режим записи данных в файл
 */
export enum WriteMode {
    /** Дописать в конец файла (если файл существует, читать и дописать) */
    APPEND = 'append',
    /** Перезаписать файл полностью */
    OVERWRITE = 'overwrite',
}

/**
 * Читает существующий CSV файл и возвращает все строки (кроме заголовков)
 * @param filePath - Полный путь к файлу
 * @returns Массив строк данных (без заголовков) или пустой массив, если файл не существует
 */
function readCsvFileRows(filePath: string): (string | number | null | undefined)[][] {
    if (!fs.existsSync(filePath)) {
        return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim() !== '');

    // Пропускаем заголовки (первая строка)
    if (lines.length <= 1) {
        return [];
    }

    // Парсим строки CSV (простой парсер, без учета сложных случаев)
    return lines.slice(1).map((line) => {
        // Простой парсинг CSV (для базовых случаев)
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Удвоенная кавычка - экранированная кавычка
                    current += '"';
                    i++; // Пропускаем следующую кавычку
                } else {
                    // Начало/конец кавычек
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Запятая вне кавычек - разделитель
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        // Добавляем последнее значение
        values.push(current);

        return values;
    });
}

/**
 * Записывает CSV файл с заголовками и данными
 * @param filePath - Полный путь к файлу
 * @param headers - Массив заголовков колонок
 * @param rows - Массив строк данных (каждая строка - массив значений)
 * @param mode - Режим записи: APPEND (дописать в конец) или OVERWRITE (перезаписать)
 */
export function writeCsvFile(
    filePath: string,
    headers: string[],
    rows: (string | number | null | undefined)[][],
    mode: WriteMode = WriteMode.OVERWRITE
): void {
    if (rows.length === 0 && mode === WriteMode.APPEND) {
        return;
    }

    const csvLines: string[] = [];

    // Добавляем заголовки
    csvLines.push(rowToCsv(headers));

    if (mode === WriteMode.APPEND) {
        // Читаем существующие данные (без заголовков)
        const existingRows = readCsvFileRows(filePath);
        // Объединяем существующие и новые строки
        const allRows = [...existingRows, ...rows];
        // Добавляем все строки данных
        for (const row of allRows) {
            csvLines.push(rowToCsv(row));
        }
    } else {
        // Добавляем только новые строки данных
        for (const row of rows) {
            csvLines.push(rowToCsv(row));
        }
    }

    // Записываем файл
    const csvContent = csvLines.join('\n') + '\n';
    fs.writeFileSync(filePath, csvContent, 'utf-8');
}
