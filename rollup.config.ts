import * as path from 'path';
import { RollupOptions, Plugin } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';

// Объявляем __dirname для TypeScript
declare const __dirname: string;

/**
 * Плагин для замены Node.js модулей на заглушки в GAS бандле
 * В GAS эти модули не используются, но нужны для компиляции
 */
function replaceNodeModules(): Plugin {
    return {
        name: 'replace-node-modules',
        resolveId(source) {
            // Заменяем Node.js модули на заглушки
            if (['path', 'fs', 'os', 'crypto', 'node-fetch', 'dotenv'].includes(source)) {
                return source; // Помечаем как resolved
            }
            return null;
        },
        load(id) {
            // Возвращаем заглушки для Node.js модулей с нужными методами
            // Используем namespace export для поддержки import * as
            if (id === 'path') {
                return `
                    const join = (...args) => args.filter(Boolean).join('/');
                    const resolve = (...args) => args.filter(Boolean).join('/');
                    const dirname = (p) => p.split('/').slice(0, -1).join('/') || '.';
                    const basename = (p, ext) => {
                        const name = p.split('/').pop() || '';
                        return ext ? name.replace(new RegExp(ext + '$'), '') : name;
                    };
                    export { join, resolve, dirname, basename };
                    export default { join, resolve, dirname, basename };
                `;
            }
            if (id === 'fs') {
                return `
                    const existsSync = () => false;
                    const mkdirSync = () => {};
                    const readFileSync = () => '';
                    const writeFileSync = () => {};
                    export { existsSync, mkdirSync, readFileSync, writeFileSync };
                    export default { existsSync, mkdirSync, readFileSync, writeFileSync };
                `;
            }
            if (id === 'dotenv') {
                return `
                    const config = () => {};
                    export { config };
                    export default { config };
                `;
            }
            if (id === 'os' || id === 'crypto' || id === 'node-fetch') {
                return 'export default {};';
            }
            return null;
        },
    };
}

/**
 * Генерирует конфигурацию rollup для сборки фичи в плоский бандл для GAS
 * @param entryPoint - Путь к entry point файлу
 * @returns Конфигурация rollup
 */
function generateRollupConfig(entryPoint: string): RollupOptions {
    const entryPath = path.resolve(__dirname, entryPoint);
    const featureDir = path.dirname(entryPath);
    const entryFileName = path.basename(entryPoint, path.extname(entryPoint));
    const outputDir = path.join(featureDir, 'dist-gas');
    const outputFileName = `${entryFileName}.bundle.js`;

    return {
        input: entryPoint,
        output: {
            file: path.join(outputDir, outputFileName),
            format: 'iife', // IIFE для плоского кода, но потом уберем обертку
            name: 'wbFunnel',
            // Не минифицируем для читаемости
            compact: false,
            // Генерируем современный ES2020 код
            generatedCode: {
                constBindings: true, // Используем const вместо var
                objectShorthand: true,
                arrowFunctions: true, // Используем arrow functions
            },
            // Не генерируем helpers для external модулей
            interop: 'auto',
        },
        plugins: [
            // Сначала заменяем Node.js модули на пустые объекты
            replaceNodeModules(),
            nodeResolve({
                // Исключаем Node.js модули
                preferBuiltins: false,
            }),
            typescript({
                tsconfig: 'tsconfig.rollup.json',
                // Исключаем типы из вывода
                declaration: false,
                declarationMap: false,
                // Переопределяем outDir, чтобы он совпадал с выходным файлом Rollup
                // Это нужно, чтобы избежать ошибки Rollup о несовпадении путей
                outDir: outputDir,
            }),
        ],
    };
}

// Получаем entry point из переменной окружения
const entryPoint = process.env.WEBPACK_ENTRY || './src/wildberries/features/wb-funnel/wb-funnel.ts';

// eslint-disable-next-line @typescript-eslint/no-require-imports
module.exports = generateRollupConfig(entryPoint);
