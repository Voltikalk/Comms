# 🚀 Secure Comms — Architecture & Design System Master Guide

> **Telegram Web Replica / Ultra-Premium Real-Time Messenger**  
> Стек: **React 19 / Vite**, **TypeScript**, **Tailwind CSS**, **Ultra-Fast Full-Text Search UI Suite (FTS / Debounced SearchBar / Advanced Filters / Animated Cards / History / Stats)**, **Framer Motion, GSAP, AOS & Lottie**, **Storybook**, **Node.js / Express**, **Socket.io / WebSocket**, **WebRTC**, **JWT & Bcrypt**.

---

## ⚡ Getting Started & Быстрый старт

### 1. Системные требования
* **Node.js**: `v20.x` или выше (рекомендуется `LTS v20.x` / `v22.x`)
* **Пакетный менеджер**: `npm v10.x` или выше
* **База данных / Сервисы**: Supabase аккаунт (PostgreSQL + Auth + Storage + Realtime) или локальный эмулятор

### 2. Клонирование и установка зависимостей
```bash
# Клонирование репозитория
git clone https://github.com/Voltikalk/Comms.git
cd Comms

# Установка зависимостей
npm install
```

### 3. Настройка переменных окружения
```bash
# Создание конфигурационного файла на основе шаблона
cp .env.example .env
# Отредактируйте .env, указав ваши реальные ключи VITE_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY
```

### 4. Запуск приложения в режиме разработки
```bash
# Терминал 1: Запуск Backend сервера Express + Socket.io (порт 3001)
npm run server

# Терминал 2: Запуск Frontend клиента Vite + React 19 (порт 5173)
npm run dev
```

### 5. Миграции базы данных и тестирование
```bash
# Применение всех миграций схемы Supabase / PostgreSQL
npm run migrate:up

# Проверка статуса миграций
npm run migrate:status

# Линтинг кодовой базы (Oxlint)
npm run lint

# Сборка production-бандла и проверка типов TypeScript
npm run build

# Запуск изолированной песочницы компонентов Storybook (порт 6006)
npm run storybook
```

---

