# Продукционен сървър на backend-а — runbook

Цел: чиста машина → работещ `https://api.cortanasoft.com` за под час.
Проверено срещу реалния сървър на 2026-09-27 (`/home/cortanasoft-nest`, Ubuntu 24.04).

## Архитектура

- **Кодът пътува като Docker образ.** Push в `main` → GitHub Actions (`.github/workflows/deploy.yml`)
  билдва образа (`NODE_ENV=production`, `APP_VERSION=<sha>`), качва го в
  `ghcr.io/<user>/cortanasoft-nest:latest` и по SSH пуска:
  `docker compose pull backend` → `docker compose run --rm --entrypoint npx backend prisma migrate deploy`
  (миграциите ПРЕДИ да тръгне новият код) → `docker compose up -d backend nginx`.
- **На сървъра** има само: `docker-compose.yml`, `.env`, `nginx/backend.conf`, `certbot/` и cron за
  подновяване. Деплоят не ги пипа. `entrypoint.sh` в образа също пуска `prisma migrate deploy` при старт.
- Контейнери: `cortanasoft-backend` (NestJS, 3001 вътрешно), `cortanasoft-nginx` (80/443, TLS,
  WebSocket за чата), `cortanasoft-certbot`.
- **Данни извън сървъра:** базата е **DigitalOcean Managed Postgres** (порт 25060, `sslmode=require`,
  вграден PITR — НЕ се вдига Postgres в Docker); файловете са в **Cloudflare R2**; имейлите през
  **AWS SES** (SMTP); push през **Firebase**. Сървърът не държи състояние, освен сертификата.

## Какво трябва предварително

1. **DNS**: A запис `api.cortanasoft.com` → IP на сървъра.
2. **GitHub Secrets** (Settings → Secrets → Actions): `SERVER_IP`, `SERVER_USER` (root),
   `SSH_PRIVATE_KEY`, `PROJECT_PATH` (`/home/cortanasoft-nest`).
3. **Тайните** за `.env` (виж `.env.example` за пълния списък и значението) — в мениджъра на пароли.
   Най-важни: `DATABASE_URL` (от DO панела), `JWT_SECRET` (същият като във frontend), `ENCRYPTION_KEY`
   (веднъж зададен НЕ се сменя — шифрова тайни в базата), R2, SMTP, Firebase, Anthropic.
4. **Достъп до базата**: в DO Managed Postgres → Trusted sources добави IP-то на новия сървър,
   иначе връзката се отхвърля.
5. Ubuntu 22.04+/Debian 12 с root SSH, портове 80 и 443 отворени.

## Първоначална инсталация (чиста машина)

```bash
apt-get update && apt-get install -y git curl
cd /home && git clone https://github.com/<user>/cortanasoft-nest.git && cd cortanasoft-nest
cp .env.example .env && nano .env            # реалните стойности
chmod +x deploy/init.sh
./deploy/init.sh you@example.com <GITHUB_PAT_с_read:packages>
```

`init.sh`: Docker, ghcr login, nginx конфигурация, сертификат за `api.cortanasoft.com`, cron за
подновяване, `docker compose up -d`. Идемпотентен. Миграциите се прилагат от entrypoint-а при първия старт.

## Проверка

```bash
curl -sS https://api.cortanasoft.com/api/health          # {"status":"ok","db":"ok",...}
curl -sSI https://api.cortanasoft.com/api/health | grep -i strict   # HSTS от helmet
docker compose logs --tail=50 backend                    # "Applying database migrations..." → "Server running"
docker compose run --rm certbot certificates
docker ps                                                 # само backend, nginx (+ certbot при renew)
```

## Ежедневни операции

- **Деплой:** push в `main`. Миграциите вървят автоматично; ако миграция гръмне, деплоят спира
  ПРЕДИ новият код да тръгне (старият продължава да работи).
- **nginx конфигурация:** истината е `deploy/nginx/backend.conf`; на сървъра се копира с `cat >` или nano
  (НЕ `sed -i` — bind-mount, контейнерът остава на стария inode) и
  `docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload`.
- **Сертификат:** сам, всяка нощ в 03:17 (`/var/log/certbot-renew.log`).
- **База:** резервни копия и PITR са в DO панела. Локално копие: `pg_dump -Fc` с connection string-а
  (само четене). Никакви ръчни SQL-и в прод.
- **Останали контейнери от `docker compose run`:** ако `docker ps` показва
  `cortanasoft-nest-backend-run-*`, те са остатъци (ядат памет): `docker rm -f <име>`.
- **Връщане назад:** смени тага на образа в `docker-compose.yml` на `sha-<commit>` и `docker compose up -d backend`.
  Внимание: миграция назад няма — новите колони остават (всички са nullable/с default, старият код ги игнорира).

## Миграция към друг доставчик (напр. AWS)

1. **База:** `pg_dump -Fc` от DO → `pg_restore` в RDS (или EC2 Postgres). Направи го в прозорец без
   писане: спри backend-а (`docker compose stop backend`) → dump → restore → смени `DATABASE_URL` → старт.
2. **Сървър:** „Първоначална инсталация" на новата машина с временен DNS (`api2.…`) или без сертификат.
   Добави новото IP в Trusted sources на базата (или на новата база).
3. **DNS** `api.cortanasoft.com` → новото IP (TTL 300 ден по-рано). Сертификатът на новата машина се
   издава след като DNS сочи към нея. Frontend-ът не се пипа (`BACKEND_URL` е по домейн).
4. R2, SES, Firebase, Anthropic не зависят от хостинга — същите ключове.
5. Старият сървър остава 24 h, после се спира.
