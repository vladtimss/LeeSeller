import { WBStoreIdentifier } from '../../enums/wb-store-identifier.enum';
import { writeCsvFile, WriteMode } from '../../../integrations/google-sheets/google-sheets-client';
import { logger } from '../../../common/helpers/logger';
import { getPeriod, SelectedPeriod, fetchWBFunnelData, getWBFunnelFilePath } from './wb-funnel.helpers';
import { adaptWBFunnelToCSVFormat } from './adapters/wb-funnel.adapter';
import { WB_FUNNEL_HEADERS } from './adapters/wb-funnel.headers.const';
import { getRuntimeEnvironment } from '../../../common/helpers/runtime-env.helper';

/**
 * Главная функция фичи wb-funnel
 * Получает данные по воронке продаж из WB Analytics API и создает CSV отчет
 * @param storeIdentifier - Идентификатор магазина WB
 * @param selectedPeriod - Опциональный период для запроса. Если не указан, используется вчерашний день по МСК
 * @throws Error если токен не найден или произошла ошибка при запросе к API
 */
export async function wbFunnelByStore(
    storeIdentifier: WBStoreIdentifier,
    selectedPeriod?: SelectedPeriod
): Promise<void> {
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
    writeCsvFile(filePath, WB_FUNNEL_HEADERS, csvRows, WriteMode.OVERWRITE);
    logger.info(`✅ CSV файл сохранен: ${filePath} (${csvRows.length} строк)`);

    logger.success('✓ Выполнение завершено успешно');
}
