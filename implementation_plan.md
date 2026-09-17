# 🛠️ Архитектурный рефакторинг и очистка кодовой базы Secure Comms (Phase 60)

В ходе комплексного аудита кодовой базы выявлены технический долг, дублирующиеся архитектурные слои, устаревший неиспользуемый код (dead code), потенциальный сбой CORS в Socket.io для локальных и мобильных подключений, а также перегруженность компонента `ChatScreen.tsx` (2 618 строк).

Данный план описывает пошаговый рефакторинг, устранение всех найденных проблем, модульную декомпозицию и приведение документации в `handoff.md` в строгое соответствие с правилом проекта.

---

## 🔍 Выявленные проблемы ("Что тут не так"):

1. **Мертвый legacy-стек Mongoose & MongoDB**:
   - В каталоге `src/models/` лежат файлы `User.ts`, `Session.ts`, `LoginAttempt.ts`, `index.ts`, а в `src/config/` — `database.ts`.
   - В `package.json` установлена тяжелая зависимость `mongoose`.
   - **Факт**: проект полностью работает на **Supabase (PostgreSQL) + in-memory cache** и ни в одном месте не использует Mongoose/MongoDB. Присутствие серверных моделей Mongoose в клиентской папке `src/` — критический архитектурный антипаттерн.

2. **Заброшенный дублирующий стек авторизации**:
   - В `src/pages/` остался `LoginPage.tsx`, использующий `src/hooks/useAuth.ts`, `src/context/AuthContext.tsx` и `src/services/supabase-auth.service.ts`.
   - **Факт**: в приложении (`App.tsx`) используется единый рабочий стек `src/components/LoginScreen.tsx` + `SocketContext.tsx` + `src/services/auth.service.ts`. Старый `LoginPage.tsx` не подключен в роутинг и не используется.

3. **Неиспользуемая серверная утилита в клиентском каталоге**:
   - Файл `src/utils/token.utils.ts` импортирует Node.js-модули `crypto` и `jsonwebtoken`, но не используется ни одним файлом (сервер `server.js` имеет собственную встроенную реализацию работы с JWT).

4. **Асинхронное расхождение CORS в `server.js` (Socket.io vs Express)**:
   - В `server.js` настроена функция `isOriginAllowed()`, проверяющая динамические порты localhost, LAN-адреса (`192.168.*`) и домены (`*.duckdns.org`).
   - Однако при создании `new Server(httpServer, { cors: { origin: ALLOWED_ORIGINS } })` передан фиксированный массив `ALLOWED_ORIGINS`.
   - **Следствие**: при подключении с мобильного телефона по Wi-Fi (`http://192.168.0.x:5173`) или порта `5174` Socket.io блокирует соединение на уровне Engine.IO CORS до запуска `io.use()`.

5. **Остаточный God-компонент `ChatScreen.tsx` (2 618 строк)**:
   - Несмотря на декомпозицию в Phase 50, компонент по-прежнему содержит более 500 строк низкоуровневой логики работы с MediaRecorder (запись аудио, спектрограмма Web Audio API, жесты отмены свайпом, блокировка записи) и видео-кружков.
   - Эту логику необходимо вынести в изолированные хуки:
     - `src/hooks/useVoiceRecording.ts`
     - `src/hooks/useVideoNoteRecording.ts`
     - `src/hooks/useChatInteractions.ts` (действия со списком сообщений: ответ, редактирование, закрепление, удаление через эффект распада Таноса).

6. **Предупреждения Fast Refresh в Oxlint**:
   - 6 файлов экспортируют компоненты вместе с утилитами или хуками (`skiper26.tsx`, `StoriesContext.tsx`, `VideoPlayerContext.tsx`, `markdown-parser.tsx`, `PlatformContext.tsx`), нарушая Fast Refresh в Vite.

7. **Небезопасные дефолтные токены в `docker-compose.yml`**:
   - В файле присутствуют hardcoded default ключи Supabase вместо обязательного использования переменных из `.env`.

---

## User Review Required

> [!NOTE]
> Удаление мертвого кода (`src/models/`, `src/config/database.ts`, `src/pages/LoginPage.tsx`, `src/context/AuthContext.tsx`, `src/services/supabase-auth.service.ts`, `src/utils/token.utils.ts` и `mongoose`) уменьшит размер `node_modules` и устранит риск случайного импорта серверных библиотек в клиентский бандл.
> Все существующие 121 юнит-тест Vitest и сборка Vite продолжат стабильно работать (100% pass).

---

## Proposed Changes

### 1. Очистка мертвого кода и удаление `mongoose`

#### [DELETE] `src/config/database.ts`
#### [DELETE] `src/models/User.ts`
#### [DELETE] `src/models/Session.ts`
#### [DELETE] `src/models/LoginAttempt.ts`
#### [DELETE] `src/models/index.ts`
#### [DELETE] `src/pages/LoginPage.tsx`
#### [DELETE] `src/hooks/useAuth.ts`
#### [DELETE] `src/context/AuthContext.tsx`
#### [DELETE] `src/services/supabase-auth.service.ts`
#### [DELETE] `src/utils/token.utils.ts`

