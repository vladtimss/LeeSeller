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

// Убираем IIFE обертку: var wbFunnel = (function (exports) { ... })({});
if (content.includes('var wbFunnel = (function')) {
    // Убираем начало обертки и 'use strict'
    content = content.replace(/^var\s+wbFunnel\s*=\s*\(function\s*\([^)]*\)\s*\{\s*['"]use strict['"];\s*/m, '');
    
    // Убираем строки с exports (exports.functionName = functionName;)
    content = content.replace(/^\s*exports\.\w+\s*=\s*[^;]+;\s*$/gm, '');
    
    // Убираем конец обертки (return exports; })({});
    content = content.replace(/\s*return\s+exports;\s*\}\s*\)\s*\(\{\}\)\s*;?\s*$/m, '');
    
    // Убираем лишние пустые строки в начале и конце
    content = content.replace(/^\s+/, '').replace(/\s+$/, '');
}

// Заменяем var на const, но оставляем var для:
// 1. Enum объявлений без инициализации (var EnumName;)
// 2. Переменных, которые переприсваиваются в следующей строке (IIFE pattern)
const lines = content.split('\n');
const formattedLines = lines.map((line, index) => {
    // Пропускаем enum объявления без инициализации (var EnumName;)
    if (/^\s*var\s+\w+;\s*$/.test(line)) {
        return line;
    }
    
    // Пропускаем, если следующая строка - это IIFE с этой переменной
    if (index < lines.length - 1) {
        const nextLine = lines[index + 1];
        const varMatch = line.match(/^\s*var\s+(\w+)/);
        if (varMatch && nextLine.includes(`(function (${varMatch[1]})`)) {
            return line;
        }
    }
    
    // Заменяем все остальные var на const
    return line.replace(/\bvar\s+/g, 'const ');
});
content = formattedLines.join('\n');

// Записываем обратно
fs.writeFileSync(fullPath, content, 'utf-8');

console.log('✅ Форматирование завершено');
