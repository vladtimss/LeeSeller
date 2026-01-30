import * as path from 'path';
import * as fs from 'fs';

/**
 * Подготавливает директорию для сохранения файлов
 * Создает директорию data/output, если её нет
 * @returns Путь к директории output
 */
export function prepareOutputDir(): string {
    const projectRoot = process.cwd();
    const outputDir = path.join(projectRoot, 'data', 'output');

    // Создаем директорию, если её нет
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    return outputDir;
}
