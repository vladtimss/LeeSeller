/**
 * Получает переменную окружения для Google Apps Script окружения
 * Использует PropertiesService.getScriptProperties().getProperty()
 * @param key - Ключ переменной окружения
 * @returns Значение переменной окружения или null, если не найдена
 */
export function getEnvVariableGAS(key: string): string | null {
    // Получаем PropertiesService из глобального контекста GAS
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const PropertiesService = (
        globalThis as {
            PropertiesService?: {
                getScriptProperties: () => { getProperty: (key: string) => string | null };
            };
        }
    ).PropertiesService;

    if (!PropertiesService) {
        throw new Error(
            'PropertiesService не доступен. Убедитесь, что код запущен в Google Apps Script окружении.',
        );
    }

    const scriptProperties = PropertiesService.getScriptProperties();
    return scriptProperties.getProperty(key);
}
