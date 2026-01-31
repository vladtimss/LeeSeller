#!/usr/bin/env node

/**
 * Скрипт для сборки фичи в бандл для GAS
 * Использование: ts-node scripts/build-gas.ts <путь-к-entry>
 * Пример: ts-node scripts/build-gas.ts src/wildberries/features/wb-funnel/wb-funnel.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Получаем путь к entry point из аргументов
const entryPoint = process.argv[2];

if (!entryPoint) {
    console.error('❌ Ошибка: не указан путь к entry point');
    console.log('Использование: ts-node scripts/build-gas.ts <путь-к-entry>');
    console.log('Пример: ts-node scripts/build-gas.ts src/wildberries/features/wb-funnel/wb-funnel.ts');
    process.exit(1);
}

// Проверяем, что файл существует
const entryPath = path.resolve(process.cwd(), entryPoint);
try {
    fs.accessSync(entryPath);
} catch {
    console.error(`❌ Ошибка: файл не найден: ${entryPath}`);
    process.exit(1);
}

// Устанавливаем переменную окружения для rollup
process.env.WEBPACK_ENTRY = entryPoint.startsWith('./') ? entryPoint : `./${entryPoint}`;

console.log(`🔨 Сборка бандла для GAS...`);
console.log(`📁 Entry point: ${process.env.WEBPACK_ENTRY}`);

try {
    // Используем rollup для создания плоского бандла без модульной системы webpack
    // Rollup лучше подходит для создания читаемого ES2020 кода для GAS
    // Используем rollup.config.js который загружает TypeScript конфиг через ts-node
    execSync('rollup --config rollup.config.js', {
        stdio: 'inherit',
        cwd: process.cwd(),
    });

    // Форматируем собранный файл
    const outputPath = path.join(
        path.dirname(entryPath),
        'dist-gas',
        `${path.basename(entryPoint, path.extname(entryPoint))}.bundle.js`,
    );

    console.log('📝 Форматирование бандла...');
    // Сначала заменяем var на const
    execSync(`node scripts/format-bundle.js "${outputPath}"`, {
        stdio: 'inherit',
        cwd: process.cwd(),
    });
    // Потом форматируем через prettier
    execSync(`npx prettier --write "${outputPath}"`, {
        stdio: 'inherit',
        cwd: process.cwd(),
    });

    console.log('✅ Сборка завершена успешно!');
} catch (error) {
    console.error('❌ Ошибка при сборке');
    process.exit(1);
}
