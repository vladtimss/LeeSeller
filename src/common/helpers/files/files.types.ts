/**
 * Режим записи данных в файл
 */
export enum WriteMode {
    /** Дописать в конец файла (если файл существует, читать и дописать) */
    APPEND = 'append',
    /** Перезаписать файл полностью */
    OVERWRITE = 'overwrite',
}

/**
 * Результат подготовки директории/папки
 */
export interface OutputDirResult {
    /** Путь к директории (Node.js) или ID папки (GAS) */
    pathOrId: string;
    /** Имя директории/папки */
    name: string;
}
