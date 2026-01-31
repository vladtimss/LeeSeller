import { isNode, isGoogleAppsScript } from '../runtime/runtime-env.helper';
import { getProjectRootNode, joinPathNode, prepareOutputDirNode, writeCsvFileNode } from './files.node';
import { getProjectRootGAS, joinPathGAS, prepareOutputDirGAS, writeCsvFileGAS } from './files.gas';
import { OutputDirResult, WriteMode } from './files.types';

/**
 * Получает корневую директорию/папку проекта
 */
export function getProjectRoot(): string {
    if (isNode()) {
        return getProjectRootNode();
    }
    if (isGoogleAppsScript()) {
        return getProjectRootGAS();
    }
    throw new Error('Не удалось определить окружение выполнения для getProjectRoot');
}

/**
 * Объединяет пути
 */
export function joinPath(...paths: string[]): string {
    if (isNode()) {
        return joinPathNode(...paths);
    }
    if (isGoogleAppsScript()) {
        return joinPathGAS(...paths);
    }
    throw new Error('Не удалось определить окружение выполнения для joinPath');
}

/**
 * Подготавливает директорию/папку для сохранения файлов
 */
export function prepareOutputDir(): OutputDirResult {
    if (isNode()) {
        return prepareOutputDirNode();
    }
    if (isGoogleAppsScript()) {
        return prepareOutputDirGAS();
    }
    throw new Error('Не удалось определить окружение выполнения для prepareOutputDir');
}

/**
 * Записывает CSV файл с заголовками и данными
 */
export function writeCsvFile(
    filePathOrName: string,
    headers: string[],
    rows: (string | number | null | undefined)[][],
    mode: WriteMode = WriteMode.OVERWRITE,
): void {
    if (isNode()) {
        writeCsvFileNode(filePathOrName, headers, rows, mode);
    } else if (isGoogleAppsScript()) {
        writeCsvFileGAS(filePathOrName, headers, rows, mode);
    } else {
        throw new Error('Не удалось определить окружение выполнения для writeCsvFile');
    }
}