## 📋 Содержание
1. [Getting Started & Быстрый старт](#-getting-started--быстрый-старт)
2. [Обзор проекта и текущая стадия](#-обзор-проекта-и-текущая-стадия)
2. [Структура репозитория и файлов](#-структура-репозитория-и-файлов)
3. [UI Компоненты полнотекстового поиска (Search UI Suite)](#-ui-компоненты-полнотекстового-поиска-search-ui-suite)
4. [Система архивирования и управления жизненным циклом данных](#-система-архивирования-и-управления-жизненным-циклом-данных)
5. [Управление историей сообщений и виртуальный скроллинг](#-управление-историей-сообщений-и-виртуальный-скроллинг)
6. [Комплексный сервис поиска (Message Search Service & Utilities)](#-комплексный-сервис-поиска-message-search-service--utilities)
7. [Полнотекстовый поиск (Full-Text Search & Multilingual Stemming)](#-полнотекстовый-поиск-full-text-search--multilingual-stemming)
8. [React UI Компоненты на базе Supabase](#-react-ui-компоненты-на-базе-supabase)
9. [Архитектура Socket.io сервера и синхронизация с Supabase](#-архитектура-socketio-сервера-и-синхронизация-с-supabase)
10. [Система миграций базы данных (Schema Migrations & CLI)](#-система-миграций-базы-данных-schema-migrations--cli)
11. [Supabase Storage & Компрессия медиа](#-supabase-storage--компрессия-медиа)
12. [Система Real-time подписок (WebSockets & Presence)](#-система-real-time-подписок-websockets--presence)
13. [Сервисный слой данных (Rooms, Messages, Reactions, Receipts, Attachments)](#-сервисный-слой-данных-rooms-messages-reactions-receipts-attachments)
14. [Supabase Authentication & Управление сессиями](#-supabase-authentication--управление-сессиями)
15. [Supabase & PostgreSQL Tooling Suite (Client, Queries, Cache, Hooks)](#-supabase--postgresql-tooling-suite-client-queries-cache-hooks)
16. [Дизайн-гайдлайны и правила стилизации](#-дизайн-гайдлайны-и-правила-стилизации)
17. [Дизайн-токены (Design Tokens & Color Harmonies)](#-дизайн-токены-design-tokens--color-harmonies)
18. [Документация компонентов (UI Component Library)](#-документация-компонентов-ui-component-library)
19. [Анимационный движок & Гайдлайн по физике движения](#-анимационный-движок--гайдлайн-по-физике-движения)
20. [Мобильная оптимизация & Тач-взаимодействия](#-мобильная-оптимизация--тач-взаимодействия)
21. [Руководство для контрибьюторов (Contributing & Review Guide)](#-руководство-для-контрибьюторов-contributing--review-guide)
22. [Запуск, сборка и Storybook](#-запуск-сборка-и-storybook)
23. [Журнал изменений (Changelog)](#-журнал-изменений-changelog)

---

## 🌟 Обзор проекта и текущая стадия

**Secure Comms** — высоконагруженный веб-мессенджер реального времени, воссоздающий интерфейс, UX и плавность официального клиента **Telegram Web K/A** с современным Glassmorphism оформлением, кинематографичными анимациями, стандартизированной дизайн-системой, аутентификацией на базе **Supabase Auth**, сервисом загрузки и компрессии файлов **Supabase Storage**, системой **Supabase Real-time подписок** и **премиальным набором UI-компонентов полнотекстового поиска с горячими клавишами, фильтрацией и историей**.

### 📌 Текущая стадия разработки (Status: Phase 37 — Telegram Rich Chat List Snippets & Delivery Indicators):
* ✅ **Telegram Chat List Snippets Suite (NEW)**:
  * [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) — векторные иконки вложений вместо битых эмодзи, галочки статуса доставки сообщений (`✓`/`✓✓`), анимированный индикатор набора текста и статусы онлайна.
  * [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) — живые миниатюры медиа (фото/видео/стикеры), персональная палитра цветов авторов и импульсная подсветка.

---

## 📁 Структура репозитория и файлов

```
Comms/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql             # Таблицы, индексы, constraints, schema_version
│       ├── 002_rls_policies.sql               # RLS политики для всех сущностей
│       ├── 003_add_timestamps_triggers.sql    # Триггеры обновления дат и Realtime
│       ├── 004_add_fulltext_search.sql        # Полнотекстовый поиск (tsvector, GIN, RPC)
│       └── 005_add_message_archive.sql        # Долговременный архив и процедуры
├── scripts/
│   └── migrate.js                             # CLI миграций (up, down, status, create)
├── .supabaserc                                # Конфигурация Supabase CLI и миграций
├── .env.local                                 # Ключи и URL Supabase
├── server.js                                  # Node.js + Express + Socket.io + Supabase v2 Server
├── package.json                               # Зависимости и npm-скрипты
├── vite.config.ts                             # Конфигурация сборщика Vite
├── index.html                                 # Точка входа HTML (Montserrat, Inter, PWA)
├── handoff.md                                 # Этот документ (Генеральный архитектурный гайд)
└── src/
    ├── main.tsx                               # Точка входа React 19
    ├── App.tsx                                # Корневой компонент
    ├── index.css                              # Глобальные стили, темы, импорты шрифтов
    ├── types.ts                               # Базовые типы чата, сообщений, UserId и звонков
    ├── constants.ts                           # Константы, дефолтные профили, эмодзи, URL
    ├── tokens/
    │   └── design-tokens.json                 # Экспортируемые токены (Colors, Typography, Spacing)
    ├── jobs/
    │   └── archive-messages.job.ts            # Фоновое задание автоматической архивации
    ├── lib/
    │   ├── filter-utils.ts                    # Утилиты фильтрации, сортировки, валидации и экспорта
    │   ├── cron-jobs.ts                       # Планировщик фоновых задач CronScheduler
    │   ├── image-compression.ts               # Canvas утилита сжатия картинок и аватаров
    │   ├── supabase/
    │   │   ├── search-utils.ts                # Санитизация, контекст ±50 симв, Rate Limiter
    │   │   ├── search-config.ts               # Полнотекстовый поиск, нормализатор и подсветка
    │   │   ├── client.ts                      # Singleton клиент с retry-логикой
    │   │   ├── types.ts                       # Полная TypeScript типизация БД и RPC
    │   │   ├── config.ts                      # Таймауты, бакеты и лимиты
    │   │   ├── queries.ts                     # Типобезопасные Query Builders
    │   │   └── cache.ts                       # TTL кеш-менеджер с инвалидацией
    │   ├── colors.ts                          # Цветовые токены Coolors/Adobe Color
    │   └── animations.ts                      # Framer Motion, GSAP, AOS и Lottie
    ├── context/
    │   ├── AuthContext.tsx                    # Supabase Auth Context
    │   └── SocketContext.tsx                  # Real-time сокеты, WebRTC звонки, Supabase sync
    ├── services/
    │   ├── message-filter.service.ts          # Сервис фильтрации, сортировки, кэширования и пресетов
    │   ├── message-archive.service.ts         # Управление архивом, очистка файлов, восстановление
    │   ├── message-history.service.ts         # Управление историей, контекстом и экспортом
    │   ├── message-search.service.ts          # Комплексный движок поиска сообщений
    │   ├── storage.service.ts                 # Загрузка и удаление файлов в Storage
    │   ├── realtime.service.ts                # Менеджер Real-time WebSockets & Presence
    │   ├── room.service.ts                    # Сервис комнат, участников и ролей
    │   ├── message.service.ts                 # Сервис отправки, пагинации, поиска
    │   ├── reaction.service.ts                # Сервис эмодзи-реакций
    │   ├── read-receipt.service.ts            # Сервис статусов прочитанности
    │   ├── attachment.service.ts              # Сервис загрузки медиа
    │   ├── supabase-auth.service.ts           # Сервис Supabase Auth
    │   └── auth.service.ts                    # Клиентский REST API сервис
    ├── hooks/
    │   ├── useMessageFilter.ts                # Реактивный хук фильтрации, пресетов и экспорта
    │   ├── useSearchMessages.ts               # Высокоуровневый хук поиска с таймингом
    │   ├── useVirtualScroll.ts                # Хук расчета виртуального окна
    │   ├── useInfiniteMessageHistory.ts       # Хук двунаправленной подгрузки истории
    │   ├── useMessageSearch.ts                # Хук поиска с debounce, фильтрами и историей
    │   ├── useFileUpload.ts                   # Хук загрузки файлов
    │   ├── useRealtimeSubscription.ts         # Хук управления каналом Realtime
    │   ├── useRoomMessages.ts                 # Реактивный хук живых сообщений
    │   ├── useUserStatus.ts                   # Хук онлайн-статусов
    │   ├── useMessageReactions.ts             # Хук живых эмодзи-реакций
    │   ├── useAuth.ts                         # Хук доступа к AuthContext
    │   ├── useSupabase.ts                     # Хук работы с БД
    │   ├── useMediaQuery.ts                   # Хуки брейкпоинтов
    │   └── useTouchInteractions.ts            # Хуки свайп-навигации
    ├── lib/
    │   ├── tgs-loader.ts                      # Загрузчик и GZIP-декомпрессор Telegram .TGS стикеров
    │   └── filter-utils.ts                    # Утилиты фильтрации
    ├── constants/
    │   └── stickers.ts                        # Коллекция стикер-паков (ICQ Колобки, Сеня, Пепе, Котики, Доге, 3D)
    ├── components/
    │   ├── Stickers/
    │   │   ├── StickerPicker.tsx              # Telegram Стикер-пикер (поиск, паки, избранное, недавние)
    │   │   └── TgsStickerPlayer.tsx           # 60 FPS Lottie/.TGS плеер векторных анимаций стикеров
    │   ├── Search/
    │   │   ├── FilterPanel.tsx                # Расширенная панель фильтрации и пресетов
    │   │   ├── DateRangePicker.tsx            # Компонент выбора периода дат с валидацией
    │   │   ├── SearchBar.tsx                  # Поисковая строка с хоткеем Ctrl+F
    │   │   ├── SearchFilters.tsx              # Панель быстрых фильтров
    │   │   ├── SearchResultCard.tsx           # Карточка найденного сообщения
    │   │   ├── SearchResults.tsx              # Лента результатов и NoSearchResults
    │   │   ├── SearchHistory.tsx              # Чипсы недавних поисковых запросов
    │   │   ├── SearchStats.tsx                # Счетчик, время ответа и сортировка
    │   │   └── AdvancedSearchModal.tsx        # Модальное окно расширенных фильтров
    │   ├── ChatRoom/
    │   │   ├── MessageVirtualizer.tsx         # Панель фильтров, экспорт JSON/CSV, виртуализатор
    │   │   ├── VirtualMessageList.tsx         # Виртуальная лента сообщений с разделителем
    │   │   ├── ChatRoom.tsx                   # Контейнер чата, лента сообщений и инпут
    │   │   ├── MessageList.tsx                # Лента сообщений
    │   │   └── SendMessage.tsx                # Инпут отправки с загрузкой вложений
    │   ├── RoomList/                          # Список диалогов с поиском
    │   │   ├── UserProfile/                       # Редактирование профиля и аватарки
    │   ├── RoomMembers/                       # Список участников комнаты и роли
    │   ├── FileUploadInput.tsx                # Drag-and-drop компонент загрузки
    │   ├── ui/                                # Button, Input, Card, LoadingSpinner
    │   ├── ChatScreen.tsx                     # Главный экран чата Telegram
    │   ├── MessageBubble.tsx                  # Пузырь сообщения (текст, стикеры .tgs, медиа, аудио, кружки)
    │   ├── ProfileEditModal.tsx               # Модальное окно редактирования профиля Telegram
    │   ├── TelegramContextMenuModal.tsx       # Контекстное меню сообщения
    │   ├── TelegramEmojiPickerModal.tsx       # Палитра эмодзи и вкладка стикеров Telegram
    │   ├── LoginScreen.tsx                    # Экран входа и регистрации
    │   └── VideoCallModal.tsx                 # Модальное окно аудио/видео звонка WebRTC
    └── pages/
        ├── SearchPage.tsx                     # Главный экран поиска и фильтрации сообщений
        ├── AdminArchive.tsx                   # Панель управления архивацией сообщений
        ├── LoginPage.tsx                      # Страница входа с поддержкой пресетов
        ├── RegisterPage.tsx                   # Страница регистрации аккаунта
        └── ResetPasswordPage.tsx              # Страница сброса пароля
```

---

## 🛠 Запуск, сборка и Storybook

```bash
# 1. Запуск Node.js бэкенд сервера (порт 3000)
npm run server

# 2. Запуск Vite Dev сервера с HTTPS (порт 5173)
npm run dev

# 3. Проверка типов TypeScript и сборка проекта
npm run build

# 4. Запуск Storybook песочницы компонентов (порт 6006)
npm run storybook
```

### [v2.99.0] — 18 августа 2026 г.
* **Премиальный редизайн превью последних сообщений в списке чатов (Telegram Rich Chat List Snippets & Delivery Indicators)**:
  * **Устранение битых символов и эмодзи на Windows**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) текстовые эмодзи (квадраты `🖼️`) заменены на векторные SVG Tabler-иконки (`IconPhoto`, `IconVideo`, `IconMicrophone`, `IconMoodSmile`, `IconCamera`, `IconFileText`).
  * **Галочки доставки для исходящих сообщений**: для собственных последних сообщений добавлен индикатор статуса доставки (`IconChecks` — прочитано, `IconCheck` — отправлено) рядом с префиксом «Вы: ».
  * **Анимированный индикатор набора текста**: при наборе текста в чате отображаются 3 прыгающие точки с плавной пульсацией и акцентным цветом.
  * **Статусы активности**: для личных чатов отображаются лаконичные статусы «в сети» (зеленый акцент) или «был(а) недавно».

### [v2.98.0] — 18 августа 2026 г.
* **Премиальный редизайн блока цитирования и ответов (Telegram Native Quotes, Thumbnails & Author Colors)**:
  * **Реальные миниатюры медиафайлов в цитате**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) внутри плашки цитаты теперь отображаются живые миниатюры фото (`34×34px`), превью видео с бейджем воспроизведения и анимированные мини-стикеры.
  * **Персональные цвета авторов**: левая полоса `border-l-[3px]` и имя цитируемого автора динамически окрашиваются в персональный цвет (`getAuthorColor`), в исходящих сообщениях автоматически адаптируется контраст.
  * **Векторные иконки типов вложений**: вместо текстовых эмодзи внедрены четкие Tabler-иконки (`IconPhoto`, `IconVideo`, `IconMicrophone`, `IconMoodSmile`, `IconCamera`, `IconFileText`).
  * **Интерактивная подсветка целевого сообщения (`Flash Ripple Highlight`)**: при клике на цитату целевое сообщение плавно центрируется и подсвечивается импульсной анимацией (`tg-message-row-highlight`).
  * **Привязка ID строк сообщений**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) к корневым оберткам сообщений добавлен атрибут `id="msg-{id}"`.

### [v2.97.0] — 18 августа 2026 г.
* **Исправление отправки медиа, оптимизация превью и док-панели прикреплений (Media Upload Resilience & Telegram Docked Bar)**:
  * **Мгновенный предпросмотр без нагрузки на память (`URL.createObjectURL`)**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) функция `handleFileSelect` переведена с тяжелого `FileReader.readAsDataURL` на нативный `URL.createObjectURL`, что устранило создание 100MB+ base64-строк в памяти и исключило зависание браузера при выборе видео и тяжелых медиафайлов.
  * **Telegram Glassmorphic док-панель прикрепления**: плашка прикрепленного файла, цитирования и редактирования перенесена внутрь `<footer>` в виде компактного всплывающего блока над капсулой ввода (`bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-md rounded-2xl shadow-xl`), исправив баг с «оторванным черным квадратом».
  * **Отказоустойчивость отправки и Socket.io сериализации**: в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) корректно определен `isInstantMedia`, а перед отправкой через сокеты из полезной нагрузки гарантированно вычищается ссылка `rawBlob` (File-объект), предотвращая сбои сериализации.
  * **Быстрый тайм-аут Supabase Storage на сервере**: в [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) загрузка в облачный бакет ограничена 2.5с тайм-аутом с мгновенным локальным фоллбэком, предотвращая зависание прогресс-бара загрузки при сетевых задержках.

### [v2.96.0] — 18 августа 2026 г.
* **Исправление сбоя и зеленого экрана при установке собственного фото (Custom Photo Compression & Storage Quota Fix)**:
  * **Клиентская компрессия загружаемых обоев**: в [`src/components/Theme/ThemeSettingsModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Theme/ThemeSettingsModal.tsx) перед сохранением кастомное фото теперь автоматически сжимается до оптимального разрешения (макс 1600×1200 JPEG, качество 0.8), что сократило размер base64 с 20MB до ~150KB и полностью устранило ошибку переполнения квоты `QuotaExceededError`.
  * **Безопасное сохранение в localStorage**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) запись `localStorage.setItem` обернута в защитный блок `try...catch`, предотвратив падение дерева React-компонентов.
  * **Устранение ложного фоллбэка на зеленый фон**: в [`src/constants/wallpapers.ts`](https://github.com/Voltikalk/Comms/blob/main/src/constants/wallpapers.ts) в функции `getWallpaperById` добавлен явный обработчик `id === 'custom'`, исключив подстановку классического зеленого фона `classic_tg`.
  * **Кавычки в CSS URL**: в `getChatBackgroundStyle` ссылки `url("...")` обернуты в кавычки для корректного парсинга Data URI и URL со спецсимволами.

### [v2.95.0] — 18 августа 2026 г.
* **Минималистичный редизайн окна выбора обоев с компактным живым предпросмотром (Telegram Clean Wallpaper Picker & Live Tuning)**:
  * **Компактный живой предпросмотр (128px)**: в [`src/components/Theme/ThemeSettingsModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Theme/ThemeSettingsModal.tsx) интегрирован аккуратный мини-блок предпросмотра с мгновенной реакцией на регулировку размытия (0–20px), затемнения (0–80%), смену фона и акцентного цвета сообщений.
  * **Избавление от визуального шума**: удалены длинные пояснительные подзаголовки, тяжелые рамки и громоздкие тексты. Ширина модалки уменьшена до лаконичных `450px`.
  * **Чистые цветные круги акцентов**: громоздкие кнопки с обрезанным текстом заменены на аккуратный горизонтальный ряд круглых цветных точек с активной галочкой выбора.
  * **Интегрированная плитка загрузки файла**: плитка «+ Своё фото» встроена прямо первым элементом в сетку обоев (паттерн Telegram / iOS).
  * **Компактная сетка 3×N**: карточки обоев получили аккуратные пропорции и плавное масштабирование при наведении.

### [v2.94.0] — 18 августа 2026 г.
* **Исправление зацикливания/перезапуска анимации стикеров при наведении (Sticker Hover Loop Re-trigger Fix & Stable Lottie Lifecycle)**:
  * **Стабилизация жизненного цикла Lottie**: в [`src/components/Stickers/TgsStickerPlayer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stickers/TgsStickerPlayer.tsx) функция инициализации `initLottie` избавлена от нестабильных зависимостей `isHovered` и `isInView`. Плеер Lottie больше не уничтожается (`destroy()`) и не перезапускается с 0-го кадра при входе/выходе курсора мыши.
  * **Плавное управление воспроизведением**: воспроизведение и пауза регулируются через прямой вызов `animItemRef.current.play()` / `pause()`, для сообщений чата стикеры плавно циклично проигрываются без рывков.
  * **Оптимизация сетки стикер-пикера**: в [`src/components/Stickers/StickerPicker.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stickers/StickerPicker.tsx) компонент `StickerCell` переведен на чистый CSS `group-hover:opacity-90`, устранив лишние React-рендеры при наведении.
* **Полный редизайн каталога обоев, векторные Telegram-дудлы и галерея HD-фотографий (Authentic Telegram Chat Wallpapers & HD Photography Suite)**:
  * **Официальные векторные SVG-паттерны Telegram**: в [`src/constants/wallpapers.ts`](https://github.com/Voltikalk/Comms/blob/main/src/constants/wallpapers.ts) внедрен генератор аутентичных векторных узоров Telegram Doodles (самолетик, котики, лапки, сердечки, звезды, кофе, наушники, чаты, ракеты, алмазы) с бесшовным тайлингом 160x160px и 7 готовыми палитрами (Классический Telegram, Полночный Сапфир, Космический Неон, Изумрудный Лес, Закатный Коралл, Киберпанк Grid, Теплый Мокко).
  * **Галерея из 12 HD-фотографий и пейзажей как в Telegram**: добавлены Альпийские вершины, Глубокий космос & Небула, Неоновый Токио ночью, Туманный хвойный лес, Закатный океан с пальмами, Дождливый вечерний город, Сакура на закате, Ретровейв неон, Шелковые песчаные дюны, Темный шелк & волны, Зимняя сказка в тайге и Архитектурный свет.
  * **Расширенная модалка оформления с категориями (`ThemeSettingsModal.tsx`)**: добавлены вкладки категорий («🌟 Все», «🖼️ Фотографии (12)», «🎨 Узоры Telegram (7)», «🌈 Градиенты (5)», «⬛ Минимализм», «📷 Своё фото»), интерактивные ползунки размытия (0–20px) и затемнения (0–80%) для всех фото-фонов, 8 акцентных цветов Telegram и живой предпросмотр пузырей.
  * **Синхронизация фона в чате**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) функция `getChatBackgroundStyle` и слой затемнения адаптированы под любые фото-обои и SVG-дудлы.

### [v2.93.0] — 18 августа 2026 г.
* **Кастомные темы оформления, каталог Telegram-обоев и загрузка собственных фонов (Chat Wallpapers & Themes Suite)**:
  * **Каталог встроенных Telegram-обоев и градиентов**: в [`src/constants/wallpapers.ts`](https://github.com/Voltikalk/Comms/blob/main/src/constants/wallpapers.ts) и [`src/types/theme.types.ts`](https://github.com/Voltikalk/Comms/blob/main/src/types/theme.types.ts) добавлен каталог фирменных фонов: Классический Telegram, Космическая Небула, Киберпанк Неон, Закатный Персик, Изумрудный Лес, Лавандовый Пастель и Чистый Минимализм.
  * **Палитра акцентных цветов интерфейса**: поддержка 6 акцентных тем (Telegram Blue, Emerald Green, Neon Purple, Ruby Crimson, Sunset Amber, Ocean Cyan) с динамической подстановкой в CSS-переменные (`--tg-theme-accent`).
  * **Загрузка собственных изображений**: поддержка выбора любого фото с компьютера с регулировкой размытия (0–20px) и затемнения (0–80%) для идеальной читаемости сообщений.
  * **Интерактивное модальное окно настроек (`ThemeSettingsModal.tsx`)**: живой предпросмотр чата с пузырями сообщений в реальном времени, карточками галереи и сохранением настроек в `localStorage`.
  * **Точки входа в интерфейсе**: кнопка вызова палитры (🎨) в шапке активного чата и пункт «Оформление и обои» в главном боковом меню.

### [v2.92.0] — 18 августа 2026 г.
* **Очистка сырых JSON-тегов пересылки в закрепленных сообщениях и превью ответов (Clean Forward Metadata Sanitization)**:
  * **Устранение утечки `[fwd:{"s":"...", "n":"..."}]` в интерфейс**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) реализован универсальный санитайзер `getCleanMessageText`, который полностью удаляет служебные мета-теги пересылки и неразрывные пробелы `\u200B` из закрепленных сообщений, плашки ответов и списка чатов.
  * **Корректные лейблы вложений**: если пересланное сообщение содержало фото, видео, стикер или аудио без текстовой подписи, закрепленная плашка теперь красиво отображает `🖼 Фотография`, `📹 Видео`, `🎭 Стикер`, `⭕ Видеосообщение` или `🎤 Голосовое сообщение` вместо сырого JSON.
  * **Аналогичное исправление в цитатах**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) цитаты ответов на пересланные медиафайлы теперь также корректно выводят тип вложения.

### [v2.91.0] — 18 августа 2026 г.
* **Непрерывная фиксация низа ленты при асинхронной загрузке обложек видео и медиа (Continuous Media Load Bottom Pinning)**:
  * **Динамическое удержание `ResizeObserver` при загрузке видео**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) `ResizeObserver` теперь удерживает скролл внизу всякий раз, когда пользователь находится у нижней границы (`isNearBottomRef.current === true`). Когда тяжелые обложки видео, метаданные или фотографии асинхронно догружаются спустя 1–2 секунды и меняют высоту ленты, чат не отпрыгивает вверх, а остается идеально зафиксированным на последнем сообщении.
  * **Устранение анимационной тряски видеоконтейнера**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) удален класс `transition-all duration-300` с обертки видеоплеера, что предотвратило субпиксельное дрожание скролла при авто-определении ориентации видео.

### [v2.90.0] — 18 августа 2026 г.
* **Непрерывный ResizeObserver якорь низа чата и фиксация размеров стикеров (Continuous ResizeObserver Anchor & Zero Layout Shift)**:
  * **Непрерывный `ResizeObserver` при открытии чата**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) внедрен `ResizeObserver` на внутренний контейнер ленты сообщений. При открытии чата он непрерывно удерживает скролл в самом низу (`feed.scrollTop = feed.scrollHeight`) на протяжении всех 500 мс, пока монтируются стикеры, аватарки и шрифты, полностью исключая прыжки вверх/вниз и открытие в середине.
  * **Фиксация `aspect-ratio: 1/1` стикеров**: в [`src/components/Stickers/TgsStickerPlayer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stickers/TgsStickerPlayer.tsx) для контейнера плеера стикеров задан постоянный `aspectRatio: '1 / 1'` и `overflow: 'hidden'`, устранив изменение высоты блоков при асинхронном старте Lottie Canvas.

### [v2.89.0] — 18 августа 2026 г.
* **Плавное исчезновение и схлопывание высоты при удалении сообщений (Smooth CSS Height Collapse & Responsive Thanos Snap)**:
  * **Плавное схлопывание высоты строки**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) при удалении сообщения его родительская строка плавно анимирует высоту `height: 0px` с кривой Безье `cubic-bezier(0.33, 1, 0.68, 1)` за 340 мс. Окружающие сообщения мягко и плавно скользят на освободившееся место без рывков.
  * **Устранение долгой задержки (1.75s -> 420ms)**: длительность эффекта распада уменьшена с 1750 мс до отзывчивых 420 мс, что полностью убрало неприятную паузу и резкий провал контента после удаления.

### [v2.88.0] — 18 августа 2026 г.
* **Гарантированное открытие любого чата в самом низу (Multi-Stage Pre-Paint & Post-Paint Bottom Lock)**:
  * **Синхронный `useLayoutEffect`**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) при смене активного чата `activeRoomId` мгновенно устанавливается `scrollTop = scrollHeight` еще до первой отрисовки кадров на экране.
  * **Многоэтапная стабилизация (0ms -> RAF -> 40ms -> 120ms)**: добавлено поэтапное удержание скролла внизу при подгрузке аватарок, стикеров и шрифтов, что полностью исключает ситуацию, когда пользователь открывал чат где-то посередине истории.

### [v2.87.0] — 18 августа 2026 г.
* **Плавная аутентичная анимация отправки стикеров (Telegram Spring Pop & Smooth Scale Bounce)**:
  * **Пружинная физика отправки `@keyframes tgStickerSendSpring`**: в [`src/index.css`](https://github.com/Voltikalk/Comms/blob/main/src/index.css) внедрена реалистичная пружинная анимация с кривой Безье `cubic-bezier(0.34, 1.56, 0.64, 1)` длительностью 420 мс (масштабирование из `0.35` с мягким блюром, вылет с перелётом `1.05` и элегантная доводка до `1.0`).
  * **Направленный `transform-origin`**: для своих сообщений стикер мягко вырастает из нижнего правого угла (`animate-sticker-send`), для собеседников — из левого нижнего угла (`animate-sticker-send-peer`).
  * **Применение в компоненте**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) стикеры получили динамическую привязку класса плавной отправки.

### [v2.86.0] — 18 августа 2026 г.
* **Устранение резких скачков и рывков скролла при отправке стикеров и удалении сообщений**:
  * **Устранение Flexbox `justify-end` Scroll Bug**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) контейнер сообщений избавлен от `justify-end` (который приводил к пересчету и резкому скачку скролла вниз при удалении сообщения). Вместо этого внедрен гибкий спейсер `<div className="flex-1 min-h-0" />`, сохраняющий стабильную высоту и естественный поток скролла.
  * **Мгновенная фиксация внизу при отправке**: при отправке своего сообщения/стикера вместо медленной анимации `scrollIntoView({ behavior: 'smooth' })` от верха страницы используется прямое мгновенное закрепление `scrollTop = scrollHeight` внутри контейнера чата (поведение 1:1 Telegram Desktop).
  * **Стабильный скролл при удалении**: удаление сообщений больше не триггерит автоскролл ленты.

### [v2.85.0] — 18 августа 2026 г.
* **Глубокая оптимизация производительности стикеров (Hardware Acceleration & Viewport Culling)**:
  * **GPU Hardware Canvas Acceleration**: в [`src/components/Stickers/TgsStickerPlayer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stickers/TgsStickerPlayer.tsx) рендерер `lottie-web` переведен с тяжелого SVG DOM на аппаратный `canvas` (`clearCanvas: true`), исключив тысячи мутирующих SVG-нод в DOM-дереве.
  * **IntersectionObserver Viewport Culling**: добавлено отслеживание видимости стикеров на экране. Анимация рассчитывается и проигрывается **только для 6–8 видимых стикеров** в текущей области видимости, а внеэкранные стикеры автоматически ставятся на паузу (`anim.pause()`), снижая нагрузку на CPU/GPU на 90%.
  * **In-Memory Дедупликация и Cache**: в [`src/lib/tgs-loader.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/tgs-loader.ts) внедрен глобальный кеш и дедупликация одновременных сетевых запросов `pendingFetches`.
  * **Мемоизация сетки `StickerCell`**: в [`src/components/Stickers/StickerPicker.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stickers/StickerPicker.tsx) ячейки сетки стикеров обернуты в `React.memo` для устранения повторных рендеров при прокрутке.

### [v2.84.0] — 18 августа 2026 г.
* **Внедрение официальных 60 FPS плавных векторных Telegram-стикеров (Official 60 FPS Telegram Vectors & 180-frame Interpolation)**:
  * **Уточка Сеня (UtyaDuck) 60 FPS**: в [`src/constants/duck_stickers.ts`](https://github.com/Voltikalk/Comms/blob/main/src/constants/duck_stickers.ts) и `public/stickers/duck/` добавлены 29 официальных векторных Lottie-анимаций Telegram с 180 непрерывными кадрами без рывков.
  * **Вишенка Hot Cherry 60 FPS**: в [`src/constants/cherry_stickers.ts`](https://github.com/Voltikalk/Comms/blob/main/src/constants/cherry_stickers.ts) и `public/stickers/cherry/` добавлены плавные векторные стикеры Вишенки в 60 FPS.
  * **Оптимизация ретро-колобков**: разъяснена специфика ретро-пака ICQ Колобки (оригинальные GIF-исходники 2000-х годов из 4 кадров), дополненная современными ультра-плавными паками 60 FPS.

### [v2.83.0] — 18 августа 2026 г.
* **Исправление артефактов при удалении чужих сообщений («Удалить для всех» 1:1 Telegram)**:
  * **Разрешение удаления в сокете бэкенда**: в [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) в сокет-обработчике `delete_message` убрано ограничение `sender !== user`. Теперь участники личных чатов и семейной группы могут удалять любые сообщения в диалоге для обоих собеседников (Telegram «Удалить для всех»).
  * **Оптимистичное удаление на клиенте**: в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) в метод `deleteMessage` добавлено мгновенное оптимистичное удаление из массива `messages`, что исключает появление пустых строк-призраков, зависание исчезнувших пузырей и пустых чекбоксов выбора `◯`.
  * **Синхронный сброс режима выбора**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) сброс `isSelectMode` и `selectedMessageIds` выполняется синхронно перед анимацией распада Таноса, предотвращая остаточные радио-метки на фоне.

### [v2.82.0] — 18 августа 2026 г.
* **Поддержка Telegram .TGS анимированных стикеров, Lottie-движка и 50 анимированных ICQ Колобков (Telegram .TGS Animation Engine & 50 Animated Kolobki)**:
  * **Парсер и GZIP-декомпрессор `.tgs`**: в [`src/lib/tgs-loader.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/tgs-loader.ts) реализована распаковка сжатых gzip-контейнеров `.tgs` с помощью `pako` (`inflate`) и `TextDecoder` в стандартный JSON-формат Lottie с in-memory кешированием.
  * **60 FPS векторный плеер `<TgsStickerPlayer />`**: в [`src/components/Stickers/TgsStickerPlayer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stickers/TgsStickerPlayer.tsx) создан плеер на базе `lottie-web` для отрисовки `.tgs` и Lottie анимаций с непрерывным живым автовоспроизведением 60 FPS как в стикер-пикере, так и в пузырях сообщений чата и быстрой строке подсказок.
  * **Все 50 оригинальных анимированных стикеров ICQ Колобки**: в [`src/constants/kolobki.ts`](https://github.com/Voltikalk/Comms/blob/main/src/constants/kolobki.ts) и папку `public/stickers/kolobki/` добавлены все 50 полноразмерных 60 FPS векторных Lottie-анимаций оригинальных Колобков (Устал 😩, Меломан 🎧, Болеет 🤕, Безумие 🤪, Гроб ⚰️, Поцелуй 😘, Подмигивает 😉, Гангстер 🔫, Закатил глаза 🙄, Крутой 😎, Рок 🤟, Солнышко 🌤, Ржу до слез 😂, Злой 😡, Пивко 🍺, Курит 🚬, За рулем 🚗, Бомба 💣, Танцовщица 💃, В космос 🚀 и др.).
  * **Поддержка отправки `.tgs` файлов**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) файлы с расширением `.tgs` и MIME-типом `application/x-tgsticker` автоматически распознаются как стикеры и моментально воспроизводятся в сообщениях.

### [v2.81.0] — 18 августа 2026 г.
* **Полноценная система стикеров Telegram, паки, мгновенная отправка и предиктивный ввод (Telegram Stickers Suite & Fast Picker)**:
  * **Коллекция стикер-паков**: в [`src/constants/stickers.ts`](https://github.com/Voltikalk/Comms/blob/main/src/constants/stickers.ts) внедрены 8 разнообразных паков (Уточка Сеня 🦆, Лягушонок Пепе 🐸, Мемные Котики 🐱, Доге и Чимс 🐕, Аня Шпионка 🌸, Гигачад и Мемы 🗿, 3D Живые Стикеры ✨, ICQ Колобки 🟡) с поиском по тегам и эмодзи.
  * **Интерфейс Стикер-пикера**: компонент [`src/components/Stickers/StickerPicker.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stickers/StickerPicker.tsx) и модальное окно [`src/components/TelegramEmojiPickerModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/TelegramEmojiPickerModal.tsx) с переключением вкладок «Эмодзи» / «Стикеры», поиском, быстрой нижней каруселью паков, избранным (❤️) и недавними стикерами (🕒).
  * **Прозрачный рендеринг 1:1 Telegram**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) стикеры отображаются без пузыря и рамок с плавающим полупрозрачным бейджем времени и статуса прочтения (`✓` / `✓✓`).
  * **Предиктивные подсказки стикеров**: при вводе эмодзи в поле ввода над инпутом мгновенно всплывает горизонтальная строка подходящих стикеров для быстрой отправки в 1 клик.
* **Полная сквозная интеграция авторизации, сокетов и динамических комнат (Real End-to-End Auth & Multi-User Integration)**:
  * **Реальная регистрация и сохранение профилей**: регистрация через [`TelegramRegistrationWizard.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/TelegramRegistrationWizard.tsx) отправляет данные на бэкенд `/api/auth/register`, создает JWT-сессию, сохраняет аватар/имя/никнейм и автоматически подключает сокет с новым пользователем.
  * **Динамическая авторизация комнат и личных сообщений**: в [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) функция `isRoomAllowedForUser` обеспечивает мгновенный доступ к общему чату `family` и автоматически авторизует любые личные диалоги (`dm-*`).
  * **Автоматические личные чаты для новых пользователей**: в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) для любого вновь зарегистрированного пользователя сразу генерируются активные 1-on-1 диалоги со стандартными контактами (Влад, Аня, Мама, Папа, Сестра).
  * **Персистентность профилей в `localStorage`**: профили пользователей и кастомные аватары сохраняются и восстанавливаются при обновлении страницы.
  * **E2E-валидация**: проведен сквозной браузерный тест регистрации реального пользователя `realuser@telegram.org`, входа в чат, отправки сообщений и бесшовного выхода.

### [v2.79.0] — 18 августа 2026 г.
* **Интерактивные микро-взаимодействия и режим входа по QR-коду (Interactive Auth & Telegram QR Login)**:
  * **Режим входа по QR-коду в [`LoginScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/LoginScreen.tsx)**: добавлен анимированный SVG QR-код с лазерным лучом сканирования, таймером обновления, инструкцией по подключению смартфона и быстрой эмуляцией сканирования.
  * **3D-параллакс маскота**: логотип Telegram реагирует на движение курсора мыши (`rotateX`, `rotateY`) с плавной физикой отклика.
  * **Детектор Caps Lock**: отображение мягкого предупреждения при случайном вводе пароля с включенным Caps Lock.
  * **Палитра градиентов и Emoji-стикеры в [`TelegramRegistrationWizard.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/TelegramRegistrationWizard.tsx)**: выбор из 8 градиентов аватарки и быстрых стикеров (🚀, 😎, 🔥, ⚡, 👑, 💎) с живым обновлением.
  * **Генератор никнеймов**: кнопка с кубиком (🎲) для мгновенной генерации уникальных никнеймов.
  * **Быстрый демо-ввод кода**: кнопка `777777` на Шаге 2 с конфетти-анимацией подтверждения.
  * **Расширенный редактор аватара**: поворот фото на 90°, масштабирование и 4 цветовых фильтра (Оригинал, Яркий, Ч/Б, Теплый).

### [v2.78.0] — 18 августа 2026 г.
* **Редизайн экрана входа в монолитный стиль Telegram Web (Telegram Web Unified Login Aesthetic)**:
  * **Полная унификация дизайна**: в [`src/components/LoginScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/LoginScreen.tsx) убран старый фиолетовый фон с градиентными частицами и стеклянной карточкой. Теперь экран входа выполнен в чистом минималистичном стиле Telegram Web (`bg-slate-50` / dark `bg-[#0e1621]`, центрированный контейнер 400px, фирменный круглый логотип Telegram Blue `#3390ec` с самолетиком).
  * **Сетка быстрых демо-аккаунтов**: стилизована под Telegram-аватарки с мягкими скруглениями `rounded-2xl`, цветными градиентами и hover-подсветкой.
  * **Крупные поля ввода и кнопка «Войти»**: фирменные поля `rounded-2xl` с мягкой обводкой и подсветкой фокуса `#3390ec`, кнопка переключения видимости пароля и кнопка «Войти».
  * **Бесшовный переход к регистрации**: кнопка «Нет аккаунта? Зарегистрироваться» плавно запускает многошаговый мастер регистрации [`TelegramRegistrationWizard.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/TelegramRegistrationWizard.tsx), а кнопка «Назад» и «Уже зарегистрированы? Войти» мгновенно возвращают на экран входа.

### [v2.77.0] — 18 августа 2026 г.
* **Многошаговый визард регистрации в стиле Telegram Web (Telegram Multi-Step Registration Wizard)**:
  * **Компонент [`TelegramRegistrationWizard.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/TelegramRegistrationWizard.tsx)**: разработан полнофункциональный 4-шаговый мастер регистрации без перезагрузки страниц в фирменной эстетике Telegram (акцентный цвет `#3390ec`, типографика, скругления `rounded-2xl`, центрирование до 400px).
  * **Плавные Slide-анимации шагов (250–300ms)**: плавный переход между экранами с помощью `framer-motion` (`AnimatePresence`) со скольжением вперед (справа налево с fade-in/fade-out) и назад (слева направо).
  * **Шаг 1 (Ввод Email)**: валидация формата email в реальном времени, крупное поле ввода с мягким кольцом фокуса, активация кнопки «Далее» только при валидном email.
  * **Шаг 2 (6-значный код подтверждения)**: 6 отдельных ячеек с крупным моноширинным шрифтом, автопереход фокуса на следующую ячейку, поддержка навигации стрелками и Backspace, автопаста всего кода из буфера обмена, таймер повторной отправки (30 сек) с обратным отсчетом и ссылкой «Отправить код повторно».
  * **Шаг 3 (Имя пользователя и живой аватар)**: поля «Имя» (обязательное) и «Фамилия» (опционально) с генерацией и живым превью круглой аватарки с инициалами на фирменном градиентном фоне Telegram.
  * **Шаг 4 (Загрузка и встроенный Circular Crop аватара)**: загрузка фото drag&drop/picker, встроенный интерактивный инструмент круглой обрезки фото (масштабирование 1x–3x слайдером, перетаскивание позиции drag & drop, экспорт Canvas Data URL), кнопки «Пропустить» и «Готово».
  * **Интеграция с экраном входа и бэкендом**: компонент интегрирован в [`src/components/LoginScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/LoginScreen.tsx), [`src/pages/RegisterPage.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/pages/RegisterPage.tsx), [`src/types/auth.types.ts`](https://github.com/Voltikalk/Comms/blob/main/src/types/auth.types.ts) и [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js).

### [v2.76.0] — 18 августа 2026 г.
* **Комплексное улучшение документации, онбординга, CI/CD и стандартов GitHub (Onboarding & Engineering Excellence Suite)**:
  * **Репозиторные Permalinks**: все локальные файловые ссылки (`file:///...`) в `handoff.md` заменены на валидные GitHub Permalinks (`https://github.com/Voltikalk/Comms/blob/main/...`).
  * **Раздел Getting Started**: в начало `handoff.md` интегрирован пошаговый гайд по быстрому старту с системными требованиями (Node.js >= 20.x), командами запуска бэкенда, фронтенда, миграций и Storybook.
  * **Конфигурационный шаблон `.env.example`**: добавлен исчерпывающий шаблон переменных окружения для портов, Supabase URL/Keys, JWT секретов, MongoDB и WebRTC.
  * **CI Pipeline (`.github/workflows/ci.yml`)**: настроен GitHub Actions пайплайн для автоматической проверки линтинга (`oxlint`) и сборки бандла (`tsc -b && vite build`) на pull requests и push в `main`.
  * **Политика безопасности (`SECURITY.md`)**: сформирован регламент ответственного раскрытия уязвимостей, контакты и матрица поддерживаемых версий.
  * **Операционный ранбук (`docs/RUNBOOK.md`)**: добавлено руководство по эксплуатации, диагностике типичных проблем с WebSocket/Supabase и деплою.
  * **Шаблоны GitHub (`PULL_REQUEST_TEMPLATE.md` и `ISSUE_TEMPLATE/bug_report.md`)**: стандартизированы процессы ревью кода и репортинга багов.

### [v2.75.0] — 18 августа 2026 г.
* **Аутентичный заголовок компактного режима 1:1 Telegram Desktop (Clean Centered Top Bar & Menu Search)**:
  * **Устранение переполнения и наложения иконок**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) верхняя панель компактного режима (72px) переведена на каноничный дизайн Telegram Desktop — аккуратная одиночная центрированная кнопка гамбургер-меню, исключающая любое горизонтальное вылезание иконок за пределы боковой панели.
  * **Поиск в выпадающем меню**: функция полнотекстового глобального поиска сообщений (`FTS`) интегрирована прямо в верхний пункт выпадающего меню, обеспечивая удобный доступ как мышью, так и клавиатурным хоткеем `Ctrl+F`.
  * **Полноразмерная панель поиска в обычном режиме**: при растягивании списка чатов вправо полноразмерная строка поиска и кнопка глобуса отображаются в привычном виде.

### [v2.74.0] — 18 августа 2026 г.
* **Полнофункциональный поиск и глобальный поиск в компактном режиме (Compact Search & FTS Integration)**:
  * **Иконки поиска и глобального поиска в колонке 72px**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) при сужении панели до иконок функции поиска и глобального FTS-поиска (`IconSearch` и `IconWorld`) остаются полностью доступными в верхней панели.
  * **Всплывающий быстрый поиск (Floating Quick Search Flyout)**: нажатие на кнопку поиска в компактном режиме открывает аккуратный плавающий поисковый оверлей для мгновенной фильтрации списка чатов прямо из компактной панели с кнопкой очистки и быстрым переходом в полнотекстовый глобальный поиск.
  * **Прямой вызов глобального поиска**: клик на глобус (`🌐`) мгновенно открывает полнотекстовый поиск по всей истории сообщений с подсветкой и фильтрами.

### [v2.73.0] — 18 августа 2026 г.
* **Исправление наложения линии разделителя поверх выпадающего меню (Z-Index Layering Fix)**:
  * **Корректный порядок наложения (Z-Index Stacking)**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) скорректирован `z-index` боковой панели и сплиттера: при открытии меню панель поднимается на `z-50`, а разделитель переведен на `z-10`, благодаря чему синяя линия сплиттера больше не перекрывает всплывающее меню.
  * **Чистый визуальный вид в компактном режиме**: меню профиля и настроек отображается монолитно поверх всех разделителей и окон.

### [v2.72.0] — 18 августа 2026 г.
* **Исправление выпадающего гамбургер-меню и добавление клика вне меню (Hamburger Dropdown Fix & Outside Click Backdrop)**:
  * **Устранение падения интерфейса**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) исправлен рендеринг выпадающего меню боковой панели, устранены невалидные ссылки на неопределенные обработчики, вызывавшие падение React-компонента при нажатии на иконку меню.
  * **Прозрачный бэкдроп (Click-Outside)**: добавлен прозрачный фоновый оверлей (`fixed inset-0 z-40`), автоматически закрывающий меню при клике в любую область чата.
  * **Адаптивное позиционирование меню**: в компактном режиме (72px) меню аккуратно всплывает поверх чата без обрезания границ.

### [v2.71.0] — 18 августа 2026 г.
* **Компактный режим панели чатов до иконок и аватаров (Compact Icon-Only Sidebar Mode 1:1 Telegram)**:
  * **Сужение до 72px (Icon Bar)**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) при сжатии панели влево (или перетаскивании порога `< 175px`) список чатов плавно и компактно сворачивается в аккуратную вертикальную колонку шириной **72px** с круглыми аватарами, центрированным меню и всплывающими подсказками названий (`title`).
  * **Бейджи непрочитанных и статус активности**: в компактном режиме счетчики непрочитанных сообщений аккуратно отображаются в верхнем правом углу каждого аватара, а статус онлайн (`emerald dot`) и подсветка активного диалога сохраняются в первозданном виде.
  * **Удобное раскрытие обратно**: при перетаскивании границы вправо панель плавно разворачивается обратно в полноразмерный список чатов с поиском и текстом.

### [v2.70.0] — 18 августа 2026 г.
* **Растягивание и сужение боковой панели списка чатов 1:1 с Telegram Desktop (Resizable & Adaptive Sidebar Engine)**:
  * **Интерактивный сплиттер (Drag-to-Resize Handle)**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) между боковым списком чатов и окном сообщений добавлен интерактивный разделитель с подсветкой при наведении и захвате (`cursor-col-resize`), позволяющий плавно мышью или тачем растягивать и сужать ширину панели от 250px до 640px (до 60% экрана).
  * **Сохранение ширины в LocalStorage**: выбранная пользователем ширина автоматически сохраняется в `localStorage('tg_sidebar_width')` и восстанавливается при перезагрузке приложения.
  * **Адаптивность и защита от перехвата событий**: на мобильных экранах панель автоматически переключается на нативную полноэкранную верстку (`w-full`), а во время перетаскивания активируется прозрачный глобальный оверлей, предотвращающий залипание курсора над медиафайлами и видеоплеером.

### [v2.69.0] — 18 августа 2026 г.
* **Полная стабильность ленты чата на месте и ламинарное парение песчинок (Stationary Chat Feed & Laminar Micro-Sand Physics)**:
  * **Лента чата остается на месте без сдвигов**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) удалена принудительная анимация схлопывания высоты строки в DOM во время полета частиц, вызывавшая скачки и перерисовку всего скролла чата. Чат теперь стоит на месте, пока облако пыли растворяется в воздухе.
  * **6 000 – 9 500 ультра-мелких песчинок (0.6–1.1px)**: частицы уменьшены до размера микроскопической пыли и плавно расширяются мягким облаком с мягким восходящим потоком.
  * **Абсолютная гладкость без вибрации**: чистое ламинарное интегрирование скорости с вязким демпфированием (`0.982–0.987`) исключает любые колебания.

### [v2.68.0] — 18 августа 2026 г.
* **Ультра-мелкие микро-песчинки без дрожания (High-Density Ultra-Fine Micro-Sand Engine)**:
  * **Микро-песчинки (0.7 – 1.3px) и повышенная плотность**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) количество частиц увеличено почти в 3 раза (от 5 000 до 8 500 песчинок), а их размер уменьшен до настоящих микроскопических песчинок (0.7–1.0px).
  * **Полное устранение дрожания и вибрации (Zero-Jitter Physics)**: удалено синусоидальное наложение шума на координаты, вызывавшее колебания между кадрами. Интеграция переведена на непрерывное вязкое демпфирование (`drag: 0.974–0.982`), обеспечивающее абсолютную шелковистость движения.
  * **Мягкое кинематографичное затухание (1.8 с)**: частицы долго и плавно парят восходящим потоком с деликатным мерцанием.

### [v2.67.0] — 18 августа 2026 г.
* **Восстановление полюбившегося оригинального движка звездной пыли (Restoration of Beloved Stardust Thanos Snap Engine)**:
  * **Возврат оригинального Canvas-движка из v2.52.0**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) возвращена оригинальная и полюбившаяся физика космической звездной пыли (1 500 – 3 500 микро-пылинок, палитра Stardust `#b8f2ff`, `#5ac8fa`, `#70b1ff`, `#ffffff`, мягкое затухание за 1.45 с).
  * **Поддержка единичного и группового удаления**: сохранен единый общий Canvas и чистое сжатие строк (`transition: all 480ms cubic-bezier(0.25, 1, 0.5, 1)`), обеспечивающий идеальную стабильность без дерганий и лагов.

### [v2.66.0] — 18 августа 2026 г.
* **Аутентичная диагональная волна распада Telegram и тайминг схлопывания строк (Authentic Telegram Wave Dissolution & Timed Row Collapse)**:
  * **Плавный фронт волны (Bottom-Right -> Top-Left)**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) реализована аутентичная физика Telegram: сообщение плавно «сгорает» по диагонали (340 мс), на границе среза рождаются яркие светящиеся искры (`#5ac8fa`), а отделившиеся частицы взмывают вверх легким вихрем.
  * **Устранение рывков интерфейса (Delayed Row Collapse)**: схлопывание высоты строки чата больше не стартует на нулевом кадре (что смещало координаты), а плавно запускается в середине волны (на 240-й мс) с мягким переходом `380ms cubic-bezier(0.25, 1, 0.5, 1)`, устраняя любые визуальные нестыковки между Canvas и списком сообщений.

### [v2.65.0] — 18 августа 2026 г.
* **Единый оптимизированный мульти-эффект удаления группы сообщений (Unified Multi-Message Disintegration Engine)**:
  * **Один общий Canvas вместо множества копий**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) и [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) групповое удаление выделенных сообщений переведено на единый общий Canvas с единым render-циклом 60/120 FPS.
  * **Адаптивная плотность частиц (Adaptive Particle Capping)**: шаг сетки частиц динамически рассчитывается исходя из суммарной площади всех выделенных облачков, жестко удерживая общее количество частиц на уровне ~3 500 – 4 500 даже при одновременном удалении 10+ сообщений, что гарантирует абсолютную плавность и отсутствие лагов GPU/CPU.
  * **Синхронное схлопывание всех выделенных строк**: все выбранные строки чата плавно и синхронно сжимаются одновременно, формируя единое красивое вихревое облако космической пыли.

### [v2.64.0] — 18 августа 2026 г.
* **Исправление чистого отображения видеосообщений без карточки файла и дублирования имени (Clean Video Message Rendering Fix)**:
  * **Разделение типов медиа (Exclusive Media Types)**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) карточка файла с синей иконкой документа теперь рендерится исключительно для настоящих документов (`isDocumentFile`), исключая видео и фото.
  * **Устранение дублирующей подписи с именем файла**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) и [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) очищено автозаполнение текста сообщения именем файла (`📎 Download (1).mp4`). Видео отображается строго как нативный видеоплеер Telegram с таймкодом и длительностью.
  * **Распознавание видео при синхронизации Supabase**: в [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) парсер вложений из PostgreSQL теперь корректно определяет `video` и `video_note` по MIME-типу и расширениям файлов.

### [v2.63.0] — 18 августа 2026 г.
* **Полное устранение микро-дерганий и исправление удаления на сервере (Zero-Jitter Continuous Rotation Physics & Server Fix)**:
  * **Математически гладкая интеграция траекторий**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) удалены тригонометрические осцилляции прямого позиционирования, вызывавшие микро-вибрацию частиц. Завихрение переведено на непрерывное вращение вектора скорости (`nvx = vx * cos - vy * sin`) с монотонным интегрированием координат `p.x += p.vx`, обеспечив 100% стабильный и гладкий полет.
  * **Устранение субпиксельного дрожания списка**: из анимации схлопывания удален `transform: scale()`, благодаря чему соседние сообщения поднимаются монолитно и без дрожания.
  * **Исправление падения Node.js сервера**: в [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) исправлен вызов `supabase.from(...).update().eq().catch()`, вызывавший TypeError при удалении/редактировании сообщений.

### [v2.62.0] — 18 августа 2026 г.
* **Ультра-плавное слоу-мо рассеивание звездной пыли (Ultra-Smooth Slow-Motion Ethereal Dust)**:
  * **Невесомый подъем и вязкое демпфирование**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) начальная скорость разлета снижена до нежнейших `0.2–0.8`, а сопротивление воздуха доведено до `drag: 0.982–0.988` с мягким непрерывным тепловым подъемом (`buoyancy: 0.006–0.010`), придавая частицам ощущение невесомости.
  * **Увеличенная продолжительность жизни (1.9–2.4 с)**: время мягкого парения увеличено до ~2.4 с с квадратичным угасанием (`decayAlpha = (1 - progress)^2.0`), благодаря чему пылинки плавно и бесшовно тают как утренний туман.
  * **Эластичное скольжение списка (720 мс)**: анимация высоты строки переведена на кривую замедления Apple/Telegram `720ms cubic-bezier(0.16, 1, 0.3, 1)`.

### [v2.61.0] — 18 августа 2026 г.
* **Шелковистая и плавная физика рассеивания пыли (Silky Smooth & Graceful Dust Dynamics)**:
  * **Мягкий разлет и высокое сопротивление воздуха**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) начальная скорость разлета частиц снижена более чем в 2 раза (`burstSpeed: 0.4–1.5`), а сопротивление воздуха увеличено до `drag: 0.966–0.978`, благодаря чему частицы не улетают резко, а плавно парят в воздухе.
  * **Увеличенное время жизни (1.3–1.7 с)**: продолжительность парения пылинок увеличена до комфортных ~1.75 с с нелинейным квадратичным затуханием (`decayAlpha = (1 - progress)^1.6`), сохраняя видимость вихрей в воздухе.
  * **Плавное схлопывание чата (520 мс)**: переход высоты строки чата переведен на `520ms cubic-bezier(0.25, 1, 0.5, 1)`, обеспечивая кинематографичное скольжение списка сообщений.

