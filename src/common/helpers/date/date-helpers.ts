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

/**
 * Извлекает год из даты в формате YYYY-MM-DD
 * @param date - Дата в формате YYYY-MM-DD
 * @returns Год (число)
 */
export function extractYear(date: string): number {
    return parseInt(date.split('-')[0], 10);
}

/**
 * Извлекает месяц из даты в формате YYYY-MM-DD
 * @param date - Дата в формате YYYY-MM-DD
 * @returns Месяц (число от 1 до 12)
 */
export function extractMonth(date: string): number {
    return parseInt(date.split('-')[1], 10);
}

/**
 * Вычисляет номер недели года для даты (неделя начинается с понедельника)
 * Первая неделя - это неделя, содержащая 1 января
 * @param date - Дата в формате YYYY-MM-DD
 * @returns Номер недели (от 1 до 53)
 */
export function getWeekNumber(date: string): number {
    const dateObj = new Date(date + 'T00:00:00');
    const year = dateObj.getFullYear();
    
    // Находим день недели для 1 января (0 = воскресенье, 1 = понедельник, ..., 6 = суббота)
    const jan1 = new Date(year, 0, 1);
    const jan1Day = jan1.getDay();
    
    // Вычисляем смещение до первого понедельника года
    // Если 1 января - понедельник (1): первый понедельник = 1 января (смещение 0)
    // Если 1 января - вторник (2): первый понедельник = 31 декабря прошлого года (смещение -1)
    // Если 1 января - среда (3): первый понедельник = 30 декабря прошлого года (смещение -2)
    // ...
    // Если 1 января - воскресенье (0): первый понедельник = 2 января (смещение 1)
    let daysToMonday: number;
    if (jan1Day === 0) {
        // Воскресенье - первый понедельник на следующий день
        daysToMonday = 1;
    } else if (jan1Day === 1) {
        // Понедельник - первый понедельник сегодня
        daysToMonday = 0;
    } else {
        // Вторник-суббота - первый понедельник в прошлом году
        daysToMonday = -(jan1Day - 1);
    }
    
    const firstMonday = new Date(year, 0, 1 + daysToMonday);
    
    // Вычисляем разницу в днях между датой и первым понедельником
    const diffTime = dateObj.getTime() - firstMonday.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Если дата до первого понедельника, это последняя неделя прошлого года
    if (diffDays < 0) {
        // Рекурсивно вычисляем для последнего дня прошлого года
        const lastDayOfPrevYear = new Date(year - 1, 11, 31);
        const lastDayStr = `${lastDayOfPrevYear.getFullYear()}-12-31`;
        return getWeekNumber(lastDayStr);
    }
    
    // Номер недели = (разница в днях / 7) + 1
    return Math.floor(diffDays / 7) + 1;
}

/**
 * Получает вчерашнюю дату по московскому времени (UTC+3) в формате YYYY-MM-DD
 * @returns Дата вчерашнего дня по МСК
 */
export function getYesterdayDateMoscow(): string {
    const now = new Date();
    
    // Получаем текущее время в UTC
    const utcTime = now.getTime();
    
    // Добавляем 3 часа (МСК = UTC+3)
    const moscowTime = utcTime + 3 * 60 * 60 * 1000;
    
    // Создаем дату в МСК
    const moscowDate = new Date(moscowTime);
    // Вычитаем 1 день
    moscowDate.setDate(moscowDate.getDate() - 1);

    // Форматируем в YYYY-MM-DD
    const year = moscowDate.getUTCFullYear();
    const month = String(moscowDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(moscowDate.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Получает текущую дату по московскому времени (UTC+3) в формате YYYY-MM-DD
 * @returns Текущая дата по МСК
 */
export function getCurrentDateMoscow(): string {
    const now = new Date();
    
    // Получаем текущее время в UTC
    const utcTime = now.getTime();
    
    // Добавляем 3 часа (МСК = UTC+3)
    const moscowTime = utcTime + 3 * 60 * 60 * 1000;
    
    // Создаем дату в МСК
    const moscowDate = new Date(moscowTime);
    
    // Форматируем в YYYY-MM-DD
    const year = moscowDate.getUTCFullYear();
    const month = String(moscowDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(moscowDate.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}
