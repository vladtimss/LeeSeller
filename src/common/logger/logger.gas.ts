import type { Logger } from './logger.interface';

/**
 * GAS реализация Logger
 * Использует Logger.log для вывода
 */
export const loggerGas: Logger = {
    info: (message: string): void => {
        Logger.log(`ℹ ${message}`);
    },

    success: (message: string): void => {
        Logger.log(`✓ ${message}`);
    },

    error: (message: string): void => {
        Logger.log(`✗ ${message}`);
    },
};
