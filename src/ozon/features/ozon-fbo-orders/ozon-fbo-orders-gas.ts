/**
 * Entry для сборки GAS-бандла ozon-funnel (FBO orders).
 * Экспортируем OzonStoreIdentifier и ozoFboOrdersByStore.
 * Глобальные runPovarOzonFunnel / runLeeshopOzonFunnel добавляются в бандл пост-обработкой (format-bundle).
 */
export { OzonStoreIdentifier } from '../../enums/ozon-store-identifier.enum';
export { ozoFboOrdersByStore } from './ozon-fbo-orders';
