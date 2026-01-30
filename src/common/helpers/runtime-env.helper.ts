/**
 * Типы окружений выполнения
 */
export enum RuntimeEnvironment {
    /** Node.js окружение */
    NODE = 'node',
    /** Google Apps Script окружение */
    GAS = 'gas',
}

/**
 * Определяет текущее окружение выполнения через переменную RUNTIME_ENV
 * Проверяет переменную в следующем порядке:
 * 1. process.env.RUNTIME_ENV (для Node.js)
 * 2. PropertiesService.getScriptProperties().getProperty('RUNTIME_ENV') (для Google Apps Script)
 *
 * @returns RuntimeEnvironment - текущее окружение выполнения
 * @throws Error если переменная RUNTIME_ENV не задана или имеет недопустимое значение
 */
export function getRuntimeEnvironment(): RuntimeEnvironment {
    // 1. Пробуем получить переменную из process.env (Node.js)
    // Используем globalThis и optional chaining для безопасного доступа
    // В GAS process не существует, но globalThis.process вернет undefined, а не вызовет ошибку
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
        ?.RUNTIME_ENV;
    if (nodeEnv === RuntimeEnvironment.NODE) {
        return RuntimeEnvironment.NODE;
    }
    if (nodeEnv === RuntimeEnvironment.GAS) {
        return RuntimeEnvironment.GAS;
    }

    // 2. Пробуем получить переменную из PropertiesService (Google Apps Script)
    try {
        // В Node.js PropertiesService не существует, поэтому обращение вызовет ReferenceError
        // Используем явное приведение типа для PropertiesService из Google Apps Script
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        const PropertiesService = (
            globalThis as {
                PropertiesService?: { getScriptProperties: () => { getProperty: (key: string) => string | null } };
            }
        ).PropertiesService;
        if (PropertiesService) {
            const scriptProperties = PropertiesService.getScriptProperties();
            const gasEnv = scriptProperties.getProperty('RUNTIME_ENV');
            if (gasEnv === RuntimeEnvironment.NODE) {
                return RuntimeEnvironment.NODE;
            }
            if (gasEnv === RuntimeEnvironment.GAS) {
                return RuntimeEnvironment.GAS;
            }
        }
    } catch {
        // PropertiesService не существует (значит мы в Node.js)
        // Но если process.env тоже не сработал, значит переменная не задана
    }

    // 3. Если переменная не найдена ни в одном окружении - выбрасываем ошибку
    throw new Error(
        'Переменная окружения RUNTIME_ENV не задана. ' +
            'Установите RUNTIME_ENV=node для Node.js или RUNTIME_ENV=gas для Google Apps Script. ' +
            'В Google Apps Script используйте PropertiesService через UI настроек скрипта.',
    );
}

/**
 * Проверяет, запущен ли код в Node.js окружении
 * @returns true если окружение - Node.js, иначе false
 */
export function isNode(): boolean {
    return getRuntimeEnvironment() === RuntimeEnvironment.NODE;
}

/**
 * Проверяет, запущен ли код в Google Apps Script окружении
 * @returns true если окружение - Google Apps Script, иначе false
 */
export function isGoogleAppsScript(): boolean {
    return getRuntimeEnvironment() === RuntimeEnvironment.GAS;
}
