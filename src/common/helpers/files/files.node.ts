import * as path from 'path';
import * as fs from 'fs';
import { WriteMode, OutputDirResult } from './files.types';
import { buildCsvContent, mergeCsvRows, parseCsvContent } from './files.common';

/**
 * Получает корневую директорию проекта для Node.js окружения
 */
export function getProjectRootNode(): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const processObj = (globalThis as { process?: { cwd: () => string } }).process;
    if (!processObj?.cwd) {
        throw new Error('process.cwd() не доступен. Убедитесь, что код запущен в Node.js окружении.');
    }
    return processObj.cwd();
}

/**
 * Объединяет пути для Node.js окружения
 */
export function joinPathNode(...paths: string[]): string {
    return path.join(...paths);
}

/**
 * Подготавливает директорию для сохранения файлов в Node.js окружении
 */
export function prepareOutputDirNode(): OutputDirResult {
    const projectRoot = getProjectRootNode();
    const outputDir = joinPathNode(projectRoot, 'data', 'output');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    return {
        pathOrId: outputDir,
        name: 'output',
    };
}

/**
 * Читает существующий CSV файл и возвращает все строки (кроме заголовков)
 */
export function readCsvFileRowsNode(filePath: string): (string | number | null | undefined)[][] {
    if (!fs.existsSync(filePath)) {
        return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return parseCsvContent(content);
}

/**
 * Записывает CSV файл с заголовками и данными для Node.js окружения
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
        const existingRows = readCsvFileRowsNode(filePath);
        const allRows = mergeCsvRows(existingRows, rows);
        csvContent = buildCsvContent(headers, allRows);
    } else {
        csvContent = buildCsvContent(headers, rows);
    }

    fs.writeFileSync(filePath, csvContent, 'utf-8');
}
