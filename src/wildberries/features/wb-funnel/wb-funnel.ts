import { WBStoreIdentifier } from '../../enums/wb-store-identifier.enum';
import { writeCsvFile } from '../../../common/helpers/files/files.helper';
import { logger } from '../../../common/helpers/logs/logger';
import { getPeriod, SelectedPeriod, fetchWBFunnelData, getWBFunnelFilePath } from './wb-funnel.helpers';
import { adaptWBFunnelToCSVFormat } from './adapters/wb-funnel.adapter';
import { WB_FUNNEL_HEADERS } from './adapters/wb-funnel.headers.const';
import { getRuntimeEnvironment } from '../../../common/helpers/runtime/runtime-env.helper';
import { WriteMode } from '../../../common/helpers/files/files.types';

/**
 * Главная функция фичи wb-funnel
 * Получает данные по воронке продаж из WB Analytics API и создает CSV отчет
 * @param storeIdentifier - Идентификатор магазина WB
 * @param selectedPeriod - Опциональный период для запроса. Если не указан, используется вчерашний день по МСК
 * @throws Error если токен не найден или произошла ошибка при запросе к API
 */
export async function wbFunnelByStore(
    storeIdentifier: WBStoreIdentifier,
    selectedPeriod?: SelectedPeriod,
): Promise<void> {
    try {
        // Проверяем окружение выполнения перед запуском фичи
        const runtimeEnv = getRuntimeEnvironment();
        logger.info(`🔧 Окружение выполнения: ${runtimeEnv}`);

        logger.info(`🚀 Запуск wb-funnel для ${storeIdentifier}`);

        // 1. Определяем период: если не передан, используем вчерашний день по МСК
        const period = getPeriod(selectedPeriod);
        logger.info(`📅 Получение данных за период: ${period.start} - ${period.end}`);

        // 2. Получаем данные из WB Analytics API
        const products = await fetchWBFunnelData(storeIdentifier, period);

        if (products.length === 0) {
            logger.info('⚠️  Данных нет. Возможно, за этот период нет статистики.');
            return;
        }

        // 3. Преобразуем данные в формат CSV
        logger.info('📊 Преобразование данных для CSV...');
        const csvRows = adaptWBFunnelToCSVFormat(products);

        // 4. Формируем путь к файлу и сохраняем CSV
        const filePath = getWBFunnelFilePath(period, storeIdentifier);
        try {
            writeCsvFile(filePath, WB_FUNNEL_HEADERS, csvRows, WriteMode.OVERWRITE);
            logger.info(`✅ CSV файл сохранен: ${filePath} (${csvRows.length} строк)`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`❌ Ошибка при сохранении файла: ${errorMessage}`);
        }

        logger.success('✓ Выполнение завершено успешно');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`❌ Ошибка при выполнении wb-funnel: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
            logger.error(`Stack trace: ${error.stack}`);
        }
        throw error;
    }
}

/**
 * Обертки для удобного вызова из Google Apps Script
 * Примеры обёрток под конкретные магазины
 * (запускать их удобнее из меню IDE Apps Script).
 */
export function runPovarFunnel(): Promise<void> {
    return wbFunnelByStore(WBStoreIdentifier.POVAR_NA_RAYONE);
}

export function runLeeshopFunnel(): Promise<void> {
    return wbFunnelByStore(WBStoreIdentifier.LEESHOP);
}
