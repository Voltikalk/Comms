# 🚀 Secure Comms — Architecture & Design System Master Guide

> **Telegram Web Replica / Ultra-Premium Real-Time Messenger**  
> Стек: **React 19 / Vite**, **TypeScript**, **Tailwind CSS**, **Ultra-Fast Full-Text Search UI Suite (FTS / Debounced SearchBar / Advanced Filters / Animated Cards / History / Stats)**, **Framer Motion, GSAP, AOS & Lottie**, **Storybook**, **Node.js / Express**, **Socket.io / WebSocket**, **WebRTC**, **JWT & Bcrypt**.

---

## 📋 Содержание
1. [Обзор проекта и текущая стадия](#-обзор-проекта-и-текущая-стадия)
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

### 📌 Текущая стадия разработки (Status: Phase 32 — Full Video Player Controls Suite Complete):
* ✅ **Video Player Modular Controls Suite (NEW)**:
  * [`src/components/VideoPlayer/Controls/PlayPauseButton.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/PlayPauseButton.tsx) (кнопка воспроизведения/паузы, пульс-анимация при клике, хоткеи Space/K, большая иконка по центру видео при паузе).
  * [`src/components/VideoPlayer/Controls/ProgressBar.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/ProgressBar.tsx) (интерактивный скраббер таймлайна, drag-to-seek с поддержкой тач-событий, буферизованная и просмотренная полосы, hover-тултип с временной меткой).
  * [`src/components/VideoPlayer/Controls/TimeDisplay.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/TimeDisplay.tsx) (форматирование `MM:SS` / `HH:MM:SS`, клик для переключения на оставшееся время `-MM:SS`).
  * [`src/components/VideoPlayer/Controls/VolumeControl.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/VolumeControl.tsx) (4 стадии иконки громкости, всплывающий ползунок 0–100%, запоминание громкости при Mute, хоткеи M и `↑`/`↓`).
  * [`src/components/VideoPlayer/Controls/FullscreenButton.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/FullscreenButton.tsx) (HTML5 Fullscreen API + iOS WebKit, хоткей F).
  * [`src/components/VideoPlayer/Controls/SettingsMenu.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/SettingsMenu.tsx) (всплывающее меню настроек: скорость 0.5x–2x, качество 360p–1080p/Auto, панель технической статистики, сохранение в localStorage).
  * [`src/components/VideoPlayer/Controls/PictureInPictureButton.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/PictureInPictureButton.tsx) (режим «Картинка в картинке», хоткей P).
  * [`src/components/VideoPlayer/Controls/SubtitlesButton.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/SubtitlesButton.tsx) (выбор дорожек субтитров VTT, включение/выключение).
  * [`src/components/VideoPlayer/Controls/ControlBar.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/ControlBar.tsx) (мастер-оверлей с плавным градиентным затемнением, скрытием через 3 сек, быстрым скраббингом ±10 сек и театральным режимом).

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
    ├── components/
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
    │   ├── UserProfile/                       # Редактирование профиля и аватарки
    │   ├── RoomMembers/                       # Список участников комнаты и роли
    │   ├── FileUploadInput.tsx                # Drag-and-drop компонент загрузки
    │   ├── ui/                                # Button, Input, Card, LoadingSpinner
    │   ├── ChatScreen.tsx                     # Главный экран чата Telegram
    │   ├── MessageBubble.tsx                  # Пузырь сообщения (текст, медиа, аудио, кружки)
    │   ├── ProfileEditModal.tsx               # Модальное окно редактирования профиля Telegram
    │   ├── TelegramContextMenuModal.tsx       # Контекстное меню сообщения
    │   ├── TelegramEmojiPickerModal.tsx       # Палитра анимированных эмодзи и реакций
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

---

### [v2.20.0] — 17 августа 2026 г.
* **Автоматическое распознавание вертикальных и горизонтальных видео (Dynamic Aspect Ratio & Orientation Detection)**:
  * **Определение соотношения сторон в видеоплеере**: в [`src/types/video-player.types.ts`](file:///c:/Users/Drilla/Desktop/Comms/src/types/video-player.types.ts), [`src/components/VideoPlayer/VideoPlayerContext.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/VideoPlayerContext.tsx) и [`src/components/VideoPlayer/VideoPlayer.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/VideoPlayer.tsx) добавлен метод `updateDimensions(width, height)` и колбэки `onOrientationChange` / `onAspectRatioChange`. Плеер автоматически определяет ориентацию (`vertical` при соотношении < 0.85, `horizontal` при > 1.15, иначе `square`).
  * **Адаптивные размеры карточки сообщения в чате**: в [`src/components/MessageBubble.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/MessageBubble.tsx) жесткий класс `aspect-video` заменен на динамическое соотношение сторон `aspectRatio: videoAspectRatio`:
    * Для вертикальных видео (9:16 / Reels / Shorts / Stories) контейнер принимает портретные пропорции с ограничением ширины (`max-w-[220px] xs:max-w-[250px] sm:max-w-[270px]`) и высоты до `420px`, убирая черные полосы по бокам.
    * Для горизонтальных видео (16:9 / 4:3) сохраняются ландшафтные размеры (`max-w-[280px] xs:max-w-[320px] sm:max-w-[360px]`).
  * **Предпросмотр при выборе файла**: в [`src/components/ChatScreen.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/ChatScreen.tsx) при выборе видеофайла его ориентация мгновенно считывается через прелоадер метаданных, а на панели прикрепления отображается миниатюра видео с бейджем разрешения (`9:16` / `16:9` / `📱 Вертикальное`).

### [v2.19.0] — 17 августа 2026 г.
* **Исправление позиционирования контролов видеоплеера и залипания индикатора загрузки на 100% (Player Controls Alignment & Upload Spinner Fixes)**:
  * **Исправление вертикального позиционирования контролов видеоплеера и оптическое центрирование**:
    * В [`src/components/VideoPlayer/Controls/ControlBar.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/ControlBar.tsx) устранена проблема, из-за которой панель контролов (таймлайн, громкость, время, настройки) сдвигалась в верхнюю/среднюю часть видео. Добавлен `mt-auto w-full` и корректный верхний плейсхолдер для `flex-col justify-between`, что гарантирует строгое прижатие нижней панели контролов и градиента к нижнему краю видео.
    * Большая центральная кнопка Play переведена на оптическое центрирование (`top-[42%] sm:top-[44%]` в обычном режиме сообщений и `top-1/2` в полноэкранном), что устранило зрительный перекос вниз к нижней панели перемотки и обеспечило гармоничные зазоры.
    * В [`src/components/VideoPlayer/Controls/ProgressBar.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/ProgressBar.tsx) добавлено ограничение отображения hover-тултипа времени (`duration > 0` и clamp отступов 8%–92%), исключая появление тултипа `0:00` за пределами видео.
    * В [`src/components/VideoPlayer/VideoPlayer.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/VideoPlayer.tsx) добавлен класс `.comms-video-player-container` и атрибут `controls={false}`.
  * **Устранение залипания кольца загрузки на 100% (Upload Progress Fix)**:
    * В [`src/context/SocketContext.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/context/SocketContext.tsx) в функции `sendMessage` при наступлении события `xhr.onload` и в блоке `catch` теперь мгновенно сбрасываются флаги `isUploading: false` и `uploadProgress: undefined` в локальном состоянии `messages`, а также в функции `sanitizeMessage`.
    * В [`src/components/MessageBubble.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/MessageBubble.tsx) для видео, кружков, фото, аудио и файлов проверка отображения спиннера загрузки обновлена: кольцо `CircularProgress` отображается строго при `isUploading && (uploadProgress === undefined || uploadProgress < 100)`, мгновенно исчезая при достижении 100% или завершении передачи.

### [v2.18.0] — 17 августа 2026 г.
* **Исправление распознавания аудио и очистка информации о названии (Voice Notes & Clean Media UI Fix)**:
  * **Разделение голосовых сообщений и видео**: в [`src/components/MessageBubble.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/MessageBubble.tsx) исправлена логика классификации файлов. Аудиозаписи формата `.webm` (записываемые через браузерный MediaRecorder) и файлы с префиксом `Голосовое сообщение` теперь строго определяются как `isAudioFile` и отображаются только в виде синего аудиоплеера с динамической волной спектра (waveform), исключая ложное открытие в видеоплеере.
  * **Удаление лишних названий файлов сверху и снизу**:
    * В [`MessageBubble.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/MessageBubble.tsx) удален нижний текстовый блок с техническим именем файла под видео, оставлена только аккуратная метка времени отправки (в стиле Telegram).
    * В [`ControlBar.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/ControlBar.tsx) верхний градиентный баннер с названием скрыт в компактном режиме сообщений и отображается исключительно в полноэкранном режиме (`isFullscreen && props.title`).
* **Адаптация видеоплеера под мобильные экраны и исправление центрирования (Mobile UI & Alignment Fixes)**:
  * **Идеальное абсолютное центрирование кнопки воспроизведения**: в [`src/components/VideoPlayer/Controls/ControlBar.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/ControlBar.tsx) большая круглая кнопка Play переведена на абсолютное позиционирование `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`, что гарантирует ее нахождение ровно в центре прямоугольника видео независимо от высоты нижней панели контролов.
  * **Оптимизация мобильного интерфейса**:
    * Очищена нижняя панель контролов от перегруженных элементов (убраны лишние дублирующие кнопки в компактном режиме).
    * Блок громкости переведен в быстрый тач-режим (одно касание мгновенно включает/выключает звук без застревания выдвижного ползунка на экранах смартфонов).
    * Таймлайн оптимизирован для мобильных тач-событий (`touches`/`changedTouches`), обеспечивая 100% плавную перемотку пальцем.
    * Размеры видео-контейнера в сообщениях адаптированы под ширину мобильных экранов (`max-w-[280px]` на узких и `max-w-[360px]` на планшетах/десктопе).
* **Интеграция кастомного видеоплеера в пузыри сообщений (MessageBubble Integration)**:
  * В [`src/components/MessageBubble.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/MessageBubble.tsx) стандартный HTML5 `<video controls>` полностью заменен на кастомный компонент `<VideoPlayer />` со всеми контролами (Play/Pause, скраббер с подсказкой времени, громкость со слайдером, полноэкранный режим, PiP, меню скорости/качества).
  * Добавлено автораспознавание видеофайлов по расширениям `.mp4`, `.mov`, `.webm`, `.mkv`, `.avi` для мгновенного рендеринга плеера.
* **Реализован полный модульный набор контролов видеоплеера (Video Player Controls Suite)**:
  * [`src/components/VideoPlayer/Controls/PlayPauseButton.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/PlayPauseButton.tsx) — кнопка Play/Pause с пульс-эффектом и ARIA-метками.
  * [`src/components/VideoPlayer/Controls/ProgressBar.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/ProgressBar.tsx) — интерактивный таймлайн с drag-to-seek, отображением буферизации, текущего прогресса и hover-тултипом времени.
  * [`src/components/VideoPlayer/Controls/TimeDisplay.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/TimeDisplay.tsx) — блок отображения времени с переключением оставшегося времени по клику.
  * [`src/components/VideoPlayer/Controls/VolumeControl.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/VolumeControl.tsx) — блок громкости с 4 динамическими стадиями иконки, слайдером 0-100% и запоминанием уровня при Mute.
  * [`src/components/VideoPlayer/Controls/FullscreenButton.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/FullscreenButton.tsx) — кнопка переключения полноэкранного режима с поддержкой WebKit.
  * [`src/components/VideoPlayer/Controls/SettingsMenu.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/SettingsMenu.tsx) — всплывающее меню настроек: скорость (0.5x–2x), качество (360p–1080p, Auto), техническая статистика, сохранение в localStorage.
  * [`src/components/VideoPlayer/Controls/PictureInPictureButton.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/PictureInPictureButton.tsx) — кнопка Picture-in-Picture.
  * [`src/components/VideoPlayer/Controls/SubtitlesButton.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/SubtitlesButton.tsx) — меню выбора и переключения субтитров VTT.
  * [`src/components/VideoPlayer/Controls/ControlBar.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/ControlBar.tsx) — мастер-панель управления с градиентными оверлеями, автоскрытием через 3 секунды, быстрой перемоткой ±10 сек и театральным режимом (T).
  * [`src/components/VideoPlayer/Controls/index.ts`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/Controls/index.ts) — точка экспорта всех компонентов контролов.
  * Актуализирован файл [`handoff.md`](file:///c:/Users/Drilla/Desktop/Comms/handoff.md).

### [v2.17.0] — 17 августа 2026 г.
* **Добавлена архитектура кастомного видеоплеера (Custom Video Player Suite)**:
  * [`src/types/video-player.types.ts`](file:///c:/Users/Drilla/Desktop/Comms/src/types/video-player.types.ts) — полная типизация видеоплеера: `VideoPlayerProps`, `VideoPlayerState`, `VideoPlayerActions`, `PlaybackState`, `VideoQuality`, `Subtitle`, `PlayerTheme`.
  * [`src/styles/video-player.css`](file:///c:/Users/Drilla/Desktop/Comms/src/styles/video-player.css) — стили видеоплеера (Glassmorphism, темная тема по умолчанию, верхний и нижний градиентный scrim overlay, скраббер таймлайна с hover-подсказкой времени, всплывающее меню настроек).
  * [`src/components/VideoPlayer/VideoPlayerContext.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/VideoPlayerContext.tsx) — React Context и Provider для глобального управления состоянием плеера, таймер автоскрытия контролов, глобальные горячие клавиши (Space/K/F/M/P/ArrowLeft/ArrowRight), поддержка Fullscreen API и Picture-in-Picture API.
  * [`src/hooks/useVideoPlayer.ts`](file:///c:/Users/Drilla/Desktop/Comms/src/hooks/useVideoPlayer.ts) — кастомный React-хук для взаимодействия с плеером и форматирования времени (`hh:mm:ss`).
  * [`src/components/VideoPlayer/VideoPlayer.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/VideoPlayer.tsx) — главный компонент с модульными подкомпонентами (`VideoElement`, `VideoTimeline`, `VideoSettingsMenu`, `VideoControlsOverlay`, `VideoFeedbackOverlay`).
  * [`src/components/VideoPlayer/index.ts`](file:///c:/Users/Drilla/Desktop/Comms/src/components/VideoPlayer/index.ts) — точка входа и экспорта модуля.
  * Актуализирован файл [`handoff.md`](file:///c:/Users/Drilla/Desktop/Comms/handoff.md).

### [v2.16.0] — 17 августа 2026 г.
* **Редизайн и полная адаптация UI/UX под мобильные телефоны и Telegram-стилистику**:
  * **Исправлен поиск во всех чатах (Global Search Fix)**:
    * Экран поиска [`src/pages/SearchPage.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/pages/SearchPage.tsx) подключен к реальному массиву всех сообщений приложения (`allMessages`), комнатам и профилям пользователей из [`SocketContext.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/context/SocketContext.tsx).
    * Реализован мгновенный полнотекстовый поиск с подсветкой совпадений по тексту сообщений, именам прикрепленных файлов и именам отправителей.
    * Добавлен переключатель области поиска: `🌐 Везде` (поиск по всем диалогам и группам) и `💬 В этом чате`.
    * При клике на найденное сообщение из другого чата приложение автоматически переключает активный диалог (`setActiveRoomId`) и плавно скроллит к найденному сообщению с анимацией подсветки.
  * **Исправлен сдвиг интерфейса и горизонтальный перелив на мобильных (Horizontal Overflow Fix)**:
    * Устранен баг, из-за которого правый край чата, кнопка «Отмена», сообщения и кнопка отправки уезжали за пределы экрана телефона.
    * Добавлены строгие ограничения ширины `min-w-0`, `w-full`, `max-w-full` и `overflow-x-hidden` для главного контейнера `<main>`, шапки поиска, свайп-бара фильтров, ленты сообщений и нижней панели ввода.
    * В `MessageBubble.tsx` убраны отрицательные отступы `-mx-4`, пузыри сообщений ограничены до `max-w-[85%]` на мобильных.
    * Окно глобального поиска разворачивается **на весь экран** (`fixed inset-0 w-full h-full`) без посторонних черных рамок и плавающих окон.
    * Цветовая палитра полностью синхронизирована с дизайн-системой приложения (фон `#0e1621` / `#17212b`, поля ввода `#242f3d`, акцентный цвет `#3390ec`).
  * Актуализирован файл [`handoff.md`](file:///c:/Users/Drilla/Desktop/Comms/handoff.md).

### [v2.15.0] — 17 августа 2026 г.
* **Добавлено**:
  * Реализована комплексная система фильтрации и сортировки сообщений:
    * [`src/lib/filter-utils.ts`](file:///c:/Users/Drilla/Desktop/Comms/src/lib/filter-utils.ts) — функции фильтрации `applyFilters`, сортировки по дате/релевантности/реакциям/времени правки, построитель SQL-запросов `buildFilterQuery`, валидатор `validateFilters`, пресеты и экспорт в CSV/JSON.
    * [`src/services/message-filter.service.ts`](file:///c:/Users/Drilla/Desktop/Comms/src/services/message-filter.service.ts) — сервис многокритериальной фильтрации сообщений с кэшированием, пагинацией и валидацией сущностей.
    * [`src/hooks/useMessageFilter.ts`](file:///c:/Users/Drilla/Desktop/Comms/src/hooks/useMessageFilter.ts) — React-хук для управления состоянием фильтров, сортировкой, пресетами и экспортом.
    * [`src/components/Search/FilterPanel.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Search/FilterPanel.tsx) — панель фильтрации (выбор дат, отправителей, категорий файлов, флагов).
    * [`src/components/Search/DateRangePicker.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/Search/DateRangePicker.tsx) — компонент выбора периода дат с пресетами и валидацией.
    * Полный редизайн поиска в шапке чата [`src/components/ChatScreen.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/ChatScreen.tsx).
  * Актуализирован файл [`handoff.md`](file:///c:/Users/Drilla/Desktop/Comms/handoff.md).

### [v2.14.0] — 17 августа 2026 г.
* **Добавлено**:
  * Создана библиотека UI-компонентов поиска сообщений (Search UI Suite).

---

*Документ актуален и поддерживается в ходе разработки.* 🚀
