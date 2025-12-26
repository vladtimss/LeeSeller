import { logger } from '../common/utils/logger';
import { Marketplace } from '../common/enums/marketplace.enum';
import { Feature } from '../wildberries/enums/wb-feature.enum';
import { WBStoreIdentifier } from '../wildberries/enums/wb-store-identifier.enum';

/**
 * Парсит аргументы командной строки и валидирует их
 * Ожидает формат: <marketplace> <feature> <store>
 * @returns Объект с валидированными значениями marketplace, feature и store
 * @throws Error и завершает процесс если аргументов недостаточно или они невалидны
 */
export function parseArgs(): { marketplace: Marketplace; feature: Feature; store: WBStoreIdentifier } {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        logger.error('Недостаточно аргументов');
        logger.info('Использование: npm run executor -- <marketplace> <feature> <store>');
        logger.info('Пример: npm run executor -- wb ping povar-na-rayone');
        logger.info('Пример: npm run executor -- wb ping leeshop');
        process.exit(1);
    }

    const marketplace = Object.values(Marketplace).find((value) => value === args[0]);
    if (!marketplace) {
        logger.error(`Неизвестный маркетплейс: ${args[0]}`);
        process.exit(1);
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
