# 🚀 Secure Comms — Project Handoff & Architecture Guide

> **Telegram Web Replica / Ultra-Premium Real-Time Messenger**  
> Стек: **React 19 / Vite**, **TypeScript**, **Tailwind CSS**, **Framer Motion & Canvas FX**, **Node.js / Express**, **Socket.io / WebSocket**, **WebRTC**, **MongoDB / Mongoose**, **JWT & Bcrypt**.

---

## 📋 Содержание
1. [Обзор проекта и текущая стадия](#-обзор-проекта-и-текущая-стадия)
2. [Структура репозитория и ключевые файлы](#-структура-репозитория-и-ключевые-файлы)
3. [Исправления и оптимизации UX (Фикс контрастности иконок, темы и фона)](#-исправления-и-оптимизации-ux-фикс-контрастности-иконок-темы-и-фона)
4. [Микроинтеракции & UX-детали (Spring Animations, Real-time Validation, Sound)](#-микроинтеракции--ux-детали-spring-animations-real-time-validation-sound)
5. [Визуальные эффекты & Canvas FX (Частицы, Неоновый бордер, Звуки)](#-визуальные-эффекты--canvas-fx-частицы-неоновый-бордер-звуки)
6. [Система анимаций (Framer Motion + CSS Keyframes)](#-система-анимаций-framer-motion--css-keyframes)
7. [Дизайн-система (Glassmorphism & Gradients)](#-дизайн-система-glassmorphism--gradients)
8. [Архитектура аутентификации и базы данных (MongoDB + JWT)](#-архитектура-аутентификации-и-базы-данных-mongodb--jwt)
9. [Архитектура состояния и контекста](#-архитектура-состояния-и-контекста)
10. [Реализованные фичи и функционал](#-реализованные-фичи-и-функционал)
11. [Запуск и сборка](#-запуск-и-сборка)
12. [Журнал изменений (Changelog) & Дальнейшие шаги](#-журнал-изменений-changelog--дальнейшие-шаги)

---

## 🌟 Обзор проекта и текущая стадия

**Secure Comms** — полнофункциональный веб-мессенджер реального времени, воссоздающий интерфейс, UX и анимации официального клиента **Telegram Web K/A** с ультра-премиум дизайном, кинематографичными анимациями и тактильными микроинтеракциями.

### 📌 Текущая стадия разработки (Status: Phase 9 — Contrast & Icon Rendering Polish):
* ✅ **High Contrast Input Icons**: Иконки внутри полей ввода (Email/Логин, Пароль, Имя пользователя) получили яркий контрастный цвет `dark:text-slate-200` (`#e2e8f0`) в тёмной теме и динамическую подсветку `#0066FF` / `#9933FF` при фокусе. Устранён конфликт инлайн-стилей Framer Motion.
* ✅ **Fixed Theme Button Positioning**: Кнопка переключения темы жестко закреплена в правом верхнем углу окна (`fixed top-5 right-5 sm:top-6 sm:right-6 z-50`).
* ✅ **Stable Background & Particles**: Устранена перезагрузка Canvas частиц при вводе текста. Хук `useParticles.ts` изолирован через `useRef` и `React.memo`.
* ✅ **Micro-Interactions Suite**: Пружинящий лейбл (`Spring Jump 0.2s`), быстрая очистка поля 'X', счетчик символов, скользящий индикатор табов `layoutId`, покачивание глаза пароля, 5s автоскрытие ошибок, morphing кнопка успеха.
* ✅ **Canvas Particle Network**: Анимированная сеть светящихся частиц с соединительными линиями.
* ✅ **Animated Conic Neon Border**: Вращающаяся неоновая градиентная рамка вокруг карточки.
* ✅ **Web Audio Sound Effects**: Звуки успешных действий, кликов и ошибок (`playUISound`).

---

## 🔧 Исправления и оптимизации UX (Фикс контрастности иконок, темы и фона)

1. **Контрастность и видимость иконок в полях ввода**:
   - **Причина**: В `useInputAnimation.ts` хук Framer Motion анимировал `color: '#0066FF'` при фокусе, а при потере фокуса возвращал `color` в начальный цвет инлайн-стилей (`#000000`/черный), перекрывая CSS-классы и делая иконки почти невидимыми на темном фоне карточки.
   - **Решение**: Убран конфликтный параметр цвета из Framer Motion, а в [`Input.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/ui/Input.tsx) установлены явные контрастные классы `${isFocused ? 'text-[#0066FF] dark:text-[#9933FF]' : 'text-slate-400 dark:text-slate-200'}`. Иконки теперь четко видны и в светлой, и в темной теме.

2. **Кнопка смены темы**:
   - Закреплена через `fixed top-5 right-5 sm:top-6 sm:right-6 z-50`.

3. **Стабилизация Canvas фона и частиц**:
   - `useParticles.ts` и `GradientBackground.tsx` оптимизированы и мемоизированы.

---

## 📁 Структура репозитория и ключевые файлы

```
Comms/
├── server.js                          # Node.js + Express + Socket.io + MongoDB + JWT сервер
├── package.json                       # Зависимости (React 19, Framer Motion, Mongoose, Bcrypt, JWT, Socket.io)
├── vite.config.ts                     # Конфигурация Vite (HTTPS, плагины)
├── index.html                         # Точка входа HTML (Montserrat, Inter, PWA)
├── handoff.md                         # Этот документ (архитектурный гайд и статус проекта)
└── src/
    ├── main.tsx                       # Инициализация React DOM
    ├── App.tsx                        # Корневой компонент (переключение экранов, провайдеры)
    ├── index.css                      # Глобальные стили, темы Telegram, анимации
    ├── types.ts                       # Базовые типы чата, сообщений, UserId и звонков
    ├── constants.ts                   # Константы, дефолтные профили, эмодзи, серверный URL
    ├── styles/
    │   ├── animations.css             # Все ключевые кадры анимаций, шейков, шиммеров, вращения бордера
    │   ├── globals.css                # Стили Glassmorphism, анимированных орбов и градиентов
    │   └── tailwind.config.js         # Конфигурация цветов, градиентов и шрифтов
    ├── components/
    │   ├── interactions/
    │   │   ├── useInputInteractions.ts # Хук пружинящих лейблов, очистки поля и счетчика символов
    │   │   ├── useFormValidation.ts   # Хук валидации, spring-галочек и автоскрытия ошибок 5s
    │   │   ├── useToggleAnimation.ts  # Хук наклона иконки глаза, layoutId табов и success-кнопки
    │   │   └── index.ts               # Barrel export микроинтеракций
    │   ├── effects/
    │   │   ├── ParticleBackground.tsx # Canvas компонент (Memoized)
    │   │   ├── AnimatedBorder.tsx     # Вращающийся неоновый конический бордер
    │   │   ├── GradientBackground.tsx # Многослойный градиентный анимированный фон (Memoized)
    │   │   ├── useParticles.ts        # Оптимизированный Canvas API хук (без сбросов)
    │   │   ├── AnimatedIcons.tsx      # Анимированные SVG иконки и звуки Web Audio
    │   │   └── index.ts               # Barrel export эффектов
    │   ├── animations/
    │   │   ├── usePageTransition.ts   # Хук переходов страницы, зума карточки и смены табов
    │   │   ├── useInputAnimation.ts   # Хук микровзаимодействий инпутов
    │   │   ├── useButtonAnimation.ts  # Хук кнопки (scale 1.02/0.98, ripple-эффект)
    │   │   └── index.ts               # Barrel export хуков анимации
    │   ├── ui/
    │   │   ├── Button.tsx             # Framer Motion кнопка с ripple, shimmer, hover scale и isSuccess
    │   │   ├── Input.tsx              # Поле ввода со spring label, clear X, counter и hover rotation
    │   │   ├── Card.tsx               # Glassmorphism карточка (blur 20px, max-w 450px)
    │   │   ├── LoadingSpinner.tsx     # Анимированный SVG спиннер
    │   │   └── index.ts               # Barrel export UI компонентов
    │   ├── ChatScreen.tsx             # Главный экран (сайдбар, сообщения, хедер, правая панель)
    │   ├── MessageBubble.tsx          # Пузырь сообщения (текст, медиа, аудио, кружки, чекбоксы)
    │   ├── ProfileEditModal.tsx       # Модальное окно редактирования профиля Telegram
    │   ├── TelegramContextMenuModal.tsx # Контекстное меню сообщения
    │   ├── TelegramEmojiPickerModal.tsx # Палитра анимированных эмодзи и реакций
    │   ├── LoginScreen.tsx            # Экран входа и регистрации с микроинтеракциями и Canvas FX
    │   └── VideoCallModal.tsx         # Модальное окно аудио/видео звонка WebRTC
    ├── config/
    │   └── database.ts                # Подключение к MongoDB (Mongoose, пулы, реконнекты)
    ├── types/
    │   └── auth.types.ts              # TypeScript интерфейсы аутентификации, сессий, токенов
    ├── models/
    │   ├── User.ts                    # Mongoose схема пользователя + Bcrypt + методы
    │   ├── Session.ts                 # Mongoose схема сессий с MongoDB TTL индексом
    │   ├── LoginAttempt.ts            # Mongoose схема аудита входа + защита от brute-force
    │   └── index.ts                   # Barrel export моделей базы данных
    ├── services/
    │   └── auth.service.ts            # Клиентский сервис авторизации (REST API + localStorage)
    ├── utils/
    │   └── token.utils.ts             # Утилиты JWT (генерация, валидация Access 15m / Refresh 7d)
    └── context/
        └── SocketContext.tsx          # Центральный контекст (JWT авторизация, сокеты, звонки, чаты)
```

---

## 🛠 Запуск и сборка

```bash
# 1. Запуск Node.js бэкенд сервера (порт 3000)
npm run server

# 2. Запуск Vite Dev сервера с HTTPS (порт 5173)
npm run dev

# 3. Проверка типов TypeScript и сборка проекта
npm run build
```

---

## 📝 Журнал изменений (Changelog) & Дальнейшие шаги

### [v1.6.2] — 17 августа 2026 г.
* **Исправлено**:
  * Исправлена видимость и контрастность иконок в полях ввода: убран конфликт с инлайн-свойством `color` в Framer Motion [`useInputAnimation.ts`](file:///c:/Users/Drilla/Desktop/Comms/src/components/animations/useInputAnimation.ts), в [`Input.tsx`](file:///c:/Users/Drilla/Desktop/Comms/src/components/ui/Input.tsx) добавлены классы высокой контрастности `text-slate-400 dark:text-slate-200` с неоновым выделением `#0066FF` / `#9933FF` при фокусе.
  * Актуализирован файл [`handoff.md`](file:///c:/Users/Drilla/Desktop/Comms/handoff.md).

---

*Документ актуален и поддерживается в ходе разработки.* 🚀
