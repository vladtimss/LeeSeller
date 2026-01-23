/**
 * Утилиты для работы с датами
 */

/**
 * Получает вчерашнюю дату в формате YYYY-MM-DD
 * @returns Дата вчерашнего дня
 */
export function getYesterdayDate(): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

/**
 * Получает текущую дату в формате YYYY-MM-DD
 * @returns Текущая дата
 */
export function getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
}
