import { OzonStoreIdentifier } from '../../enums/ozon-store-identifier.enum';
import { getOzonCredentials } from '../../helpers/ozon.helpers';
import { fetchAllFboPostings } from '../../services/ozon-api-service';
import { adaptFboPostingToOrderCsvRows } from './adapters/ozon-fbo-orders.adapter';
import { getOzonOrdersCsvHeaders } from './adapters/ozon-fbo-orders.adapter';
import {
    getDefaultOrdersPeriod,
    buildOrdersPeriodFromDates,
    getOzonOrdersFilePath,
    writeOzonOrdersCsv,
} from './ozon-fbo-orders.helpers';
import { logger } from '../../../common/helpers/logs/logger';

/**
 * Выгружает заказы FBO за период и сохраняет CSV в формате orders-ozon-lee.csv
 * (те же колонки и порядок; при отсутствии данных в API — "Данных в API нет")
 * @param storeIdentifier
 * @param periodArg - Опциональный период в YYYY-MM-DD; если не передан — берётся вчера
 */
export async function ozoFboOrdersByStore(
    storeIdentifier: OzonStoreIdentifier,
    periodArg?: { since: string; to: string },
): Promise<void> {
    logger.info(`🚀 Запуск ozon-fbo-orders для ${storeIdentifier}`);

    const credentials = getOzonCredentials(storeIdentifier);
    const period = periodArg
        ? (() => {
            const p = buildOrdersPeriodFromDates(periodArg.since, periodArg.to);
            if (!p) {
                throw new Error(
                    // eslint-disable-next-line max-len
                    `Неверный период: дата начала (${periodArg.since}) должна быть раньше или равна дате конца (${periodArg.to})`,
                );
            }
            return p;
        })()
        : getDefaultOrdersPeriod();

    logger.info(`📅 Период: ${period.since.slice(0, 10)} — ${period.to.slice(0, 10)}`);

    const postings = await fetchAllFboPostings(credentials, {
        since: period.since,
        to: period.to,
    });

    if (postings.length === 0) {
        logger.info('⚠️  За период отправлений нет.');
        return;
    }

    const allRows: (string | number)[][] = [];
    for (const posting of postings) {
        const rows = adaptFboPostingToOrderCsvRows(posting);
        allRows.push(...rows);
    }

    const headers = getOzonOrdersCsvHeaders();
    const filePath = getOzonOrdersFilePath(period, storeIdentifier);

    writeOzonOrdersCsv(filePath, headers, allRows);

    logger.info(`✅ CSV сохранён: ${filePath} (${allRows.length} строк)`);
    logger.success('✓ Выполнение завершено успешно');
}
