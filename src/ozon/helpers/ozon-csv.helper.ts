/**
 * Общая логика для CSV с разделителем ";" (заказы и остатки Ozon).
 * Экранирование кавычек, точки с запятой и переносов по RFC 4180.
 */

export function escapeSemicolonCsvValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
        return '';
    }
    const str = String(value);
    if (str.includes('"') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Собирает содержимое CSV: заголовок + строки, разделитель ";", UTF-8-совместимо.
 */
export function buildSemicolonCsvContent(
    headers: string[],
    rows: (string | number)[][],
): string {
    const escape = (v: string | number): string => escapeSemicolonCsvValue(v);
    const lines: string[] = [];
    lines.push(headers.map(escape).join(';'));
    for (const row of rows) {
        lines.push(row.map(escape).join(';'));
    }
    return lines.join('\n') + '\n';
}
