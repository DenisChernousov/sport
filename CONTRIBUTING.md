# Как работать с проектом SportRun

## Начало работы

```bash
git clone https://github.com/DenisChernousov/sport.git
cd sport
```

### Локальный запуск
```bash
# Docker (PostgreSQL + Redis)
docker compose up -d

# Backend
cd server
cp .env.example .env  # отредактируй подключение к БД
npm install
npx prisma generate
npx prisma db push
npx tsx src/index.ts

# Frontend (в новом терминале)
cd client
npm install
npx vite --port 5174
```

## Workflow разработки

### 1. Создай ветку под задачу
```bash
git checkout main
git pull origin main
git checkout -b feature/название-задачи
```

Примеры имён веток:
- `feature/strava-integration`
- `fix/login-bug`
- `ui/redesign-header`

### 2. Работай и коммить
```bash
git add -A
git commit -m "что сделал"
```

### 3. Запуш ветку
```bash
git push origin feature/название-задачи
```

### 4. Создай Pull Request
- Зайди на GitHub → появится кнопка "Compare & Pull Request"
- Опиши что сделал
- Назначь ревьюера

### 5. После одобрения — мерж в main
- На GitHub нажми "Merge pull request"
- Или попроси Claude задеплоить

## Правила
- **НЕ пушить напрямую в main**
- Всегда через ветку + PR
- Перед созданием ветки — `git pull origin main`
- Один PR = одна задача/фича

## Деплой
Деплой делает Claude или ведущий разработчик:
```bash
ssh root@94.241.141.78 deploy-sportrun
```