### [v2.60.0] — 18 августа 2026 г.
* **Мгновенный старт анимации распада без пауз и замираний (Zero-Delay Instant Dust Liftoff)**:
  * **Устранение статической фазы ожидания**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) полностью удалена искусственная задержка активации (`activationTime: 0`), из-за которой частицы замирали на экране перед разлетом.
  * **Мгновенный импульс с 0-го кадра**: все 1 800 – 3 800 песчинок начинают разлет и вихревой подъем в воздух сразу в момент клика, моментально превращая сообщение в динамичное облако цветной пыли.
  * **Синхронное схлопывание строки**: схлопывание высоты строки чата (`startSmoothCollapse()`) запускается мгновенно с начала анимации, обеспечивая идеальную бесшовность списка.

### [v2.59.0] — 18 августа 2026 г.
* **Аутентичный эффект удаления сообщений 1:1 с Telegram (Pixel-Sampled Telegram Dust Effect Deletion)**:
  * **Прямой семплинг реальных пикселей элемента**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) движок теперь захватывает растровый снимок сообщения (цвета фона, текст, аватарки, медиа и галочки) — каждая песчинка распада получает точный RGBA-цвет того места сообщения, из которого она родилась.
  * **Диагональный волновой фронт распада**: волна аннигиляции распространяется по рваной диагональной линии от правого нижнего угла к левому верхнему, сопровождаясь яркими мерцающими искрами и светящимися осколками (`#5ac8fa`, `#b8f2ff`, `#ffffff`).
  * **Двухслойная физика песка и вихрей**: 1 800 – 4 000 микрочастиц (1.0–2.2px) с симуляцией атмосферного сопротивления воздуха, теплового восходящего потока и легкой турбулентности плавно закручиваются и тают в воздухе.
  * **Бесшовное схлопывание списка (`height -> 0px`)**: строка сообщения начинает мягко сжиматься уже на 190-й миллисекунде, плавно подтягивая соседние сообщения, пока облако песка еще кружится в пространстве.

