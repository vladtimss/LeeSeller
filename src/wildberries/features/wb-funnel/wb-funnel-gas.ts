/**
 * Entry для сборки GAS-бандла wb-funnel.
 * Экспортируем только то, что нужно для Google Sheet: WBStoreIdentifier и wbFunnelByStore.
 * Глобальные runPovarFunnel/runLeeshopFunnel добавляются в бандл пост-обработкой (format-bundle).
 */
export { WBStoreIdentifier } from '../../enums/wb-store-identifier.enum';
export { wbFunnelByStore } from './wb-funnel';
