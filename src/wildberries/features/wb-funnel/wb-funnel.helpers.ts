import { WBStoreIdentifier } from '../../enums/wb-store-identifier.enum';
import { getYesterdayDateMoscow } from '../../../common/helpers/date-helpers';
import { getStoreShortName } from '../../helpers/wb.helpers';
import { getWBSalesFunnelProducts } from '../../services/wb-api-service';
import { SalesFunnelProduct, SalesFunnelProductsRequest } from './wb-funnel.types';
import { logger } from '../../../common/helpers/logger';
import { prepareOutputDir } from '../../../common/helpers/file-helpers';
import * as path from 'path';

/**
 * Период для запроса статистики
 */
export interface SelectedPeriod {
    /** Дата начала периода в формате YYYY-MM-DD */
    start: string;
    /** Дата конца периода в формате YYYY-MM-DD */
    end: string;
}

/**
 * Тип ярлыка товара из WB API
 */
interface WBTag {
    id: number;
    name: string;
}

/**
 * Определяет период для запроса: если не передан, использует вчерашний день по МСК
 * @param selectedPeriod - Опциональный период для запроса
 * @returns Период для запроса (start и end одинаковые, если не указано иное)
 */
export function getPeriod(selectedPeriod?: SelectedPeriod): SelectedPeriod {
    if (selectedPeriod) {
        return selectedPeriod;
    }

    const yesterdayDate = getYesterdayDateMoscow();
    return {
        start: yesterdayDate,
        end: yesterdayDate,
    };
}

/**
 * Форматирует массив ярлыков товара в строку
 * @param tags - Массив ярлыков товара
 * @returns Строка с названиями ярлыков, разделенными запятой
 */
export function formatTags(tags: WBTag[]): string {
    if (!tags || tags.length === 0) {
        return '';
    }

    return tags.map((tag) => tag.name).join(', ');
}

/**
 * Получает данные по воронке продаж из WB Analytics API за указанный период
 * Инкапсулирует логику формирования запроса и получения данных
 * @param storeIdentifier - Идентификатор магазина WB
 * @param period - Период для запроса
 * @returns Промис с массивом данных по товарам
 * @throws Error если токен не найден или произошла ошибка при запросе к API
 */
export async function fetchWBFunnelData(
    storeIdentifier: WBStoreIdentifier,
    period: SelectedPeriod
): Promise<SalesFunnelProduct[]> {
    // 1. Подготавливаем запрос к API
    const request: SalesFunnelProductsRequest = {
        selectedPeriod: {
            start: period.start,
            end: period.end,
        },
        nmIds: [], // Пустой массив = все товары
        limit: 1000, // Максимальное количество товаров
        offset: 0,
    };

    // 2. Получаем данные из WB Analytics API через единый сервис
    logger.info('📡 Запрос к WB Analytics API...');
    const products = await getWBSalesFunnelProducts(storeIdentifier, request);
    logger.info(`✅ Получено товаров: ${products.length}`);

    return products;
}

/**
 * Формирует полный путь к файлу CSV отчета воронки продаж
 * Подготавливает директорию и формирует путь: wb-funnel-YYYY-MM-DD-store.csv
 * @param period - Период для запроса
 * @param storeIdentifier - Идентификатор магазина WB
 * @returns Полный путь к файлу
 */
export function getWBFunnelFilePath(
    period: SelectedPeriod,
    storeIdentifier: WBStoreIdentifier
): string {
    // Подготавливаем директорию для сохранения файла
    const outputDir = prepareOutputDir();

    // Формируем имя файла: wb-funnel-YYYY-MM-DD-store.csv
    const storeShortName = getStoreShortName(storeIdentifier);
    const fileName = `wb-funnel-${period.start}-${storeShortName}.csv`;

    // Возвращаем полный путь
    return path.join(outputDir, fileName);
}
