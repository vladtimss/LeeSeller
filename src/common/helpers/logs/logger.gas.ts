/**
 * Утилита для логирования в Google Apps Script окружении
 * Использует Logger.log() для вывода сообщений (видно в Execution Transcript)
 * Цветной вывод не поддерживается в GAS
 */
export const loggerGAS = {
    /**
     * Информационное сообщение
     */
    info: (message: string): void => {
        // Используем Logger.log() если доступен, иначе console.log()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const Logger = (
            globalThis as {
                Logger?: { log: (message: string) => void };
            }
        ).Logger;

        if (Logger) {
            Logger.log(`ℹ ${message}`);
        } else {
            console.log(`ℹ ${message}`);
        }
    },

    /**
     * Успешное выполнение
     */
    success: (message: string): void => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const Logger = (
            globalThis as {
                Logger?: { log: (message: string) => void };
            }
        ).Logger;

        if (Logger) {
            Logger.log(`✓ ${message}`);
        } else {
            console.log(`✓ ${message}`);
        }
    },

    /**
     * Ошибка
     */
    error: (message: string): void => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const Logger = (
            globalThis as {
                Logger?: { log: (message: string) => void };
            }
        ).Logger;

        if (Logger) {
            Logger.log(`✗ ${message}`);
        } else {
            console.log(`✗ ${message}`);
        }
    },
};
