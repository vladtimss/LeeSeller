/**
 * Entry для сборки GAS-бандла ozon-stocks.
 * Экспортируем OzonStoreIdentifier и ozonStocksByStore.
 * Глобальные runPovarOzonStocks / runLeeshopOzonStocks добавляются в бандл пост-обработкой (format-bundle).
 */
export { OzonStoreIdentifier } from '../../enums/ozon-store-identifier.enum';
export { ozonStocksByStore } from './ozon-stocks';
