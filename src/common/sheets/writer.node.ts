import * as path from 'path';
import * as fs from 'fs';
import { rowToCsv } from '../utils/csv-helpers';
import type { SheetWriter, SheetWriterWriteOptions } from './writer.interface';

/**
 * Читает существующий CSV файл и возвращает все строки (кроме заголовков)
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
    });
}

/**
 * Node.js реализация SheetWriter
 * Использует fs для записи CSV файлов
 */
export const sheetWriterNode: SheetWriter = {
    write(options: SheetWriterWriteOptions): void {
        const { sheetName, headers, rows, storeIdentifier, mode = 'overwrite' } = options;

        if (rows.length === 0 && mode === 'append') {
            return;
        }

        const projectRoot = process.cwd();
        const outputDir = path.join(projectRoot, 'data', 'output');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = storeIdentifier ? `${sheetName}.${storeIdentifier}.csv` : `${sheetName}.csv`;
        const filePath = path.join(outputDir, fileName);

        const csvLines: string[] = [];
        csvLines.push(rowToCsv(headers));

        if (mode === 'append') {
            const existingRows = readCsvFileRows(filePath);
            const allRows = [...existingRows, ...rows];
            for (const row of allRows) {
                csvLines.push(rowToCsv(row));
            }
        } else {
            for (const row of rows) {
                csvLines.push(rowToCsv(row));
            }
        }

        const csvContent = csvLines.join('\n') + '\n';
        fs.writeFileSync(filePath, csvContent, 'utf-8');
    },
};
