# Добавление прав для базы знаний

## Добавленные права

### Категории (Categories)
- `knowledge.categories.read` - Просмотр категорий
- `knowledge.categories.create` - Создание категорий
- `knowledge.categories.update` - Редактирование категорий
- `knowledge.categories.delete` - Удаление категорий

### Типы (Types)
- `knowledge.types.read` - Просмотр типов
- `knowledge.types.create` - Создание типов
- `knowledge.types.update` - Редактирование типов
- `knowledge.types.delete` - Удаление типов

### Материалы (Items)
- `knowledge.items.read` - Просмотр материалов
- `knowledge.items.create` - Создание материалов
- `knowledge.items.update` - Редактирование материалов
- `knowledge.items.delete` - Удаление материалов

### Файлы (Files)
- `knowledge.files.read` - Просмотр и скачивание файлов
- `knowledge.files.create` - Загрузка файлов
- `knowledge.files.delete` - Удаление файлов

## Всего добавлено: 15 прав

## Миграция
Создана миграция: `1761344000000-AddKnowledgeBasePermissions.ts`

## SQL для проверки
```sql
SELECT name, description, resource, action 
FROM permissions 
WHERE resource LIKE 'knowledge.%' 
ORDER BY resource, action;
```