#### [MODIFY] [package.json](file:///c:/Users/Drilla/Desktop/Comms/package.json)
- Удалить зависимость `"mongoose": "^9.9.2"`.

---

### 2. Серверная надежность и CORS

#### [MODIFY] [server.js](file:///c:/Users/Drilla/Desktop/Comms/server.js)
- Обновить конфигурацию `io` в `new Server(httpServer, { cors: { origin: ... } })`:
  Заменить фиксированный массив `ALLOWED_ORIGINS` на функцию-валидатор `(origin, callback) => callback(null, !origin || isOriginAllowed(origin))` для корректной поддержки мобильных клиентов в локальной сети (`192.168.*`) и альтернативных портов разработки.

---

### 3. Декомпозиция `ChatScreen.tsx` на чистые хуки

#### [NEW] [useVoiceRecording.ts](file:///c:/Users/Drilla/Desktop/Comms/src/hooks/useVoiceRecording.ts)
- Инкапсулировать состояние записи аудио: `isRecording`, `isVoiceLocked`, `isVoicePaused`, `recordTime`, `liveVolumeLevels`, `voiceDragOffset`, `recordedVoicePreview`.
- Логика MediaRecorder, Web Audio API analyser, нормализация волны и обработка свайпа (отмена влево, блокировка вверх).

#### [NEW] [useVideoNoteRecording.ts](file:///c:/Users/Drilla/Desktop/Comms/src/hooks/useVideoNoteRecording.ts)
- Инкапсулировать состояние круговых видео-сообщений: `isRecordingVideo`, `videoRecordTime`, `videoPreviewRef`, переключение камеры, сохранение и конвертация в Blob.

#### [NEW] [useChatInteractions.ts](file:///c:/Users/Drilla/Desktop/Comms/src/hooks/useChatInteractions.ts)
- Инкапсулировать состояние интеракций: `replyingToMessage`, `editingMessage`, `pinnedMessages`, `contextMenuTarget`, анимированное удаление через `triggerTelegramDisintegrate()`.

#### [MODIFY] [ChatScreen.tsx](file:///c:/Users/Drilla/Desktop/Comms/src/components/ChatScreen.tsx)
- Подключить новые хуки, устранить дублирование логики и сократить объем файла на 600+ строк, сделав компонент чистым координатором.

---

### 4. Исправление Fast Refresh и разделение компонентов/утилит

#### [MODIFY] [src/components/ui/skiper26.tsx](file:///c:/Users/Drilla/Desktop/Comms/src/components/ui/skiper26.tsx)
- Вынести вспомогательную функцию `createAnimation` во вспомогательный файл или изолировать экспорт.

#### [MODIFY] [src/lib/markdown-parser.tsx](file:///c:/Users/Drilla/Desktop/Comms/src/lib/markdown-parser.tsx)
- Разделить чистый парсер/токенизатор (`src/lib/markdown-parser.ts`) и React-компоненты спойлера и подсветки синтаксиса (`src/components/Markdown/TelegramSpoiler.tsx`, `src/components/Markdown/CodeBlock.tsx`), устранив предупреждения Fast Refresh.

---

### 5. Безопасность конфигурации Docker

#### [MODIFY] [docker-compose.yml](file:///c:/Users/Drilla/Desktop/Comms/docker-compose.yml)
- Убрать жестко зашитые дефолтные сервисные JWT-ключи и анонимные токены Supabase, заменив на строгие переменные окружения со ссылкой на `.env`.

---

### 6. Актуализация документации проекта

#### [MODIFY] [handoff.md](file:///c:/Users/Drilla/Desktop/Comms/handoff.md)
- В соответствии с правилом `RULE[comms.md]` внести запись о Phase 60 в `handoff.md`:
  - Описать удаление мертвого MongoDB/Mongoose стека и дублирующего AuthContext;
  - Описать фикс CORS для Socket.io;
  - Описать декомпозицию `ChatScreen` на `useVoiceRecording`, `useVideoNoteRecording` и `useChatInteractions`;
  - Описать устранение Fast Refresh замечаний и очистку `docker-compose.yml`.

---

## Verification Plan

### Automated Tests
```bash
# 1. Запуск всех 121 тестов Vitest
npm test

# 2. Проверка линтера Oxlint (цель: 0 ошибок, минимизация warnings)
npm run lint

# 3. Полная проверка типов TypeScript и сборка Vite
npm run build
```

### Manual Verification
1. Проверка авторизации через `LoginScreen` (вход под тестовыми аккаунтами `vlad` / `anya` / `mom` / `dad` / `sister`).
2. Проверка отправки текстовых сообщений, эмодзи, стикеров.
3. Проверка записи голосового сообщения и видео-кружка.
4. Проверка анимации распада Таноса при удалении сообщения.
5. Проверка подключения сокетов при перезапуске сервера.
