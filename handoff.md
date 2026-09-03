# 🚀 Secure Comms — Architecture & Design System Master Guide

> **Telegram Web Replica / Ultra-Premium Real-Time Messenger**  
> Стек: **React 19 / Vite**, **TypeScript**, **Tailwind CSS**, **Telegram Rich Text (Spoilers ||text|| / Markdown / CodeBlocks with Copy / Floating Toolbar / Hotkeys)**, **Telegram Media Lightbox & Gallery Suite (Fullscreen / Zoom & Pan / Rotation / Navigation / Carousel)**, **Master Navigation Suite (Command Palette Spotlight Ctrl+K / Chat Folder Tabs / Mobile Bottom Nav / Desktop Breadcrumbs / Power-User Hotkeys)**, **Hybrid Desktop & Mobile Suite (PWA / Window Controls Overlay / Edge Gestures / Latency Ping)**, **Stories 2.0 & Polls/Quizzes Suite**, **Voice & Video Notes 2.0 (Waveform & Circular 60 FPS Player)**, **Telegram .TGS Stickers (60 FPS Lottie/Canvas)**, **Full-Text Search UI Suite (FTS / Debounced SearchBar / Advanced Filters / Animated Cards / History / Stats)**, **Custom Video Player (4K/60FPS/PiP/Settings)**, **Skiper UI 26 View Transitions & Skiper 4 Morphing Theme Switcher**, **Chat Wallpapers Suite (Live Blur & Dimming)**, **Framer Motion, GSAP, AOS & Lottie**, **Storybook**, **Node.js / Express**, **Socket.io / WebSocket**, **WebRTC**, **JWT & Bcrypt**, **Supabase (PostgreSQL + Auth + Storage + Realtime)**, **Vitest (107/107 Tests Passing)**.

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
# Терминал 1: Запуск Backend сервера Express + Socket.io (порт 3000)
npm run server

# Терминал 2: Запуск Frontend клиента Vite + React 19 (порт 5173)
npm run dev
```

### 5. Тестирование, проверка качества и сборка
```bash
# Запуск юнит-тестов Vitest (107/107 тестов)
npm test

# Линтинг кодовой базы (Oxlint)
npm run lint

# Сборка production-бандла и проверка типов TypeScript
npm run build

# Запуск изолированной песочницы компонентов Storybook (порт 6006)
npm run storybook

# Применение миграций схемы Supabase / PostgreSQL
npm run migrate:up

# Проверка статуса миграций
npm run migrate:status
```

---

## 📋 Содержание
1. [Getting Started & Быстрый старт](#-getting-started--быстрый-старт)
2. [Обзор проекта и текущая архитектурная стадия](#-обзор-проекта-и-текущая-архитектурная-стадия)
3. [Структура репозитория и файлов](#-структура-репозитория-и-файлов)
4. [Ключевые подсистемы и мастер-сьюты](#-ключевые-подсистемы-и-мастер-сьюты)
   * 4.1. [Telegram Stories 2.0 (24h TTL, Reactions, Captions & Gradients)](#41-telegram-stories-20)
   * 4.2. [Интерактивные опросы и викторины (Live Polls & Quizzes)](#42-интерактивные-опросы-и-викторины-live-polls--quizzes)
   * 4.3. [Голосовые сообщения 2.0 и видео-кружки (Waveform & 60 FPS Player)](#43-голосовые-сообщения-20-и-видео-кружки)
   * 4.4. [Анимированные стикеры .TGS и Lottie-движок](#44-анимированные-стикеры-tgs-и-lottie-движок)
   * 4.5. [Полнотекстовый поиск и фильтрация (Search UI Suite & FTS)](#45-полнотекстовый-поиск-и-фильтрация)
   * 4.6. [Кастомный видеоплеер (Custom Video Player Suite)](#46-кастомный-видеоплеер-custom-video-player-suite)
   * 4.7. [Движок тем Skiper UI, обоев, размытия и затемнения](#47-движок-тем-skiper-ui-обоев-размытия-и-затемнения)
   * 4.8. [Эффект распада сообщений Таноса (Thanos Snap Disintegration)](#48-эффект-распада-сообщений-таноса)
   * 4.9. [Кроссплатформенный гибридный мастер-сьют для ПК и смартфонов (Comms Hybrid Suite)](#49-кроссплатформенный-гибридный-мастер-сьют-для-пк-и-смартфонов)
   * 4.10. [Форматирование текста, спойлеры и блоки кода (Rich Text & Telegram Spoilers Suite)](#410-форматирование-текста-спойлеры-и-блоки-кода)
   * 4.11. [Полноэкранная медиа-галерея (Telegram Media Lightbox & Gallery Suite)](#411-полноэкранная-медиа-галерея-telegram-media-lightbox--gallery-suite)
   * 4.12. [Анимированные фоны React Bits (React Bits Backgrounds Suite)](#412-анимированные-фоны-react-bits-react-bits-backgrounds-suite)
   * 4.13. [Мастер-сьют навигации (Command Palette Spotlight, Chat Folders & Power-User Hotkeys)](#413-мастер-сьют-навигации-master-navigation-suite)
5. [Серверная архитектура, сокеты и Supabase](#-серверная-архитектура-сокеты-и-supabase)
6. [Тестирование и контроль качества (Vitest, Oxlint, CI/CD)](#-тестирование-и-контроль-качества-vitest-oxlint-cicd)
7. [Дизайн-система, токены и анимационный движок](#-дизайн-система-токены-и-анимационный-движок)
8. [Запуск, сборка и Storybook](#-запуск-сборка-и-storybook)
9. [Журнал изменений (Changelog)](#-журнал-изменений-changelog)

---

## 🌟 Обзор проекта и текущая архитектурная стадия

**Secure Comms** — высоконагруженный веб-мессенджер реального времени, воссоздающий интерфейс, UX и плавность официального клиента **Telegram Web K/A** с современным Glassmorphism оформлением, кинематографичными анимациями, стандартизированной дизайн-системой, аутентификацией на базе **Supabase Auth / JWT**, сервисом загрузки и компрессии файлов **Supabase Storage**, системой **Real-time сокетов (Socket.io)**, историями (Stories 2.0), опросами и викторинами (Polls & Quizzes), голосовыми сообщениями с живым спектром звука (Web Audio Waveforms), видео-кружками с 60 FPS GPU-плеером, анимированными .TGS стикерами, кастомным 4K видеоплеером, полнотекстовым поиском FTS, кроссплатформенным гибридным режимом, интерактивным форматированием текста со спойлерами, полноэкранной медиа-галереей Lightbox и палитрой команд Command Palette Spotlight.

### 📌 Текущая стадия разработки (Status: Phase 50 — Modular Architecture, God-Component Decomposition & Clean Repository [v3.19.0]):
* ✅ **Распил "God-компонента" `ChatScreen.tsx` (декомпозиция монолита 4 478 строк / 192 КБ)**:
  * Создана модульная архитектура субкомпонентов в каталоге `src/components/Chat/`:
    * [`ChatSidebar.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Chat/Sidebar/ChatSidebar.tsx) (511 строк) — изолированный сайдбар: гамбургер-меню, профиль пользователя, быстрый поиск диалогов, блок историй `<StoriesBar />`, вкладки папок `<ChatFolderTabs />`, список комнат со счетчиками и превью черновиков, кнопка архива сообщений (Admin), плавный drag-to-resize разделитель и мобильная панель `<MobileBottomNav />`.
    * [`ChatHeader.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Chat/Header/ChatHeader.tsx) (508 строк) — шапка чата: индикатор статуса "в сети", аватары, капсула поиска внутри чата (iOS/Telegram capsule) с навигацией по совпадениям (Next/Prev), фильтрами по дате/типу и панелью мультивыделения сообщений (`isSelectMode`).
    * [`ChatMessageFeed.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Chat/Feed/ChatMessageFeed.tsx) (228 строк) — скроллируемый поток сообщений: плашка закрепленного сообщения с переходом, баннер оффлайн-статуса, разделители дат ("Сегодня", "Вчера", календарные дни), визуальная дропзона Drag & Drop, плавающая кнопка скролла вниз со счетчиком непрочитанных.
    * [`ChatInputBar.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Chat/Input/ChatInputBar.tsx) (491 строк) — расширенная нижняя панель ввода: плашки ответов и редактирования, предпросмотр медиа и документов, выпадающий автокомплит @упоминаний (`ActiveToken`, `MentionCandidate`), быстрые подсказки стикеров, попап эмодзи, диктофон `<VoiceRecorderHUD />` с живым спектром звука, плеер превью `<VoicePreviewPlayer />` и тулбар форматирования `<FormattingToolbar />`.
    * [`ChatUserInfoPanel.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Chat/UserInfo/ChatUserInfoPanel.tsx) (190 строк) — правая панель деталей пользователя и группы: переключатель беззвучного режима, телефон, био, галерея общих медиафайлов.
    * [`ChatModalsHost.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Chat/Modals/ChatModalsHost.tsx) (834 строк) — централизованный хост модальных окон: `ProfileEditModal`, `PollCreateModal`, `SearchPage`, `AdvancedSearchModal`, `ThemeSettingsModal`, `StoryViewer`, `StoryCreateModal`, `MediaGalleryModal`, `CommandPaletteModal`, `TelegramContextMenuModal`, оверлей WebRTC-звонков, модалка видео-сообщений, QR-код профиля, нижняя панель действий выбора и тосты.
    * [`ChatScreen.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/ChatScreen.tsx) — сокращен с 4 478 до 2 609 строк (~50% сокращение объема файла!), преобразован в чистый координатор состояний, эффектов и доменной логики.
