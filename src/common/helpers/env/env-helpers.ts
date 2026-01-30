import { isNode, isGoogleAppsScript } from '../runtime/runtime-env.helper';
import { getEnvVariableNode } from './env-helpers.node';
import { getEnvVariableGAS } from './env-helpers.gas';

/**
 * Получает переменную окружения
 * Автоматически определяет окружение выполнения и использует соответствующую реализацию:
 * - Node.js: использует process.env (после инициализации dotenv)
 * - Google Apps Script: использует PropertiesService.getScriptProperties().getProperty()
 *
 * @param key - Ключ переменной окружения
 * @returns Значение переменной окружения или undefined/null, если не найдена
 * @throws Error если переменная не найдена и требуется обязательное значение
 */
export function getEnvVariable(key: string): string | undefined | null {
    if (isNode()) {
        return getEnvVariableNode(key);
    }

    if (isGoogleAppsScript()) {
        return getEnvVariableGAS(key);
    }

    // Это не должно произойти, так как getRuntimeEnvironment() выбрасывает ошибку, если окружение не определено
    throw new Error('Не удалось определить окружение выполнения для getEnvVariable');
}

/**
 * Получает переменную окружения с обязательной проверкой наличия
 * @param key - Ключ переменной окружения
 * @returns Значение переменной окружения
 * @throws Error если переменная не найдена
 */
export function getEnvVariableRequired(key: string): string {
    const value = getEnvVariable(key);

    if (!value) {
        throw new Error(`Переменная окружения "${key}" не найдена`);
    }

    return value;
}
