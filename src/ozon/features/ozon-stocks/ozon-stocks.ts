import { OzonStoreIdentifier } from '../../enums/ozon-store-identifier.enum';
import { getOzonCredentials } from '../../helpers/ozon.helpers';
import { fetchProductAttributesPage, fetchAnalyticsStocks } from '../../services/ozon-api-service';
import type { OzonProductAttributesItem, OzonAnalyticsStocksItem } from './ozon-stocks.types';
import { adaptAnalyticsStockToCsvRow, getOzonStocksCsvHeaders } from './adapters/ozon-stocks.adapter';
import { getOzonStocksFilePath, writeOzonStocksCsv } from './ozon-stocks.helpers';
import { logger } from '../../../common/helpers/logs/logger';

/**
 * Получает все товары с SKU через /v4/product/info/attributes (visibility = ALL).
 */
async function fetchAllProductAttributesWithSku(
    credentials: ReturnType<typeof getOzonCredentials>,
): Promise<OzonProductAttributesItem[]> {
    const all: OzonProductAttributesItem[] = [];
    const limit = 1000;
    let lastId = '';

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const response = await fetchProductAttributesPage(credentials, {
            filter: { visibility: 'ALL' },
            limit,
            last_id: lastId || undefined,
            sort_dir: 'ASC',
        });
        const items = response.result ?? [];

        if (items.length === 0) {
            break;
        }

        if (all.length === 0) {
            logger.info(`📡 Product attributes: первая страница, получено ${items.length} товаров`);
        }

        all.push(...items);

        const total = response.total ?? 0;
        if (!response.last_id || items.length < limit || (total > 0 && all.length >= total)) {
            break;
        }

        lastId = response.last_id ?? '';
        logger.info(`📡 Product attributes: получено ${items.length} товаров (всего ${all.length})`);
    }

    return all;
}

/**
 * Разбивает массив на чанки фиксированного размера.
 */
function chunkArray<T>(items: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * Выгружает остатки товаров Ozon (товар × кластер × склад) в один CSV.
 */
export async function ozonStocksByStore(storeIdentifier: OzonStoreIdentifier): Promise<void> {
    logger.info(`🚀 Запуск ozon-stocks для ${storeIdentifier}`);

    const credentials = getOzonCredentials(storeIdentifier);
    // 1. Получаем все товары с SKU
    const products = await fetchAllProductAttributesWithSku(credentials);
    const uniqueSkus = Array.from(new Set(products.map((p) => p.sku).filter((v) => v !== null))) as number[];

    if (products.length > 0) {
        const sampleSkus = uniqueSkus.slice(0, 50);
        logger.info(`📄 Пример SKU с первой выборки (/v4/product/info/attributes): ${sampleSkus.join(', ')}`);
    }

    if (uniqueSkus.length === 0) {
        logger.info('⚠️  Не удалось получить SKU товаров по API.');
        return;
    }

    logger.info(`📡 Найдено SKU: ${uniqueSkus.length}. Запрашиваем аналитику остатков...`);

    // 2. По SKU запрашиваем аналитику остатков чанками
    const allAnalytics: OzonAnalyticsStocksItem[] = [];
    const skuChunks = chunkArray(uniqueSkus, 100);

    // eslint-disable-next-line no-restricted-syntax
    for (const chunk of skuChunks) {
        logger.info(`📄 Запрос в /v1/analytics/stocks, skus: ${chunk.join(', ')}`);
        const response = await fetchAnalyticsStocks(credentials, { skus: chunk });
        const stocks = response.items ?? [];
        allAnalytics.push(...stocks);
        logger.info(`📡 Analytics stocks: обработано SKU чанком ${chunk.length}, всего строк: ${allAnalytics.length}`);
    }

    if (allAnalytics.length === 0) {
        logger.info('⚠️  Аналитика остатков по SKU пустая.');
        return;
    }

    // 3. Формируем строки CSV
    const allRows: (string | number)[][] = allAnalytics.map((item) => adaptAnalyticsStockToCsvRow(item));

    const headers = getOzonStocksCsvHeaders();
    const filePath = getOzonStocksFilePath(storeIdentifier);

    writeOzonStocksCsv(filePath, headers, allRows);

    logger.info(`✅ CSV сохранён: ${filePath} (${allRows.length} строк)`);
    logger.success('✓ Выполнение завершено успешно');
}