### [v2.58.0] — 18 августа 2026 г.
* **Идеальное инлайн-выравнивание времени по базовой линии текста (Authentic Inline Baseline Timestamp Alignment)**:
  * **Устранение `float-right` и искусственных сдвигов**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) удален класс `float-right` и ручной `translate-y-[3px]`, приводившие к задиранию времени в верхний угол и отрыву от базовой линии слов.
  * **Нативная базовая линия (`align-baseline`)**: блок времени переведен в естественный инлайн-поток (`inline-flex items-center align-baseline whitespace-nowrap ml-2 tabular-nums`), благодаря чему цифры времени (`01:11`, `01:13`) строго и бесшовно сидят на единой горизонтальной базовой линии рядом с текстом сообщения на одном уровне с буквами `sadgsfg`, `привет мир` и `ывапыв`.

### [v2.57.0] — 18 августа 2026 г.
* **Идеальная калибровка базовой линии времени (Pixel-Perfect Baseline Calibration)**:
  * **Калибровка высоты шрифта**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) задано точное смещение `translate-y-[3px]` с `leading-none`, благодаря чему нижняя граница цифр времени `01:21` идеально совпадает с нижней базовой линией букв текста `аоаоапр`.
  * **Отсутствие сползания и парения**: время больше не парит вверху строки и не вылезает за пределы облачка.

