import { logger } from '../common/helpers/logs/logger';
import { Marketplace } from '../common/enums/marketplace.enum';
import { Feature } from '../wildberries/enums/wb-feature.enum';
import { pingWBStore } from '../wildberries/features/ping/ping';
// eslint-disable-next-line max-len
import { wbFunnelByStore } from '../wildberries/features/wb-funnel/wb-funnel';
import { wbStocksByStore } from '../wildberries/features/wb-stocks/wb-stocks';
import { WBStoreIdentifier } from '../wildberries/enums/wb-store-identifier.enum';
import { OzonFeature } from '../ozon/enums/ozon-feature.enum';
import { OzonStoreIdentifier } from '../ozon/enums/ozon-store-identifier.enum';
import { ozoFboOrdersByStore } from '../ozon/features/ozon-fbo-orders/ozon-fbo-orders';
import { ozonStocksByStore } from '../ozon/features/ozon-stocks/ozon-stocks';
import { parseArgs } from './executor.helpers';

/**
 * Запускает конкретную фичу для маркетплейса Wildberries
 * @param feature - Тип фичи из enum (например, Feature.PING)
 * @param store - Идентификатор магазина WB
 * @throws Error если фича не реализована
 */
async function runWBFeature(feature: Feature, store: WBStoreIdentifier): Promise<void> {
    switch (feature) {
        case Feature.PING: {
            await pingWBStore(store);
            break;
        }
        case Feature.WB_FUNNEL: {
            await wbFunnelByStore(store);
            break;
        }
        case Feature.WB_STOCKS: {
            await wbStocksByStore(store);
            break;
        }
        default:
            throw new Error('Неизвестная фича для WB: ' + feature);
    }
}

/**
 * Запускает конкретную фичу для маркетплейса Ozon
 * @param feature
 * @param store
 * @param periodArg - Опциональный период { since, to } в YYYY-MM-DD; без него используется вчера
 */
async function runOzonFeature(
    feature: OzonFeature,
    store: OzonStoreIdentifier,
    periodArg?: { since: string; to: string },
): Promise<void> {
    switch (feature) {
        case OzonFeature.OZON_FBO_ORDERS: {
            await ozoFboOrdersByStore(store, periodArg);
            break;
        }
        case OzonFeature.OZON_STOCKS: {
            await ozonStocksByStore(store);
            break;
        }
        default:
            throw new Error('Неизвестная фича для Ozon: ' + feature);
    }
}

/**
 * Запускает фичу для указанного маркетплейса
 * Роутит выполнение в зависимости от маркетплейса (WB, Ozon)
 */
async function runFeature(
    marketplace: Marketplace,
    feature: import('./executor.helpers').ParsedFeature,
    store: import('./executor.helpers').ParsedStore,
): Promise<void> {
    if (marketplace === Marketplace.WB) {
        await runWBFeature(feature as Feature, store as WBStoreIdentifier);
    } else if (marketplace === Marketplace.OZON) {
        await runOzonFeature(feature as OzonFeature, store as OzonStoreIdentifier);
    } else {
        throw new Error(`Неизвестный маркетплейс: ${marketplace}`);
    }
}

/**
 * Главная функция executor - точка входа для запуска фич
 * Парсит аргументы командной строки, запускает соответствующую фичу и обрабатывает ошибки
 */
async function main(): Promise<void> {
    const parsed = parseArgs();

    logger.info('Запуск фичи "' + parsed.feature + '" для маркетплейса "' + parsed.marketplace + '"');

    try {
        if (parsed.marketplace === Marketplace.OZON) {
            await runOzonFeature(
                parsed.feature as OzonFeature,
                parsed.store as OzonStoreIdentifier,
                parsed.ozonPeriod,
            );
        } else {
            await runFeature(parsed.marketplace, parsed.feature, parsed.store);
        }
        logger.success('\n✓ Выполнение завершено');
    } catch (error) {
        logger.error('Ошибка: ' + (error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
}

main().catch((error) => {
    logger.error('Критическая ошибка: ' + (error instanceof Error ? error.message : String(error)));
    process.exit(1);
});
