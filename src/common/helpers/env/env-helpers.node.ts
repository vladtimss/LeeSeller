import * as dotenv from 'dotenv';

// Инициализируем dotenv при первом импорте (только для Node.js)
dotenv.config();

/**
 * Получает переменную окружения для Node.js окружения
 * Использует process.env после инициализации dotenv
 * @param key - Ключ переменной окружения
 * @returns Значение переменной окружения или undefined, если не найдена
 */
export function getEnvVariableNode(key: string): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[key];
}
