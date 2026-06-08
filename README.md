# Instagram Clone

Full-stack клон Instagram: бэкенд на **FastAPI** (Python) и фронтенд на **React + TypeScript**. Поддерживает посты, истории, рилсы, лайки, комментарии, подписки, сохранённое, теги, чаты с обменом сообщениями в реальном времени (WebSocket) и уведомления.

## Возможности

- 🔐 Регистрация и авторизация через JWT
- 📸 Посты с медиа (загрузка изображений)
- 🎬 Истории, хайлайты и рилсы
- ❤️ Лайки, 💬 комментарии и 🔖 сохранённое
- 👥 Подписки, блокировки, теги пользователей
- 💌 Личные чаты с сообщениями в реальном времени через WebSocket
- 🔔 Уведомления
- 🌗 Тёмная тема по умолчанию + светлая тема

## Стек технологий

**Backend**
- FastAPI, SQLAlchemy 2.0, SQLite
- Alembic (миграции)
- JWT (python-jose), passlib/bcrypt (хеширование паролей)
- WebSockets, Pillow

**Frontend**
- React 18, TypeScript, Vite
- TailwindCSS, Zustand, React Query
- lucide-react (иконки)

## Структура проекта

```
FastapiINSTAGRAM/
├── main.py              # Точка входа FastAPI, подключение роутеров
├── database.py          # Настройка SQLAlchemy (Base, engine, session)
├── alembic/             # Миграции БД
├── auth/                # Регистрация, логин, JWT
├── users/               # Профили пользователей
├── posts/               # Посты
├── medias/              # Медиафайлы постов
├── stories/             # Истории
├── highlights/          # Хайлайты
├── likes/               # Лайки
├── comments/            # Комментарии
├── follows/             # Подписки
├── blocks/              # Блокировки
├── saved/               # Сохранённое
├── tags/                # Теги
├── chats/               # Чаты
├── messages/            # Сообщения (WebSocket)
├── notifications/       # Уведомления
├── uploads/             # Загрузка файлов + статика
└── frontend/            # React + TypeScript приложение
```

Каждый модуль бэкенда устроен единообразно: `models.py`, `schemas.py`, `crud.py`, `router.py`.

## Быстрый старт

### Backend

```bash
cd FastapiINSTAGRAM
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Документация API (Swagger UI): http://127.0.0.1:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Приложение: http://localhost:5173

Vite проксирует запросы `/api` → `http://localhost:8000` (включая WebSocket).

## Миграции базы данных

```bash
.venv\Scripts\alembic upgrade head      # применить миграции
.venv\Scripts\alembic revision --autogenerate -m "описание"  # создать миграцию
```

## API

После запуска бэкенда интерактивная документация доступна по адресам:

- Swagger UI — http://127.0.0.1:8000/docs
- ReDoc — http://127.0.0.1:8000/redoc
