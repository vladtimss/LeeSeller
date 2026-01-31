/**
 * Типы для WB Analytics API - Отчет об остатках (Stock History Report)
 * API: https://seller-analytics-api.wildberries.ru/api/v2/nm-report/downloads
 * Документация: https://dev.wildberries.ru/openapi/analytics#tag/Analitika-prodavca-CSV
 */

// ============================================================================
// Типы для запроса создания отчета
// ============================================================================

/**
 * Период для запроса отчета
 */
export interface StockReportPeriod {
    /** Дата начала периода в формате YYYY-MM-DD */
    start: string;
    /** Дата конца периода в формате YYYY-MM-DD */
    end: string;
}

/**
 * Параметры сортировки для отчета
 */
export interface StockReportOrderBy {
    /** Поле для сортировки (например, 'ordersCount') */
    field: string;
    /** Режим сортировки: 'asc' или 'desc' */
    mode: 'asc' | 'desc';
}

/**
 * Параметры запроса на создание отчета об остатках
 */
export interface StockHistoryReportParams {
    /** Период для отчета */
    currentPeriod: StockReportPeriod;
    /** Тип склада: 'wb' - склады WB, 'mp' - склады маркетплейса */
    stockType: 'wb' | 'mp';
    /** Пропускать удаленные товары */
    skipDeletedNm: boolean;
    /** Фильтры по доступности товаров */
    availabilityFilters: Array<
        'deficient' | 'actual' | 'balanced' | 'nonActual' | 'nonLiquid' | 'invalidData'
    >;
    /** Параметры сортировки */
    orderBy: StockReportOrderBy;
}

/**
 * Запрос на создание отчета об остатках
 */
export interface StockHistoryReportRequest {
    /** Уникальный идентификатор задачи (UUID) */
    id: string;
    /** Тип отчета */
    reportType: 'STOCK_HISTORY_REPORT_CSV';
    /** Параметры отчета */
    params: StockHistoryReportParams;
}

// ============================================================================
// Типы для ответов API
// ============================================================================

/**
 * Ответ при создании задачи на генерацию отчета
 */
export interface CreateReportResponse {
    /** Идентификатор задачи */
    id: string;
    /** Статус задачи */
    status?: string;
}

/**
 * Статус отчета
 */
export type ReportStatus = 'pending' | 'processing' | 'ready' | 'error';

/**
 * Ответ при проверке статуса отчета
 */
export interface ReportStatusResponse {
    /** Идентификатор задачи */
    id: string;
    /** Статус отчета */
    status: ReportStatus;
    /** URL для скачивания файла (если статус 'ready') */
    fileUrl?: string;
    /** Сообщение об ошибке (если статус 'error') */
    error?: string;
}

// ============================================================================
// Типы для CSV данных (на основе структуры файла)
// ============================================================================

/**
 * Строка данных из CSV отчета об остатках
 * Структура соответствует колонкам из примера файла
 */
export interface WBStocksCSVRow {
    VendorCode: string;
    Name: string;
    NmID: string;
    SubjectName: string;
    BrandName: string;
    SizeName: string;
    ChrtID: string;
    RegionName: string;
    OfficeName: string;
    Availability: string;
    OrdersCount: string;
    OrdersSum: string;
    BuyoutCount: string;
    BuyoutSum: string;
    BuyoutPercent: string;
    AvgOrders: string;
    StockCount: string;
    StockSum: string;
    SaleRate: string;
    AvgStockTurnover: string;
    ToClientCount: string;
    FromClientCount: string;
    Price: string;
    OfficeMissingTime: string;
    LostOrdersCount: string;
    LostOrdersSum: string;
    LostBuyoutsCount: string;
    LostBuyoutsSum: string;
    AvgOrdersByMonth_01_2026: string; // Динамическое поле, может меняться
}
