import * as dotenv from 'dotenv';
import { pingWB } from '../../services/wb-api-service';
import { logger } from '../../../common/utils/logger';
import { WBStoreName } from '../../types/wb-store-name.enum';

dotenv.config();

/**
 * Главная функция фичи ping
 */
export async function pingWBStore(storeName: WBStoreName): Promise<void> {
    const token = process.env[storeName];
    if (!token) {
        throw new Error(`Не найден токен: ${storeName}`);
    }

    const response = await pingWB(token);

    logger.success(`✓ Успешно подключено к WB API`);
    logger.info(`  Ответ сервера: ${JSON.stringify(response, null, 2)}`);
}
