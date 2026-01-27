/**
 * Интерфейс для логирования
 */
export interface Logger {
    /**
     * Информационное сообщение
     */
    info(message: string): void;

    /**
     * Успешное выполнение
     */
    success(message: string): void;

    /**
     * Ошибка
     */
    error(message: string): void;
}