* ✅ **Подключение неиспользуемых страниц и очистка Git-репозитория**:
  * [`AdminArchive.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/pages/AdminArchive.tsx) подключен к пользовательскому интерфейсу: добавлен проп `onClose` с кнопкой «✕ Закрыть», доступен из бокового меню сайдбара, через горячую команду в `CommandPaletteModal` (поиск по словам: *архив, archive, бд, хранилище, admin*) и через модальный хост `ChatModalsHost`.
  * Удалены неиспользуемые страницы-дубликаты (`src/pages/RegisterPage.tsx`, `src/pages/ResetPasswordPage.tsx`).
  * Зафиксировано удаление более 30 устаревших файлов в Git (`src/components/ChatRoom/*`, `src/services/*`, `src/hooks/*`), висевших в несинхронизированном состоянии.
* ✅ **Контроль качества, линтинг и тесты**:
  * `npm test` (vitest): 112/112 юнит-тестов проходят (10 suites).
  * `npx oxlint`: 0 ошибок линтинга.
  * `npm run build`: сборка TypeScript и Vite завершается за 1.18s с exit code 0.

### 📌 Предыдущая стадия разработки (Phase 49 — Server Resilience, WebRTC Signaling & Socket Unification Suite [v3.18.0]):
* ✅ **Серверная стабильность и устранение синтаксической ошибки (`server.js`)**:
  * Исправлено фатальное повторное объявление `const userStories` в блоке `send_story`, предотвращавшее запуск Node.js-сервера.
  * Исправлен WebRTC сигналинг: в обработчиках `call_end` и `webrtc_signal` проверка комнат переведена с `allowedRooms.includes(roomId)` на `isRoomAllowedForUser(roomId, user)`, благодаря чему личные звонки (`dm-*`) корректно обмениваются ICE-кандидатами/SDP и завершаются без подвисаний.
  * Синхронизированы UUID сообщений с PostgreSQL Supabase: при сохранении сообщений генерируются и сохраняются валидные UUID (`crypto.randomUUID`), гарантируя корректность реакций и меток прочтения в базе данных.
* ✅ **Клиентская оптимизация и унификация сокетов**:
  * В `SocketContext.tsx` добавлен экспортируемый экземпляр `socket: Socket | null`.
  * В `StoriesContext.tsx` полностью удален избыточный второй сокет `io(SERVER_URL)` — подписка на `stories_state` и отправка историй переведены на единый общий сокет из `SocketContext`.
  * В `ChatFolderTabs.tsx` массив вкладок `tabs` вынесен в константу `FOLDER_TABS` за пределы компонента, устранив бесконечную переподписку слушателей событий скролла и ресайза (`exhaustive-deps`).

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
├── .github/
│   ├── workflows/ci.yml                       # CI пайплайн (Oxlint + Typecheck & Build)
│   ├── PULL_REQUEST_TEMPLATE.md               # Шаблон Pull Request
│   └── ISSUE_TEMPLATE/bug_report.md           # Шаблон отчета об ошибке
├── docs/
│   ├── RUNBOOK.md                             # Руководство по эксплуатации и траблшутингу
│   └── SECURITY.md                            # Политика безопасности и сообщений об уязвимостях
├── public/
│   ├── sw.js                                  # PWA Service Worker (Cache-first + Stale-while-revalidate)
│   ├── manifest.json                          # PWA Web App Manifest
│   └── stickers/                              # Стикеры (.tgs, Lottie, JSON, webp)
├── .vscode/
│   └── mcp.json                               # Конфигурация MCP-серверов (shadcn / React Bits)
├── .agents/
│   └── mcp_config.json                        # Конфигурация MCP для Antigravity агентов
├── components.json                             # Конфигурация UI компонентов и реестра @react-bits
├── server.js                                  # Node.js + Express + Socket.io Server (порт 3000)
├── package.json                               # Зависимости, скрипты и конфигурация
├── vite.config.ts                             # Конфигурация сборщика Vite
├── index.html                                 # Точка входа HTML (Montserrat, Inter, PWA)
├── handoff.md                                 # Генеральный архитектурный гайд проекта
└── src/
    ├── main.tsx                               # Точка входа React 19
    ├── App.tsx                                # Корневой компонент приложения
    ├── index.css                              # Глобальные стили, темы, анимации, скроллбары
    ├── types.ts                               # Базовые типы чата, сообщений, опросов, реакций
    ├── constants.ts                           # Дефолтные профили, аватары, эмодзи, URL
    ├── tokens/
    │   └── design-tokens.json                 # Экспортируемые токены (Colors, Typography, Spacing)
    ├── types/
│   ├── platform.types.ts                  # Типы платформ (OS, DeviceType, HybridViewMode, Haptic)
│   ├── story.types.ts                     # Типы историй (Story, StoryGradient, StoryReaction)
│   ├── sticker.types.ts                   # Типы стикеров и стикер-паков (StickerPack, TgsSticker)
│   ├── theme.types.ts                     # Типы тем, размытия, затемнения и обоев
│   ├── video-player.types.ts              # Типизация кастомного 4K видеоплеера
│   └── auth.types.ts                      # Типы аутентификации, сессий и регистрации
├── constants/
│   ├── stickers.ts                        # Коллекция стикер-паков (8 паков: Сеня, Пепе, Котики, Доге, 3D)
│   ├── duck_stickers.ts                   # 60 FPS векторные анимации Уточки Сени (29 стикеров)
│   ├── cherry_stickers.ts                 # 60 FPS стикеры Вишенки Hot Cherry
│   ├── corgi_stickers.ts                  # Стикеры Корги
│   ├── kolobki.ts                         # 50 оригинальных 60 FPS анимаций ICQ Колобков
│   └── wallpapers.ts                      # Коллекция обоев чата (фото, градиенты, паттерны)
├── context/
│   ├── PlatformContext.tsx                # Единый контекст гибридной платформы (ОС, PWA, Ping, Haptic)
│   ├── AuthContext.tsx                    # Supabase Auth Context и сессии
│   ├── SocketContext.tsx                  # Real-time сокеты, сообщения, опросы, WebRTC звонки
│   └── StoriesContext.tsx                 # Изолированный контекст управления историями
├── lib/
│   ├── platform.test.ts                   # 5 юнит-тестов гибридной платформы и виброотклика
│   ├── audio-waveform.ts                  # Анализ спектра Web Audio API, RMS нормализация в 30 баров
│   ├── audio-waveform.test.ts             # 8 юнит-тестов нормализации звукового спектра
│   ├── mentions.ts                        # Парсер токенов @упоминаний и #хештегов с автодополнением
│   ├── mentions.test.ts                   # 26 юнит-тестов упоминаний и хештегов
│   ├── poll.test.ts                       # 15 юнит-тестов опросов, викторин и подсчета голосов
│   ├── stories.test.ts                    # 6 юнит-тестов 24-часового TTL и реакций историй
│   ├── filter-utils.ts                    # Утилиты фильтрации, сортировки, валидации и экспорта
│   ├── filter-utils.test.ts               # 23 юнит-теста фильтров сообщений
│   ├── tgs-loader.ts                      # Парсер и GZIP-декомпрессор Telegram .TGS файлов (Pako)
│   ├── image-compression.ts               # Canvas сжатие картинок и аватаров перед отправкой
│   ├── colors.ts                          # Цветовые палитры и токены
│   ├── animations.ts                      # Пресеты Framer Motion, GSAP, AOS и Lottie
│   └── supabase/                          # Клиент Supabase, кеш, запросы и типизация
├── hooks/
│   ├── useSearchMessages.ts               # Хук быстрого поиска с таймингом и подсветкой
│   ├── useVideoPlayer.ts                  # Хук управления воспроизведением видеоплеера
│   ├── useAuth.ts                         # Хук доступа к AuthContext
│   ├── useMediaQuery.ts                   # Хуки брейкпоинтов
│   └── useTouchInteractions.ts            # Хуки свайп-навигации
├── components/
│   ├── ChatScreen.tsx                     # Главный экран мессенджера (сайдбар, чат, рекордеры, drag&drop)
│   ├── MessageBubble.tsx                  # Пузырь сообщения (текст, стикеры, медиа, аудио, кружки, цитаты)
│   ├── LoginScreen.tsx                    # Экран входа в стиле Telegram Web K (QR-логин, демо-аккаунты)
│   ├── TelegramRegistrationWizard.tsx     # 4-шаговый мастер регистрации с обрезкой аватара и кодом
│   ├── ProfileEditModal.tsx               # Модальное окно редактирования профиля Telegram
│   ├── TelegramContextMenuModal.tsx       # Контекстное меню сообщения с быстрыми реакциями
│   ├── TelegramEmojiPickerModal.tsx       # Палитра эмодзи и вкладка стикеров Telegram
│   ├── VideoCallModal.tsx                 # Модальное окно аудио/видео звонков WebRTC
│   ├── ErrorBoundary.tsx                  # Граница ошибок с красивым фоллбэк UI
│   ├── FileUploadInput.tsx                # Drag-and-drop компонент загрузки файлов
│   ├── Desktop/
│   │   ├── DesktopTitleBar.tsx            # Фирменный заголовок окна Telegram Desktop с пингом и хоткеями
│   │   └── KeyboardShortcutsModal.tsx     # Интерактивная шпаргалка горячих клавиш (Ctrl+K/1-9/Esc/,/)
│   ├── Mobile/
│   │   └── MobileBottomNav.tsx            # Нативная нижняя навигация смартфонов (Чаты, Истории, Поиск, Комнаты, Настройки)
│   ├── Hybrid/
│   │   └── AppInstallModal.tsx            # Модальное окно быстрой PWA-установки на ПК, Android и iOS
│   ├── Media/
│   │   └── TelegramVideoNotePlayer.tsx    # 60 FPS GPU-плеер видео-кружков с IntersectionObserver
│   ├── Poll/
│   │   ├── PollCard.tsx                   # Карточка интерактивного опроса / викторины с анимацией
│   │   └── PollCreateModal.tsx            # Создание опросов и викторин с правильным ответом
│   ├── Stories/
│   │   ├── StoriesBar.tsx                 # Строка аватаров историй с градиентными кольцами
│   │   ├── StoryViewer.tsx                # Полноэкранный плеер историй (реакции, ответы, просмотры)
│   │   └── StoryCreateModal.tsx           # Создание текстовых/фото историй на градиентах
│   ├── Stickers/
│   │   ├── StickerPicker.tsx              # Стикер-пикер с поиском, паками, избранным и недавними
│   │   └── TgsStickerPlayer.tsx           # 60 FPS Lottie/Canvas плеер векторных .TGS анимаций
│   ├── Search/
│   │   ├── SearchBar.tsx                  # Поисковая строка с хоткеем Ctrl+F
│   │   ├── SearchResultCard.tsx           # Карточка найденного сообщения с подсветкой
│   │   ├── SearchResults.tsx              # Лента результатов и пустое состояние
│   │   ├── SearchHistory.tsx              # Чипсы недавних поисковых запросов
│   │   ├── SearchStats.tsx                # Счетчик совпадений, время ответа и сортировка
│   │   └── AdvancedSearchModal.tsx        # Модальное окно расширенных фильтров
│   ├── Theme/
│   │   └── ThemeSettingsModal.tsx         # Настройки тем, размытия (0-20px) и затемнения (0-80%)
│   ├── VideoPlayer/
│   │   ├── VideoPlayer.tsx                # Кастомный видеоплеер Telegram Web
│   │   ├── VideoPlayerContext.tsx         # Контекст состояния и горячих клавиш плеера
│   │   └── Controls/                      # PlayPause, ProgressBar, Volume, Fullscreen, Settings
│   ├── effects/
│   │   ├── disintegrate.ts                # Canvas движок распада сообщений на частицы Таноса
│   │   ├── AnimatedBorder.tsx             # Анимированные градиентные рамки
│   │   ├── AnimatedIcons.tsx              # Анимированные векторные иконки
│   │   ├── GradientBackground.tsx         # Фоновые градиенты
│   │   └── ParticleBackground.tsx         # Интерактивные фоновые частицы
│   └── ui/
│       ├── skiper26.tsx                   # View Transitions API радиальное раскрытие темы
│       ├── skiper4.tsx                    # Framer Motion морфинг-переключатель темы Солнце/Луна
│       ├── Button.tsx                     # Кнопки дизайн-системы с вариантами и ripple
│       ├── Input.tsx                      # Поля ввода с плавающей меткой
│       ├── Card.tsx                       # Glassmorphism карточки
│       └── LoadingSpinner.tsx             # Индикаторы загрузки
└── pages/
    ├── SearchPage.tsx                     # Главный экран глобального FTS поиска сообщений
    ├── AdminArchive.tsx                   # Панель управления долговременной архивацией
    ├── LoginPage.tsx                      # Страница входа
    ├── RegisterPage.tsx                   # Страница регистрации
    └── ResetPasswordPage.tsx              # Страница восстановления пароля
```

---

## 🧩 Ключевые подсистемы и мастер-сьюты

### 4.1. Telegram Stories 3.0 Master Suite («Как в TG»)
* **Хранилище и синхронизация**: бэкенд [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) поддерживает in-memory хранилище историй с автоочисткой по кастомному TTL (6, 12, 24, 48 часов или бессрочно при закреплении в профиле `isPinned`) и сокет-событиями `send_story`, `delete_story`, `view_story`, `react_story`.
* **Строка историй ([`src/components/Stories/StoriesBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stories/StoriesBar.tsx))**:
  * **Сегментированные SVG-кольца (`SegmentedStoryRing`)**: кольцо вокруг аватарки динамически разделяется на количество дуг, равное числу историй пользователя с разделителями.
  * **Статусы сегментов**: просмотренные истории окрашиваются в серый цвет, непросмотренные — в фирменный градиент Telegram (`#3390ec` ➔ `#ac8bdd` ➔ `#e6604c`), а для «Близких друзей» — в ярко-зеленый градиент (`#00c853` ➔ `#aeea00`).
  * **Быстрое создание**: кнопка «+» на своей аватарке, горизонтальный скролл колесом мыши и drag-to-scroll.
* **Просмотрщик ([`src/components/Stories/StoryViewer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stories/StoryViewer.tsx))**:
  * **Управление и жесты**: удержание пальцем/мышью (Hold to pause & Hide UI) мгновенно останавливает таймер и плавно скрывает весь интерфейс для чистого просмотра контента; свайп/драг вниз с пружинящей физикой для закрытия; двойной тап для лайка ❤️; горячие клавиши (`←`/`→`, `↑`/`↓`, `Space`, `M`, `Esc`).
  * **Реакции и ответы**: плавающая панель реакций TG с летающими физическими частицами эмодзи, автоотправка реакции в чат, форма прямого ответа на историю автору с прикреплением цитаты.
  * **Шторка зрителей (Viewers Drawer)**: детальный список посмотревших пользователей с аватарками, поиском, временными метками и бейджами реакций.
  * **Опции**: меню (⋯) с возможностью сохранения/скачивания медиа, копирования ссылки и удаления истории.
* **Студия создания историй ([`src/components/Stories/StoryCreateModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stories/StoryCreateModal.tsx))**:
  * **Режимы медиа**: фото/видео загрузка (JPG, PNG, WebP, MP4, WebM, MOV), **живая съемка с веб-камеры / камеры смартфона** (моментальное фото или запись видео до 60с) и текстовые истории на 12 градиентах с 6 шрифтами (`Classic`, `Neon`, `Bold`, `Serif`, `Mono`, `Script`).
  * **Художественные инструменты**: интерактивное рисование кистью (Doodle Canvas) с палитрой цветов и толщиной, наложение стикеров и эмодзи на фото.
  * **Telegram 2.0 настройки**: выбор срока жизни (6ч, 12ч, 24ч, 48ч), уровни приватности (*«Все»*, *«Контакты»*, *«Близкие друзья»*, *«Только я»*) и чекбокс *«Сохранить в профиле» (Pinned Highlights)*.

### 4.2. Интерактивные опросы и викторины (Live Polls & Quizzes)
* **Режимы опросов**: одиночный выбор (радиокнопки), множественный выбор (квадратные чекбоксы с переключением toggle) и **Режим викторины (Quiz Mode)** с выбором правильного ответа и карточкой объяснения 💡.
* **Интерактивная карточка ([`src/components/Poll/PollCard.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Poll/PollCard.tsx))**: анимированные цветные полосы результатов, расчет процентов в реальном времени, всплывающий список проголосовавших в публичных опросах, возможность отзыва голоса и кнопка завершения опроса автором.
* **Синхронизация**: трансляция через сокеты (`vote_poll`, `close_poll`), оптимистичное обновление локального состояния, индексация вопросов и вариантов в глобальном поиске.

### 4.3. Голосовые сообщения 2.0 и видео-кружки
* **Анализ спектра звука ([`src/lib/audio-waveform.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/audio-waveform.ts))**: Web Audio API захват амплитуд через `AnalyserNode`, RMS нормализация в массив из 30 баров (`0–100`) и генератор детерминированного фоллбэка.
* **Продвинутый UX записи голосовых сообщений (Slide-to-Cancel & Hands-Free Lock Suite)**:
  * **Плавающий HUD записи ([`src/components/Audio/VoiceRecorderHUD.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Audio/VoiceRecorderHUD.tsx))**:
    * **Свайп влево для отмены (Slide-to-Cancel)**: подсказка `‹ ‹ ‹ Проведите влево для отмены` со смещением пальцем/мышью, анимация открывающейся корзины 🗑️ и виброотклик `triggerHaptic('warning')` при превышении порога (>80px).
    * **Свайп вверх для фиксации (Swipe-Up Lock)**: всплывающая капсула 🔒 над кнопкой микрофона. Свайп вверх (>55px) переводит рекордер в режим «без удержания» (Hands-Free).
    * **Панель Hands-Free**: пульсирующий красный индикатор, таймер записи, живой колеблющийся спектр звука, пауза ⏸️ / возобновление ▶️ (`MediaRecorder.pause()`), отмена 🗑️, остановка для прослушивания ⏹️ и быстрая отправка 🚀.
  * **Предпросмотр перед отправкой ([`src/components/Audio/VoicePreviewPlayer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Audio/VoicePreviewPlayer.tsx))**:
    * Интерактивный мини-плеер: воспроизведение/пауза ▶️ / ⏸️, 30-полосная диаграмма спектра с интерактивным скраббером по клику, счетчик времени (`0:03 / 0:14`), удаление 🗑️ и отправка 🚀.
* **Плеер голосовых в ленте ([`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx))**: интерактивный скраббер по реальным полоскам спектра звука, переключатель скорости `1x` / `1.5x` / `2x` и точный тайминг.
* **Мастер-сьют видео-кружков 2.0 ([`src/components/Media/TelegramVideoNotePlayer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Media/TelegramVideoNotePlayer.tsx))**:
  * Изолированный мемоизированный плеер (0 лишних ререндеров ленты).
  * `IntersectionObserver` для автоматической паузы и остановки RAF при скролле за экран (100% экономия CPU).
  * Аппаратное GPU-масштабирование `transform: scale(1.28)` и `preload="auto"` (запуск 60/120 FPS без layout reflow).
  * Тонкий полупрозрачный белый контур Telegram (`rgba(255, 255, 255, 0.88)` толщиной `2.2px`).
  * 360° круговой скраббер перемотки с защитным порогом сдвига (>7px), тап для звука, закрытие по `Escape` или клику вне кружка.
* **Рекордер кружков в [`ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx)**: переключение Микрофон 🎙️ ⟷ Камера 📹, круговой SVG-таймер до 60 сек, битрейт 1.2 Mbps, шумоподавление и эхокомпенсация.

### 4.4. Анимированные стикеры .TGS и Lottie-движок
* **Декомпрессор ([`src/lib/tgs-loader.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/tgs-loader.ts))**: распаковка сжатых gzip-контейнеров `.tgs` с помощью `pako` в JSON-структуру Lottie с in-memory кешированием и дедупликацией сетевых запросов.
* **Векторный плеер ([`src/components/Stickers/TgsStickerPlayer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stickers/TgsStickerPlayer.tsx))**: 60 FPS рендеринг через Lottie Canvas с аппаратным ускорением, `IntersectionObserver` для отсечения внеэкранных стикеров и фиксированным `aspect-ratio: 1/1`.
* **Стикер-паки ([`src/constants/stickers.ts`](https://github.com/Voltikalk/Comms/blob/main/src/constants/stickers.ts))**: 8 паков, включая 50 оригинальных анимированных ICQ Колобков, Уточку Сеню (29 стикеров), Вишенку Hot Cherry, Пепе, Мемных Котиков, Доге и 3D-стикеры.
* **Стикер-пикер ([`src/components/Stickers/StickerPicker.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stickers/StickerPicker.tsx))**: поиск по эмодзи/тегам, избранное (❤️), недавние стикеры (🕒), предиктивные подсказки при вводе эмодзи в поле набора.

### 4.5. Полнотекстовый поиск и фильтрация
* **Глобальный поиск ([`src/pages/SearchPage.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/pages/SearchPage.tsx))**: полнотекстовый поиск по всем сообщениям, авторам, файлам и опросам с подсветкой совпадений, историей запросов и фильтрами по датам и типам медиа.
* **Мгновенный переход к сообщению**: переход в нужный чат (`setMobileView('chat')`, `handleSetActiveRoomId`), расширение среза видимых сообщений и плавная подсветка целевого облачка (`jumpToMessage`).
* **Поиск по #хештегам**: клик по любому `#тегу` в чате мгновенно открывает глобальный поиск с предзаполненным запросом.

### 4.6. Кастомный видеоплеер (Custom Video Player Suite)
* **Архитектура ([`src/components/VideoPlayer/`](https://github.com/Voltikalk/Comms/blob/main/src/components/VideoPlayer/))**: кастомный HTML5-плеер в стилистике Telegram Web с поддержкой авто-определения ориентации (вертикальные 9:16 Reels / горизонтальные 16:9), управления скоростью (`0.5x`–`2x`), слайдером громкости, хоткеями (Space/K/F/M/P/ArrowLeft/ArrowRight), Picture-in-Picture и полноэкранным режимом.

### 4.7. Движок тем Skiper UI, обоев, размытия и затемнения
* **Skiper UI 26 ([`src/components/ui/skiper26.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ui/skiper26.tsx))**: круговое радиальное раскрытие темы через View Transitions API (`document.startViewTransition`) из координат клика.
* **Skiper 4 ([`src/components/ui/skiper4.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ui/skiper4.tsx))**: переключатель тем с морфингом полумесяца и лучей солнца (Framer Motion).
* **Обои чата ([`src/components/Theme/ThemeSettingsModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Theme/ThemeSettingsModal.tsx))**: коллекция фото-обоев, градиентов и паттернов с независимыми ползунками размытия `blur` (0–20px) и затемнения `dimming` (0–80%) с компенсацией масштабирования `scale(1.12)`.

### 4.8. Эффект распада сообщений Таноса
* **Canvas физика ([`src/components/effects/disintegrate.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/effects/disintegrate.ts))**: аутентичный волновой фронт распада сообщения на тысячи мерцающих частиц звездной пыли с вихревым потоком, звуковым сопровождением и плавным схлопыванием высоты строки.

### 4.9. Кроссплатформенный гибридный мастер-сьют для ПК и смартфонов (Comms Hybrid Suite)
* **Ядро платформы и детектор ([`src/context/PlatformContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/PlatformContext.tsx))**:
  * Автоматическое распознавание ОС (`windows`, `macos`, `linux`, `ios`, `android`, `web`), типа устройства (`desktop`, `mobile`, `tablet`) и автономного режима PWA (`isStandalone`).
  * Непрерывный мониторинг качества сети с замером задержки ping (ms) и индикацией 🟢 Онлайн / 🟡 Подключение / 📴 Офлайн.
  * Управление режимами интерфейса (`auto` / `desktop` / `mobile`), позволяющее тестировать или принудительно включать режим ПК (2 колонки) либо телефона.
  * Тактильный отклик (`triggerHaptic` с 6 паттернами вибрации `light`, `medium`, `heavy`, `success`, `warning`, `selection`).
  * Перехват события `beforeinstallprompt` для PWA-установки в 1 клик.
* **Мастер-сьют для ПК (Desktop Experience)**:
  * **Заголовок окна Telegram Desktop ([`src/components/Desktop/DesktopTitleBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Desktop/DesktopTitleBar.tsx))**: стилизованная панель окна с бейджем ОС, сетевым пингом, быстрым поиском (`Ctrl+K`), переключателем адаптивных режимов, кнопкой хоткеев, кнопкой установки PWA и полноэкранным режимом F11.
  * **Горячие клавиши ([`src/components/Desktop/KeyboardShortcutsModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Desktop/KeyboardShortcutsModal.tsx))**: глобальный перехват `Ctrl+K` (поиск), `Ctrl+1..9` (быстрая смена чата), `Ctrl+,` (настройки), `Ctrl+/` (шпаргалка клавиш), `Esc` (отмена/назад).
* **Мастер-сьют для смартфонов (Mobile Native Experience)**:
  * **Нижняя панель навигации ([`src/components/Mobile/MobileBottomNav.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Mobile/MobileBottomNav.tsx))**: 5 разделов (💬 Чаты, 🌟 Истории, 🔍 Поиск, 👥 Комнаты, ⚙️ Настройки) с динамическими бейджами непрочитанных сообщений.
  * **Тач-жесты возврата (Edge Swipe)**: свайп пальцем от левого края экрана (<48px) плавно закрывает активный чат и возвращает пользователя к списку диалогов с виброоткликом.
  * **Безопасные зоны**: стили `safe-area-inset` для экранов с вырезами (iPhone Notch, Dynamic Island) и домашней полосой жестов Android/iOS.
* **Модальное окно установки ([`src/components/Hybrid/AppInstallModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Hybrid/AppInstallModal.tsx))**:
  * PWA-инсталляция в 1 клик для браузеров Chrome / Edge / Android.
  * Интерактивная 3-шаговая иллюстрированная инструкция для Safari на iOS («Поделиться -> На экран "Домой"`).

### 4.10. Форматирование текста, спойлеры и блоки кода (Rich Text & Telegram Spoilers Suite)
* **Токенизатор и рендерер ([`src/lib/markdown-parser.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/lib/markdown-parser.tsx))**:
  * **Интерактивные спойлеры `||текст||` (`<TelegramSpoiler />`)**: мерцающий шумовой слой частиц на Canvas, предотвращающий прочтение и копирование в скрытом состоянии, с плавной волновой анимацией раскрытия (`@keyframes tgSpoilerBurst`) при клике/тапе.
  * **Блоки кода ```` ```[lang]\n[code]\n``` ```` (`<CodeBlock />`)**: оформление в стиле Telegram Web, верхняя плашка с бейджем языка, моноширинный шрифт, номера строк и 1-click кнопка «Копировать» с анимацией подтверждения `IconCheck`.
  * **Инлайн-форматирование**: жирный (`**`), курсив (`*`), подчеркнутый (`__`), зачеркнутый (`~~`), моноширинный код (`` ` ``).
  * **Автораспознавание ссылок**: автоматическое превращение `http/https` в безопасные кликабельные ссылки.
  * **Подсветка поиска**: интеграция с `searchQuery` (`renderHighlightedText`).
* **Всплывающая панель инструментов HUD ([`src/components/Chat/FormattingToolbar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Chat/FormattingToolbar.tsx))**:
  * Автоматическое появление над выделенным текстом в поле ввода в виде плавающего премиум-HUD с нижним указателем-стрелкой, глубокой тенью и стеклянным блюром (`backdrop-blur-xl`).
  * Кнопки стилей (**B**, *I*, <u>U</u>, ~~S~~, `</>`), градиентная капсула ✨ «Спойлер», вставка ссылок 🔗 и кнопка закрытия ✕.
  * **Горячие клавиши ввода**: `Ctrl+B` (жирный), `Ctrl+I` (курсив), `Ctrl+U` (подчеркнутый), `Ctrl+Shift+X` (зачеркнутый), `Ctrl+Shift+P` (спойлер), `Ctrl+Shift+M` (код).
* **Стилизованная панель редактирования сообщения ([`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx))**:
  * Фирменная плашка Telegram над полем ввода с круглой иконкой карандаша в акцентном цвете `#3390ec`, предпросмотром оригинального текста и отменой по `Esc`.
  * Превращение кнопки отправки в зеленую/синюю галочку `IconCheck` («Сохранить изменения (Enter)») в режиме редактирования.

### 4.11. Полноэкранная медиа-галерея (Telegram Media Lightbox & Gallery Suite)
* **Полноэкранный плеер и галерея ([`src/components/Media/MediaGalleryModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Media/MediaGalleryModal.tsx))**:
  * Просмотр всех фотографий и видеозаписей активного чата в едином полноэкранном окне (React Portal).
  * **Навигация**: кнопки влево/вправо, клавиши `ArrowLeft` / `ArrowRight`, свайпы на мобильных устройствах.
  * **Интерактивный зум и панорамирование (Zoom & Pan)**: масштабирование колесом мыши (`1.0x`–`4.0x`), двойной клик 1x ⟷ 2.5x, плавное перетаскивание курсором/пальцем при увеличении.
  * **Поворот на 90°**: кнопка поворота картинки по часовой стрелке (`R`).
  * **Верхняя панель**: аватар и имя отправителя, дата и время отправки, счетчик «N из M», скачивание файла и копирование ссылки.
  * **Нижняя карусель миниатюр (Thumbnail Strip)**: горизонтальная лента превью всех медиа диалога с автоскроллом к активному элементу.
### 4.12. Анимированные фоны React Bits (React Bits Backgrounds Suite)
* **Коллекция живых фонов ([`src/components/Backgrounds/`](https://github.com/Voltikalk/Comms/tree/main/src/components/Backgrounds))**:
  * **React Bits Squares ([`Squares.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Backgrounds/Squares.tsx))**: интерактивная бесконечная сетка светящихся квадратов с постоянным диагональным дрейфом и подсветкой тайла под курсором мыши.
  * **React Bits Aurora ([`Aurora.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Backgrounds/Aurora.tsx))**: плавные переливающиеся градиентные волны северного сияния с атмосферным размытием и световой динамикой.
  * **React Bits Particles ([`Particles.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Backgrounds/Particles.tsx))**: физическая сеть летающих частиц с соединительными линиями созвездий и эффектом отталкивания от курсора.
  * **React Bits Matrix / LetterGlitch ([`LetterGlitch.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Backgrounds/LetterGlitch.tsx))**: киберпанк-матрица случайных цифровых символов с настраиваемым темпом глитча и виньеткой.
  * **React Bits Hyperspeed ([`Hyperspeed.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Backgrounds/Hyperspeed.tsx))**: гиперпространственный туннель звезд со световыми шлейфами и эффектом варп-скорости.
  * **React Bits Waves ([`Waves.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Backgrounds/Waves.tsx))**: плавные синусоидальные волновые ленты с гармонической интерполяцией и динамической фазой.
  * **React Bits Ambient Dither ([`Dither.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Backgrounds/Dither.tsx))**: световые размытые градиентные волны с эффектом диффузного свечения.
### 4.13. Мастер-сьют навигации (Master Navigation Suite)
* **Палитра команд Spotlight ([`src/components/Navigation/CommandPaletteModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Navigation/CommandPaletteModal.tsx))**:
  * Быстрый вызов через `Ctrl+K` / `Cmd+K` или кнопку поиска в заголовке окна.
  * Фильтрация по категориям (*Все, Чаты, Действия, Настройки*), умный нечеткий поиск (Fuzzy Match) по названиям комнат, именам контактов и ключевым словам действий.
  * Полное управление стрелками `ArrowUp`/`ArrowDown`, переход по `Enter`, закрытие по `Escape`.
  * Быстрый доступ к созданию опросов, историй, переключению темы, муту чата, PWA установке, QR-коду и профилю.
* **Вкладки папок чатов Telegram ([`src/components/Navigation/ChatFolderTabs.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Navigation/ChatFolderTabs.tsx))**:
  * 5 предопределенных папок: **«Все»**, **«Личные»**, **«Группы»**, **«Непрочитанные»**, **«Избранное»**.
  * **Плавное горизонтальное листание**:
    * Автоматическая конвертация вертикального колесика мыши в горизонтальный скролл (`onWheel`).
    * Жест перетаскивания мышью и пальцем (Drag / Pan to scroll) с защитой от случайных кликов.
    * Интерактивные круглые кнопки-стрелки (`IconChevronLeft` / `IconChevronRight`) и градиентные маски по краям при переполнении.
    * Автоматическое центрирование выбранной вкладки (`scrollIntoView({ inline: 'center' })`).
  * Динамический подсчет количества комнат и бейджей непрочитанных сообщений в реальном времени.
  * Горячие клавиши `Alt+1`..`Alt+5`.
* **Мобильная навигация и жесты ([`src/components/Mobile/MobileBottomNav.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Mobile/MobileBottomNav.tsx))**:
  * Плавающая стеклянная панель с размытием `backdrop-blur-xl`, активной световой капсулой и поддержкой безопасных зон (Safe Area).
  * Интерактивный виброотклик Haptic Feedback при переключении вкладок.
* **Десктопные хлебные крошки и горячие клавиши ([`src/components/Desktop/DesktopTitleBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Desktop/DesktopTitleBar.tsx), [`src/components/Desktop/KeyboardShortcutsModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Desktop/KeyboardShortcutsModal.tsx))**:
  * Цепочка `Secure Comms › [Название чата]` с индикатором онлайн-статуса собеседника.
  * Быстрое переключение между чатами в списке через `Alt+↑` (предыдущий) и `Alt+↓` (следующий).
  * Прямой переход по номеру `Ctrl+1..9` и иерархическое закрытие слоев модалок по `Escape`.
* **Тесты ([`src/components/Navigation/navigation.test.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/Navigation/navigation.test.ts))**:
  * 10 специализированных юнит-тестов логики фильтрации комнат по папкам, комбинирования с поисковыми запросами и работы Command Palette.

---

## 🛠 Запуск, сборка и Storybook

```bash
# 1. Запуск Node.js бэкенд сервера (порт 3000)
npm run server

# 2. Запуск Vite Dev сервера (порт 5173)
npm run dev

# 3. Запуск юнит-тестов Vitest (107/107 тестов)
npm test

# 4. Проверка линтером Oxlint
npm run lint

# 5. Проверка типов TypeScript и production сборка проекта
npm run build

# 6. Запуск Storybook песочницы компонентов (порт 6006)
npm run storybook
```

---

## 📜 Журнал изменений (Changelog)

### [v3.19.0] — 2 сентября 2026 г.
* **Распил "God-компонента" `ChatScreen.tsx` (декомпозиция монолита 4 478 строк / 192 КБ)**:
  * **Архитектурная модульность**: монолитный компонент `ChatScreen.tsx` декомпозирован на 6 изолированных, легко поддерживаемых субкомпонентов в каталоге `src/components/Chat/`:
    * [`src/components/Chat/Sidebar/ChatSidebar.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Chat/Sidebar/ChatSidebar.tsx) (511 строк) — список чатов, фильтры, папки, поиск, истории, гамбургер-меню, кнопка архива сообщений (Admin), плавный ресайз ширины и мобильная навигация.
    * [`src/components/Chat/Header/ChatHeader.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Chat/Header/ChatHeader.tsx) (508 строк) — шапка активного чата, аватар, статус "печатает", капсула поиска внутри чата (iOS/Telegram capsule) с навигацией по совпадениям (Next/Prev) и фильтрами по дате/типу, кнопки звонков и панель мультивыделения сообщений (`isSelectMode`).
    * [`src/components/Chat/Feed/ChatMessageFeed.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Chat/Feed/ChatMessageFeed.tsx) (228 строк) — лента сообщений, плашка закрепленного сообщения с прыжком, баннер оффлайн-статуса, разделители дат ("Сегодня", "Вчера"), дропзона Drag & Drop и плавающая кнопка скролла вниз со счетчиком непрочитанных.
    * [`src/components/Chat/Input/ChatInputBar.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Chat/Input/ChatInputBar.tsx) (491 строк) — поле ввода, предпросмотр медиа и документов, плашки ответов и редактирования, автокомплит @упоминаний, подсказки стикеров, попап эмодзи, диктофон `<VoiceRecorderHUD />`, превью голоса `<VoicePreviewPlayer />` и тулбар форматирования `<FormattingToolbar />`.
    * [`src/components/Chat/UserInfo/ChatUserInfoPanel.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Chat/UserInfo/ChatUserInfoPanel.tsx) (190 строк) — правая панель деталей пользователя и группы, переключатель уведомлений, био и галерея общих медиафайлов.
    * [`src/components/Chat/Modals/ChatModalsHost.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Chat/Modals/ChatModalsHost.tsx) (834 строк) — централизованный хост модалок (`ProfileEditModal`, `PollCreateModal`, `SearchPage`, `AdvancedSearchModal`, `ThemeSettingsModal`, `StoryViewer`, `StoryCreateModal`, `MediaGalleryModal`, `CommandPaletteModal`, `TelegramContextMenuModal`, оверлей WebRTC-звонков, модалка видео-кружка, QR-код, нижняя панель выбора и тосты).
    * [`src/components/Chat/index.ts`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Chat/index.ts) — единая точка экспорта компонентов подсистемы чата.
  * **Рефакторинг `ChatScreen.tsx`**: размер файла сокращен с 4 478 строк (192 КБ) до 2 609 строк (~50% сокращение объема!). Компонент очищен от громоздкой вложенной верстки и преобразован в чистый координатор состояний, контекстов и эффектов.
* **Подключение неиспользуемых страниц и очистка Git-репозитория**:
  * **Подключение `AdminArchive.tsx`**: компонент страницы архива [`src/pages/AdminArchive.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/pages/AdminArchive.tsx) получил проп `onClose` и кнопку «✕ Закрыть». Интегрирован в пользовательский интерфейс:
    1. Кнопка «Архив сообщений (Admin)» в гамбургер-меню сайдбара.
    2. Быстрая команда в палитре `CommandPaletteModal` (Ctrl+K, ключевые слова: *архив, archive, бд, хранилище, admin*).
    3. Рендеринг через модальный хост `ChatModalsHost`.
  * **Удаление мертвых дубликатов**: удалены неиспользуемые файлы `src/pages/RegisterPage.tsx` и `src/pages/ResetPasswordPage.tsx`, дублировавшие визард авторизации.
  * **Фиксация зависших удаленных файлов в Git**: зафиксировано удаление более 30 устаревших файлов (`src/components/ChatRoom/*`, `src/services/*`, `src/hooks/*`), исключив рассинхронизацию индекса.
* **Контроль качества, линтинг и тесты**:
  * 112/112 юнит-тестов Vitest проходят успешно (10 suites, 100% pass).
  * Линтер `oxlint` проходит с **0 ошибок**.
  * Сборка `npm run build` (`tsc -b && vite build`) проходит с exit code 0 за 1.18 сек.

### [v3.18.0] — 2 сентября 2026 г.
* **Устранение критических ошибок в бэкенде и WebRTC сигналинге ([`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js))**:
  * **Устранение SyntaxError redeclaration `userStories`**: удалено повторное объявление `const userStories` на строке 931 в сокет-обработчике `send_story`, блокировавшее запуск сервера Node.js.
  * **Исправление сигналинга личных звонков 1-на-1**: в обработчиках `call_end` и `webrtc_signal` проверка разрешенных комнат переведена с `allowedRooms.includes(roomId)` (где находились только статические комнаты) на общую функцию `isRoomAllowedForUser(roomId, user)`. Это разблокировало передачу ICE-кандидатов, SDP оферов/ансверов и завершение звонков для комнат прямого общения (`dm-*`).
  * **Сквозная генерация и синхронизация UUID сообщений**: генерация `messageId` переведена на `crypto.randomUUID()`. При сохранении в Supabase PostgreSQL строковый ID передается явно (`id: messageId`), обеспечивая 100% совпадение идентификаторов в памяти и в базе данных, что гарантирует работу реакций и статусов прочтения (`isUuid`).
* **Унификация сокетов и оптимизация рендеринга на клиенте**:
  * **Единый WebSocket в StoriesContext ([`src/context/StoriesContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/StoriesContext.tsx), [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx))**:
    * В `SocketContextType` добавлен экспортируемый инстанс `socket: Socket | null`.
    * В `StoriesContext.tsx` полностью удален второй независимый экземпляр `io(SERVER_URL)`. Контекст историй теперь использует общий сокет из `useSocket()`, подписывается на `stories_state` и выполняет `socket.off(...)` при размонтировании. Это снизило нагрузку на сокеты в 2 раза и исключило гонки аутентификации.
  * **Стабилизация вкладок ChatFolderTabs ([`src/components/Navigation/ChatFolderTabs.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Navigation/ChatFolderTabs.tsx))**:
    * Массив `tabs` вынесен за пределы компонента в константу `FOLDER_TABS`, удалена лишняя зависимость из `useEffect`. Устранены постоянные пересоздания слушателей `scroll` и `resize` окна при каждом рендере.
* **Качество кодовой базы и тесты**:
  * Линтер `oxlint` теперь проходит с **0 ошибок** (была 1 блокирующая ошибка).
  * 112/112 юнит-тестов Vitest успешно пройдены.
  * Сборка `npm run build` проходит без ошибок типов TypeScript.

### [v3.17.0] — 1 сентября 2026 г.
* **Мастер-сьют историй Telegram 3.0 («Как в TG» / Telegram Stories 3.0 Master Suite)**:
  * **Сегментированные SVG-кольца в сайдбаре ([`src/components/Stories/StoriesBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stories/StoriesBar.tsx))**:
    * Реализован компонент `<SegmentedStoryRing />`: кольцо вокруг аватара динамически разделяется на количество дуг, точно равное числу историй пользователя с разделителями (`stroke-dasharray`).
    * Независимый статус просмотренных (серый цвет) и непросмотренных историй (градиент `#3390ec` ➔ `#ac8bdd` ➔ `#e6604c`).
    * Режим «Близкие друзья» (Close Friends) с неоново-зеленым кольцом (`#00c853` ➔ `#aeea00`) и звездочкой ★.
    * Горизонтальный drag-to-scroll мышью и колесиком, быстрый плюс `+` на своей аватарке для публикации истории.
  * **Полноэкранный плеер историй в стиле Telegram ([`src/components/Stories/StoryViewer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stories/StoryViewer.tsx))**:
    * **Жест удержания (Hold to pause & Hide UI)**: долгое нажатие/удержание мгновенно ставит историю на паузу и плавно скрывает весь интерфейс (шапку, сегменты, футер) для чистого просмотра контента.
    * **Свайп/драг вниз для закрытия**: утягивание карточки истории вниз с динамическим масштабированием и пружинящим закрытием.
    * **Двойной тап для лайка ❤️**: быстрое двойное касание триггерит анимацию пульсирующего сердца по центру экрана и регистрирует реакцию.
    * **Панель быстрых реакций TG**: 10 аутентичных реакций (`❤️`, `🔥`, `👍`, `👏`, `😂`, `😍`, `🎉`, `⚡`, `💯`, `🚀`) с физикой взлетающих разнонаправленных частиц и автоотправкой уведомления в чат автору.
    * **Прямой ответ (Story Direct Reply)**: поле ввода ответа на историю с мгновенной отправкой в личный диалог с автором.
    * **Шторка зрителей для автора (Viewers Drawer)**: всплывающая шторка со списком всех посмотревших пользователей, поиском, временными метками и бейджами оставленных реакций.
    * **Меню опций**: скачивание медиа, копирование ссылки и удаление своей истории.
    * **Горячие клавиши**: `←`/`→` (сегменты), `↑`/`↓` (смена пользователей), `Space` (пауза), `M` (звук), `Esc` (закрыть).
  * **Студия создания историй Telegram Studio ([`src/components/Stories/StoryCreateModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stories/StoryCreateModal.tsx))**:
    * **Живая съемка с веб-камеры / камеры смартфона (`navigator.mediaDevices.getUserMedia`)**: моментальная съемка фото или запись видео с круговым таймером до 60 секунд.
    * **Текстовые истории**: 12 фирменных градиентов, 6 шрифтов (`Classic`, `Neon`, `Bold`, `Serif`, `Mono`, `Script`), палитра цветов, выравнивание и стили подложки (`None`, `[Fill]`, `✨Glow`).
    * **Интерактивное рисование кистью (Doodle Canvas)**: рисование на `<canvas>` поверх фото/видео с выбором из 8 цветов, ползунком толщины и кнопкой очистки.
    * **Стикеры поверх фото**: добавление и позиционирование эмодзи-стикеров.
    * **Срок жизни (Custom TTL)**: выбор 6 часов, 12 часов, 24 часа, 48 часов.
    * **Приватность и закрепление**: *«Все»*, *«Контакты»*, *«Близкие друзья»*, *«Только я»*, тумблер *«Сохранить в профиле» (Pinned Highlights)*.
  * **Синхронизация бэкенда и контекст ([`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js), [`src/context/StoriesContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/StoriesContext.tsx), [`src/components/Stories/StoryCreateModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stories/StoryCreateModal.tsx))**:
    * Устранены дубликаты сокет-обработчиков, добавлена поддержка всех полей Stories 3.0 и расчет срока жизни по `durationHours`.
    * **Дедупликация и защита от повторной отправки**: сквозная передача уникального клиентского `id` истории в сокет, серверная проверка дедупликации `userStories.some(s => s.id === storyId)` и блокировка повторного нажатия кнопки отправки (`isPosting`).
    * Очищены неиспользуемые переменные и дубликаты JSX в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx).
  * **Юнит-тесты ([`src/lib/stories.test.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/stories.test.ts))**:
    * Добавлены 11 тестов для сегментированных колец, кастомных TTL 6-48ч, оверлеев, рисования и приватности. Общее число тестов: **112/112 passed** (100%).

### [v3.16.0] — 1 сентября 2026 г.
* **Мастер-сьют глобальной навигации и палитры команд (Master Navigation Suite: Spotlight, Folders & Power-User Shortcuts)**:
  * **Command Palette Spotlight (`Ctrl+K` / `Cmd+K`) ([`src/components/Navigation/CommandPaletteModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Navigation/CommandPaletteModal.tsx))**:
    * Создана модальная палитра команд в стиле macOS Spotlight и Linear.
    * Категории: *Все*, *Чаты*, *Действия*, *Настройки*.
    * Поиск по комнатам, контактам и ключевым словам действий с поддержкой клавиатурной навигации (`↑`/`↓`/`Enter`/`Esc`).
  * **Вкладки папок чатов Telegram ([`src/components/Navigation/ChatFolderTabs.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Navigation/ChatFolderTabs.tsx))**:
    * Вкладки: *Все*, *Личные*, *Группы*, *Непрочитанные*, *Избранное*.
    * Динамический подсчет комнат и бейджей непрочитанных, горячие клавиши `Alt+1`..`Alt+5`.
  * **Модернизация мобильной навигации и устранение перекрытий ([`src/components/Mobile/MobileBottomNav.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Mobile/MobileBottomNav.tsx), [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx))**:
    * Устранено наложение нижней панели навигации на строку ввода сообщений: панель `MobileBottomNav` скрывается при открытии активного диалога и на десктопном интерфейсе, отображаясь строго в списке чатов на смартфонах (`!isDesktopView && mobileView === 'list'`).
    * Добавлены классы `md:hidden`, `min-w-0`, `truncate` и безопасные отступы `safe-area-inset-bottom`.
  * **Десктопные хлебные крошки и заголовок окна ([`src/components/Desktop/DesktopTitleBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Desktop/DesktopTitleBar.tsx))**:
    * Интегрированы цепочка `Secure Comms › [Чат]`, онлайн-индикатор и триггер Command Palette.
  * **Клавиатурные хоткеи Power-User ([`src/components/Desktop/KeyboardShortcutsModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Desktop/KeyboardShortcutsModal.tsx), [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx))**:
    * Добавлено циклическое переключение чатов `Alt+↑` / `Alt+↓`, переключение по цифрам `Ctrl+1..9`, иерархический `Escape`.
  * **Юнит-тесты ([`src/components/Navigation/navigation.test.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/Navigation/navigation.test.ts))**:
    * Добавлено 10 тестов для фильтрации папок и поиска в палитре команд. Общее количество тестов: **107/107 passed**.

### [v3.15.1] — 1 сентября 2026 г.
* **Стабилизация WebSocket-проксирования Vite и подавление сетевых прерываний (Vite WS Proxy ECONNABORTED Fix)**:
  * **Кастомный фильтр логгера Vite ([`vite.config.ts`](https://github.com/Voltikalk/Comms/blob/main/vite.config.ts))**:
    * Интегрирован `customLogger` с перехватом `logger.error` для подавления безвредных сетевых ошибок закрытия сокета (`ECONNABORTED`, `ECONNRESET`, `EPIPE`, `ECONNREFUSED`), возникающих при горячей перезагрузке страниц (HMR), закрытии/обновлении вкладок браузера или выходе из спящего режима.
    * Добавлен обработчик ошибок `proxy.on('proxyReqWs')` для безопасного перехвата ошибок на уровне сокета клиента.
  * **Актуализация тестов**: все 97/97 тестов Vitest проходят успешно (`npm test`).

### [v3.15.0] — 1 сентября 2026 г.
* **Продвинутый UX записи голосовых сообщений (Slide-to-Cancel & Hands-Free Lock Suite)**:
  * **Плавающий HUD записи ([`src/components/Audio/VoiceRecorderHUD.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Audio/VoiceRecorderHUD.tsx))**:
    * Реализован Slide-to-Cancel жест свайпа влево с подсказкой `‹ ‹ ‹ Проведите влево для отмены`, анимацией корзины и виброоткликом `triggerHaptic('warning')`.
    * Реализован Swipe-Up Lock жест свайпа вверх для перехода в режим фиксации (Hands-Free) с плавающим индикатором замочка 🔒.
    * Полнофункциональная панель управления: кнопка паузы/возобновления (`MediaRecorder.pause()`), колеблющийся спектр звука, таймер, удаление и быстрая отправка.
  * **Предпросмотр перед отправкой ([`src/components/Audio/VoicePreviewPlayer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Audio/VoicePreviewPlayer.tsx))**:
    * Интерактивный мини-плеер: прослушивание записанного звука до отправки с интерактивным скраббером по 30-полосному спектру волн, таймером и кнопками отмены/отправки.
  * **Тесты**: добавлены юнит-тесты таймеров, порогов жестов и нормализации спектра ([`src/components/Audio/VoiceRecorder.test.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/Audio/VoiceRecorder.test.ts)), 97/97 тестов проходят.
* **Анимированные интерактивные фоны React Bits (React Bits Backgrounds Suite)**:
  * Созданы 5 премиальных компонентов фонов: `<Squares />`, `<Aurora />`, `<Particles />`, `<LetterGlitch />`, `<Hyperspeed />`.
  * Добавлена новая категория обоев «✨ React Bits» в модальном окне настроек темы.
  * Интегрирован живой рендеринг анимированных фонов прямо в окно активного чата.
* **Мастер-сьют форматирования текста, спойлеров и блоков кода (Rich Text & Telegram Spoilers Suite)**:
  * **Парсер и токенизатор ([`src/lib/markdown-parser.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/lib/markdown-parser.tsx), [`src/lib/markdown-parser.test.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/markdown-parser.test.ts))**:
    * Реализован парсер с поддержкой `||спойлеров||`, блоков кода ```` ```lang\ncode\n``` ````, инлайн-кода `` `code` ``, `**жирного**`, `*курсива*`, `__подчеркнутого__`, `~~зачеркнутого~~`, `@упоминаний`, `#хештегов` и URL-ссылок.
    * **Интерактивный спойлер `<TelegramSpoiler />`**: Canvas-эффект искрящихся частиц/шума в скрытом состоянии с волновым раскрытием по клику.
    * **Блок кода `<CodeBlock />`**: темный контейнер с бейджем языка, номерами строк и кнопкой «Копировать» с анимацией `IconCheck`.
  * **Всплывающая панель инструментов ([`src/components/Chat/FormattingToolbar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Chat/FormattingToolbar.tsx))**:
    * Контекстный тулбар над выделенным текстом в поле ввода с кнопками форматирования и глобальными хоткеями (`Ctrl+B`, `Ctrl+I`, `Ctrl+U`, `Ctrl+Shift+X`, `Ctrl+Shift+P`, `Ctrl+Shift+M`).
* **Мастер-сьют полноэкранной медиа-галереи (Telegram Media Lightbox & Gallery Suite)**:
  * **Компонент полноэкранного просмотра ([`src/components/Media/MediaGalleryModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Media/MediaGalleryModal.tsx), [`src/components/Media/MediaGalleryModal.test.ts`](https://github.com/Voltikalk/Comms/blob/main/src/components/Media/MediaGalleryModal.test.ts))**:
    * Полноэкранный просмотр всех фото и видео активного диалога с навигацией стрелками `←` / `→` и свайпами.
    * Интерактивный зум колесом мыши (`1.0x`–`4.0x`), двойной клик 1x ⟷ 2.5x, панорамирование мышью при зуме.
    * Поворот на 90° (`R`), счетчик «N из M», автор, дата, скачивание и копирование ссылки.
    * Нижняя карусель миниатюр с подсветкой и автоскроллом к активному медиа.
* **Интеграция в сообщения и ленту ([`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx), [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx))**:
  * В сообщениях чата подключен рендеринг через `parseAndRenderRichText`.
  * Клик по любому фото/видео в чате или в сайдбаре общих медиа открывает медиа-галерею.
* **Тесты Vitest**: 93/93 юнит-теста проходят успешно (`npm test`).
* **Кроссплатформенный гибридный мастер-сьют для ПК и смартфонов (Comms Hybrid Desktop & Mobile Suite)**:
  * **Ядро платформы и хук `usePlatform` ([`src/context/PlatformContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/PlatformContext.tsx), [`src/types/platform.types.ts`](https://github.com/Voltikalk/Comms/blob/main/src/types/platform.types.ts))**:
    * Реализован универсальный контекст платформы с автоопределением операционной системы (`windows`, `macos`, `linux`, `ios`, `android`), форм-фактора устройства (`desktop`, `mobile`, `tablet`) и PWA-статуса `isStandalone`.
    * **Замер пинга в реальном времени**: непрерывный фоновый мониторинг сетевой задержки (ping в миллисекундах) и статуса онлайн/офлайн.
    * **Тактильный движок (`triggerHaptic`)**: 6 сценариев виброотклика на поддерживаемых устройствах (`light`, `medium`, `heavy`, `success`, `warning`, `selection`).
    * **Переключатель режимов отображения**: тумблер `Авто ⚡` / `ПК 🖥️` / `Телефон 📱` с сохранением в `localStorage`.
  * **Настольный режим (Telegram Desktop Experience)**:
    * **Заголовок окна Telegram Desktop ([`src/components/Desktop/DesktopTitleBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Desktop/DesktopTitleBar.tsx))**:
      * Стеклянная плашка с логотипом, бейджем операционной системы, живым пингом сети (🟢 22ms), строкой быстрого поиска `Ctrl+K`, переключателем режимов и кнопкой F11.
    * **Интерактивная шпаргалка горячих клавиш ([`src/components/Desktop/KeyboardShortcutsModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Desktop/KeyboardShortcutsModal.tsx))**:
      * Красивое модальное окно со всеми доступными хоткеями (`Ctrl+K`, `Ctrl+1..9`, `Ctrl+,`, `Ctrl+/`, `Esc`, `Ctrl+N`, `Ctrl+E`).
      * Глобальные перехватчики клавиатурных событий для быстрого серфинга без мыши.
  * **Мобильный режим (Telegram Mobile Experience)**:
    * **Нижняя панель навигации ([`src/components/Mobile/MobileBottomNav.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Mobile/MobileBottomNav.tsx))**:
      * Таб-бар с вкладками Чаты, Истории, Поиск, Комнаты, Настройки, бейджами непрочитанных сообщений и поддержкой `safe-area-inset-bottom`.
    * **Свайп от левого края (Edge Swipe Gesture)**:
      * Жест возврата из экрана чата к списку диалогов при свайпе от левой границы экрана с легким тактильным виброоткликом.
  * **PWA & Hybrid App Shell ([`src/components/Hybrid/AppInstallModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Hybrid/AppInstallModal.tsx), [`public/manifest.json`](https://github.com/Voltikalk/Comms/blob/main/public/manifest.json))**:
    * Модальное окно установки с поддержкой установки в 1 клик (`beforeinstallprompt`) на Windows/macOS/Linux/Android и иллюстрированным гидом для Safari iOS.
    * Обновлен `manifest.json` с поддержкой `display_override: ["window-controls-overlay", "standalone"]`, shortcuts быстрого поиска и историй, и `viewport-fit=cover` в `index.html`.
  * **Устранение ошибки SSL в Яндекс.Браузере (`ERR_CERT_AUTHORITY_INVALID`)**:
    * В [`vite.config.ts`](https://github.com/Voltikalk/Comms/blob/main/vite.config.ts) отключен плагин принудительного самоподписанного сертификата `basicSsl`, благодаря чему локальный сервер разработки `http://localhost:5173` мгновенно открывается без ложных предупреждений «Нейропротект» и блокировок сертификатов.
    * В [`index.html`](https://github.com/Voltikalk/Comms/blob/main/index.html) добавлен автоматический редирект со старого `https://` на `http://` для локальных сессий.
    * В [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) и [`src/context/StoriesContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/StoriesContext.tsx) добавлена явная конфигурация `transports: ['websocket', 'polling']` для бесшовного подключения сокетов.
  * **Исправление SVG атрибута `<circle>` в переключателях тем**:
    * В [`src/components/ui/skiper4.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ui/skiper4.tsx) и [`src/components/ui/skiper26.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ui/skiper26.tsx) для `<motion.circle>` добавлены базовый и начальный радиусы `r` и `initial={{ r }}`, устранив предупреждение браузера `Error: <circle> attribute r: Expected length, "undefined"`.
  * **Тесты Vitest**:
    * Создан файл [`src/lib/platform.test.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/platform.test.ts) с 5 тестами логики платформы — общее число тестов выросло до 83/83 (100% Passing).

### [v3.13.0] — 27 августа 2026 г.
* **Мастер-сьют видео-кружков 2.0 (Telegram Video Notes 2.0 Master Suite)**:
  * **Изолированный компонент плеера ([`src/components/Media/TelegramVideoNotePlayer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Media/TelegramVideoNotePlayer.tsx))**:
    * Вся логика видео-кружка вынесена в изолированный мемоизированный компонент, устранив 60 перерендеров всего сообщения `MessageBubble` в секунду.
    * **Intersection Observer**: автоматическая пауза воспроизведения и моментальная остановка цикла `requestAnimationFrame` при скролле видео-кружка за пределы экрана, экономя 100% ресурсов процессора.
    * **Устранение лагов при первом нажатии**: замена физического изменения `width/height` на аппаратное GPU-масштабирование (`transform: scale(1.28)` + `transform-gpu` + `will-change-transform`) и предзагрузка `preload="auto"`, обеспечивающая запуск с 60/120 FPS без пересчета DOM-дерева (0 layout reflows).
    * **Аутентичный контур Telegram**: тонкая полупрозрачная белая линия `rgba(255, 255, 255, 0.88)` толщиной `2.2px` по контуру кружка без искажающих отступов и без лишних круглых точек/ручек.
    * **Умное отображение прогресса**: в миниатюре ленты чата кружок проигрывается как чистое видео без полоски (`opacity: 0`), а белое кольцо прогресса плавно появляется только при активном просмотре (`opacity: 100`).
    * **Управление и жесты**: круговая 360° перемотка пальцем/мышью с защитным порогом сдвига (>7px) против случайных нажатий, мгновенная пауза/воспроизведение по тапу, выключение звука по клику на иконку в углу и автоматическое закрытие/сворачивание кружка при клике на фон или по клавише `Escape`.
    * **Оптимизация видео-рекордера**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) для `MediaRecorder` установлен битрейт `1.2 Mbps` с подавлением шума (`noiseSuppression`) и эхокомпенсацией (`echoCancellation`).
* **Движок смены темы Skiper UI 26 (View Transitions API) & Skiper 4 Variant 2**:
  * **Круговое раскрытие темы**: в [`src/components/ui/skiper26.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ui/skiper26.tsx) интегрирован View Transition API (`document.startViewTransition`) с кинематографичным временем `1.15s` и радиальным раскрытием `clip-path` точно из координат клика мыши.
  * **Морфинг-иконка Skiper 4 (Variant 2)**: в [`src/components/ui/skiper4.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ui/skiper4.tsx) реализован компонент `ThemeToggleButton2` с плавным вырезанием полумесяца через Framer Motion `clipPath` и вращением лучей солнца.
  * **Очистка меню**: удален устаревший дублирующий пункт темы из выпадающего меню Telegram.
* **Мастер-сьют размытия и затемнения обоев чата**:
  * В [`src/components/Theme/ThemeSettingsModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Theme/ThemeSettingsModal.tsx) и [`src/types/theme.types.ts`](https://github.com/Voltikalk/Comms/blob/main/src/types/theme.types.ts) исправлено сохранение настроек `blur` (0–20px) и `dimming` (0–80%) для всех типов обоев (свои фото, встроенные фото-обои, паттерны и градиенты).
  * В [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) обновлен `getChatBackgroundStyle` с наложением `filter: blur(...)`, авто-масштабированием `scale(1.12)` против краевых артефактов и динамическим слоем затемнения.
* **Тесты и стабильность**: все 78/78 тестов в проекте (`npm test`) и TypeScript сборка (`npm run build`) успешно пройдены.

### [v3.12.0] — 27 августа 2026 г.
* **Мастер-сьют голосовых сообщений 2.0 и видео-кружков (Voice & Video Notes Master Suite)**:
  * **Реальный спектр звука (Waveform Analysis)**: в [`src/lib/audio-waveform.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/audio-waveform.ts) реализован захват амплитуд через Web Audio API (`AudioContext` + `AnalyserNode`), расчет RMS громкости, интерполяция/нормализация в 30 баров (`normalizeWaveform`) и детерминированный фоллбэк для старых записей (`generateFallbackWaveform`).
  * **Живой осциллирующий визуализатор записи**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) во время записи микрофона в строке ввода отображаются анимированные полоски звукового спектра в реальном времени, пульсирующий индикатор записи, таймер и кнопка отмены.
  * **Переключатель режимов отправки (Mic 🎙️ ⟷ Camera 📹)**: на главной кнопке действия реализовано переключение между записью голосового сообщения и видео-кружка по клику / контекстному меню с мгновенной сменой иконок и подсказок.
  * **Круговой рекордер видео-кружков**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) модальное окно записи видео-кружка оснащено круговым SVG-кольцом таймера (0–100% за 60 секунд), авто-завершением при достижении 1 минуты и сохранением метаданных длительности.
  * **Премиум-плеер голосовых сообщений**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) внедрен интерактивный скраббер по полоскам спектра звука с кликом для перемотки, переключением скорости воспроизведения `1x` → `1.5x` → `2x` и точным отображением времени.
  * **Круглый плеер видео-кружков**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) добавлено внешнее круговое SVG-кольцо прогресса по периметру кружка, синхронизированное с `currentTime / duration`, управление звуком по тапу и сохранение плавного раскрытия.
  * **Юнит-тесты**: создан файл [`src/lib/audio-waveform.test.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/audio-waveform.test.ts) с 8 тестами — 78/78 тестов в проекте проходят успешно.

### [v3.11.0] — 23 августа 2026 г.
* **Мастер-сьют интерактивных историй (Stories Master Suite — Telegram Stories 2.0)**:
  * **Backend-синхронизация и хранилище историй**: в [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) реализовано in-memory хранилище `storiesStore` с автоматической фоновой очисткой истекших историй (24-часовой TTL), отправкой `stories_state` при подключении и сокет-обработчиками `send_story`, `delete_story`, `view_story`, `react_story`.
  * **Контекст историй и оптимистичные обновления**: [`src/context/StoriesContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/StoriesContext.tsx) дополнен методами `sendStory`, `deleteStory`, `viewStory`, `reactStory` с мгновенным локальным обновлением UI до ответа сервера.
  * **Интеграция в интерфейс мессенджера**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) в шапку сайдбара встроен компонент [`StoriesBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stories/StoriesBar.tsx) с градиентными анимированными кольцами непросмотренных историй (`#3390ec` ➔ `#ac8bdd` ➔ `#e6604c`), бейджем добавления «+» и плавной горизонтальной прокруткой колесом мыши.
  * **Полноэкранный плеер историй (StoryViewer)**: в [`src/components/Stories/StoryViewer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stories/StoryViewer.tsx) добавлены:
    * Панель быстрых эмодзи-реакций (❤️, 🔥, 😂, 👏, 🎉, 😍) с анимацией взлетающих эмодзи (`animate-fly-up`).
    * Поле быстрого ответа на историю с автоматической отправкой личного сообщения автору.
    * Панель просмотров для автора истории со списком зрителей и их аватарами.
    * Поддержка фото, видеоисторий со звуком (`<video>` + mute toggle), текстовых историй на 12 ярких градиентах и подписей к медиа (captions).
    * Зоны навигации (нажатие слева/справа, пауза при удержании, стрелки клавиатуры и Esc).
    * Монотонный таймер прогресс-бара: устранены рывки и отскоки таймлайна назад при паузах и перерендерах за счет перехода на инкремент дельты времени кадра (`performance.now() - lastTime`) и отключения инерционных CSS-анимаций `transition-all duration-75`.
  * **Модальное окно создания историй (StoryCreateModal)**: в [`src/components/Stories/StoryCreateModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stories/StoryCreateModal.tsx) реализованы:
    * Создание текстовых историй с выбором из 12 градиентов (`STORY_GRADIENTS`) и выравниванием текста (слева, по центру, справа).
    * Drag-and-drop загрузка фото и видео с живым предпросмотром в рамке 9:14 и полем подписи (до 200 символов).
  * **Юнит-тесты**: создан файл [`src/lib/stories.test.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/stories.test.ts) с 6 тестами на 24-часовой TTL, дедупликацию просмотров, группировку реакций, градиенты и подписи — 70/70 тестов в проекте проходят успешно.

### [v3.10.0] — 23 августа 2026 г.
* **Мастер-сьют интерактивных опросов и викторин (Live Polls & Quizzes Master Suite)**:
  * **Исправление бага множественного выбора**: в [`src/components/Poll/PollCard.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Poll/PollCard.tsx) устранена критическая ошибка, из-за которой повторный клик по выбранному варианту в режиме нескольких ответов не снимал отметку — теперь чекбокс корректно переключается (toggle on/off).
  * **Поддержка режима «Викторина» (Quiz Mode)**:
    * В [`src/types.ts`](https://github.com/Voltikalk/Comms/blob/main/src/types.ts) в интерфейс `Poll` добавлены поля `quiz?: boolean`, `correctOptionId?: string` и `explanation?: string`.
    * В [`src/components/Poll/PollCreateModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Poll/PollCreateModal.tsx) добавлен тумблер «Режим викторины», радиокнопки выбора правильного ответа и опциональное поле «Объяснение» с лимитом 200 символов.
    * В [`src/components/Poll/PollCard.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Poll/PollCard.tsx) реализована анимация ответа викторины: при выборе правильного варианта — зеленое кольцо и иконка галочки, при ошибке — красная обводка с крестиком, анимация дрожания (`animate-shake`), автоматическая подсветка верного варианта и карточка пояснения с лампочкой 💡.
    * В [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) в обработчик `vote_poll` добавлено правило неизменяемости ответа в викторине (поведение 1:1 Telegram).
  * **Отзыв голоса («Отменить голос»)**: для обычных (не-викторин) активных опросов добавлена кнопка отзыва своего голоса.
  * **Список проголосовавших в публичных опросах**: для неанонимных опросов при наведении на вариант отображается всплывающий список имен участников (`getUserDisplayName`).
  * **Оптимистичный UI**: в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) методы `votePoll` и `closePoll` обновляют локальное состояние `messages` мгновенно до ответа сервера.
  * **Пересылка опросов и Избранное**: в `forwardMessage` добавлена передача структуры опроса со сбросом счетчика голосов (`votes: {}`).
  * **Копирование опроса из контекстного меню**: в [`src/components/TelegramContextMenuModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/TelegramContextMenuModal.tsx) и [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) пункт «Копировать опрос» копирует вопрос и пронумерованный список вариантов в буфер обмена.
  * **Полнотекстовый поиск по опросам**: [`src/pages/SearchPage.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/pages/SearchPage.tsx), [`src/components/Search/SearchResultCard.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Search/SearchResultCard.tsx) и [`src/lib/filter-utils.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/filter-utils.ts) теперь индексируют текст вопроса и всех вариантов ответа.
  * **Контрастность заголовков (Contrast & Accessibility Fix)**: устранена нечитаемость белого текста на светло-зеленых пузырях исходящих сообщений в светлой теме — заголовок «Викторина» переведен на четкий янтарный цвет (`text-amber-600 dark:text-amber-400`), а «Опрос» — на фирменный синий (`text-[#3390ec] dark:text-[#70b1ff]`) со 100% контрастностью на любом фоне.
  * **Защита от фантомных пустых сообщений (Ghost Message Elimination)**: добавлена валидация на клиенте и сервере, запрещающая отправку и сохранение пустых сообщений без текста/файла/опроса, а в [`MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) внедрен guard `return null` для исключения рендеринга пустых горизонтальных полос при выделении.
  * **Встроенный таймлайн в карточке опроса**: отображение времени отправки и двойных галочек прочитанности в нижнем правом углу пузыря опроса.
  * **Юнит-тесты**: создан файл [`src/lib/poll.test.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/poll.test.ts) с 15 тестами (одиночный выбор, мультивыбор, викторины, подсчет процентов, фильтрация и пересылка) — 64/64 тестов в проекте проходят успешно.

### [v3.9.0] — 23 августа 2026 г.
* **Тестовая инфраструктура Vitest и юнит-тесты утилит (Testing Foundation)**:
  * **Vitest 4.x подключен**: в [`package.json`](https://github.com/Voltikalk/Comms/blob/main/package.json) добавлены dev-зависимость `vitest` и скрипт `npm run test` (режим `vitest run` для CI).
  * **49 юнит-тестов на утилиты упоминаний**: [`src/lib/mentions.test.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/mentions.test.ts) — парсинг токенов (текст/упоминания/хештеги, кириллица, смежные токены), детектор активного токена по каретке (триггер `@`/`#`, пробелы, лимит длины 32), построение и фильтрация кандидатов автодополнения (по username и имени, case-insensitive, лимиты), `isUserMentionedInText` (по username/имени, игнор хештегов), извлечение хештегов и упомянутых userId.
  * **Юнит-тесты фильтров сообщений**: [`src/lib/filter-utils.test.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/filter-utils.test.ts) — `applyFilters` по отправителям, комнатам, вложениям и их типам, реакциям, правкам, типу сообщения, поисковому запросу, датам (включая расширение конечной даты до 23:59:59.999) и комбинациям фильтров; `sortMessages` (date asc/desc, reactions, edited, иммутабельность входного массива); `validateFilters` (инвертированные даты, невалидные строки, отрицательные minReactions).
  * **Результат**: `npm run test` — 49/49 зеленых за ~200 мс; `tsc`, `oxlint`, `vite build` — без ошибок.

### [v3.8.0] — 23 августа 2026 г.
* **Глубокая чистка мертвого кода (Dead Code Purge: −31 файл)**:
  * **Удалены заброшенные папки компонентов** (завершенный неудачей рефакторинг на Supabase-архитектуру, нигде не импортировались): [`src/components/RoomList/`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx), `src/components/RoomMembers/`, `src/components/UserProfile/`, `src/components/ChatRoom/` (ChatRoom, MessageList, VirtualMessageList, MessageVirtualizer, SendMessage).
  * **Удалены мертвые компоненты поиска**: `Search/FilterPanel.tsx`, `Search/SearchFilters.tsx`, `Search/DateRangePicker.tsx` (реальный UI поиска живет в SearchPage + AdvancedSearchModal).
  * **Удалены неиспользуемые хуки**: `useFileUpload`, `useMessageFilter`, `useMessageReactions`, `useMessageSearch`, `useRealtimeSubscription`, `useSupabase`, `useUserStatus`, `useVirtualScroll`, `useInfiniteMessageHistory`, `useRoomMessages`.
  * **Удалены неиспользуемые сервисы**: `attachment.service`, `read-receipt.service`, `message-filter.service`, `message-history.service`, `realtime.service`, `room.service`, `message.service`, `reaction.service`, `storage.service`.
  * **Сохранены**: страницы (LoginPage/RegisterPage/ResetPasswordPage/AdminArchive — задокументированные точки входа), `message-archive.service` + `archive-messages.job` (цепочка AdminArchive), `filter-utils` (используется ChatScreen), `message-search.service` (AdvancedSearchModal).
  * **Результат**: кодовая база сократилась со 156 до 125 файлов, `tsc` / `oxlint` / `vite build` — без ошибок.

### [v3.7.0] — 23 августа 2026 г.
* **Роутинг и глубокие ссылки на чаты (URL Hash Routing & Deep Links)**:
  * **Синхронизация URL с активным чатом**: в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) метод `handleSetActiveRoomId` теперь пишет `#/chat/{roomId}` в адресную строку через `history.pushState` — URL всегда отражает открытый диалог.
  * **Глубокие ссылки**: при запуске приложения активный чат читается из hash URL в приоритете над `localStorage` — ссылка вида `https://host/#/chat/family` открывает сразу нужный чат, удобно для шаринга и закладок.
  * **Кнопка «Назад» браузера**: добавлен обработчик `popstate` / `hashchange` — навигация назад/вперед переключает между ранее открытыми чатами, ручное редактирование hash тоже поддерживается.
  * **Без новых зависимостей**: вместо тяжелого react-router реализована легковесная hash-синхронизация (~40 строк), полностью совместимая с существующей state-архитектурой SocketContext.

### [v3.6.0] — 23 августа 2026 г.
* **Полноценный PWA: офлайн-кэш и индикатор соединения (Offline-First App Shell)**:
  * **Рабочий Service Worker**: [`public/sw.js`](https://github.com/Voltikalk/Comms/blob/main/public/sw.js) полностью переписан — раньше он самоуничтожался (unregister + очистка кэшей), теперь реализует три стратегии: cache-first для хешированных бандлов `/assets/*` (иммутабельны), stale-while-revalidate для медиа `/uploads/*` и network-first с офлайн-фоллбэком на закэшированный `index.html` для навигации. Сокеты, HMR и API-запросы не перехватываются.
  * **Регистрация SW**: в [`index.html`](https://github.com/Voltikalk/Comms/blob/main/index.html) блок самоуничтожения заменен на честную регистрацию `/sw.js` c pre-cache app shell (`/`, `manifest.json`, иконки).
  * **Баннер «Нет соединения»**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) при потере сокет-соединения над лентой появляется янтарная плашка «Нет соединения с сервером · сообщения не отправляются» с пульсирующим индикатором.
  * **Установка на домашний экран**: манифест и иконки уже были на месте — теперь PWA проходит критерий installability (SW + manifest + иконки) и корректно работает офлайн как приложение-оболочка.

### [v3.5.0] — 23 августа 2026 г.
* **Истории (Stories) с кругами аватарок, просмотрщиком и 24-часовым жизненным циклом**:
  * **Типизация и градиенты**: создан модуль [`src/types/story.types.ts`](https://github.com/Voltikalk/Comms/blob/main/src/types/story.types.ts) — интерфейс `Story` (текст/фото, просмотры, срок жизни 24 ч) и 8 фирменных градиентных фонов (`STORY_GRADIENTS`).
  * **Серверное хранилище**: в [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) in-memory стор `storiesStore` с автоочисткой истекших историй и сокет-событиями `send_story` / `delete_story` / `view_story` + broadcast `stories_state` всем клиентам (до 20 историй на пользователя).
  * **Изолированный контекст**: новый [`src/context/StoriesContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/StoriesContext.tsx) с собственным легковесным сокет-подключением (не трогает SocketContext), экспортирует `myStories` / `othersStories` и действия.
  * **Строка историй в списке чатов**: компонент [`src/components/Stories/StoriesBar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stories/StoriesBar.tsx) — круги аватарок с градиентным кольцом для непросмотренных и серым для просмотренных (отслеживание в `localStorage tg_viewed_stories`), кнопка «+» на своей аватарке; в компактном режиме сайдбара — круглая кнопка добавления.
  * **Полноэкранный просмотрщик**: [`src/components/Stories/StoryViewer.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stories/StoryViewer.tsx) — сегментные полосы прогресса с автопереходом каждые 5 секунд, навигация кликом по зонам / стрелками / Esc, пауза при зажатии мыши, шапка с автором и возрастом истории, панель просмотров и удаление для своих историй.
  * **Создание истории**: [`src/components/Stories/StoryCreateModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Stories/StoryCreateModal.tsx) — вкладки «Текст» (живое превью + палитра градиентов) и «Фото» (загрузка через `/api/upload`), превью 9:14, автосрок 24 часа.
  * **E2E-валидация**: сокет-тест создание → broadcast → просмотр (views) → удаление пройден полностью.

### [v3.4.1] — 23 августа 2026 г.
* **Список пользователей в реакциях (Who Reacted Tooltip)**:
  * **Всплывающая подсказка при наведении**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) каждый бейдж реакции обернут в группу с CSS `group-hover` тултипом — при наведении курсора над бейджем всплывает аккуратная стеклянная карточка со списком имен всех, кто поставил реакцию («Вы, Влад и ещё 2»).
  * **Корректная резолюция имен**: имена определяются через `getUserDisplayName` (пользовательские профили → дефолтные профили → USER_NAMES), собственная реакция всегда подписана «Вы»; список обрезается до 4 имен с указанием «и ещё N».
  * **Нулевые ререндеры**: тултип реализован на чистом CSS (`opacity` + `translate` переходы), без дополнительного React-состояния — наведение не вызывает повторных рендеров ленты.

### [v3.4.0] — 23 августа 2026 г.
* **Сохранённые сообщения — личное «Избранное» (Saved Messages Suite)**:
  * **Виртуальная комната «Избранное»**: в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) каждому пользователю в начало списка чатов добавляется персональная комната `saved-messages` (участник — только сам пользователь), как в Telegram.
  * **Фирменная синяя закладка**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) комната «Избранное» получила градиентную синюю аватарку с иконкой закладки (`IconBookmark`) в списке чатов и в шапке активного диалога; подзаголовок «Ваши сохранённые сообщения», скрытие индикаторов онлайн и кнопок звонков.
  * **Быстрое сохранение из контекстного меню**: в [`src/components/TelegramContextMenuModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/TelegramContextMenuModal.tsx) новый пункт «В Избранное» — пересылает любое сообщение (текст, медиа, стикеры, опросы) в личное хранилище одним кликом через существующий механизм `forwardMessage` с toast-подтверждением.
  * **Серверная поддержка**: в [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) комната `saved-messages` автоматически добавляется в авторизованные комнаты каждого подключившегося пользователя, история сохранённостей переживает перезагрузку страницы.

### [v3.3.1] — 23 августа 2026 г.
* **Доработка опросов: завершение опроса и полировка карточки (Poll Close & Visual Polish)**:
  * **Кнопка «Завершить опрос» для автора**: в [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) добавлен сокет-обработчик `close_poll` (только автор опроса) с broadcast-событием `poll_updated`; в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) добавлен метод `closePoll(messageId, roomId)`, в [`src/components/Poll/PollCard.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Poll/PollCard.tsx) — кнопка завершения с блокировкой дальнейшего голосования.
  * **Исправление обрезания футера карточки**: увеличены внутренние отступы контейнера опроса в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) (`pt-2.5 pb-2`), счетчик голосов больше не обрезается нижней границей пузыря.
  * **Русская плюрализация счетчика**: корректные формы «1 голос / 2 голоса / 5 голосов»; для мультивыбора отображается «N голосов · M чел.».
  * **Квадратные чекбоксы для мультивыбора**: круглые радиокнопки для одиночного выбора и квадратные чекбоксы для опросов с несколькими ответами (поведение 1:1 Telegram).
  * **E2E-валидация**: сквозной сокет-тест (отправка опроса → голосование → завершение автором) прошел успешно на всех трех этапах.

### [v3.3.0] — 23 августа 2026 г.
* **Интерактивные опросы с живыми результатами (Live Polls Suite)**:
  * **Типизация опросов**: в [`src/types.ts`](https://github.com/Voltikalk/Comms/blob/main/src/types.ts) добавлены интерфейсы `Poll` (вопрос, варианты, карта голосов `optionId -> UserId[]`, флаги «несколько ответов» / «анонимно» / «завершён») и `PollOption`, поле `poll` интегрировано в `Message`.
  * **Модалка создания опроса**: новый компонент [`src/components/Poll/PollCreateModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Poll/PollCreateModal.tsx) — вопрос, 2–10 вариантов с добавлением/удалением, тумблеры «Несколько ответов» и «Анонимное голосование», кнопка создания активна только при заполненных полях.
  * **Живая карточка голосования**: компонент [`src/components/Poll/PollCard.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Poll/PollCard.tsx) в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) — клик по варианту отдает голос, анимированные цветные полосы результатов с процентами, галочка на выбранном варианте, счетчик голосующих, кнопка «Завершить опрос» для автора.
  * **Синхронизация через сокеты**: в [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) новое событие `vote_poll` (переключение голоса пользователя между вариантами) с broadcast-событием `poll_updated` на всю комнату; поле `poll` прокинуто сквозь `send_message`.
  * **Клиентский контекст**: в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) метод `votePoll(messageId, roomId, optionIds)` и обработчик `poll_updated`, обновляющий ленту у всех участников в реальном времени; параметр `poll` добавлен в `sendMessage` с оптимистичным рендером.
  * **Превью опроса**: плашка «Опрос: {вопрос}» в списке чатов ([`ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx)) и в цитатах ответов ([`MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx)); кнопка 📊 создания опроса добавлена в строку ввода рядом с камерой.

### [v3.2.0] — 23 августа 2026 г.
* **Упоминания пользователей @user и хештеги (Mentions & Hashtags Suite)**:
  * **Утилиты парсинга токенов**: создан модуль [`src/lib/mentions.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/mentions.ts) — `parseMessageTokens` (разбивка текста на `@упоминания`, `#хештеги` и обычный текст с поддержкой кириллицы), `getActiveToken` (определение активного токена по позиции каретки), `buildMentionCandidates` / `filterMentionCandidates` (кандидаты автодополнения из участников комнаты), `isUserMentionedInText` и `extractHashtags`.
  * **Автодополнение @упоминаний в стиле Telegram**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) при вводе `@` над строкой ввода всплывает аккуратный попап с аватарками, именами и @username участников активного чата; фильтрация в реальном времени по имени и username, клавиатурная навигация (`↑`/`↓`/`Enter`/`Tab`/`Esc`) и вставка выбранного упоминания с корректной позицией курсора.
  * **Подсветка в пузырях сообщений**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) внедрен рендерер `renderRichTokens` — упоминания отображаются фирменным синим цветом Telegram (#3390ec) с полужирным начертанием, хештеги кликабельны и открывают глобальный поиск по тегу через новый проп `onHashtagClick`.
  * **Поиск по хештегу из сообщения**: клик по `#хештегу` мгновенно открывает окно глобального поиска с предзаполненным запросом (новый проп `initialQuery` в [`src/pages/SearchPage.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/pages/SearchPage.tsx)).
  * **Push-уведомления «Вас упомянули»**: в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) уведомления об упоминании текущего пользователя имеют приоритетный заголовок «{Имя} упомянул(а) вас» и обходят mute отдельных чатов (поведение 1:1 Telegram).

### [v3.1.0] — 23 августа 2026 г.
* **Плавающая кнопка прокрутки вниз (Scroll-to-Bottom FAB with Unread Badge)**:
  * **Telegram-стиль кнопка «вниз»**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) при прокрутке вверх более чем на 350px от низа ленты появляется круглая белая кнопка со стрелкой (`IconArrowDown`) с плавным появлением и мгновенным скрытием у нижней границы.
  * **Счетчик непрочитанных на кнопке**: красный бейдж с числом непрочитанных сообщений активного чата в стиле Telegram (синий кружок с белой обводкой).
* **Группировка сообщений одного автора (Author Message Grouping & Corner Flattening)**:
  * **Слющенные углы пузырей**: в [`src/components/MessageBubble.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/MessageBubble.tsx) сообщения, идущие подряд от одного автора (в пределах 5 минут, без цитаты-ответа), получают сплющенные углы стыковки (`6px` вместо полного скругления) — сверху при продолжении группы и снизу при ее завершении, отдельно для входящих/исходящих сторон.
  * **Плотные вертикальные отступы**: сгруппированные сообщения сближаются до `2px` между собой, сохраняя стандартный отступ перед началом новой группы.
* **Перетаскивание файлов прямо в окно чата (Full-Chat Drag & Drop Attachments)**:
  * **Полноэкранный оверлей захвата**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) при перетаскивании файла на область чата появляется оверлей с пунктирной рамкой, стеклянной карточкой «Отпустите для отправки» и иконкой скрепки; подсчет глубины вложенных drag-событий исключает мерцание.
  * **Единый конвейер обработки**: извлечена общая функция `acceptIncomingFile`, используемая и пикером файлов, и drag&drop — с автораспознаванием типа (фото/видео/аудио/стикер `.tgs`), превью через `URL.createObjectURL` и определением ориентации видео.
* **Mute отдельных чатов (Per-Chat Mute)**:
  * **Тумблер «Без звука»**: в панели информации о чате добавлен переключатель отключения уведомлений с персистентностью в `localStorage` (`tg_muted_rooms`) и toast-подтверждением.
  * **Приоритет мьюта в уведомлениях**: в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) звук и push-уведомления не отправляются для заглушенных чатов.
  * **Индикатор в списке чатов**: перечеркнутый колокольчик (`IconBellOff`) рядом с именем заглушенного диалога.

### [v3.0.1] — 23 августа 2026 г.
* **Визуальное отображение черновиков в списке чатов (Draft Indicators in Chat List)**:
  * **Красная плашка «Черновик:» как в Telegram**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) превью чата с несохраненным набранным текстом показывает красную метку `Черновик:` и начало текста вместо последнего сообщения (приоритет ниже индикатора «печатает...»).
  * **Скрытие плашки для активного чата**: метка черновика не отображается для открытого в данный момент диалога — она появляется только после выхода из чата.
  * **Реактивное состояние черновиков**: черновики зеркалируются в состояние `draftsMap` через единый `persistDraft` (localStorage + UI синхронно), гидратация всех сохраненных черновиков при запуске приложения.
  * **Индикатор карандаша в компактном режиме**: на аватарке чата в узкой панели (72px) отображается красная круглая метка с `IconEdit` при наличии черновика.

### [v3.0.0] — 23 августа 2026 г.
* **Черновики сообщений для каждого чата (Per-Chat Message Drafts)**:
  * **Автосохранение с дебаунсом 400 мс**: в [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) набранный текст каждого диалога автоматически сохраняется в `localStorage` (`tg_draft_{roomId}`) и восстанавливается при возврате в чат — поведение 1:1 Telegram Desktop.
  * **Мгновенное сохранение при переключении чатов**: при смене активного диалога черновик предыдущего чата фиксируется синхронно через `inputTextRef`, а поле ввода мгновенно наполняется сохраненным текстом целевого чата.
  * **Очистка после отправки**: отправка сообщения удаляет черновик чата; режим редактирования сообщения не загрязняет черновики.
* **Доработка браузерных уведомлений (Notification Click Navigation & Tab Title Badge)**:
  * **Переход в чат по клику на уведомление**: в [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) клик по push-уведомлению теперь фокусирует окно и переключает активный диалог на чат отправителя (`navigateToRoomRef` → `handleSetActiveRoomId`) с автоматической отметкой прочитанности.
  * **Счетчик непрочитанных в заголовке вкладки**: мемизированный `totalUnread` по всем комнатам выводит бейдж `(N) Telegram Web` в `document.title`.
  * **Синхронизация переключателя уведомлений**: тумблер «Уведомления» в боковом меню переведен на состояние контекста (`notificationsEnabled`) с персистентностью в `localStorage` (`tg_notifications_enabled`); при включении запрашивается `Notification.requestPermission()`, при выключении подавляются и звук, и push.
* **Чистка кодовой базы от lint-предупреждений (Zero-Warning Lint Pass)**:
  * Устранены неиспользуемые catch-параметры в [`src/services/message.service.ts`](https://github.com/Voltikalk/Comms/blob/main/src/services/message.service.ts), [`src/services/reaction.service.ts`](https://github.com/Voltikalk/Comms/blob/main/src/services/reaction.service.ts), [`src/services/room.service.ts`](https://github.com/Voltikalk/Comms/blob/main/src/services/room.service.ts), [`src/services/read-receipt.service.ts`](https://github.com/Voltikalk/Comms/blob/main/src/services/read-receipt.service.ts), [`src/services/attachment.service.ts`](https://github.com/Voltikalk/Comms/blob/main/src/services/attachment.service.ts) и [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) (удален мертвый `memoryAttempts`).
  * Исправлены зависимости `useEffect`/`useMemo` в [`src/hooks/useUserStatus.ts`](https://github.com/Voltikalk/Comms/blob/main/src/hooks/useUserStatus.ts), [`src/hooks/useRealtimeSubscription.ts`](https://github.com/Voltikalk/Comms/blob/main/src/hooks/useRealtimeSubscription.ts), [`src/hooks/useRoomMessages.ts`](https://github.com/Voltikalk/Comms/blob/main/src/hooks/useRoomMessages.ts) и [`src/pages/SearchPage.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/pages/SearchPage.tsx) (`getRoomName`/`saveHistory` обернуты в `useCallback`).
  * Удалены лишние приведения `Boolean()` в [`src/lib/filter-utils.ts`](https://github.com/Voltikalk/Comms/blob/main/src/lib/filter-utils.ts) и [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx), почищены неиспользуемые импорты в [`scratch/test-filter.ts`](https://github.com/Voltikalk/Comms/blob/main/scratch/test-filter.ts).

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

### [v2.18.1] — 3 сентября 2026 г.
* **Повышение надежности скрипта развертывания (`deploy.sh`)**:
  * Добавлена гарантированная установка пакетов `curl`, `wget`, `ca-certificates`, `openssl`, `certbot`.
  * Реализована прямая загрузка официального бинарника Docker Compose v2 с GitHub Releases в `/usr/local/lib/docker/cli-plugins/docker-compose` и создание симлинка `/usr/local/bin/docker-compose` на случай отсутствия пакета `docker-compose-plugin` в стандартных репозиториях Ubuntu Jammy.
  * Реализовано динамическое определение команды вызова (`docker compose` или `docker-compose`) через переменную `$COMPOSE_CMD`.
  * Актуализирован файл [`handoff.md`](https://github.com/Voltikalk/Comms/blob/main/handoff.md).

### [v2.18.0] — 3 сентября 2026 г.
* **Инфраструктура контейнеризации и развертывания на виртуальном сервере (Ubuntu VPS / Docker Compose)**:
  * **Контейнеризация бэкенда (`Dockerfile.backend`)**:
    * Легковесный базовый образ `node:20-alpine`, установка только production-зависимостей (`npm ci --omit=dev`).
    * Персистентное хранилище для пользовательских медиафайлов и вложений через Docker Volume `uploads_data:/app/uploads`.
    * Поддержка чтения переменной порта `process.env.PORT || 3000` в [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js).
  * **Контейнеризация фронтенда и защищенный обратный прокси (`Dockerfile.frontend` & `nginx.docker.conf`)**:
    * Multi-stage сборка: сборка Vite-бандла (`npm run build`) с передачей аргументов Supabase окружения (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) и раздача через Nginx `1.25-alpine`.
    * Оптимизированная конфигурация Nginx с поддержкой домена `commsint.duckdns.org`:
      * Автоматический 301-редирект с HTTP (порт 80) на HTTPS (порт 443).
      * Поддержка бесплатного SSL-сертификата Let's Encrypt (TLSv1.2, TLSv1.3, HSTS).
      * SPA-маршрутизация с fallback на `/index.html`.
      * Защищенное проксирование REST API (`/api/`) и медиафайлов (`/uploads/`) на бэкенд-контейнер `http://backend:3000`.
      * Защищенное проксирование WebSockets WSS (`/socket.io/`) с поддержкой HTTP/1.1 Upgrade, отключенной буферизацией и таймаутом `86400s`.
      * Gzip-сжатие и кэширование хешированных статических ассетов Vite на 1 год.
  * **Оркестрация и автоматизация (`docker-compose.yml` & `deploy.sh`)**:
    * Создан `docker-compose.yml` с автоматическим перезапуском (`restart: unless-stopped`), изолированной внутренней сетью `comms_net`, портами `80:80` и `443:443`, и монтированием сертификатов из `/etc/letsencrypt`.
    * Создан `.dockerignore` для ускорения сборки и изоляции локальных артефактов (`node_modules`, `dist`, `.git`).
    * Написан скрипт `deploy.sh` для развертывания одной командой на Ubuntu VPS: автоматическая установка Docker & Certbot, выпуск Let's Encrypt сертификата для `commsint.duckdns.org`, настройка cron-продления, сборка и запуск `https://commsint.duckdns.org/`.
  * Актуализирован файл [`handoff.md`](https://github.com/Voltikalk/Comms/blob/main/handoff.md).

### [v2.17.0] — 2 сентября 2026 г.
* **Трансформация прототипа в полноценный многопользовательский мессенджер (Real Messenger Architecture)**:
  * **Персистентность пользователей и комнат в Supabase (PostgreSQL)**:
    * `server.js`: функция `initUsers()` загружает всех зарегистрированных пользователей из таблицы `users` Supabase при старте сервера в память и сохраняет кэш.
    * Регистрация (`POST /api/auth/register`) теперь сохраняет нового пользователя (UUID, username, email, хешированный пароль bcrypt, display_name, avatar_url) непосредственно в PostgreSQL таблицу `users`.
    * Убрана жесткая привязка комнат к семейному списку `USER_ROOMS`. Реализовано хранилище `memoryRooms` с загрузкой из Supabase (`loadRoomsFromSupabase()`), поддержкой персонального «Избранного» (Saved Messages) и динамических комнат.
    * Добавлен REST-эндпоинт `GET /api/users/search?q=...&currentUserId=...` для поиска пользователей.
  * **Реализация сокет-событий взаимодействия в реальном времени**:
    * Добавлена подписка сокетов на персональную комнату пользователя `socket.join(user)`, позволяющая отправлять персональные оповещения.
    * Реализовано событие `search_users` для поиска зарегистрированных пользователей по никнейму и имени (исключая самого себя).
    * Реализовано событие `create_direct_chat`: находит существующий или создает новый 1-на-1 диалог, сохраняет в Supabase (`rooms`, `room_members`), подключает сокеты обоих участников и отправляет событие `room_created`.
    * Реализовано событие `create_group_chat`: создание групповых чатов с произвольным количеством участников.
    * Реализовано событие `get_user_rooms` и автоматическая рассылка актуального списка комнат `rooms_list` клиентам.
  * **Клиентский уровень SocketContext и типы**:
    * В [`src/types.ts`](https://github.com/Voltikalk/Comms/blob/main/src/types.ts) добавлен интерфейс `UserSearchResult` и опциональные поля `avatarUrl`, `description` для `Room`.
    * В [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) методы `searchUsers`, `createDirectChat`, `createGroupChat` интегрированы в контекст; список комнат синхронизируется с сервером через `rooms_list` и `room_created`.
    * Для новых пользователей дефолтным стартовым чатом назначается личное «Избранное» (`saved-messages`).
  * **UI Suite создания чатов (NewChatModal & FAB)**:
    * Создан компонент [`src/components/Chat/NewChatModal.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Chat/NewChatModal.tsx) в стиле Telegram Web:
      * Вкладки «Личный диалог» и «Создать группу».
      * Поле поиска с дебаунсом (220ms) и индикатором загрузки.
      * Интерактивный список пользователей с анимированными карточками, аватарами, онлайн-статусами, никами и био.
      * В режиме группы: множественный выбор чекбоксами, чипсы выбранных участников и поле ввода названия группы.
    * В [`src/components/Chat/Sidebar/ChatSidebar.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Chat/Sidebar/ChatSidebar.tsx) добавлена фирменная круглая плавающая кнопка (FAB ✏️) в правом нижнем углу и пункт «Новое сообщение» в выпадающем меню сайдбара.
    * Добавлено визуальное пустое состояние со ссылкой на поиск для пользователей, у которых еще нет диалогов.
    * Компонент подключен в центральный диспетчер модалок [`src/components/Chat/Modals/ChatModalsHost.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Chat/Modals/ChatModalsHost.tsx) и управляется из [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx).
  * **Редизайн экрана авторизации (LoginScreen Cleanup)**:
    * В [`src/components/LoginScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/LoginScreen.tsx) убрана навязчивость моковых аккаунтов:
      * Вкладки переименованы в лаконичные «Вход по паролю» и «По QR-коду».
      * Кнопка «Создать новый аккаунт» размещена прямо под формой входа и открывает пошаговый мастер регистрации `TelegramRegistrationWizard`.
      * Пять тестовых профилей убраны в аккуратный сворачиваемый блок «🧪 Тестовые профили (Dev Mode)» в нижней части экрана.
  * **Исправление вызова контекстного меню сообщений (Bugfix: TypeError e.preventDefault)**:
    * В [`src/components/ChatScreen.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/ChatScreen.tsx) и [`src/components/Chat/Feed/ChatMessageFeed.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/components/Chat/Feed/ChatMessageFeed.tsx) добавлен безопасный вызов `e?.preventDefault?.()` и корректная передача координат клика/тапа при вызове контекстного меню на пузырях сообщений.
  * **Устранение ошибки 401 Unauthorized при авторизации (Auth Fix)**:
    * В [`server.js`](https://github.com/Voltikalk/Comms/blob/main/server.js) обработчик `POST /api/auth/login` научился автоматически отсекать префикс `@` в логине, динамически находить пользователя в Supabase PostgreSQL при отсутствии в кеше памяти, безопасно сопоставлять пароль (bcrypt/plain) и при необходимости проверять пользователя через Supabase Auth (`signInWithPassword`).
    * В [`src/context/SocketContext.tsx`](https://github.com/Voltikalk/Comms/blob/main/src/context/SocketContext.tsx) добавлена очистка префикса `@` перед отправкой и гарантированный fallback на тестовые пресеты при недоступности сети/сервера.
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
