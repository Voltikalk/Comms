#!/bin/bash
set -e

DOMAIN="commsint.duckdns.org"

echo "=================================================="
echo "  🚀 Развертывание Comms Messenger: ${DOMAIN}      "
echo "=================================================="

# 1. Проверка и установка необходимых пакетов (Docker, Certbot, OpenSSL, Compose)
apt-get update -y
apt-get install -y curl wget ca-certificates openssl certbot

if ! command -v docker &> /dev/null; then
    echo "⚙️ Docker не найден. Выполняется автоматическая установка..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
    echo "✅ Docker успешно установлен!"
fi

# Установка Docker Compose v2 (как плагин и как бинарник)
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "⚙️ Установка Docker Compose v2..."
    ARCH=$(uname -m)
    mkdir -p /usr/local/lib/docker/cli-plugins
    mkdir -p /usr/local/bin
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" -o /usr/local/lib/docker/cli-plugins/docker-compose || \
    wget -O /usr/local/lib/docker/cli-plugins/docker-compose "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}"
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose
    echo "✅ Docker Compose успешно установлен!"
fi

# Определение команды для вызова Compose
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "⚙️ Установка docker-compose из apt..."
    apt-get install -y docker-compose
    COMPOSE_CMD="docker-compose"
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
    (crontab -l 2>/dev/null; echo "0 3 1 * * certbot renew --quiet && cd $(pwd) && $COMPOSE_CMD restart frontend") | crontab -
fi

# 5. Сборка и запуск контейнеров через Docker Compose
echo "📦 Сборка и запуск контейнеров..."
$COMPOSE_CMD down 2>/dev/null || true
$COMPOSE_CMD up -d --build

# 6. Проверка статуса
echo ""
echo "📊 Статус контейнеров:"
$COMPOSE_CMD ps

echo ""
echo "=================================================="
echo "  🎉 Мессенджер успешно запущен с HTTPS (SSL)!"
echo "  🌐 Откройте в браузере на телефоне или ПК:"
echo "     https://${DOMAIN}/"
echo "=================================================="
