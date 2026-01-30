/**
 * ANSI коды для цветного вывода в консоль
 */
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
};

/**
 * Утилита для красивого логирования в консоль для Node.js окружения
 * Поддерживает цветной вывод с использованием ANSI кодов
 */
export const loggerNode = {
    /**
     * Информационное сообщение (голубой цвет)
     */
    info: (message: string): void => {
        console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
    },

    /**
     * Успешное выполнение (зеленый цвет, жирный)
     */
    success: (message: string): void => {
        console.log(`${colors.green}${colors.bright}${message}${colors.reset}`);
    },

    /**
     * Ошибка (красный цвет, жирный)
     */
    error: (message: string): void => {
        console.log(`${colors.red}${colors.bright}${message}${colors.reset}`);
    },
};
