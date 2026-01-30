/**
 * Парсит строку CSV в массив значений
 * Обрабатывает кавычки, экранированные кавычки, запятые внутри кавычек
 * @param line - Строка CSV для парсинга
 * @returns Массив значений из строки CSV
 */
export function parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Удвоенная кавычка - экранированная кавычка
                current += '"';
                i++; // Пропускаем следующую кавычку
            } else {
                // Начало/конец кавычек
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // Запятая вне кавычек - разделитель
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    // Добавляем последнее значение
    values.push(current);

    return values;
}

/**
 * Парсит CSV контент в массив строк данных (без заголовков)
 * @param content - CSV контент (строка)
 * @returns Массив строк данных (без заголовков) или пустой массив, если данных нет
 */
export function parseCsvContent(content: string): (string | number | null | undefined)[][] {
    const lines = content.split('\n').filter((line) => line.trim() !== '');

    // Пропускаем заголовки (первая строка)
    if (lines.length <= 1) {
        return [];
    }

    // Парсим строки CSV (без заголовков)
    return lines.slice(1).map((line) => parseCsvLine(line));
}
