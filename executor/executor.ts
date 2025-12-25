import { logger } from '../src/common/utils/logger';
import { pingWBStore } from '../src/wildberries/features/ping/ping';
import { WBStoreName } from '../src/wildberries/types/wb-store-name.enum';

/**
 * Парсит аргументы командной строки
 * Формат: <marketplace> <feature> <store>
 */
function parseArgs(): { marketplace: string; feature: string; store: string } {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        logger.error('Недостаточно аргументов');
        logger.info('Использование: npm run executor -- <marketplace> <feature> <store>');
        logger.info('Пример: npm run executor -- wb ping povar-na-rayone');
        logger.info('Пример: npm run executor -- wb ping leeshop');
        process.exit(1);
    }

    return {
        marketplace: args[0],
        feature: args[1],
        store: args[2],
    };
}

/**
 * Запускает фичу для WB
 */
async function runWBFeature(feature: string, store: string): Promise<void> {
    if (feature === 'ping') {
        const storeName = store === 'povar-na-rayone' 
            ? WBStoreName.POVAR_NA_RAYONE 
            : WBStoreName.LEESHOP;
        await pingWBStore(storeName);
    } else {
        throw new Error(`Неизвестная фича для WB: ${feature}`);
    }
}

/**
 * Запускает фичу
 */
async function runFeature(marketplace: string, feature: string, store: string): Promise<void> {
    if (marketplace === 'wb') {
        await runWBFeature(feature, store);
    } else if (marketplace === 'ozon') {
        throw new Error('Ozon пока не реализован');
    } else {
        throw new Error(`Неизвестный маркетплейс: ${marketplace}`);
    }
}

/**
 * Главная функция executor'а
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
