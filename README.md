# Lee Seller

Проект для автоматизации работы с маркетплейсами Wildberries и Ozon.

## Архитектура

```
src/
├── common/              # Общие компоненты (утилиты, хелперы, константы)
├── wildberries/         # Все что касается Wildberries
│   ├── services/        # API сервисы
│   ├── types/           # Типы данных
│   ├── constants/       # Константы (endpoints, URLs)
│   └── features/        # Бизнес-фичи (ping, get-products-with-prices и т.д.)
├── ozon/               # Все что касается Ozon (аналогично WB)
└── integrations/       # Интеграции с внешними сервисами
    └── google-sheets/   # Работа с Google Sheets

executor/               # Универсальный запускатор фич
```

## Запуск фич

Используйте executor для запуска фич:

```bash
# Запуск для всех магазинов
npm run executor -- wb ping

# Запуск для конкретного магазина
npm run executor -- wb ping povar-na-rayone
npm run executor -- wb ping leeshop
```

## Добавление новой фичи

1. Создайте папку фичи в `src/wildberries/features/your-feature/`
2. Реализуйте основную логику в `your-feature.ts`
3. Добавьте обработку в `executor/executor.ts` в функцию `runWbFeature()`

Пример структуры фичи:

```
src/wildberries/features/your-feature/
├── your-feature.ts      # Основная логика
├── types.ts            # Типы для фичи (если нужны)
└── helpers.ts          # Хелперы фичи (если нужны)
```

## Компиляция для Google Sheets

Для запуска фич в Google Apps Script:

```bash
npm run build:google-sheets -- wb your-feature
```

Скомпилированный JS будет в `src/wildberries/features/your-feature/compiled/your-feature.js`

Скопируйте содержимое файла в редактор Google Apps Script.

## Документация

- [README.wildberries.md](./README.wildberries.md) - Работа с Wildberries
- [README.ozon.md](./README.ozon.md) - Работа с Ozon
