# 🚗 Автоковрики EVA-ART — Telegram-бот и Telegram Mini App (Кемерово)

> **Слоган компании:** *«Если ЕВА коврики, то EVA-ART»*  
> **Локация:** г. Кемерово, ул. Карболитовская, д. 12, бокс №3 (въезд в арку)  
> **Телефон:** [+7 951 222 9999](tel:+79512229999)  
> **Навигация:** [Яндекс.Карты](https://yandex.ru/maps/?text=Кемерово,+ул.+Карболитовская,+12) · [2ГИС](https://2gis.ru/kemerovo/search/Кемерово,%20ул.%20Карболитовская,%2012)

Полнофункциональный комплекс для мастерской по индивидуальному производству автомобильных ковриков:
1. **Telegram Mini App (WebApp)** — премиальный интерактивный конфигуратор на базе компонентов **Liquid Glass (стиль iOS 27 Fluid Glass)**:
   - Выбор марки, модели и года авто с моментальной проверкой наличия лекал в базе данных.
   - Интерактивный визуализатор коврика водителя в реальном времени (отрисовка структуры ромб/сота выбранного цвета, окантовки, металлического/полимерного подпятника и металлических шильдиков с логотипом марки авто).
   - Расчёт стоимости и сроков изготовления на лету.
   - Онлайн-запись на бесплатный замер и установку в бокс №3 с интерактивным календарем занятости слотов на ближайшие 14 дней.
   - Галерея готовых работ с функцией «Хочу так же!» (автоматически подставляет цвета и опции в конфигуратор).
   - Интерактивный FAQ (преимущества EVA, чистка и мойка, гарантия 12 месяцев).
   - Экран контактов с картой, подсказкой проезда в арку и кнопками навигации.
   - Встроенная **Панель администратора** (доступна только для ID из `ADMIN_CHAT_ID`): смена статуса заказа в 1 клик с моментальной отправкой push-уведомления клиенту в Telegram, просмотр записей на замер, пополнение базы лекал.
2. **Telegram-бот (aiogram 3.x)**:
   - Быстрый запуск Mini App по кнопке в меню и в сообщениях.
   - Просмотр истории и статуса своих заказов («Мои заказы»).
   - Уведомления клиенту при оформлении заказа и при каждой смене его статуса мастером.
   - Уведомления администраторам в чат о новых заказах и бронированиях с кнопками быстрых действий.
   - Команда `/export` — автоматическая выгрузка всех заказов и записей в красиво оформленный Excel-файл (`.xlsx`).
3. **Автодеплой (GitHub Actions -> VPS AEZA)**:
   - Развёртывание на личном сервере в Docker без использования сторонних BaaS (Supabase и Render исключены).
   - Автоматический CI/CD при пуше в ветку `main`.
   - Постоянный Docker Volume для PostgreSQL (данные сохраняются при любых обновлениях).

---

## 📁 Структура проекта

```
ART/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD: автодеплой на VPS AEZA при push в main
├── api/
│   ├── __init__.py             # Маршрутизатор FastAPI
│   ├── routes_config.py        # Публичная конфигурация, цены, цвета, FAQ
│   ├── routes_patterns.py      # Проверка базы лекал под авто
│   ├── routes_orders.py        # Создание заказов и история
│   ├── routes_appointments.py  # Запись на замер (слоты и даты)
│   └── routes_admin.py         # Управление заказами, смена статусов, лекала
├── bot/
│   ├── __init__.py
│   ├── instance.py             # Синглтон Bot и Dispatcher (aiogram 3)
│   ├── keyboards.py            # Reply и Inline клавиатуры
│   ├── notifications.py        # Шаблоны уведомлений клиенту и админу
│   └── handlers/
│       ├── __init__.py
│       ├── start.py            # /start, контакты, мои заказы
│       └── admin.py            # /export (выгрузка в Excel), callback кнопок
├── database/
│   ├── __init__.py
│   ├── connection.py           # Async SQLAlchemy подключение к PostgreSQL
│   ├── models.py               # Модели: Order, Appointment, Pattern, Price, FAQ
│   └── seed_data.py            # Автозаполнение цен, лекал (50+ авто) и FAQ
├── webapp/
│   ├── index.html              # Интерфейс Mini App с 5 экранами
│   └── static/
│       ├── css/
│       │   └── style.css       # Тёмная эстетика, карточки, интерактивный коврик
│       └── js/
│           ├── liquid-glass.js # Физика жидкого стекла (из liquid-glass-kit)
│           └── app.js          # Логика конфигуратора, API, Telegram haptics
├── deploy/
│   ├── nginx.conf              # Готовый конфиг Nginx с SSL и reverse proxy
│   └── docker-compose.yml      # Конфиг оркестрации для сервера
├── config.py                   # Настройки приложения и контакты
├── main.py                     # Единая точка запуска (FastAPI + aiogram)
├── requirements.txt            # Зависимости Python
├── Dockerfile                  # Сборка контейнера приложения
├── docker-compose.yml          # Запуск приложения и PostgreSQL в Docker
├── .env.example                # Пример переменных окружения
└── README.md                   # Подробная документация
```

---

## 🚀 Пошаговое руководство по развёртыванию на VPS сервере AEZA

### Шаг 1. Первичная настройка сервера AEZA

1. Подключитесь к вашему серверу AEZA по SSH:
   ```bash
   ssh root@<IP_ВАШЕГО_СЕРВЕРА>
   ```

2. Обновите пакеты системы и установите базовые утилиты:
   ```bash
   apt update && apt upgrade -y
   apt install -y curl git ufw nginx certbot python3-certbot-nginx
   ```

3. Установите Docker и Docker Compose (официальный скрипт Docker):
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   systemctl enable docker
   systemctl start docker
   ```

4. Настройте фаервол (UFW):
   ```bash
   ufw allow OpenSSH
   ufw allow 'Nginx Full'
   ufw enable
   ```

---

### Шаг 2. Клонирование репозитория и настройка `.env`

1. Клонируйте проект в каталог `/opt/eva-art`:
   ```bash
   git clone <URL_ВАШЕГО_GITHUB_РЕПОЗИТОРИЯ> /opt/eva-art
   cd /opt/eva-art
   ```

2. Создайте файл конфигурации `.env` на основе примера:
   ```bash
   cp .env.example .env
   nano .env
   ```

3. Заполните боевые переменные:
   ```dotenv
   # Токен Telegram-бота от @BotFather
   BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ

   # Telegram ID администратора (можно несколько через запятую)
   ADMIN_CHAT_ID=123456789

   # Подключение к PostgreSQL внутри Docker-сети
   DB_HOST=postgres
   DB_PORT=5432
   DB_NAME=eva_art_db
   DB_USER=eva_user
   DB_PASSWORD=Придумайте_Сложный_Пароль_123!

   # Публичный HTTPS адрес вашего домена для Mini App
   WEBAPP_URL=https://eva-art42.ru

   # Порт FastAPI приложения
   APP_PORT=8000
   APP_HOST=0.0.0.0
   ```
   *Сохраните файл (`Ctrl + O`, затем `Enter`, выход: `Ctrl + X`).*

---

### Шаг 3. Настройка домена и бесплатного SSL-сертификата (HTTPS)

> ⚠️ **Важно:** Telegram Mini App **обязан** работать по защищённому протоколу HTTPS с валидным доверенным SSL-сертификатом, иначе Telegram заблокирует открытие WebApp!

1. В панели управления вашим доменом направьте **A-запись** на IP-адрес вашего VPS сервера AEZA:
   - Хост `@` (или ваш поддомен, например `app`) -> `<IP_ВАШЕГО_СЕРВЕРА>`
   - Хост `www` -> `<IP_ВАШЕГО_СЕРВЕРА>`

2. Получите бесплатный SSL-сертификат Let's Encrypt через Certbot:
   ```bash
   # Замените your-domain.ru на ваш реальный домен
   certbot certonly --nginx -d your-domain.ru -d www.your-domain.ru --agree-tos -m your-email@gmail.com --no-eff-email
   ```
   Certbot сохранит сертификаты в `/etc/letsencrypt/live/your-domain.ru/`.

---

### Шаг 4. Настройка Nginx Reverse Proxy

1. Скопируйте готовый конфигурационный файл Nginx из проекта:
   ```bash
   cp /opt/eva-art/deploy/nginx.conf /etc/nginx/sites-available/eva-art.conf
   ```

2. Откройте файл и замените `your-domain.ru` на ваш фактический домен:
   ```bash
   sed -i 's/your-domain.ru/ВАШ_ДОМЕН.ru/g' /etc/nginx/sites-available/eva-art.conf
   ```

3. Активируйте сайт и перезапустите Nginx:
   ```bash
   ln -s /etc/nginx/sites-available/eva-art.conf /etc/nginx/sites-enabled/
   rm -f /etc/nginx/sites-enabled/default
   nginx -t
   systemctl restart nginx
   ```

---

### Шаг 5. Первый запуск в Docker

1. Находясь в `/opt/eva-art`, запустите контейнеры:
   ```bash
   docker compose up -d --build
   ```

2. Проверьте статус:
   ```bash
   docker compose ps
   docker compose logs -f app
   ```
   При первом запуске база данных PostgreSQL автоматически создаст все таблицы (`orders`, `appointments`, `prices_config`, `patterns`, `faq`) и заполнит их начальными данными (50+ популярных моделей авто, цены и подробный FAQ).

---

### Шаг 6. Настройка Telegram-бота в @BotFather

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram:
   - Создайте бота командой `/newbot` и сохраните полученный токен в `.env` (`BOT_TOKEN`).
2. Настройте кнопку вызова Mini App:
   - Отправьте команду `/setmenubutton`
   - Выберите вашего бота
   - Введите название кнопки: `🚀 Заказать коврики`
   - Введите URL: `https://your-domain.ru` (ваш домен)
3. Дополнительно создайте WebApp ссылку:
   - Отправьте команду `/newapp`
   - Укажите имя: `EVA-ART Конфигуратор`
   - Укажите URL: `https://your-domain.ru`
   - Задайте короткое имя (short name), например `app` -> ссылка `t.me/your_bot/app`
4. Отправьте боту команду `/start` — убедитесь, что бот приветствует вас и открывает WebApp.

---

## 🔄 Настройка автоматического CI/CD деплоя с GitHub

Каждый раз, когда вы делаете `git push` в ветку `main`, GitHub Actions автоматически подключается к серверу AEZA, загружает обновления, пересобирает контейнеры и обновляет бота **без простоя и без потери данных базы**.

### 1. Генерация SSH-ключа для GitHub Actions на сервере

Выполните на сервере:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f /root/.ssh/github_deploy -N ""
cat /root/.ssh/github_deploy.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

Выведите приватный ключ на экран и скопируйте его целиком:
```bash
cat /root/.ssh/github_deploy
```

### 2. Добавление секретов в GitHub

Перейдите в ваш репозиторий на GitHub:
**Settings** -> **Secrets and variables** -> **Actions** -> нажмите кнопку **New repository secret**:

| Имя секрета | Значение |
|---|---|
| `SERVER_HOST` | IP-адрес вашего сервера AEZA (например: `194.87.12.34`) |
| `SERVER_USER` | Пользователь на сервере (обычно `root`) |
| `SERVER_SSH_KEY` | Приватный ключ, скопированный из `/root/.ssh/github_deploy` (вместе с `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END OPENSSH PRIVATE KEY-----`) |
| `SERVER_PORT` | Порт SSH (по умолчанию `22`) |

Готово! Теперь любой коммит в `main` автоматически обновит работающее приложение на сервере за ~30 секунд.

---

## 🛠 Панель администратора и полезные команды

### В Telegram-боте:
- `/start` — Главное меню с быстрым запуском конфигуратора, контактами и просмотром своих заказов.
- `/export` — *(только для администраторов)* Генерирует и присылает в чат файл Microsoft Excel (`.xlsx`) со всеми заказами и записями на замер с автоматическим форматированием колонок и статусов.

### В Telegram Mini App:
- Пользователи, чей Telegram ID указан в `ADMIN_CHAT_ID`, видят 5-ю вкладку **«Админ»** в нижнем таб-баре Liquid Glass.
- **Смена статусов заказа в один клик:**
  - `Новый` -> `⚙️ В работу` -> `✅ Готово (в боксе)` -> `📦 Выдан` -> `❌ Отменить`.
  - При смене статуса на `ready` клиент моментально получает в Telegram персональное сообщение:  
    *«Ваш комплект EVA-ART готов! Ждём вас на установку по адресу: ул. Карболитовская, д. 12, бокс №3 (въезд в арку). Тел: +7 951 222 9999»*.
- **Пополнение базы лекал:** возможность добавить новую марку и модель авто прямо с телефона.

### Полезные команды на сервере AEZA:
```bash
# Просмотр логов приложения и бота в реальном времени
cd /opt/eva-art && docker compose logs -f app

# Перезапуск сервисов
docker compose restart

# Создание бэкапа базы данных PostgreSQL
docker exec -t eva_art_postgres pg_dump -U eva_user eva_art_db > ~/backup_$(date +%Y%m%d).sql
```
