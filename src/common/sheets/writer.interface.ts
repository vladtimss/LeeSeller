export type SheetWriteMode = 'append' | 'overwrite';

/**
 * Опции записи в таблицу/файл
 */
export interface SheetWriterWriteOptions {
    /**
     * Название листа / базовое имя файла
     */
    sheetName: string;
    /**
     * Заголовки колонок
     */
    headers: string[];
    /**
     * Массив строк данных (каждая строка - массив значений)
     */
    rows: (string | number | null | undefined)[][];
    /**
     * Идентификатор магазина (нужен для формирования имени файла в Node.js)
     */
    storeIdentifier?: string;
    /**
     * Режим записи: 'append' — дописать, 'overwrite' — перезаписать.
     * По умолчанию 'overwrite'.
     */
    mode?: SheetWriteMode;
}

/**
 * Интерфейс для записи данных в таблицы/файлы
 */
export interface SheetWriter {
    /**
     * Универсальная операция записи
     */
    write(options: SheetWriterWriteOptions): void;
}

/**
 * Экспортируем реализацию по умолчанию (для Node.js)
 * При локальной разработке TypeScript автоматически использует Node.js версию
 */
export { sheetWriterNode as default } from './writer.node';
