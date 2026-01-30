import { isNode, isGoogleAppsScript } from '../../runtime-env.helper';
import { writeCsvFileNode } from './file-writer.node';
import { writeCsvFileGAS } from './file-writer.gas';
import { WriteMode } from './file-writer.types';

/**
 * Записывает CSV файл с заголовками и данными
 * Автоматически определяет окружение выполнения и использует соответствующую реализацию:
 * - Node.js: использует fs.writeFileSync для записи в файловую систему
 * - Google Apps Script: использует DriveApp для записи в Google Drive
 *
 * @param filePathOrName - Полный путь к файлу (Node.js) или имя файла (GAS)
 * @param headers - Массив заголовков колонок
 * @param rows - Массив строк данных (каждая строка - массив значений)
 * @param mode - Режим записи: APPEND (дописать в конец) или OVERWRITE (перезаписать)
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
