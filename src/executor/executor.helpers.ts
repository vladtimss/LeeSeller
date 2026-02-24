import { logger } from '../common/helpers/logs/logger';
import { Marketplace } from '../common/enums/marketplace.enum';
import { Feature } from '../wildberries/enums/wb-feature.enum';
import { WBStoreIdentifier } from '../wildberries/enums/wb-store-identifier.enum';
import { OzonFeature } from '../ozon/enums/ozon-feature.enum';
import { OzonStoreIdentifier } from '../ozon/enums/ozon-store-identifier.enum';

export type ParsedFeature = Feature | OzonFeature;
export type ParsedStore = WBStoreIdentifier | OzonStoreIdentifier;

/**
 * Парсит аргументы командной строки и валидирует их
 * Ожидает формат: <marketplace> <feature> <store>
 * @returns Объект с валидированными значениями marketplace, feature и store
 * @throws Error и завершает процесс если аргументов недостаточно или они невалидны
 */
export function parseArgs(): {
    marketplace: Marketplace;
    feature: ParsedFeature;
    store: ParsedStore;
    /** Опциональный период для Ozon (since/to в YYYY-MM-DD); только для ozon-fbo-orders */
    ozonPeriod?: { since: string; to: string };
    } {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        logger.error('Недостаточно аргументов');
        logger.info('Использование: npm run executor -- <marketplace> <feature> <store> [since-date] [to-date]');
        logger.info('Пример: npm run executor -- wb ping povar-na-rayone');
        logger.info('Пример: npm run executor -- ozon ozon-fbo-orders leeshop');
        logger.info('Пример (период): npm run executor -- ozon ozon-fbo-orders leeshop 2026-02-01 2026-02-22');
        logger.info('Пример (остатки): npm run executor -- ozon ozon-stocks leeshop');
        process.exit(1);
    }

    const marketplace = Object.values(Marketplace).find((value) => value === args[0]);
    if (!marketplace) {
        logger.error(`Неизвестный маркетплейс: ${args[0]}`);
        process.exit(1);
    }

    if (marketplace === Marketplace.OZON) {
        const feature = Object.values(OzonFeature).find((value) => value === args[1]);
        if (!feature) {
            logger.error(`Неизвестная фича Ozon: ${args[1]}`);
            process.exit(1);
        }
        const store = Object.values(OzonStoreIdentifier).find((value) => value === args[2]);
        if (!store) {
            logger.error(`Неизвестный магазин Ozon: ${args[2]}`);
            process.exit(1);
        }
        const since = args[3];
        const to = args[4];
        if (since !== undefined && to !== undefined && since !== '' && to !== '') {
            const dateRe = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRe.test(since) || !dateRe.test(to)) {
                logger.error('Даты периода должны быть в формате YYYY-MM-DD (например 2026-02-01 2026-02-22)');
                process.exit(1);
            }
            return { marketplace, feature, store, ozonPeriod: { since, to } };
        }
        return { marketplace, feature, store };
    }

    const feature = Object.values(Feature).find((value) => value === args[1]);
    if (!feature) {
        logger.error(`Неизвестная фича: ${args[1]}`);
        process.exit(1);
    }

    const store = Object.values(WBStoreIdentifier).find((value) => value === args[2]);
    if (!store) {
        logger.error(`Неизвестный магазин: ${args[2]}`);
        process.exit(1);
    }

    return {
        marketplace,
        feature,
        store,
    };
}