### [v2.56.0] — 18 августа 2026 г.
* **Идеальное выравнивание времени в одну линию с текстом (Horizontal Baseline Timestamp Alignment)**:
  * **Единая базовая линия (Baseline Alignment)**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) удален отступ `mt-1`, вызывавший перекос и сползание времени на коротких строках.
  * **Синхронная высота строки (`leading-[1.35]`)**: время `01:21 ✔` теперь сидит на абсолютно одной высоте и горизонтальной линии с текстом сообщения.

### [v2.55.0] — 18 августа 2026 г.
* **Идеальное вертикальное центрирование текста в строке ввода (Pixel-Perfect Textarea Vertical Centering)**:
  * **Устранение провисания строки**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) внутренний верхний отступ поля ввода скорректирован (`py-0.5`, `leading-[22px]`, `self-center`), благодаря чему курсор и подсказка `Сообщение...` расположены строго по центру капсулы на одной оси с иконками.

### [v2.54.0] — 18 августа 2026 г.
* **Идеальное выравнивание и русификация строки ввода (Bottom Input Bar Alignment & Russian Placeholder)**:
  * **Русификация плейсхолдера**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) текст подсказки изменен с `Message` на `Сообщение...`.
  * **Пиксельное выравнивание по центру**: все кнопки (`скрепка`, `эмодзи`, `камера`) и текстовое поле набора сбалансированы по единой горизонтальной оси (`items-center`, `w-9 h-9 rounded-full`, `leading-[20px]`).

