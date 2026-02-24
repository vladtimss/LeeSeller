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

    // Путь к бандлу (для wb-funnel-gas entry Rollup пишет в wb-funnel.bundle.js — как в rollup.config)
    const entryBasename = path.basename(entryPoint, path.extname(entryPoint));
    const bundleFileName =
        entryBasename === 'wb-funnel-gas' ? 'wb-funnel.bundle.js' : `${entryBasename}.bundle.js`;
    const outputPath = path.join(path.dirname(entryPath), 'dist-gas', bundleFileName);

    console.log('📝 Форматирование бандла...');
    execSync(`node scripts/format-bundle.js "${outputPath}"`, {
        stdio: 'inherit',
        cwd: process.cwd(),
    });
    // Prettier не запускаем для wb-funnel.bundle.js — сохраняем точный формат (return { ... }, (function() {)
    if (!outputPath.endsWith('wb-funnel.bundle.js')) {
        execSync(`npx prettier --write "${outputPath}"`, {
            stdio: 'inherit',
            cwd: process.cwd(),
        });
    }

    console.log('✅ Сборка завершена успешно!');
} catch (error) {
    console.error('❌ Ошибка при сборке');
    process.exit(1);
}
