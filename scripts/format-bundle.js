#!/usr/bin/env node

/**
 * Скрипт для форматирования бандла и замены var на const/let
 */

const fs = require('fs');
const path = require('path');

const bundlePath = process.argv[2];

if (!bundlePath) {
    console.error('❌ Ошибка: не указан путь к бандлу');
    process.exit(1);
}

const fullPath = path.resolve(process.cwd(), bundlePath);

if (!fs.existsSync(fullPath)) {
    console.error(`❌ Ошибка: файл не найден: ${fullPath}`);
    process.exit(1);
}

console.log(`📝 Форматирование бандла: ${bundlePath}`);

// Читаем файл
let content = fs.readFileSync(fullPath, 'utf-8');

const isWbFunnelGasBundle =
    (fullPath.includes('wb-funnel') && fullPath.endsWith('wb-funnel.bundle.js')) ||
    content.includes('WBFunnel = (function');

if (isWbFunnelGasBundle) {
    // Приводим вывод Rollup к формату как в current-gs.funnel.js: без exports, return { ... }; })();
    content = content.replace(/\bconst\s+WBFunnel\s*=/g, 'var WBFunnel =');
    content = content.replace(/var WBFunnel = \(function \(exports\) \{[\r\n]+\s*'use strict';[\r\n]+/, 'var WBFunnel = (function() {\n');
    content = content.replace(
        /exports\.WBStoreIdentifier = void 0;[\r\n]+\s*\(function \(WBStoreIdentifier\)/,
        'var WBStoreIdentifier;\n    (function (WBStoreIdentifier)',
    );
    content = content.replace(
        /\}\)\(exports\.WBStoreIdentifier \|\| \(exports\.WBStoreIdentifier = \{\}\)\);/,
        '})(WBStoreIdentifier || (WBStoreIdentifier = {}));',
    );
    content = content.replace(/\bexports\.WBStoreIdentifier\b/g, 'WBStoreIdentifier');
    // Захватываем только пробелы отступа ( *), чтобы не добавлять лишние переводы строк
    content = content.replace(
        /( *)exports\.wbFunnelByStore = wbFunnelByStore;[\r\n]+[\r\n]+( *)return exports;[\r\n]+[\r\n]+\}\)\(\{\}\);?/,
        '$1// Экспортируем функции для использования из глобальной области\n$1return {\n$1    WBStoreIdentifier: WBStoreIdentifier,\n$1    wbFunnelByStore: wbFunnelByStore\n$1};\n$2})();',
    );
    // Уже обработанный бандл: однострочный return → многострочный с комментарием (захват только пробелов)
    content = content.replace(
        /( *)return \{ WBStoreIdentifier: WBStoreIdentifier, wbFunnelByStore: wbFunnelByStore \};[\r\n]+( *)\)\(\);/,
        '$1// Экспортируем функции для использования из глобальной области\n$1return {\n$1    WBStoreIdentifier: WBStoreIdentifier,\n$1    wbFunnelByStore: wbFunnelByStore\n$1};\n$2})();',
    );
    // Пробел после function не нужен: (function () { → (function() {
    content = content.replace(/var WBFunnel = \(function\s+\)\(\)\s*\{/, 'var WBFunnel = (function() {');
    if (!content.trimStart().startsWith('// Изолированный модуль')) {
        content = '// Изолированный модуль для wb-funnel\n' + content;
    }
    const gasFooter = [
        '',
        '// Глобальные функции для запуска из Google Apps Script UI',
        'function runPovarFunnel() {',
        '    return WBFunnel.wbFunnelByStore(WBFunnel.WBStoreIdentifier.POVAR_NA_RAYONE);',
        '}',
        '',
        'function runLeeshopFunnel() {',
        '    return WBFunnel.wbFunnelByStore(WBFunnel.WBStoreIdentifier.LEESHOP);',
        '}',
    ].join('\n');
    if (!content.includes('function runLeeshopFunnel()')) {
        content = content.trimEnd() + '\n' + gasFooter + '\n';
    }
} else if (content.includes('var wbFunnel = (function')) {
    // Убираем IIFE обертку для остальных бандлов: var wbFunnel = (function (exports) { ... })({});
    content = content.replace(/^var\s+wbFunnel\s*=\s*\(function\s*\([^)]*\)\s*\{\s*['"]use strict['"];\s*/m, '');
    content = content.replace(/^\s*exports\.\w+\s*=\s*[^;]+;\s*$/gm, '');
    content = content.replace(/\s*return\s+exports;\s*\}\s*\)\s*\(\{\}\)\s*;?\s*$/m, '');
    content = content.replace(/^\s+/, '').replace(/\s+$/, '');
}

// Заменяем var на const, но оставляем var для:
// 1. Enum объявлений без инициализации (var EnumName;)
// 2. Переменных, которые переприсваиваются в следующей строке (IIFE pattern)
// 3. var WBFunnel (формат Google Sheet для wb-funnel)
const lines = content.split('\n');
const formattedLines = lines.map((line, index) => {
    if (/^\s*var\s+\w+;\s*$/.test(line)) {
        return line;
    }
    if (/^\s*var\s+WBFunnel\s*=/.test(line)) {
        return line;
    }
    if (index < lines.length - 1) {
        const nextLine = lines[index + 1];
        const varMatch = line.match(/^\s*var\s+(\w+)/);
        if (varMatch && nextLine.includes(`(function (${varMatch[1]})`)) {
            return line;
        }
    }
    return line.replace(/\bvar\s+/g, 'const ');
});
content = formattedLines.join('\n');

// Записываем обратно
fs.writeFileSync(fullPath, content, 'utf-8');

console.log('✅ Форматирование завершено');