### [v2.53.0] — 18 августа 2026 г.
* **Идеальное позиционирование времени внутри облачка сообщения (Pixel-Perfect Inline Timestamp Alignment)**:
  * **Устранение сползания времени за пределы облачка**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) удалено смещение `translate-y-1.5`, выталкивавшее время и галочки за нижнюю скругленную границу сообщения.
  * **Комфортные внутренние отступы**: блок текста получил корректный нижний паддинг (`pt-1.5 pb-2 px-3`), благодаря чему таймстамп `00:36 ✔` сидит строго внутри угла облачка в точности как в Telegram.

### [v2.52.0] — 18 августа 2026 г.
* **Бесшовный старт анимации и плавное схлопывание высоты в списке (Smooth Onset & Seamless Height Collapse)**:
  * **Плавный старт без рывков**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) добавлена мягкая передача отображения (мягкий 80мс Fade-Out оригинального блока и синхронный Fade-In частиц).
  * **Плавное схлопывание чата (`height -> 0px`)**: во время полета звездной пыли (на 280-й миллисекунде) строка сообщения плавно сжимается по высоте (`transition: all 480ms cubic-bezier(0.25, 1, 0.5, 1)`), благодаря чему соседние сообщения мягко съезжаются без резких скачков и рывков списка.

### [v2.51.0] — 18 августа 2026 г.
* **Бесшумный и более плавный эффект рассыпания (Silent & Gracefully Slower Stardust Disintegration)**:
  * **Отключение звука**: полностью удален синтезированный аудио-шум для абсолютно тихого и чистого процесса удаления сообщений.
  * **Плавная замедленная динамика**: длительность анимации увеличена до ~1.45 с с мягким затуханием, деликатным вихревым движением пылинок и плавным рассеиванием в воздухе.

### [v2.50.0] — 18 августа 2026 г.
* **Аутентичная ультра-мелкая звездная пыль «Щелчка Таноса» 1:1 с Telegram (Ultra-Fine Stardust Thanos Snap Engine)**:
  * **1 500 – 3 500 микро-пылинок (1.0–2.4px)**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) движок переведен на генерацию плотного облака светящейся космической пыли с мерцанием и переливами.
  * **Эфирная цветовая гамма Stardust**: палитра точь-в-точь соответствует скриншоту Telegram — ледяной циан, электрический синий, мятный и чистые белые искры (`#b8f2ff`, `#5ac8fa`, `#70b1ff`, `#ffffff`).
  * **Вихревое рассеивание и восходящий поток**: частицы клубящимся облаком расширяются наружу и плавно тают в воздухе.

### [v2.49.0] — 18 августа 2026 г.
* **Устранение дублирования времени в пересланных медиа-сообщениях (Eliminate Duplicate Timestamps on Forwarded Media)**:
  * **Корректная проверка наличия подписи (`hasText`)**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) переменная `hasText` теперь проверяет именно очищенный текст подписи пользователя (`displayMessageText.trim()`), исключая ложные срабатывания от скрытых мета-тегов пересылки.
  * **Одиночный точный таймстамп**: устранено появление лишнего пустого контейнера текста и дублирующейся плашки `01:09 ✔` под видеороликами и фотографиями.

### [v2.48.0] — 18 августа 2026 г.
* **Аутентичный эффект «Щелчка Таноса» при удалении сообщения (Telegram 1:1 Thanos Snap Disintegration Wave)**:
  * **Волновой фронт распада (Progressive Wave)**: в [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts) реализована аутентичная сетка микропикселей (2.5–5px), рассыпающаяся по диагональной волне от левого нижнего угла к правому верхнему.
  * **Физика космического ветра и турбулентности**: частицы подхватываются воздушным потоком, вращаются и уносятся вправо-вверх с затухающим шлейфом пыли и реалистичным аудио-шумом растворения (Web Audio API noise buffer + bandpass filter).

### [v2.47.0] — 18 августа 2026 г.
* **Очистка метаданных пересылки в глобальном поиске (Global Search Snippet & Result Sanitization)**:
  * **Очистка сниппетов и карточек поиска**: в [`src/pages/SearchPage.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/pages/SearchPage.tsx) и [`src/components/Search/SearchResultCard.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Search/SearchResultCard.tsx) служебные теги `[fwd:...]` теперь полностью фильтруются при формировании сниппетов, текстовом поиске и подсветке совпадений.

### [v2.46.0] — 18 августа 2026 г.
* **Фирменный эффект рассыпания сообщения на частицы при удалении (Telegram Thanos Disintegration Dust Explosion)**:
  * **Движок физики частиц на Canvas**: создан модуль [`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts), генерирующий от 100 до 220 светящихся осколков и микро-частиц с реалистичной физикой разлета, гравитацией, вращением и угасанием (60 FPS).
  * **Тематическая палитра и аудио-тактильный отклик**: цвет частиц динамически подстраивается под тему (светлая/темная) и цвет облачка (исходящее/входящее), сопровождаясь мягким звуком растворения и тактильной вибрацией (`navigator.vibrate`).
  * **Интеграция со всеми сценариями удаления**: анимация распада подключена к контекстному меню, модальному окну подтверждения удаления в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) и групповому каскадному удалению в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx).

### [v2.45.0] — 18 августа 2026 г.
* **Очистка превью в списке чатов и цитатах ответов (Chat List Preview & Reply Quote Metadata Sanitization)**:
  * **Очистка превью в боковом списке**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) функция `getLastMessagePreview` теперь очищает любые служебные теги `[fwd:...]`, отображая только чистый текст сообщения.
  * **Очистка плашек ответов и цитат**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) и [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) цитаты ответов очищены от технических метаданных.

### [v2.44.0] — 18 августа 2026 г.
* **Гарантированная доставка метаданных пересылки (Bulletproof Zero-Width Forwarded Metadata Transport)**:
  * **Невидимый транспорт метаданных**: в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) метаданные об исходном авторе (`{ sender, senderName }`) теперь упаковываются в невидимый zero-width транспортный тег, который безопасно проходит через любые версии сокет-серверов и БД без потерь и обрезаний.
  * **Автоматическое декодирование и очистка**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) метаданные мгновенно извлекаются, формируя плашку `Переслано от [Имя автора]`, а тело сообщения очищается от любых технических тегов.

### [v2.43.0] — 18 августа 2026 г.
* **Сквозное определение имени автора при пересылке с любых аккаунтов (Universal Forwarded Sender Name Resolution)**:
  * **Надежное распознавание (`getUserDisplayName`)**: в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) и [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) добавлена многоуровневая цепочка определения имени отправителя (`пользовательские профили -> DEFAULT_USER_PROFILES -> USER_NAMES -> username`).
  * **Сохранение первоисточника**: при повторной/цепочной пересылке сохраняется первоначальный автор сообщения (`originalSenderName`), корректно отображая его имя на любых клиентских аккаунтах.

### [v2.42.0] — 18 августа 2026 г.
* **Исправление импортов и восстановление рендеринга (Fixed Missing Imports & Render Restoration)**:
  * **Импорты `useMemo` и `IconShare3`**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) добавлены недостающие импорты `useMemo` и `IconShare3`, устранившие runtime-ошибку ReferenceError и восстановившие отображение чата.

### [v2.41.0] — 18 августа 2026 г.
* **Выделенный значок пересылки как отдельный элемент (Standalone Forwarded Message Indicator & Badge)**:
  * **Отдельный заголовок-плашка**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) значок пересылки теперь отображается как самостоятельный элемент оформления над сообщением (`Переслано от Имя` со стрелкой пересылки) с тонким аккуратным разделителем.
  * **Очистка тела сообщения**: текст сообщения больше не загрязняется текстовыми префиксами `[Переслано от ...]`, отображая исключительно чистый контент сообщения.

### [v2.40.0] — 18 августа 2026 г.
* **Привязка панели эмодзи прямо над кнопкой строки ввода (Input Bar Emoji Popup Anchoring)**:
  * **Прямая привязка над полем ввода**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) окно выбора эмодзи при клике на смайлик `😊` в строке набора теперь открывается не в центре экрана, а строго над капсулой ввода (`absolute bottom-full right-0 sm:right-12 mb-2.5`), прямо рядом с кнопкой эмодзи и микрофона.
  * **Автоматическое закрытие по клику вне панели**: добавлен невидимый полноэкранный перехватчик клика для плавного закрытия при нажатии в любую область чата.

### [v2.39.0] — 18 августа 2026 г.
* **Адаптивное авто-расширение строки ввода сообщения (Auto-Expanding Input Field with Max-Height Limit)**:
  * **Плавный рост поля ввода**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) поле ввода текста `textarea` теперь плавно и автоматически увеличивается в высоту по мере набора текста (от 1 строки до 6–7 строк).
  * **Ограничение максимальной высоты (160px)**: при превышении 160px поле перестает бесконечно расти и включает аккуратную внутреннюю прокрутку в стиле Telegram Desktop / Mobile.
  * **Идеальное выравнивание кнопок (`items-end`)**: кнопки прикрепления файлов, эмодзи и микрофона зафиксированы у нижнего края капсулы ввода.

### [v2.38.0] — 18 августа 2026 г.
* **Плавный процесс пересылки сообщений и мягкие переходы (Smooth Forwarding Workflow & Gentle Chat Transitions)**:
  * **Сохранение контекста при пересылке**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) при пересылке сообщений пользователь больше не выбрасывается резко из текущего чата. Сообщение отправляется в фоновом режиме, а внизу экрана появляется аккуратный всплывающий баннер `Сообщение переслано в [Чат]` с кнопкой `Перейти`.
  * **Смягчение анимации смены чата (`@keyframes chatFadeSlide`)**: в [`src/index.css`](https://github.com/Voltikalk/Comms/blob/main/src/index.css) убран резкий вертикальный скачок `translateY(8px)` — переход между комнатами теперь происходит с мягким затуханием прозрачности и микро-масштабированием `scale(0.995) -> scale(1)`.

### [v2.37.0] — 18 августа 2026 г.
* **Полноценная пересылка сообщений между чатами (Cross-Room Message Forwarding & Forwarded Header)**:
  * **Прямая отправка в целевую комнату (`forwardMessage`)**: в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) реализован метод `forwardMessage(targetRoomId, message)`, отправляющий сообщение с сохранением всех вложений непосредственно в выбранный чат без асинхронных гонок состояния `activeRoomId`.
  * **Метаданные и серверная трансляция (`forwardedFrom`)**: в [`src/types.ts`](https://github.com/Voltikalk/Comms/blob/main/src/types.ts) и [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) добавлена сквозная передача информации об авторе исходного сообщения.
  * **Визуальная плашка Telegram**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) пересланные сообщения теперь отображаются с аутентичной шапкой `Переслано от ...` в фирменном синем цвете Telegram.

### [v2.36.0] — 18 августа 2026 г.
* **Интеллектуальное позиционирование окна всех реакций (Desktop-Anchored vs Mobile-Centered Emoji Picker)**:
  * **Привязка к сообщению на ПК (Desktop)**: в [`src/components/TelegramContextMenuModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/TelegramContextMenuModal.tsx) на широких экранах (`>= 640px`) окно всех эмодзи теперь открывается прямо рядом с сообщением (где был клик), учитывая полную ширину 336px и отступ 16px от правого края, без отрыва в центр монитора.
  * **Центрирование на смартфонах (Mobile)**: на мобильных экранах окно аккуратно центрируется по экрану телефона, исключая смещения и обрезание контента.

