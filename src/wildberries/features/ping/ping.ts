import { pingWBStore as pingWBStoreAPI } from '../../services/wb-api-service';
import { logger } from '../../../common/helpers/logger';
import { WBStoreIdentifier } from '../../enums/wb-store-identifier.enum';
import { getRuntimeEnvironment } from '../../../common/helpers/runtime-env.helper';

/**
 * Главная функция фичи ping для проверки подключения к WB API
 * @param storeIdentifier - Идентификатор магазина (например, 'povar-na-rayone' или 'leeshop')
 * @throws Error если токен не найден в .env или произошла ошибка при запросе к API
 */
export async function pingWBStore(storeIdentifier: WBStoreIdentifier): Promise<void> {
    // Проверяем окружение выполнения перед запуском фичи
    const runtimeEnv = getRuntimeEnvironment();
    logger.info(`🔧 Окружение выполнения: ${runtimeEnv}`);

    const response = await pingWBStoreAPI(storeIdentifier);

    logger.success('✓ Успешно подключено к WB API');
    logger.info(`  Ответ сервера: ${JSON.stringify(response, null, 2)}`);
}
