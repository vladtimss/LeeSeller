import type { Logger } from './logger.interface';

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
 * Node.js реализация Logger
 * Использует console.log с цветным выводом
 */
export const loggerNode: Logger = {
    info: (message: string): void => {
        console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
    },

    success: (message: string): void => {
        console.log(`${colors.green}${colors.bright}${message}${colors.reset}`);
    },

    error: (message: string): void => {
        console.log(`${colors.red}${colors.bright}${message}${colors.reset}`);
    },
};