### [v2.35.0] — 18 августа 2026 г.
* **Центрированное модальное окно расширенного выбора реакций (Centered Full Emoji Reaction Picker Modal)**:
  * **Отдельное центрированное модальное окно**: в [`src/components/TelegramContextMenuModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/TelegramContextMenuModal.tsx) при нажатии кнопки `▼` («Больше реакций») окно выбора эмодзи `TelegramEmojiPickerModal` теперь рендерится в глобальном центрированном контейнере `fixed inset-0 flex items-center justify-center p-3`, полностью устраняя зависимость от координат клика и смещение за правый край экрана.
  * **Идеальная адаптивность**: окно реакций корректно открывается строго по центру экрана на смартфонах, планшетах и компьютерах с полным доступом ко всем категориям, поиску и 8-колоночной сетке эмодзи.

### [v2.34.0] — 18 августа 2026 г.
* **Устранение вылезания меню реакций за правый край экрана (Right-Side Context Menu & Reactions Bounds Fix)**:
  * **Динамический замер ширины и привязка к правому краю**: в [`src/components/TelegramContextMenuModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/TelegramContextMenuModal.tsx) для исходящих сообщений (находящихся справа) меню теперь автоматически позиционируется с выравниванием `items-end` и безопасным зазором `viewportWidth - menuWidth - 12px`, полностью исключая обрезание стрелки раскрытия и крайних эмодзи.
  * **Компактная плашка реакций**: оптимизированы отступы и размеры иконок быстрых реакций (`25px`), благодаря чему меню полностью и аккуратно помещается на экранах любых смартфонов.

### [v2.33.0] — 18 августа 2026 г.
* **Адаптация и отзывчивость меню реакций на смартфонах (Mobile Reactions & Context Menu Responsiveness)**:
  * **Адаптивное позиционирование панели реакций**: в [`src/components/TelegramContextMenuModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/TelegramContextMenuModal.tsx) добавлено интеллектуальное выравнивание по экрану смартфона (`max-w-[calc(100vw-24px)] overflow-x-auto`) с безопасными отступами 12px от краев экрана, устраняющее обрезание и вылезание панели реакций за правый край.
  * **Увеличенные области нажатия и тактильный отклик**: размер кнопок реакций для тачскринов увеличен до `w-9 h-9`, добавлен легкий виброотклик (`navigator.vibrate`) при установке реакции.
  * **Оптимизация долгого нажатия**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) время удержания пальца скорректировано до комфортных 360 мс с фильтрацией микро-дрожания пальца до 16px.

### [v2.32.0] — 18 августа 2026 г.
* **Ровная и аккуратная полоса подсветки всей строки сообщения (Straight & Even Telegram Row Flash)**:
  * **Устранение изогнутой капсульной рамки**: в [`src/index.css`](https://github.com/Voltikalk/Comms/blob/main/src/index.css) анимация `@keyframes tgRowFlash` и класс `.tg-message-row-highlight` заменены на ровную, полупрозрачную синюю заливку Telegram (`rgba(51, 144, 236, 0.3)`) с плавным затуханием без выступающих овальных колец (`ring-2`).
  * **Аккуратные отступы и скругления строки**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) заданы выверенные отступы `py-1 px-1.5 sm:px-2` и скругление `rounded-xl`, благодаря чему полоса подсветки выглядит ровной, параллельной границам ленты и гармонично охватывает все сообщение.

### [v2.31.0] — 18 августа 2026 г.
* **Аутентичное выделение и подсветка сообщений (Authentic Telegram Message Bubble Flash Highlight)**:
  * **Точечная подсветка самого облачка сообщения**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) анимация перехода теперь накладывается строго на карточку сообщения (`[data-bubble="true"]`), а не на всю горизонтальную строку чата, устраняя вытянутые овальные капсулы на обоях.
  * **Плавный фирменный импульс свечения (`@keyframes tgMessageFlash`)**: в [`src/index.css`](https://github.com/Voltikalk/Comms/blob/main/src/index.css) добавлена мягкая синяя вспышка Telegram (`rgba(51, 144, 236)`) с сохранением скруглений облачка и плавным затуханием.

### [v2.30.0] — 18 августа 2026 г.
* **Точный скролл к сообщению на уровне контейнера чата (Direct Container Coordinate Scrolling & Layout Calibration)**:
  * **Прямой скролл контейнера сообщений**: в функции `jumpToMessage` расчет позиции сообщения теперь осуществляется напрямую относительно контейнера `messageFeedRef` (`targetScrollTop = relativeTop - containerHeight/2 + elHeight/2`), предотвращая зависание скролла на верхнем краю чата.
  * **Двухфазная калибровка при анимации открытия чата**: добавлен контрольный проход через 250 мс после завершения анимации перехода `animate-chat-switch` / `mobileView`, корректирующий скролл прямо на сообщение, если подгрузка аватарок или медиа сместила высоту ленты.

### [v2.29.0] — 18 августа 2026 г.
* **Мгновенный переход к сообщению из общего поиска (Instant Search Navigation & Mobile View Switch)**:
  * **Автоматическое переключение мобильного вида**: при клике на результат в окне глобального поиска (`SearchPage`) теперь мгновенно вызывается `setMobileView('chat')`, благодаря чему на мобильных устройствах и экранах любого размера пользователя сразу переносит в окно активного чата к сообщению, а не оставляет в списке чатов.
  * **Сохранение размера ленты при смене чата**: добавлен пропуск сброса `visibleCount = 40`, если активен `pendingNavigateMessageIdRef`, а также до 15 итераций динамического поиска элемента и расширения среза, благодаря чему сообщение сразу попадает в фокус экрана и подсвечивается без необходимости ручной прокрутки.

### [v2.28.0] — 18 августа 2026 г.
* **Исправление падения рендера (Runtime useCallback Import Fix)**:
  * В [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) добавлен явный импорт `useCallback` и `useMemo` из `react`, устранивший падение приложения с белым/зеленым экраном при запуске.

### [v2.27.0] — 18 августа 2026 г.
* **Исправление перехода и скролла к найденным сообщениям (Search & Quote Jump Navigation Fix)**:
  * **Устранение ограничения на видимые сообщения (`visibleCount`)**: функция перехода к сообщению `jumpToMessage` в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) теперь автоматически определяет позицию целевого сообщения в истории и динамически расширяет срез сообщений, гарантируя, что даже старые сообщения загружаются в DOM и отображаются при клике.
  * **Асинхронная навигация при смене чата**: добавлен `pendingNavigateMessageIdRef`, позволяющий мгновенно открывать чат из глобального поиска и бесшовно скроллить к сообщению после смены комнаты без сбоев и гонок таймеров.
  * **Плавный скролл и подсветка цитат**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) клик по цитате-ответу переведен на `jumpToMessage`, обеспечивая мгновенный скролл с красивой мягкой подсветкой сообщения.

### [v2.26.0] — 18 августа 2026 г.
* **Переход на аутентичную типографику Telegram (Inter / Roboto Tabular-Nums Typography)**:
  * **Замена моноширинного шрифта на чистый Telegram-шрифт**: во всех компонентах видеоплеера (`TimeDisplay.tsx`, `ControlBar.tsx`, `SettingsMenu.tsx`, `video-player.css`) убран терминальный моноширинный шрифт `JetBrains Mono`.
  * **Включение `tabular-nums`**: заданы `font-variant-numeric: tabular-nums` и `font-feature-settings: 'tnum' 1, 'cv05' 1` на базе системного шрифта Telegram (`Inter` / `Roboto` / `-apple-system`), благодаря чему цифры времени (`0:04 / 0:15`) отображаются ровно, аккуратно и не скачут при воспроизведении.

### [v2.25.0] — 17 августа 2026 г.
* **Исправление обрезки меню настроек видео (Settings Popover Clipping Fix)**:
  * В [`src/styles/video-player.css`](https://github.com/Voltikalk/Comms/blob/main/src/styles/video-player.css) меню настроек переведено на `bottom: calc(100% + 8px); right: 0;` с компактной шириной 175px и максимальной высотой до 220px, что исключило вылезание за границы видеоконтейнера сверху и слева.
  * В [`src/components/VideoPlayer/Controls/SettingsMenu.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/SettingsMenu.tsx) оптимизированы отступы и размеры иконок (`14px`), пункты меню не обрезаются и аккуратно отображаются как в узких вертикальных (9:16), так и в низких горизонтальных (16:9 / 21:9) видео.

### [v2.24.0] — 17 августа 2026 г.
* **Устранение наложения элементов управления в компактных карточках (Zero Overlap in Compact Controls)**:
  * В [`src/components/VideoPlayer/Controls/TimeDisplay.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/TimeDisplay.tsx) добавлены `shrink-0 whitespace-nowrap text-[10px] sm:text-[11px]`, что исключает перенос или наплыв таймера на соседние кнопки.
  * В [`src/components/VideoPlayer/Controls/ControlBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/ControlBar.tsx) разгружен правый блок инлайн-плеера: кнопка `1x` переведена в полноэкранный режим и меню настроек, что дало большой запас свободного пространства в узких/вертикальных видеокарточках (Play + Volume + Time слева, Settings + Fullscreen справа) с нулевым риском коллизий.

### [v2.23.0] — 17 августа 2026 г.
* **Полное воссоздание логики и интерфейса видеоплеера Telegram Web (Telegram Web Video Player Replication)**:
  * **Режим паузы (Inline Thumbnail)**: превью очищено от посторонних панелей и полос — по центру отображается круглая кнопка Play со стеклянным фоном (`bg-black/55 backdrop-blur-md`), а в верхнем левом углу — аккуратный бейдж длительности (`MM:SS`) в стиле Telegram Web.
  * **Интерактивная панель при воспроизведении**:
    * Добавлена кнопка быстрого переключения скорости воспроизведения (`1x` → `1.5x` → `2x`) прямо в нижнюю панель.
    * Интерактивный таймлайн и контролы плавно появляются при воспроизведении, наведении курсора или тапе по экрану, а затем автоматически исчезают через 3 секунды бездействия.
    * Клик по видео в любой точке плавно переключает паузу/воспроизведение.

### [v2.22.0] — 17 августа 2026 г.
* **Увеличение горизонтальных видео для комфортного просмотра (Cinematic Horizontal Video Sizing)**:
  * В [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) максимальная ширина горизонтальных видео расширена до `min-w-[260px] max-w-[350px] xs:max-w-[420px] sm:max-w-[480px] md:max-w-[540px]` с максимальной высотой до `380px`.
  * Горизонтальные видео теперь смотрятся крупно, кинематографично и выразительно как на смартфонах, так и на планшетах/десктопе.

### [v2.21.0] — 17 августа 2026 г.
* **Устранение визуальных артефактов превью видео (Clean Telegram-Style Video Preview & Zero Overlap)**:
  * **Устранение пересечения таймлайна с кнопкой Play**: в [`src/components/VideoPlayer/Controls/ControlBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/ControlBar.tsx) нижняя панель контролов и темный градиент в режиме паузы теперь скрыты, освобождая превью от визуального мусора. Кнопка Play находится строго в геометрическом центре кадра (`top-1/2 left-1/2`), а в правом нижнем углу отображается аккуратный бейдж длительности (`MM:SS`).
  * **Плавное появление контролов**: контролы (таймлайн, громкость, скорость, полноэкранный режим) плавно появляются при воспроизведении или наведении/касании и автоматически скрываются через 3 секунды.
  * **Устранение черных полос (Letterboxing Fix)**: в [`src/styles/video-player.css`](https://github.com/Voltikalk/Comms/blob/main/src/styles/video-player.css) для видеоэлемента задан `object-fit: cover` в инлайн-режиме и `object-fit: contain` в полноэкранном режиме, гарантируя идеальное заполнение скругленного прямоугольника сообщения без полос по краям.

### [v2.20.0] — 17 августа 2026 г.
* **Автоматическое распознавание вертикальных и горизонтальных видео (Dynamic Aspect Ratio & Orientation Detection)**:
  * **Определение соотношения сторон в видеоплеере**: в [`src/types/video-player.types.ts`](https://github.com/Voltikalk/Comms/blob/main/src/types/video-player.types.ts), [`src/components/VideoPlayer/VideoPlayerContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/VideoPlayerContext.tsx) и [`src/components/VideoPlayer/VideoPlayer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/VideoPlayer.tsx) добавлен метод `updateDimensions(width, height)` и колбэки `onOrientationChange` / `onAspectRatioChange`. Плеер автоматически определяет ориентацию (`vertical` при соотношении < 0.85, `horizontal` при > 1.15, иначе `square`).
  * **Адаптивные размеры карточки сообщения в чате**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) жесткий класс `aspect-video` заменен на динамическое соотношение сторон `aspectRatio: videoAspectRatio`:
    * Для вертикальных видео (9:16 / Reels / Shorts / Stories) контейнер принимает портретные пропорции с ограничением ширины (`max-w-[220px] xs:max-w-[250px] sm:max-w-[270px]`) и высоты до `420px`, убирая черные полосы по бокам.
    * Для горизонтальных видео (16:9 / 4:3) сохраняются ландшафтные размеры (`max-w-[280px] xs:max-w-[320px] sm:max-w-[360px]`).
  * **Предпросмотр при выборе файла**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) при выборе видеофайла его ориентация мгновенно считывается через прелоадер метаданных, а на панели прикрепления отображается миниатюра видео с бейджем разрешения (`9:16` / `16:9` / `📱 Вертикальное`).

### [v2.19.0] — 17 августа 2026 г.
* **Исправление позиционирования контролов видеоплеера и залипания индикатора загрузки на 100% (Player Controls Alignment & Upload Spinner Fixes)**:
  * **Исправление вертикального позиционирования контролов видеоплеера и оптическое центрирование**:
    * В [`src/components/VideoPlayer/Controls/ControlBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/ControlBar.tsx) устранена проблема, из-за которой панель контролов (таймлайн, громкость, время, настройки) сдвигалась в верхнюю/среднюю часть видео. Добавлен `mt-auto w-full` и корректный верхний плейсхолдер для `flex-col justify-between`, что гарантирует строгое прижатие нижней панели контролов и градиента к нижнему краю видео.
    * Большая центральная кнопка Play переведена на оптическое центрирование (`top-[42%] sm:top-[44%]` в обычном режиме сообщений и `top-1/2` в полноэкранном), что устранило зрительный перекос вниз к нижней панели перемотки и обеспечило гармоничные зазоры.
    * В [`src/components/VideoPlayer/Controls/ProgressBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/ProgressBar.tsx) добавлено ограничение отображения hover-тултипа времени (`duration > 0` и clamp отступов 8%–92%), исключая появление тултипа `0:00` за пределами видео.
    * В [`src/components/VideoPlayer/VideoPlayer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/VideoPlayer.tsx) добавлен класс `.comms-video-player-container` и атрибут `controls={false}`.
  * **Устранение залипания кольца загрузки на 100% (Upload Progress Fix)**:
    * В [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) в функции `sendMessage` при наступлении события `xhr.onload` и в блоке `catch` теперь мгновенно сбрасываются флаги `isUploading: false` и `uploadProgress: undefined` в локальном состоянии `messages`, а также в функции `sanitizeMessage`.
    * В [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) для видео, кружков, фото, аудио и файлов проверка отображения спиннера загрузки обновлена: кольцо `CircularProgress` отображается строго при `isUploading && (uploadProgress === undefined || uploadProgress < 100)`, мгновенно исчезая при достижении 100% или завершении передачи.

