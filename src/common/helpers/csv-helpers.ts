/**
 * Утилиты для работы с CSV форматом
 */

/**
 * Экранирует значение для CSV (обрабатывает кавычки, запятые, переносы строк)
 * @param value - Значение для экранирования
 * @returns Экранированное значение
 */
export function escapeCsvValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
        return '';
    }

    const str = String(value);

    // Если значение содержит кавычки, запятые или переносы строк - оборачиваем в кавычки
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        // Экранируем кавычки удвоением
        return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
}

/**
 * Преобразует строку данных в CSV формат
 * @param row - Массив значений для строки
 * @returns CSV строка
 */
export function rowToCsv(row: (string | number | null | undefined)[]): string {
    return row.map(escapeCsvValue).join(',');
}
