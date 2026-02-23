import { WBStoreIdentifier } from '../../enums/wb-store-identifier.enum';
import { getYesterdayDateMoscow } from '../../../common/helpers/date/date-helpers';
import { getStoreShortName } from '../../helpers/wb.helpers';
import { prepareOutputDir, joinPath } from '../../../common/helpers/files/files.helper';
import { isNode } from '../../../common/helpers/runtime/runtime-env.helper';
import { logger } from '../../../common/helpers/logs/logger';
import { StockHistoryReportParams, StockReportPeriod } from './wb-stocks.types';

/**
 * Период для запроса отчета об остатках
 */
export interface SelectedPeriod {
    /** Дата начала периода в формате YYYY-MM-DD */
    start: string;
    /** Дата конца периода в формате YYYY-MM-DD */
    end: string;
}

/**
 * Определяет период для запроса: если не передан, использует период за неделю (7 дней) начиная со вчера по МСК
 * @param selectedPeriod - Опциональный период для запроса
 * @returns Период для запроса (start - 7 дней назад от вчера, end - вчера)
 */
export function getPeriod(selectedPeriod?: SelectedPeriod): SelectedPeriod {
    if (selectedPeriod) {
        return selectedPeriod;
    }

    // Получаем вчерашнюю дату по МСК
    const yesterdayDateStr = getYesterdayDateMoscow();
    
    // Парсим вчерашнюю дату
    const yesterdayParts = yesterdayDateStr.split('-');
    const yesterdayYear = parseInt(yesterdayParts[0], 10);
    const yesterdayMonth = parseInt(yesterdayParts[1], 10) - 1; // месяц в Date начинается с 0
    const yesterdayDay = parseInt(yesterdayParts[2], 10);
    
    // Создаем дату вчера в московском времени
    const yesterday = new Date(Date.UTC(yesterdayYear, yesterdayMonth, yesterdayDay));
    
    // Вычисляем дату 7 дней назад (6 дней назад + вчера = 7 дней)
    const weekAgo = new Date(yesterday);
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
    
    // Форматируем даты в YYYY-MM-DD
    const formatDate = (date: Date): string => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    return {
        start: formatDate(weekAgo),
        end: yesterdayDateStr,
    };
}

/**
 * Генерирует UUID для идентификатора задачи отчета
 * В Node.js использует crypto.randomUUID(), в GAS - Utilities.getUuid()
 * @returns UUID строка
 */