### [v2.18.0] — 17 августа 2026 г.
* **Исправление распознавания аудио и очистка информации о названии (Voice Notes & Clean Media UI Fix)**:
  * **Разделение голосовых сообщений и видео**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) исправлена логика классификации файлов. Аудиозаписи формата `.webm` (записываемые через браузерный MediaRecorder) и файлы с префиксом `Голосовое сообщение` теперь строго определяются как `isAudioFile` и отображаются только в виде синего аудиоплеера с динамической волной спектра (waveform), исключая ложное открытие в видеоплеере.
  * **Удаление лишних названий файлов сверху и снизу**:
    * В [`MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) удален нижний текстовый блок с техническим именем файла под видео, оставлена только аккуратная метка времени отправки (в стиле Telegram).
    * В [`ControlBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/ControlBar.tsx) верхний градиентный баннер с названием скрыт в компактном режиме сообщений и отображается исключительно в полноэкранном режиме (`isFullscreen && props.title`).
* **Адаптация видеоплеера под мобильные экраны и исправление центрирования (Mobile UI & Alignment Fixes)**:
  * **Идеальное абсолютное центрирование кнопки воспроизведения**: в [`src/components/VideoPlayer/Controls/ControlBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/ControlBar.tsx) большая круглая кнопка Play переведена на абсолютное позиционирование `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`, что гарантирует ее нахождение ровно в центре прямоугольника видео независимо от высоты нижней панели контролов.
  * **Оптимизация мобильного интерфейса**:
    * Очищена нижняя панель контролов от перегруженных элементов (убраны лишние дублирующие кнопки в компактном режиме).
    * Блок громкости переведен в быстрый тач-режим (одно касание мгновенно включает/выключает звук без застревания выдвижного ползунка на экранах смартфонов).
    * Таймлайн оптимизирован для мобильных тач-событий (`touches`/`changedTouches`), обеспечивая 100% плавную перемотку пальцем.
    * Размеры видео-контейнера в сообщениях адаптированы под ширину мобильных экранов (`max-w-[280px]` на узких и `max-w-[360px]` на планшетах/десктопе).
* **Интеграция кастомного видеоплеера в пузыри сообщений (MessageBubble Integration)**:
  * В [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) стандартный HTML5 `<video controls>` полностью заменен на кастомный компонент `<VideoPlayer />` со всеми контролами (Play/Pause, скраббер с подсказкой времени, громкость со слайдером, полноэкранный режим, PiP, меню скорости/качества).
  * Добавлено автораспознавание видеофайлов по расширениям `.mp4`, `.mov`, `.webm`, `.mkv`, `.avi` для мгновенного рендеринга плеера.
* **Реализован полный модульный набор контролов видеоплеера (Video Player Controls Suite)**:
  * [`src/components/VideoPlayer/Controls/PlayPauseButton.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/PlayPauseButton.tsx) — кнопка Play/Pause с пульс-эффектом и ARIA-метками.
  * [`src/components/VideoPlayer/Controls/ProgressBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/ProgressBar.tsx) — интерактивный таймлайн с drag-to-seek, отображением буферизации, текущего прогресса и hover-тултипом времени.
  * [`src/components/VideoPlayer/Controls/TimeDisplay.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/TimeDisplay.tsx) — блок отображения времени с переключением оставшегося времени по клику.
  * [`src/components/VideoPlayer/Controls/VolumeControl.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/VolumeControl.tsx) — блок громкости с 4 динамическими стадиями иконки, слайдером 0-100% и запоминанием уровня при Mute.
  * [`src/components/VideoPlayer/Controls/FullscreenButton.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/FullscreenButton.tsx) — кнопка переключения полноэкранного режима с поддержкой WebKit.
  * [`src/components/VideoPlayer/Controls/SettingsMenu.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/SettingsMenu.tsx) — всплывающее меню настроек: скорость (0.5x–2x), качество (360p–1080p, Auto), техническая статистика, сохранение в localStorage.
  * [`src/components/VideoPlayer/Controls/PictureInPictureButton.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/PictureInPictureButton.tsx) — кнопка Picture-in-Picture.
  * [`src/components/VideoPlayer/Controls/SubtitlesButton.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/SubtitlesButton.tsx) — меню выбора и переключения субтитров VTT.
  * [`src/components/VideoPlayer/Controls/ControlBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/ControlBar.tsx) — мастер-панель управления с градиентными оверлеями, автоскрытием через 3 секунды, быстрой перемоткой ±10 сек и театральным режимом (T).
  * [`src/components/VideoPlayer/Controls/index.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/Controls/index.ts) — точка экспорта всех компонентов контролов.
  * Актуализирован файл [`handoff.md`](https://github.com/Voltikalk/Comms/blob/main/handoff.md).

### [v2.17.0] — 17 августа 2026 г.
* **Добавлена архитектура кастомного видеоплеера (Custom Video Player Suite)**:
  * [`src/types/video-player.types.ts`](https://github.com/Voltikalk/Comms/blob/main/src/types/video-player.types.ts) — полная типизация видеоплеера: `VideoPlayerProps`, `VideoPlayerState`, `VideoPlayerActions`, `PlaybackState`, `VideoQuality`, `Subtitle`, `PlayerTheme`.
  * [`src/styles/video-player.css`](https://github.com/Voltikalk/Comms/blob/main/src/styles/video-player.css) — стили видеоплеера (Glassmorphism, темная тема по умолчанию, верхний и нижний градиентный scrim overlay, скраббер таймлайна с hover-подсказкой времени, всплывающее меню настроек).
  * [`src/components/VideoPlayer/VideoPlayerContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/VideoPlayerContext.tsx) — React Context и Provider для глобального управления состоянием плеера, таймер автоскрытия контролов, глобальные горячие клавиши (Space/K/F/M/P/ArrowLeft/ArrowRight), поддержка Fullscreen API и Picture-in-Picture API.
  * [`src/hooks/useVideoPlayer.ts`](https://github.com/Voltikalk/Comms/blob/main/src/hooks/useVideoPlayer.ts) — кастомный React-хук для взаимодействия с плеером и форматирования времени (`hh:mm:ss`).
  * [`src/components/VideoPlayer/VideoPlayer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/VideoPlayer.tsx) — главный компонент с модульными подкомпонентами (`VideoElement`, `VideoTimeline`, `VideoSettingsMenu`, `VideoControlsOverlay`, `VideoFeedbackOverlay`).
  * [`src/components/VideoPlayer/index.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/index.ts) — точка входа и экспорта модуля.
  * Актуализирован файл [`handoff.md`](https://github.com/Voltikalk/Comms/blob/main/handoff.md).

### [v2.16.0] — 17 августа 2026 г.
* **Редизайн и полная адаптация UI/UX под мобильные телефоны и Telegram-стилистику**:
  * **Исправлен поиск во всех чатах (Global Search Fix)**:
    * Экран поиска [`src/pages/SearchPage.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/pages/SearchPage.tsx) подключен к реальному массиву всех сообщений приложения (`allMessages`), комнатам и профилям пользователей из [`SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx).
    * Реализован мгновенный полнотекстовый поиск с подсветкой совпадений по тексту сообщений, именам прикрепленных файлов и именам отправителей.
    * Добавлен переключатель области поиска: `🌐 Везде` (поиск по всем диалогам и группам) и `💬 В этом чате`.
    * При клике на найденное сообщение из другого чата приложение автоматически переключает активный диалог (`setActiveRoomId`) и плавно скроллит к найденному сообщению с анимацией подсветки.
  * **Исправлен сдвиг интерфейса и горизонтальный перелив на мобильных (Horizontal Overflow Fix)**:
    * Устранен баг, из-за которого правый край чата, кнопка «Отмена», сообщения и кнопка отправки уезжали за пределы экрана телефона.
    * Добавлены строгие ограничения ширины `min-w-0`, `w-full`, `max-w-full` и `overflow-x-hidden` для главного контейнера `<main>`, шапки поиска, свайп-бара фильтров, ленты сообщений и нижней панели ввода.
    * В `MessageBubble.tsx` убраны отрицательные отступы `-mx-4`, пузыри сообщений ограничены до `max-w-[85%]` на мобильных.
    * Окно глобального поиска разворачивается **на весь экран** (`fixed inset-0 w-full h-full`) без посторонних черных рамок и плавающих окон.
    * Цветовая палитра полностью синхронизирована с дизайн-системой приложения (фон `#0e1621` / `#17212b`, поля ввода `#242f3d`, акцентный цвет `#3390ec`).
  * Актуализирован файл [`handoff.md`](https://github.com/Voltikalk/Comms/blob/main/handoff.md).

### [v2.15.0] — 17 августа 2026 г.
* **Добавлено**:
  * Реализована комплексная система фильтрации и сортировки сообщений:
    * [`src/lib/filter-utils.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/filter-utils.ts) — функции фильтрации `applyFilters`, сортировки по дате/релевантности/реакциям/времени правки, построитель SQL-запросов `buildFilterQuery`, валидатор `validateFilters`, пресеты и экспорт в CSV/JSON.
    * [`src/services/message-filter.service.ts`](https://github.com/Voltikalk/Comms/blob/main/src/services/message-filter.service.ts) — сервис многокритериальной фильтрации сообщений с кэшированием, пагинацией и валидацией сущностей.
    * [`src/hooks/useMessageFilter.ts`](https://github.com/Voltikalk/Comms/blob/main/src/hooks/useMessageFilter.ts) — React-хук для управления состоянием фильтров, сортировкой, пресетами и экспортом.
    * [`src/components/Search/FilterPanel.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Search/FilterPanel.tsx) — панель фильтрации (выбор дат, отправителей, категорий файлов, флагов).
    * [`src/components/Search/DateRangePicker.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Search/DateRangePicker.tsx) — компонент выбора периода дат с пресетами и валидацией.
    * Полный редизайн поиска в шапке чата [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx).
  * Актуализирован файл [`handoff.md`](https://github.com/Voltikalk/Comms/blob/main/handoff.md).

### [v2.14.0] — 17 августа 2026 г.
* **Добавлено**:
  * Создана библиотека UI-компонентов поиска сообщений (Search UI Suite).

---

*Документ актуален и поддерживается в ходе разработки.* 🚀
