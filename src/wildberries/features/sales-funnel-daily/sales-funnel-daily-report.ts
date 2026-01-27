import { getWBStoreToken } from '../../helpers/wb.helpers';
import { getYesterdayDate } from '../../../common/helpers/date-helpers';
import { WBStoreIdentifier } from '../../enums/wb-store-identifier.enum';
import { logger } from '../../../common/utils/logger';
import { fetchWBData, createKeyMetricsReport, createStocksReport } from './helpers';

/**
 * Главная функция фичи Sales Funnel Daily
 * Получает данные за вчерашний день из WB Analytics API и создает отчеты по Key Metrics и Stocks
 * @param storeIdentifier - Идентификатор магазина WB
 * @throws Error если токен не найден или произошла ошибка при запросе к API
 */
export async function salesFunnelDailyReportWBStore(
    storeIdentifier: WBStoreIdentifier
): Promise<void> {
    logger.info('🚀 Запуск Sales Funnel Daily');

    // 1. Получаем токен из .env
    const token = getWBStoreToken(storeIdentifier);

    // 2. Вычисляем вчерашнюю дату (за которую получаем данные)
    const yesterdayDate = getYesterdayDate();
    logger.info(`📅 Получение данных за период: ${yesterdayDate} - ${yesterdayDate}`);

    // 3. Получаем данные из WB API
    const products = await fetchWBData(token, yesterdayDate);

    if (products.length === 0) {
        logger.info('⚠️  Данных нет. Возможно, за этот период нет статистики.');
        return;
    }

    // 4. Создаем отчет по Key Metrics (дописывается в конец файла / листа)
    createKeyMetricsReport(products, yesterdayDate, storeIdentifier);

    // 5. Создаем отчет по Stocks (перезаписывается полностью)
    createStocksReport(products, storeIdentifier);

    logger.success('✓ Выполнение завершено успешно');
}
