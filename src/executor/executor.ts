import { logger } from '../common/utils/logger';
import { Marketplace } from '../common/enums/marketplace.enum';
import { Feature } from '../wildberries/enums/wb-feature.enum';
import { pingWBStore } from '../wildberries/features/ping/ping';
import { WBStoreIdentifier } from '../wildberries/enums/wb-store-identifier.enum';
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
        default:
            throw new Error(`Неизвестная фича для WB: ${feature}`);
    }
}

/**
 * Запускает фичу для указанного маркетплейса
 * Роутит выполнение в зависимости от маркетплейса (WB, Ozon и т.д.)
 * @param marketplace - Маркетплейс из enum (Marketplace.WB или Marketplace.OZON)
 * @param feature - Тип фичи из enum
 * @param store - Идентификатор магазина
 * @throws Error если маркетплейс не реализован или фича не найдена
 */
async function runFeature(marketplace: Marketplace, feature: Feature, store: WBStoreIdentifier): Promise<void> {
    switch (marketplace) {
        case Marketplace.WB:
            await runWBFeature(feature, store);
            break;
        case Marketplace.OZON:
            throw new Error('Ozon пока не реализован');
        default:
            throw new Error(`Неизвестный маркетплейс: ${marketplace}`);
    }
}

/**
 * Главная функция executor - точка входа для запуска фич
 * Парсит аргументы командной строки, запускает соответствующую фичу и обрабатывает ошибки
 */
async function main(): Promise<void> {
    const { marketplace, feature, store } = parseArgs();

    logger.info(`Запуск фичи "${feature}" для маркетплейса "${marketplace}"`);

    try {
        await runFeature(marketplace, feature, store);
        logger.success('\n✓ Выполнение завершено');
    } catch (error) {
        logger.error(`Ошибка: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

main().catch((error) => {
    logger.error(`Критическая ошибка: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});