export function generateReportId(): string {
    if (isNode()) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const crypto = (globalThis as { crypto?: { randomUUID: () => string } }).crypto;
        if (crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Если crypto.randomUUID недоступен, выбрасываем ошибку
        // Требуется Node.js 14.17.0+ или использование полифилла
        throw new Error(
            'crypto.randomUUID() не доступен. Требуется Node.js 14.17.0+ или установите полифилл для UUID.',
        );
    }

    // GAS окружение
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const Utilities = (
        globalThis as {
            Utilities?: {
                getUuid: () => string;
            };
        }
    ).Utilities;

    if (!Utilities) {
        throw new Error('Utilities не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
    }

    return Utilities.getUuid();
}

/**
 * Формирует параметры запроса на создание отчета об остатках
 * @param period - Период для отчета
 * @returns Параметры запроса
 */
export function buildStockReportParams(period: SelectedPeriod): StockHistoryReportParams {
    return {
        currentPeriod: {
            start: period.start,
            end: period.end,
        } as StockReportPeriod,
        stockType: 'wb',
        skipDeletedNm: false,
        availabilityFilters: ['deficient', 'actual', 'balanced', 'nonActual', 'nonLiquid', 'invalidData'],
        orderBy: {
            field: 'ordersCount',
            mode: 'asc',
        },
    };
}

/**
 * Формирует полный путь к файлу CSV отчета об остатках
 * Подготавливает директорию и формирует путь: wb-stocks-YYYY-MM-DD-store.csv
 * @param period - Период для запроса
 * @param storeIdentifier - Идентификатор магазина WB
 * @returns Полный путь к файлу (Node.js) или имя листа (GAS)
 */
export function getWBStocksFilePath(period: SelectedPeriod, storeIdentifier: WBStoreIdentifier): string {
    // Подготавливаем директорию для сохранения файла
    const outputDirResult = prepareOutputDir();

    // Формируем имя файла: wb-stocks-YYYY-MM-DD-store.csv
    const storeShortName = getStoreShortName(storeIdentifier);
    const fileName = 'wb-stocks-' + period.start + '-' + storeShortName + '.csv';

    // Возвращаем полный путь (Node.js) или имя листа (GAS)
    // В GAS работаем с Google Sheets, поэтому возвращаем имя листа
    // В Node.js pathOrId - это путь к директории, объединяем с именем файла
    if (isNode()) {
        return joinPath(outputDirResult.pathOrId, fileName);
    } else {
        // В GAS возвращаем имя листа в формате: wb-{storeShortName}-stocks
        return 'wb-' + storeShortName + '-stocks';
    }
}

/**
 * Извлекает CSV файл из ZIP архива
 * В ZIP архиве должен быть один CSV файл
 * @param zipBuffer - Бинарные данные ZIP архива
 * @returns Содержимое CSV файла в виде строки
 * @throws Error если в архиве нет CSV файла или произошла ошибка при распаковке
 */
export async function extractCsvFromZip(zipBuffer: ArrayBuffer): Promise<string> {
    if (isNode()) {
        return extractCsvFromZipNode(zipBuffer);
    } else {
        return extractCsvFromZipGAS(zipBuffer);
    }
}

/**
 * Извлекает CSV из ZIP для Node.js окружения
 * Использует библиотеку adm-zip для распаковки
 */
async function extractCsvFromZipNode(zipBuffer: ArrayBuffer): Promise<string> {
    // Для Node.js используем библиотеку adm-zip
    // Импортируем динамически, так как библиотека может быть не установлена
    let AdmZip;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const admZipModule = await import('adm-zip');
        AdmZip = admZipModule.default;
    } catch (error) {
        if (error instanceof Error && error.message.includes('Cannot find module')) {
            throw new Error('Библиотека adm-zip не установлена. Установите: npm install adm-zip');
        }
        throw error;
    }

    const zip = new AdmZip(Buffer.from(zipBuffer));

    const zipEntries = zip.getEntries();
    if (zipEntries.length === 0) {
        throw new Error('ZIP архив пуст');
    }

    // Ищем CSV файл
    const csvEntry = zipEntries.find((entry: { entryName: string }) => entry.entryName.endsWith('.csv'));
    if (!csvEntry) {
        throw new Error('В ZIP архиве не найден CSV файл');
    }

    const csvContent = csvEntry.getData().toString('utf-8');
    logger.info('✅ CSV файл извлечен из ZIP (размер: ' + csvContent.length + ' символов)');
    return csvContent;
}

/**
 * Извлекает CSV из ZIP для GAS окружения
 * Использует Utilities.unzip()
 */
function extractCsvFromZipGAS(zipBuffer: ArrayBuffer): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const Utilities = (
        globalThis as {
            Utilities?: {
                newBlob: (bytes: number[], contentType?: string) => { getBytes: () => number[] };
                unzip: (blob: { getBytes: () => number[] }) => Array<{
                    getName: () => string;
                    getDataAsString: () => string;
                }>;
            };
        }
    ).Utilities;

    if (!Utilities) {
        throw new Error('Utilities не доступен. Убедитесь, что код запущен в Google Apps Script окружении.');
    }

    // Конвертируем ArrayBuffer в массив байтов для GAS
    const bytes: number[] = [];
    const view = new Uint8Array(zipBuffer);
    for (let i = 0; i < view.length; i++) {
        bytes.push(view[i]);
    }

    // Создаем Blob для Utilities.unzip используя Utilities.newBlob()
    // В GAS правильный способ создания Blob из байтов - через Utilities.newBlob()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const blob = Utilities.newBlob(bytes, 'application/zip');
    const unzippedFiles = Utilities.unzip(blob);

    if (unzippedFiles.length === 0) {
        throw new Error('ZIP архив пуст');
    }

    // Ищем CSV файл
    const csvFile = unzippedFiles.find((file) => file.getName().endsWith('.csv'));
    if (!csvFile) {
        throw new Error('В ZIP архиве не найден CSV файл');
    }

    const csvContent = csvFile.getDataAsString();
    logger.info('✅ CSV файл извлечен из ZIP (размер: ' + csvContent.length + ' символов)');
    return csvContent;
}
