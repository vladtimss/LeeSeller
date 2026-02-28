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
        'function runWBPovarFunnel() {',
        '    return WBFunnel.wbFunnelByStore(WBFunnel.WBStoreIdentifier.POVAR_NA_RAYONE);',
        '}',
        '',
        'function runWBLeeshopFunnel() {',
        '    return WBFunnel.wbFunnelByStore(WBFunnel.WBStoreIdentifier.LEESHOP);',
        '}',
    ].join('\n');
    if (!content.includes('function runWBLeeshopFunnel()')) {
        content = content.trimEnd() + '\n' + gasFooter + '\n';
    }
} else if (
    (fullPath.includes('wb-stocks') && fullPath.endsWith('wb-stocks.bundle.js')) ||
    content.includes('WBStocks = (function')
) {
    // Приводим вывод Rollup к формату current-wb-stocks.js: IIFE, return { WBStoreIdentifier, wbStocksByStore }, глобальные runPovarStocks/runLeeshopStocks
    content = content.replace(/\bconst\s+WBStocks\s*=/g, 'var WBStocks =');
    content = content.replace(/var WBStocks = \(function \(exports\) \{[\r\n]+\s*'use strict';[\r\n]+/, 'var WBStocks = (function () {\n');
    if (!content.trimStart().startsWith('// Изолированный модуль для wb-stocks')) {
        content = '// Изолированный модуль для wb-stocks\n' + content;
    }

    // getYesterdayDateMoscow → getCurrentDateMoscow (как в current: без вычитания дня, только текущая дата по МСК)
    content = content.replace(
        /(\s*)\*\s*Получает вчерашнюю дату в формате YYYY-MM-DD[\s\S]*?@returns Дата вчерашнего дня\s*\*\/\s*\n\s*\*\s*Получает вчерашнюю дату по московскому времени[\s\S]*?@returns Дата вчерашнего дня по МСК\s*\*\/\s*\n\s*function getYesterdayDateMoscow\(\) \{\s*\n\s*const now = new Date\(\);\s*\n\s*\/\/ Получаем текущее время в UTC\s*\n\s*const utcTime = now\.getTime\(\);\s*\n\s*\/\/ Добавляем 3 часа \(МСК = UTC\+3\)\s*\n\s*const moscowTime = utcTime \+ 3 \* 60 \* 60 \* 1000;\s*\n\s*\/\/ Создаем дату в МСК \(сдвиг UTC\+3 уже применён в moscowTime\)\s*\n\s*const moscowDate = new Date\(moscowTime\);\s*\n\s*\/\/ Вычитаем 1 день в UTC \(как в dist — явно по календарю МСК\)\s*\n\s*moscowDate\.setUTCDate\(moscowDate\.getUTCDate\(\) - 1\);\s*\n\s*\/\/ Форматируем в YYYY-MM-DD/,
        '$1/**\n$1 * Получает текущую дату по московскому времени (UTC+3) в формате YYYY-MM-DD\n$1 * @returns Текущая дата по МСК\n$1 */\n$1function getCurrentDateMoscow() {\n$1    const now = new Date();\n$1    // Получаем текущее время в UTC\n$1    const utcTime = now.getTime();\n$1    // Добавляем 3 часа (МСК = UTC+3)\n$1    const moscowTime = utcTime + 3 * 60 * 60 * 1000;\n$1    // Создаем дату в МСК\n$1    const moscowDate = new Date(moscowTime);\n$1    // Форматируем в YYYY-MM-DD',
    );
    // Альтернативный вариант без лишних JSDoc (если в бандле только один блок)
    content = content.replace(
        /function getYesterdayDateMoscow\(\) \{\s*\n\s*const now = new Date\(\);\s*\n\s*\/\/ Получаем текущее время в UTC[\s\S]*?\/\/ Вычитаем 1 день в UTC[^\n]*\n\s*moscowDate\.setUTCDate\(moscowDate\.getUTCDate\(\) - 1\);\s*\n\s*\/\/ Форматируем в YYYY-MM-DD/,
        'function getCurrentDateMoscow() {\n        const now = new Date();\n        // Получаем текущее время в UTC\n        const utcTime = now.getTime();\n        // Добавляем 3 часа (МСК = UTC+3)\n        const moscowTime = utcTime + 3 * 60 * 60 * 1000;\n        // Создаем дату в МСК\n        const moscowDate = new Date(moscowTime);\n        // Форматируем в YYYY-MM-DD',
    );
    content = content.replace(
        /\*\s*Получает вчерашнюю дату по московскому времени \(UTC\+3\)/g,
        '* Получает текущую дату по московскому времени (UTC+3)',
    );
    content = content.replace(
        /function getYesterdayDateMoscow\(\)/g,
        'function getCurrentDateMoscow()',
    );
    content = content.replace(
        /(\s*\/\/ Создаем дату в МСК \(сдвиг UTC\+3 уже применён в moscowTime\)\s*\n\s*const moscowDate = new Date\(moscowTime\);\s*\n\s*)\/\/ Вычитаем 1 день в UTC[^\n]*\n\s*moscowDate\.setUTCDate\(moscowDate\.getUTCDate\(\) - 1\);\s*\n(\s*\/\/ Форматируем)/g,
        '$1$2',
    );

    // getPeriod: заменить тело на inline-логику из current (без вызова getYesterdayDateMoscow)
    const getPeriodInlineBlock =
        '\n        // Получаем вчерашнюю дату по МСК (используем логику из getCurrentDateMoscow)\n' +
        '        const now = new Date();\n' +
        '        const utcTime = now.getTime();\n' +
        '        const moscowTime = utcTime + 3 * 60 * 60 * 1000; // МСК = UTC+3\n' +
        '        const moscowDate = new Date(moscowTime);\n' +
        '        moscowDate.setUTCDate(moscowDate.getUTCDate() - 1); // Вчера\n' +
        '\n' +
        '        const yesterdayYear = moscowDate.getUTCFullYear();\n' +
        '        const yesterdayMonth = moscowDate.getUTCMonth();\n' +
        '        const yesterdayDay = moscowDate.getUTCDate();\n' +
        '\n' +
        '        const yesterdayDateStr = `${yesterdayYear}-${String(yesterdayMonth + 1).padStart(2, \'0\')}-${String(yesterdayDay).padStart(2, \'0\')}`;\n' +
        '\n' +
        '        // Создаем дату вчера в UTC\n' +
        '        const yesterday = new Date(Date.UTC(yesterdayYear, yesterdayMonth, yesterdayDay));\n' +
        '\n' +
        '        // Вычисляем дату 7 дней назад (6 дней назад + вчера = 7 дней)\n' +
        '        const weekAgo = new Date(yesterday);\n' +
        '        weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);\n' +
        '\n' +
        '        // Форматируем даты в YYYY-MM-DD\n' +
        '        const formatDate = (date) => {\n' +
        '            const year = date.getUTCFullYear();\n' +
        '            const month = String(date.getUTCMonth() + 1).padStart(2, \'0\');\n' +
        '            const day = String(date.getUTCDate()).padStart(2, \'0\');\n' +
        '            return `${year}-${month}-${day}`;\n' +
        '        };\n' +
        '\n' +
        '        return {\n' +
        '            start: formatDate(weekAgo),\n' +
        '            end: yesterdayDateStr,\n' +
        '        };';
    content = content.replace(
        /        \/\/ Получаем вчерашнюю дату по МСК\r?\n        const yesterdayDateStr = getYesterdayDateMoscow\(\);\r?\n        \/\/ Парсим вчерашнюю дату\r?\n        const yesterdayParts = yesterdayDateStr\.split\('-'\);\r?\n        const yesterdayYear = parseInt\(yesterdayParts\[0\], 10\);\r?\n        const yesterdayMonth = parseInt\(yesterdayParts\[1\], 10\) - 1; \/\/ месяц в Date начинается с 0\r?\n        const yesterdayDay = parseInt\(yesterdayParts\[2\], 10\);\r?\n        \/\/ Создаем дату вчера в московском времени\r?\n        const yesterday = new Date\(Date\.UTC\(yesterdayYear, yesterdayMonth, yesterdayDay\)\);\r?\n        \/\/ Вычисляем дату 7 дней назад \(6 дней назад \+ вчера = 7 дней\)\r?\n        const weekAgo = new Date\(yesterday\);\r?\n        weekAgo\.setUTCDate\(weekAgo\.getUTCDate\(\) - 6\);\r?\n        \/\/ Форматируем даты в YYYY-MM-DD\r?\n        const formatDate = \(date\) => \{\r?\n            const year = date\.getUTCFullYear\(\);\r?\n            const month = String\(date\.getUTCMonth\(\) \+ 1\)\.padStart\(2, '0'\);\r?\n            const day = String\(date\.getUTCDate\(\)\)\.padStart\(2, '0'\);\r?\n            return `\$\{year\}-\$\{month\}-\$\{day\}`;\r?\n        \};\r?\n        return \{\r?\n            start: formatDate\(weekAgo\),\r?\n            end: yesterdayDateStr,\r?\n        \};/,
        getPeriodInlineBlock,
    );

    // В current два JSDoc блока перед getCurrentDateMoscow: первый "вчерашнюю/Дата вчерашнего дня", второй "текущую/Текущая дата по МСК"
    content = content.replace(
        /\*\s*@returns Дата вчерашнего дня по МСК/g,
        '* @returns Текущая дата по МСК',
    );
    // В current два JSDoc блока перед getCurrentDateMoscow. Rollup уже даёт два блока из date-helpers — только правим второй на «текущую» и имя функции (не добавляем лишний первый блок).

    // JSDoc getPeriod: как в current
    content = content.replace(
        /Определяет период для запроса: если не передан, использует период за неделю \(7 дней\) начиная со вчера по МСК\s*\n\s*\* @param[\s\S]*?@returns Период для запроса \(start - 7 дней назад от вчера, end - вчера\)/,
        'Определяет период для запроса: если не передан, использует текущую дату по МСК\n     * @param selectedPeriod - Опциональный период для запроса\n     * @returns Период для запроса (start и end одинаковые, если не указано иное)',
    );

    // Очистка листа: комментарий и скобки как в current
    content = content.replace(
        /\/\/ Очищаем существующий лист \(как в dist: clear — содержимое и формат, строки остаются\)/,
        '// Очищаем существующий лист',
    );
    content = content.replace(
        /if \(lastRow > 0\) \{\r?\n\s+sheet\.clear\(\);  \/\/ ✅ Очищаем содержимое, но оставляем строки\r?\n\s+\}\r?\n\s+\}/,
        'if (lastRow > 0) {\n            sheet.clear();  // ✅ Очищаем содержимое, но оставляем строки\n        }\n        }',
    );
    // Убедиться что у sheet.clear() есть комментарий как в current
    content = content.replace(
        /(\s+if \(lastRow > 0\) \{\s*\n\s+)sheet\.clear\(\);\s*(\n\s+\})/,
        '$1sheet.clear();  // ✅ Очищаем содержимое, но оставляем строки$2',
    );

    // GAS unzip: добавить eslint комментарий как в current
    content = content.replace(
        /(const blob = Utilities\.newBlob\(bytes, 'application\/zip'\);)\s*\n(\s*const unzippedFiles = Utilities\.unzip\(blob\))/,
        '$1\n        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call\n$2',
    );

    // writeCsvFileGAS: формат второй строки как в current (много пробелов перед headers)
    content = content.replace(
        /function writeCsvFileGAS\(sheetName, \/\/ Имя листа[^\n]+\n\s+headers, rows, mode = WriteMode\.OVERWRITE\)/,
        "function writeCsvFileGAS(sheetName, // Имя листа (например, 'wb-funnel-povar-data')\n                             headers, rows, mode = WriteMode.OVERWRITE)",
    );

    // getPeriod: пустая строка перед "// Создаем дату вчера в UTC" как в current
    content = content.replace(
        /(const yesterdayDateStr = `\$\{yesterdayYear\}-\$\{String\(yesterdayMonth \+ 1\)\.padStart\(2, '0'\)\}-\$\{String\(yesterdayDay\)\.padStart\(2, '0'\)\}`;)\n(        \/\/ Создаем дату вчера в UTC)/,
        '$1\n\n$2',
    );

    // Хвост: заменить runPovarStocks/runLeeshopStocks внутри IIFE + admZip + exports на return + глобальные функции
    const tailReplace =
        '    // Экспортируем функции для использования из глобальной области\n' +
        '    return {\n' +
        '        WBStoreIdentifier: WBStoreIdentifier,\n' +
        '        wbStocksByStore: wbStocksByStore\n' +
        '    };\n' +
        '})();\n' +
        '\n' +
        '// Глобальные функции для запуска из Google Apps Script UI\n' +
        'function runWBPovarStocks() {\n' +
        '    return WBStocks.wbStocksByStore(WBStocks.WBStoreIdentifier.POVAR_NA_RAYONE);\n' +
        '}\n' +
        '\n' +
        'function runWBLeeshopStocks() {\n' +
        '    return WBStocks.wbStocksByStore(WBStocks.WBStoreIdentifier.LEESHOP);\n' +
        '}';
    content = content.replace(
        /    \/\*\*\s*\n\s*\*\s*Обертки для удобного вызова из Google Apps Script[\s\S]*?return exports;\s*\n\s*\n\}\)\(\{\}\);\s*$/,
        tailReplace,
    );

    // Добавить глобальные функции в конец, если ещё нет (на случай другого формата вывода Rollup)
    if (!content.includes('// Глобальные функции для запуска из Google Apps Script UI')) {
        const gasFooterStocks = [
            '',
            '// Глобальные функции для запуска из Google Apps Script UI',
            'function runWBPovarStocks() {',
            '    return WBStocks.wbStocksByStore(WBStocks.WBStoreIdentifier.POVAR_NA_RAYONE);',
            '}',
            '',
            'function runWBLeeshopStocks() {',
            '    return WBStocks.wbStocksByStore(WBStocks.WBStoreIdentifier.LEESHOP);',
            '}',
        ].join('\n');
        content = content.replace(/\}\)\(\);?(\s*)$/, '})();\n' + gasFooterStocks + '\n$1');
        content = content.replace(
            /\s*return \{\s*WBStoreIdentifier: WBStoreIdentifier,\s*wbStocksByStore: wbStocksByStore,\s*runPovarStocks: runPovarStocks,\s*runLeeshopStocks: runLeeshopStocks\s*\};?\s*\n\s*\}\)\(\);?/,
            '    // Экспортируем функции для использования из глобальной области\n    return {\n        WBStoreIdentifier: WBStoreIdentifier,\n        wbStocksByStore: wbStocksByStore\n    };\n})();',
        );
    }
} else if (
    (fullPath.includes('ozon-funnel') && fullPath.endsWith('ozon-funnel.bundle.js')) ||
    content.includes('OzonFunnel = (function')
) {
    // Ozon Funnel (FBO orders): IIFE, return { OzonStoreIdentifier, ozoFboOrdersByStore }, глобальные run*OzonFunnel
    content = content.replace(/\bconst\s+OzonFunnel\s*=/g, 'var OzonFunnel =');
    content = content.replace(/var OzonFunnel = \(function \(exports\) \{[\r\n]+\s*'use strict';[\r\n]+/, 'var OzonFunnel = (function() {\n');
    content = content.replace(
        /exports\.OzonStoreIdentifier = void 0;[\r\n]+\s*\(function \(OzonStoreIdentifier\)/,
        'var OzonStoreIdentifier;\n    (function (OzonStoreIdentifier)',
    );
    content = content.replace(
        /\}\)\(exports\.OzonStoreIdentifier \|\| \(exports\.OzonStoreIdentifier = \{\}\)\);/,
        '})(OzonStoreIdentifier || (OzonStoreIdentifier = {}));',
    );
    content = content.replace(/\bexports\.OzonStoreIdentifier\b/g, 'OzonStoreIdentifier');
    content = content.replace(
        /( *)exports\.ozoFboOrdersByStore = ozoFboOrdersByStore;[\r\n]+[\r\n]+( *)return exports;[\r\n]+[\r\n]+\}\)\(\{\}\);?/,
        '$1// Экспортируем для использования из глобальной области\n$1return {\n$1    OzonStoreIdentifier: OzonStoreIdentifier,\n$1    ozoFboOrdersByStore: ozoFboOrdersByStore\n$1};\n$2})();',
    );
    content = content.replace(
        /( *)return \{ OzonStoreIdentifier: OzonStoreIdentifier, ozoFboOrdersByStore: ozoFboOrdersByStore \};[\r\n]+( *)\)\(\);/,
        '$1// Экспортируем для использования из глобальной области\n$1return {\n$1    OzonStoreIdentifier: OzonStoreIdentifier,\n$1    ozoFboOrdersByStore: ozoFboOrdersByStore\n$1};\n$2})();',
    );
    content = content.replace(/var OzonFunnel = \(function\s+\)\(\)\s*\{/, 'var OzonFunnel = (function() {');
    if (!content.trimStart().startsWith('// Изолированный модуль для ozon-funnel')) {
        content = '// Изолированный модуль для ozon-funnel (FBO orders)\n' + content;
    }
    const ozonFunnelFooter = [
        '',
        '// Глобальные функции для запуска из Google Apps Script UI',
        'function runOzonPovarFunnel() {',
        '    return OzonFunnel.ozoFboOrdersByStore(OzonFunnel.OzonStoreIdentifier.POVAR);',
        '}',
        '',
        'function runOzonLeeshopFunnel() {',
        '    return OzonFunnel.ozoFboOrdersByStore(OzonFunnel.OzonStoreIdentifier.LEESHOP);',
        '}',
    ].join('\n');
    if (!content.includes('function runOzonLeeshopFunnel()')) {
        content = content.trimEnd() + '\n' + ozonFunnelFooter + '\n';
    }
} else if (
    (fullPath.includes('ozon-stocks') && fullPath.endsWith('ozon-stocks.bundle.js')) ||
    content.includes('OzonStocks = (function')
) {
    // Ozon Stocks: IIFE, return { OzonStoreIdentifier, ozonStocksByStore }, глобальные run*OzonStocks
    content = content.replace(/\bconst\s+OzonStocks\s*=/g, 'var OzonStocks =');
    content = content.replace(/var OzonStocks = \(function \(exports\) \{[\r\n]+\s*'use strict';[\r\n]+/, 'var OzonStocks = (function () {\n');
    content = content.replace(
        /exports\.OzonStoreIdentifier = void 0;[\r\n]+\s*\(function \(OzonStoreIdentifier\)/,
        'var OzonStoreIdentifier;\n    (function (OzonStoreIdentifier)',
    );
    content = content.replace(
        /\}\)\(exports\.OzonStoreIdentifier \|\| \(exports\.OzonStoreIdentifier = \{\}\)\);/,
        '})(OzonStoreIdentifier || (OzonStoreIdentifier = {}));',
    );
    content = content.replace(/\bexports\.OzonStoreIdentifier\b/g, 'OzonStoreIdentifier');
    content = content.replace(
        /( *)exports\.ozonStocksByStore = ozonStocksByStore;[\r\n]+[\r\n]+( *)return exports;[\r\n]+[\r\n]+\}\)\(\{\}\);?/,
        '$1// Экспортируем для использования из глобальной области\n$1return {\n$1    OzonStoreIdentifier: OzonStoreIdentifier,\n$1    ozonStocksByStore: ozonStocksByStore\n$1};\n$2})();',
    );
    content = content.replace(
        /( *)return \{ OzonStoreIdentifier: OzonStoreIdentifier, ozonStocksByStore: ozonStocksByStore \};[\r\n]+( *)\)\(\);/,
        '$1// Экспортируем для использования из глобальной области\n$1return {\n$1    OzonStoreIdentifier: OzonStoreIdentifier,\n$1    ozonStocksByStore: ozonStocksByStore\n$1};\n$2})();',
    );
    if (!content.trimStart().startsWith('// Изолированный модуль для ozon-stocks')) {
        content = '// Изолированный модуль для ozon-stocks\n' + content;
    }
    const ozonStocksFooter = [
        '',
        '// Глобальные функции для запуска из Google Apps Script UI',
        'function runOzonPovarStocks() {',
        '    return OzonStocks.ozonStocksByStore(OzonStocks.OzonStoreIdentifier.POVAR);',
        '}',
        '',
        'function runOzonLeeshopStocks() {',
        '    return OzonStocks.ozonStocksByStore(OzonStocks.OzonStoreIdentifier.LEESHOP);',
        '}',
    ].join('\n');
    if (!content.includes('function runOzonLeeshopStocks()')) {
        content = content.trimEnd() + '\n' + ozonStocksFooter + '\n';
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
    if (/^\s*var\s+WBStocks\s*=/.test(line)) {
        return line;
    }
    if (/^\s*var\s+OzonFunnel\s*=/.test(line)) {
        return line;
    }
    if (/^\s*var\s+OzonStocks\s*=/.test(line)) {
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
