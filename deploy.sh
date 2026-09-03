#!/bin/bash
set -e

DOMAIN="commsint.duckdns.org"

echo "=================================================="
echo "  🚀 Развертывание Comms Messenger: ${DOMAIN}      "
echo "=================================================="

# 1. Проверка и установка необходимых пакетов (Docker, Certbot, OpenSSL)
if ! command -v docker &> /dev/null; then
    echo "⚙️ Docker не найден. Выполняется автоматическая установка..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
    echo "✅ Docker успешно установлен!"
fi

if ! docker compose version &> /dev/null; then
    echo "⚙️ Установка docker-compose-plugin..."
    apt-get update && apt-get install -y docker-compose-plugin
fi

if ! command -v certbot &> /dev/null; then
    echo "⚙️ Установка certbot для выпуска SSL-сертификата..."
    apt-get update && apt-get install -y certbot openssl
fi

# 2. Создание директорий для сертификатов и ACME-валидации
mkdir -p /var/www/certbot
mkdir -p /etc/letsencrypt/live/${DOMAIN}

# 3. Выпуск бесплатного SSL-сертификата Let's Encrypt
CERT_FILE="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY_FILE="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

if [ ! -f "$CERT_FILE" ]; then
    echo "🔒 Запрос бесплатного SSL-сертификата Let's Encrypt для ${DOMAIN}..."
    systemctl stop nginx 2>/dev/null || true

    if certbot certonly --standalone -d "${DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email; then
        echo "✅ Сертификат Let's Encrypt успешно получен!"
    else
        echo "⚠️ Внимание: DNS еще обновляется или порт 80 занят. Создаем временный самоподписанный SSL, чтобы сервер запустился..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$KEY_FILE" \
            -out "$CERT_FILE" \
            -subj "/CN=${DOMAIN}"
    fi
fi

# 4. Настройка автопродления сертификата в crontab
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    echo "⏰ Настройка автоматического продления SSL (раз в месяц)..."
    (crontab -l 2>/dev/null; echo "0 3 1 * * certbot renew --quiet && cd $(pwd) && docker compose restart frontend") | crontab -
fi

# 5. Сборка и запуск контейнеров через Docker Compose
echo "📦 Сборка и запуск контейнеров..."
docker compose down 2>/dev/null || true
docker compose up -d --build

# 6. Проверка статуса
echo ""
echo "📊 Статус контейнеров:"
docker compose ps

echo ""
echo "=================================================="
echo "  🎉 Мессенджер успешно запущен с HTTPS (SSL)!"
echo "  🌐 Откройте в браузере на телефоне или ПК:"
echo "     https://${DOMAIN}/"
echo "=================================================="
