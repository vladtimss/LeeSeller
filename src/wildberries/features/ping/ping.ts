import * as dotenv from 'dotenv';
import { pingWB } from '../../services/wb-api-service';
import { logger } from '../../../common/utils/logger';
import { WBStoreIdentifier } from '../../enums/wb-store-identifier.enum';
import { getStoreEnvKey } from '../../helpers/wb.helpers';

dotenv.config();

/**
 * Главная функция фичи ping для проверки подключения к WB API
 * Получает токен из .env по идентификатору магазина и проверяет подключение
 * @param storeIdentifier - Идентификатор магазина (например, 'povar-na-rayone' или 'leeshop')
 * @throws Error если токен не найден в .env или произошла ошибка при запросе к API
 */
export async function pingWBStore(storeIdentifier: WBStoreIdentifier): Promise<void> {
    const envKey = getStoreEnvKey(storeIdentifier);
    const token = process.env[envKey];

    if (!token) {
        throw new Error(`Не найден токен: ${envKey}`);
    }

    const response = await pingWB(token);

    logger.success('✓ Успешно подключено к WB API');
    logger.info(`  Ответ сервера: ${JSON.stringify(response, null, 2)}`);
}
