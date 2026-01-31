import { isNode, isGoogleAppsScript } from '../runtime/runtime-env.helper';
import { loggerNode } from './logger.node';
import { loggerGAS } from './logger.gas';

/**
 * Утилита для логирования
 * Автоматически определяет окружение выполнения и использует соответствующую реализацию:
 * - Node.js: использует цветной вывод с ANSI кодами
 * - Google Apps Script: использует Logger.log() или console.log() без цветов
 */
export const logger = {
    /**
     * Информационное сообщение
     */
    info: (message: string): void => {
        if (isNode()) {
            loggerNode.info(message);
        } else if (isGoogleAppsScript()) {
            loggerGAS.info(message);
        } else {
            // Fallback на обычный console.log
            console.log(`ℹ ${message}`);
        }
    },

    /**
     * Успешное выполнение
     */
    success: (message: string): void => {
        if (isNode()) {
            loggerNode.success(message);
        } else if (isGoogleAppsScript()) {
            loggerGAS.success(message);
        } else {
            // Fallback на обычный console.log
            console.log(`✓ ${message}`);
        }
    },

    /**
     * Ошибка
     */
    error: (message: string): void => {
        if (isNode()) {
            loggerNode.error(message);
        } else if (isGoogleAppsScript()) {
            loggerGAS.error(message);
        } else {
            // Fallback на обычный console.log
            console.log(`✗ ${message}`);
        }
    },
};
