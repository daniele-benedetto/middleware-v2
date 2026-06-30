# Primo deploy self-hosted del magazine Next.js

Documento operativo unico per portare il magazine Next.js su infrastruttura EU self-hosted, con tutto centrato sul solo progetto Next.js.

Obiettivo: avviare un ambiente pulito su Hetzner, senza Coolify e senza servizi di terze parti, dove l'unico applicativo è il Next.js più il suo Postgres e il suo Redis. Analytics, performance ed errori vivono dentro l'app, su Postgres, e si vedono nel CMS.

Modello di lavoro:

- Niente staging. Il banco di prova è il locale con Docker.
- Niente Coolify. Sul VPS gira Docker Compose gestito direttamente.
- Deploy via GitHub Action su push a `main`.
- Ingress via Cloudflare Tunnel, nessuna porta web aperta sul VPS.
- Osservabilità dentro Next.js, salvata su Postgres e mostrata nel CMS.

Regola operativa: il dominio pubblico si attiva solo dopo verifica su hostname temporaneo, upload media, login CMS, pubblicazione, backup e restore test verificati.

## Dashboard

| Area                   | Stato   | Note                                                          |
| ---------------------- | ------- | ------------------------------------------------------------- |
| Baseline locale        | Fatto   | App, DB, Redis, MinIO, S3 adapter, seed, smoke, test, build   |
| Docker prod image      | Fatto   | `docker compose build app` completato e smoke container OK    |
| Decisioni pre-acquisto | Fatto   | Dominio, Cloudflare, Tunnel, osservabilità in-app, no servizi |
| Pipeline CI/CD         | Da fare | GitHub Action build ARM, push GHCR app+migrator, deploy SSH   |
| VPS Hetzner            | Da fare | CAX21 ARM 8 GB                                                |
| Object Storage Hetzner | Da fare | Bucket reale e credenziali                                    |
| Cloudflare Tunnel      | Da fare | VPS e zona Cloudflare                                         |
| Osservabilità in-app   | Da fare | Tabelle Postgres, `instrumentation.ts`, web vitals, retention |
| Backup/restore         | Da fare | Prima del dominio pubblico                                    |
| Produzione             | Da fare | Solo dopo smoke verde e restore DB testato                    |

## Stack target

- **VPS**: Hetzner CAX21, 4 vCPU ARM Ampere, 8 GB RAM, 80 GB NVMe, Falkenstein o Norimberga. Intorno agli 8 €/mese.
- **Runtime**: Docker Compose gestito direttamente sul VPS, senza PaaS.
- **App**: Next.js standalone, deployata dal branch `main`.
- **DB**: Postgres dell'app, in container.
- **Rate limit**: Redis dell'app, in container.
- **Media**: Hetzner Object Storage S3-compatible, bucket privato con versioning.
- **Ingress/TLS**: Cloudflare Tunnel (`cloudflared`), nessuna porta 80/443 aperta sul VPS.
- **DNS/Registrar**: Cloudflare, dominio trasferito su Cloudflare Registrar.
- **CI/CD**: GitHub Actions, immagini arm64 app+migrator su GHCR, deploy via SSH.
- **Analytics**: in-app, eventi cookieless su Postgres, dashboard nel CMS.
- **Performance**: `useReportWebVitals` verso lo stesso collector.
- **Errori/log**: `instrumentation.ts` con `onRequestError`, tabella `ErrorLog`, Pino su stdout.
- **Uptime**: GitHub Action schedulata su `/api/health`.
- **Branch**: produzione deploya da `main`. Il branch `dev` resta il lavoro in locale.

Nota architettura: lo stack gira su arm64. `node:22-slim`, `sharp`, Postgres, Redis e `cloudflared` hanno immagini arm64 native, e la build in CI usa un runner ARM nativo, senza emulazione QEMU. Nessun adattamento al codice applicativo.

Nota migrazioni: l'immagine Next standalone non è un ambiente operativo completo per Prisma. Le migration di produzione devono girare da un'immagine/target dedicato `migrator`, che include workspace, Prisma CLI, schema, cartella `prisma/migrations` e script operativi come `auth:bootstrap-admin`. Non eseguire `pnpm prisma:migrate:deploy` dentro il container standalone dell'app.

Nota dimensionamento: senza Coolify, GlitchTip e Umami, e con la build spostata in CI, il box è scarico. CAX21 da 8 GB è comodo per app, Postgres, Redis e tunnel.

## Decisioni pre-acquisto

| Area                 | Decisione                                            |
| -------------------- | ---------------------------------------------------- |
| Dominio canonico     | `middleware.media`                                   |
| Redirect produzione  | `www.middleware.media` -> `middleware.media`         |
| Ambienti             | Solo produzione, nessuno staging                     |
| Test                 | Solo in locale con Docker                            |
| Branch produzione    | `main`                                               |
| Orchestrazione       | Docker Compose diretto, nessun PaaS                  |
| Deploy               | GitHub Action su push a `main`                       |
| CI gate              | `pnpm check:all` sulle PR verso `main`               |
| Build immagini       | CI su runner ARM nativo, push app+migrator su GHCR   |
| Registry immagini    | GHCR (GitHub Container Registry)                     |
| Rollback             | Rideploy dello SHA precedente nello script di deploy |
| Ingress/TLS          | Cloudflare Tunnel                                    |
| DNS/CDN              | Cloudflare                                           |
| Registrar dominio    | Cloudflare Registrar, transfer dal registrar attuale |
| Email transazionale  | Non prevista                                         |
| Analytics            | In-app su Postgres, cookieless con salt giornaliero  |
| Performance          | Web Vitals in-app                                    |
| Error tracking       | In-app su Postgres via `onRequestError` + boundary   |
| Alerting             | Opzionale, webhook da `onRequestError`               |
| Uptime               | GitHub Action schedulata su `/api/health`            |
| Retention telemetria | Job notturno, `TELEMETRY_RETENTION_DAYS`             |
| Bucket media prod    | `middleware-media-prod`, privato con versioning      |
| Backup media         | Solo versioning sul bucket                           |
| Backup DB            | `pg_dump` schedulato su bucket Hetzner separato      |
| Backup DB offsite    | Non previsto                                         |
| Admin bootstrap      | Credenziali produzione scelte manualmente            |

### Matrice env applicativa (produzione)

| Env                        | Produzione                                              |
| -------------------------- | ------------------------------------------------------- |
| `NODE_ENV`                 | `production`                                            |
| `NEXT_PUBLIC_SITE_URL`     | `https://middleware.media`                              |
| `BETTER_AUTH_URL`          | `https://middleware.media`                              |
| `BETTER_AUTH_SECRET`       | `openssl rand -base64 48`                               |
| `DATABASE_URL`             | `postgresql://middleware:PASS@postgres:5432/middleware` |
| `POSTGRES_URL`             | Uguale a `DATABASE_URL`                                 |
| `PRISMA_DATABASE_URL`      | Uguale a `DATABASE_URL`                                 |
| `REDIS_URL`                | `redis://redis:6379`                                    |
| `S3_ENDPOINT`              | Da Hetzner Object Storage                               |
| `S3_REGION`                | Da bucket Hetzner scelto                                |
| `S3_BUCKET`                | `middleware-media-prod`                                 |
| `S3_ACCESS_KEY`            | Access key dedicata produzione                          |
| `S3_SECRET_KEY`            | Secret key dedicata produzione                          |
| `S3_FORCE_PATH_STYLE`      | Valore richiesto da endpoint Hetzner                    |
| `ANALYTICS_SALT_SECRET`    | Base del salt giornaliero, `openssl rand -base64 32`    |
| `BOOTSTRAP_ADMIN_EMAIL`    | Admin produzione scelto manualmente                     |
| `BOOTSTRAP_ADMIN_PASSWORD` | Password produzione scelta manualmente                  |
| `BOOTSTRAP_ADMIN_NAME`     | Nome admin produzione scelto manualmente                |
| `AUDIT_LOG_RETENTION_DAYS` | `365`                                                   |
| `TELEMETRY_RETENTION_DAYS` | `90`                                                    |
| `ALERT_WEBHOOK_URL`        | Opzionale, per notifiche errori push                    |

### Env infrastrutturali (non applicative)

Restano sul VPS o nei secret GitHub, mai nel repository.

| Env / Secret              | Dove vive        | Uso                                               |
| ------------------------- | ---------------- | ------------------------------------------------- |
| `IMAGE_TAG`               | `.env` sul VPS   | SHA dell'immagine corrente, per il rollback       |
| `CLOUDFLARE_TUNNEL_TOKEN` | `.env` sul VPS   | Avvio del container `cloudflared`                 |
| `POSTGRES_PASSWORD`       | `.env` sul VPS   | Container Postgres                                |
| `POSTGRES_USER`           | `.env` sul VPS   | Utente DB, valore `middleware`                    |
| `GHCR_PAT`                | `.env` sul VPS   | PAT read-only `read:packages` per il pull dal VPS |
| `SSH_HOST`                | Secret GitHub    | Target deploy                                     |
| `SSH_USER`                | Secret GitHub    | Utente `deploy`                                   |
| `SSH_KEY`                 | Secret GitHub    | Chiave privata deploy dedicata                    |
| `GITHUB_TOKEN`            | Automatico in CI | Push immagine su GHCR dal runner                  |

Nota: il `GITHUB_TOKEN` automatico vale solo dentro il runner. Per il `pull` dal VPS serve un PAT dedicato read-only, perché il package GHCR è privato.

### DNS target

Con Cloudflare Tunnel non servono record A/AAAA verso l'IP del VPS. I public hostname del tunnel creano automaticamente i CNAME verso `<tunnel-id>.cfargotunnel.com`.

| Host                   | Uso                   | Gestione                                      |
| ---------------------- | --------------------- | --------------------------------------------- |
| `middleware.media`     | App produzione        | Public hostname del tunnel verso `app:3000`   |
| `www.middleware.media` | Redirect produzione   | Public hostname o regola redirect Cloudflare  |
| Hostname temporaneo    | Verifica pre-pubblica | Es. `app.middleware.media`, da rimuovere dopo |

## Architettura runtime sul VPS

Tutto gira in un unico `docker-compose.prod.yml`. Nessuna porta web pubblicata: `cloudflared` raggiunge l'app dalla rete interna del compose.

```yaml
services:
  app:
    image: ghcr.io/OWNER/REPO:${IMAGE_TAG:-latest}
    restart: unless-stopped
    env_file: .env
    depends_on:
      - postgres
      - redis
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",
        ]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    # nessuna porta pubblicata: l'ingress passa dal tunnel

  migrate:
    image: ghcr.io/OWNER/REPO-migrator:${IMAGE_TAG:-latest}
    env_file: .env
    depends_on:
      - postgres
    command: ["pnpm", "prisma:migrate:deploy"]
    profiles: ["ops"]

  postgres:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-middleware}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: middleware
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redisdata:/data

  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - app

volumes:
  pgdata:
  redisdata:
```

Punti chiave:

- `restart: unless-stopped` su ogni servizio sostituisce l'orchestrazione di Coolify dopo crash o reboot.
- L'`healthcheck` dell'app è la base sia per lo swap sicuro sia per il rollback automatico.
- Il servizio `migrate` non resta acceso: si esegue solo on-demand con `docker compose --profile ops run --rm migrate`.
- L'immagine `REPO-migrator` è diversa dalla standalone app: contiene Prisma CLI, schema, migration files e script operativi.
- L'app espone la `3000` solo sulla rete interna; nel tunnel il public hostname `middleware.media` punta a `http://app:3000`.
- Postgres e Redis non hanno porte pubblicate, restano raggiungibili solo dai container.
- Un unit systemd lancia `docker compose -f docker-compose.prod.yml up -d` al boot.

## Pipeline CI/CD

Un workflow copre gate e deploy. Sulle PR verso `main` gira solo il gate; su push a `main` gira tutto. Un secondo workflow fa l'uptime.

### Workflow deploy

```yaml
name: deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check:all

  build-deploy:
    needs: check
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-24.04-arm # runner ARM nativo: immagine arm64 senza QEMU
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push app image
        uses: docker/build-push-action@v6
        with:
          context: .
          target: runner
          push: true
          platforms: linux/arm64
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
      - name: Build and push migrator image
        uses: docker/build-push-action@v6
        with:
          context: .
          target: migrator
          push: true
          platforms: linux/arm64
          tags: ghcr.io/${{ github.repository }}-migrator:${{ github.sha }}
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/middleware
            ./scripts/deploy.sh ${{ github.sha }}
```

### Workflow uptime

```yaml
name: uptime
on:
  schedule:
    - cron: "*/5 * * * *" # granularità minima del cron GitHub
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Health check
        run: |
          code=$(curl -s -o /dev/null -w "%{http_code}" https://middleware.media/api/health)
          echo "status=$code"
          test "$code" = "200"
```

Per ricevere una notifica al fallimento, aggiungi uno step `if: failure()` che apre una issue con `gh issue create` o chiama un webhook. Resta tutto dentro GitHub, nessun servizio sul server.

### Script di deploy con rollback e login GHCR

`scripts/deploy.sh` risolve tre cose che mancavano: l'autenticazione del VPS a GHCR, le migration da runner dedicato e il rollback automatico su health check fallito.

```bash
#!/usr/bin/env bash
set -euo pipefail

NEW_TAG="$1"
COMPOSE="docker-compose.prod.yml"
source .env

# tag corrente salvato per il rollback
PREV_TAG="${IMAGE_TAG:-}"

# login GHCR con PAT read-only (package privato)
echo "$GHCR_PAT" | docker login ghcr.io -u OWNER --password-stdin

# backup pre-migrazione
./scripts/backup-db.sh

# punta al nuovo tag, tira app+migrator, migra, swap
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$NEW_TAG/" .env
docker compose -f "$COMPOSE" pull app
docker compose -f "$COMPOSE" --profile ops pull migrate
docker compose -f "$COMPOSE" --profile ops run --rm migrate
docker compose -f "$COMPOSE" up -d app

# health check, rollback automatico se fallisce
if ! ./scripts/healthcheck.sh; then
  echo "Health check fallito. Rollback a ${PREV_TAG:-immagine precedente}"
  if [ -n "$PREV_TAG" ]; then
    sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$PREV_TAG/" .env
    docker compose -f "$COMPOSE" up -d app
  fi
  exit 1
fi
echo "Deploy ok: $NEW_TAG"
```

`scripts/healthcheck.sh` aspetta che il container risulti healthy:

```bash
#!/usr/bin/env bash
set -euo pipefail
for _ in $(seq 1 20); do
  status=$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose -f docker-compose.prod.yml ps -q app)" 2>/dev/null || echo "")
  [ "$status" = "healthy" ] && exit 0
  sleep 3
done
exit 1
```

`scripts/backup-db.sh` fa il dump verso il bucket backup:

```bash
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%F-%H%M)
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-middleware}" middleware | gzip > "/tmp/middleware-$STAMP.sql.gz"
rclone copy "/tmp/middleware-$STAMP.sql.gz" hetzner-backup:middleware-db/
rm -f "/tmp/middleware-$STAMP.sql.gz"
```

Prerequisiti backup sul VPS:

- `rclone` installato sull'host, non nel container app.
- Remote `hetzner-backup` configurato verso il bucket backup DB, con credenziali diverse dal bucket media.
- Restore testato almeno una volta su DB separato prima del dominio pubblico.
- Retention backup DB esplicita: lifecycle del bucket o prune schedulato, non accumulo infinito.

Regole della pipeline:

- L'immagine è arm64 nativa, taggata con lo SHA git. Il rollback è automatico se l'health check fallisce, e manuale per SHA se serve tornare più indietro.
- L'ordine è sempre login, backup, migrate, swap, health check. Il backup pre-migrazione è uno step, non una buona intenzione.
- La migration gira da immagine `migrator`, non dalla standalone app. Il Dockerfile deve avere un target `migrator` dedicato.
- Le migration di produzione devono seguire il pattern expand-contract: prima aggiungi schema compatibile, poi deploy codice, poi rimuovi solo in un deploy successivo.
- `pnpm check:all` sulle PR rende automatico il vincolo che `main` è la produzione.
- Lo swap su container singolo dà un blip di un paio di secondi. Per renderlo seamless servono due repliche dietro al tunnel, non necessario ora.
- Il rollback applicativo è automatico, ma quello del DB non lo è. Per uno schema rotto valuta il restore dal dump pre-migrazione.

## Osservabilità in-app

Tutto vive dentro Next.js e Postgres. Niente servizi esterni.

### Analytics

- **Client**: una util `track(event)` che usa `navigator.sendBeacon` verso una route interna. Fire-and-forget, non blocca render né navigazione.
- **Server**: una route handler che fa `insert` su una tabella Prisma `AnalyticsEvent`.
- **Cookieless senza PII**: il visitor id è `sha256(ip + user_agent + salt_del_giorno)`, dove il salt deriva da `ANALYTICS_SALT_SECRET` più la data corrente. Ruota ogni giorno, quindi nessun identificatore persistente, nessun IP grezzo salvato, nessun cookie e nessun banner.
- **Paese**: dall'header `CF-IPCountry` di Cloudflare, senza salvare l'IP.
- **Aggregazione**: vista materializzata o job cron periodico per le query del CMS, così la dashboard non scansiona la tabella grezza a ogni apertura.
- **CMS**: una sezione che legge le aggregazioni e mostra visite, pagine, referrer.

### Performance

- `useReportWebVitals` da `next/web-vitals` cattura LCP, CLS, INP, FCP e TTFB sul client.
- I valori vanno allo stesso collector delle analytics, su una tabella `WebVital` o come tipo dentro `AnalyticsEvent`.
- Nel CMS si mostrano i percentili per pagina. È RUM, dai visitatori veri, senza strumenti esterni.

### Errori

- `instrumentation.ts` esporta `onRequestError` (Next 15+). Scatta su errori da route handler, server action, server component e middleware, e scrive su una tabella `ErrorLog`.
- Caveat: la copertura non è totale, alcuni errori middleware su certi runtime non vengono catturati. Per questo si accoppia con `app/error.tsx` e `app/global-error.tsx`, che intercettano gli errori di render lato client e fanno POST a una route di logging.
- Prima di salvare, si strippano cookie, header auth e body per non scrivere PII.
- Fingerprint minimo in scrittura, per incrementare un contatore invece di duplicare righe identiche.

### Log

- Pino come logger strutturato JSON, output su stdout catturato da Docker.
- Ciò che deve sopravvivere al container va su Postgres (gli errori) o ruotato su file/bucket.
- Non fare affidamento sullo stdout per dati che ti servono dopo un redeploy, perché `docker compose up` ricrea il container.

### Retention telemetria

- Job notturno che cancella o partiziona per data `AnalyticsEvent`, `WebVital` ed `ErrorLog`, governato da `TELEMETRY_RETENTION_DAYS`.
- Da attivare dal primo giorno: senza uno strumento esterno questi dati crescono solo dentro il tuo Postgres.
- Se vuoi storico analytics lungo, tieni la tabella grezza a 90 giorni e conserva a lungo solo le aggregazioni.

### Alerting (opzionale)

- Senza GlitchTip nessuno avvisa quando un errore esplode. Di default lo vedi nel CMS.
- Per notifiche push, dentro `onRequestError` aggiungi una chiamata a `ALERT_WEBHOOK_URL` verso ntfy, Telegram o Discord. Poche righe, nessun servizio pesante.

### Tracing (escluso per ora)

- `@vercel/otel` e OpenTelemetry si agganciano a `instrumentation.ts`, ma OTel richiede un backend (Jaeger, Tempo, SigNoz), che è un servizio. Fuori dalla linea attuale. Lo si valuta solo se servirà tracing distribuito.

### Uptime (eccezione strutturale)

- Monitorare il Next.js dal Next.js non funziona: se il box è giù, è giù anche il monitor.
- L'uptime resta esterno, sul Workflow uptime di GitHub Actions che colpisce `/api/health` ogni cinque minuti. Resta dentro l'ecosistema GitHub, nessuna terza parte e nessun health check Cloudflare a pagamento.

## Baseline locale completata

Il branch `infra/self-hosting-prep` è la base. Il locale con Docker è l'unico ambiente di test prima del deploy. La baseline include:

- Dockerfile production standalone con `openssl` per Prisma.
- Compose locale con app, Postgres, Redis, MinIO, `minio-init` e `migrate`.
- Prisma baseline pulita per DB vuoto.
- Storage S3 adapter e route media CMS/pubbliche su bucket privato.
- Rimozione dipendenze Vercel Blob, Analytics e Speed Insights.
- Seed locale contenuti e admin locale.
- Test unitari S3 config e adapter `media-storage`.
- Smoke HTTP dev, production-like e container Docker production.
- Smoke CMS media via UI: login, upload, preview/download, rename, delete.

Gate locali verdi, il vero gate pre-deploy:

```bash
pnpm check:all
docker compose config
docker compose build app
```

## Macro attività codice prima degli acquisti

Queste attività non richiedono VPS, dominio trasferito o bucket reale. Sono il lavoro da chiudere prima di spendere soldi, così l'acquisto serve solo a validare infrastruttura e deploy.

### 1. Runtime production locale completo

- [x] Creare `docker-compose.prod.yml` versionato, separato dal compose locale con MinIO.
- [x] Aggiungere target Docker `migrator`, distinto dal target `runner`, con Prisma CLI, schema, migration files e script operativi.
- [x] Aggiungere `/api/health` con risposta stabile per healthcheck container e uptime esterno.
- [x] Separare healthcheck leggero e deep check: `/api/health` controlla il processo app; `/api/health?deep=1` controlla anche DB e Redis.
- [x] Aggiungere script npm per config, build, up, logs, migrate e bootstrap admin del runtime prod locale.
- [x] Verificare localmente build e avvio delle immagini `runner` e `migrator` su DB vuoto.

Attività da fare dopo questa macro:

- Sostituire i tag locali `middleware-app`/`middleware-migrator` con immagini GHCR nel deploy reale.
- Sul VPS rimuovere la pubblicazione locale `127.0.0.1:3000:3000`: l'app deve restare raggiungibile solo dal tunnel.
- Attivare il servizio `cloudflared` solo quando esiste `CLOUDFLARE_TUNNEL_TOKEN` reale.
- Collegare media e backup a bucket Hetzner reali; questo runtime prod locale non sostituisce il test upload su Object Storage reale.
- Decidere se mantenere `docker-compose.prod.yml` come file ibrido build+image o introdurre un override specifico VPS prima del primo deploy.
- Rendere silenziosa la build Next quando il DB non è raggiungibile: oggi le query build-time falliscono in modo gestito e non bloccante, ma sporcano i log Docker.

### 2. Pipeline CI/CD pronta ma non attiva

- Creare workflow GitHub con job `check` su PR verso `main`.
- Preparare job build ARM per app e migrator, taggati con SHA.
- Preparare deploy SSH dietro secret, anche se non ancora eseguibile senza VPS.
- Evitare tag `latest` come sorgente di verità: `IMAGE_TAG` deve restare lo SHA.
- Documentare rollback manuale per SHA precedente.

### 3. Script operativi testabili in locale

- Versionare `scripts/deploy.sh`, `scripts/healthcheck.sh`, `scripts/backup-db.sh`.
- Far usare a `deploy.sh` il servizio `migrate`, non il container app standalone.
- Rendere gli script idempotenti dove possibile e fallire presto con `set -euo pipefail`.
- Simulare rollback locale con immagine/tag precedente o almeno con healthcheck forzatamente fallito.
- Aggiungere un README breve per variabili `.env` VPS, senza valori reali.

### 4. Osservabilità in-app

- Aggiungere modelli Prisma `AnalyticsEvent`, `WebVital`, `ErrorLog`.
- Implementare collector analytics cookieless e web vitals.
- Implementare `instrumentation.ts` con `onRequestError` e sanitizzazione di cookie, auth header e body.
- Implementare route logging per `app/error.tsx` e `app/global-error.tsx`.
- Implementare aggregazioni per CMS senza query pesanti sulla tabella grezza.
- Implementare retention job governato da `TELEMETRY_RETENTION_DAYS`.

### 5. Backup e restore senza bucket reale

- Preparare `backup-db.sh` usando `pg_dump`, gzip e destinazione `rclone` configurabile.
- Preparare procedura restore su DB locale separato.
- Testare restore da dump locale prima di collegare Object Storage reale.
- Definire retention backup DB: lifecycle bucket o prune periodico.

### 6. Media e CSP

- Verificare che le immagini pubbliche funzionino via route applicative e cache Cloudflare.
- Per audio pesante, preparare strategia range request o URL firmati S3 diretti, evitando proxy Node per stream lunghi.
- Aggiornare CSP per route interne di analytics/error logging e per gli host finali previsti.
- Verificare che `/cms/*`, auth, tRPC e API private non siano cacheabili.

### 7. Gate finale pre-acquisto

Prima di comprare VPS o bucket, il gate locale deve essere:

```bash
pnpm check:all
docker compose config
docker compose build app
pnpm docker:prod:config
pnpm docker:prod:build
```

In più, su DB locale vuoto devono riuscire:

```bash
pnpm prisma:migrate:deploy
pnpm auth:bootstrap-admin
```

## Fasi operative

### Fase A - Preflight senza acquisti

- [ ] Checklist account e accessi: Hetzner Cloud, Hetzner Object Storage, Cloudflare, GitHub.
- [ ] Chiave SSH dedicata al deploy generata e pronta.
- [ ] Matrice segreti applicativi e infrastrutturali pronta, fuori dal repository.
- [ ] Comando per `BETTER_AUTH_SECRET` e `ANALYTICS_SALT_SECRET` pronto.
- [ ] Piano transfer dominio su Cloudflare Registrar pronto.
- [x] `docker-compose.prod.yml` preparato nel repo per runtime prod locale.
- [x] Target Docker `migrator` pronto.
- [x] `/api/health` implementato e usabile da Docker healthcheck.
- [ ] Workflow e script (`deploy.sh`, `backup-db.sh`, `healthcheck.sh`) preparati nel repo.
- [x] Target Docker `migrator` verificato su DB locale vuoto.
- [ ] Modelli Prisma `AnalyticsEvent`, `WebVital`, `ErrorLog` definiti.
- [ ] `instrumentation.ts`, route collector analytics, route logging errori, retention job implementati e testati in locale.
- [ ] Piano CSP per host app e route interne pronto.
- [ ] Piano backup e checklist smoke/rollback pronti.

#### SSH

```bash
ssh-keygen -t ed25519 -f ~/.ssh/middleware_deploy_ed25519 -C "middleware deploy"
```

- Public key in Hetzner durante la creazione VPS, e in `~deploy/.ssh/authorized_keys`.
- Private key nei secret GitHub come `SSH_KEY` e nel password manager.
- Dopo setup si usa solo l'utente `deploy`, mai `root`.

#### Matrice segreti

| Segreto                         | Dove              | Come generarlo                          |
| ------------------------------- | ----------------- | --------------------------------------- |
| `BETTER_AUTH_SECRET`            | `.env` VPS        | `openssl rand -base64 48`               |
| `ANALYTICS_SALT_SECRET`         | `.env` VPS        | `openssl rand -base64 32`               |
| `BOOTSTRAP_ADMIN_PASSWORD`      | `.env` VPS        | Password manager, almeno 20 caratteri   |
| `POSTGRES_USER`                 | `.env` VPS        | `middleware`                            |
| `POSTGRES_PASSWORD`             | `.env` VPS        | `openssl rand -base64 32`               |
| `CLOUDFLARE_TUNNEL_TOKEN`       | `.env` VPS        | Cloudflare Zero Trust, creazione tunnel |
| `GHCR_PAT`                      | `.env` VPS        | GitHub PAT read-only `read:packages`    |
| `S3_ACCESS_KEY`/`S3_SECRET_KEY` | `.env` VPS        | Hetzner Object Storage                  |
| `SSH_KEY`                       | Secret GitHub     | Chiave privata deploy dedicata          |
| `ALERT_WEBHOOK_URL`             | `.env` VPS (opz.) | ntfy/Telegram/Discord                   |

#### Dominio su Cloudflare Registrar

1. Aggiungi `middleware.media` come zona su Cloudflare e sposta i nameserver, attendi stato `active`.
2. Nel registrar attuale togli il registrar lock e disattiva la WHOIS privacy se blocca il transfer.
3. Recupera il codice di autorizzazione (auth code / EPP).
4. Verifica le regole dei 60 giorni su registrazione e transfer precedenti.
5. Avvia il transfer su Cloudflare e approva la FOA. Il transfer aggiunge un anno alla scadenza.

Il TLD `.media` è supportato e disponibile su Cloudflare Registrar.

### Fase B - Acquisti e risorse

- [ ] Creare VPS Hetzner CAX21 (ARM) Ubuntu 24.04 LTS arm64.
- [ ] Attivare snapshot automatici VPS.
- [ ] Creare bucket media `middleware-media-prod` privato, con versioning e lifecycle rule 90 giorni sulle versioni non correnti.
- [ ] Creare bucket backup DB separato.
- [ ] Generare access key S3 dedicate produzione.
- [ ] Annotare endpoint, region e valore corretto di `S3_FORCE_PATH_STYLE`.

### Fase C - VPS, Docker e Tunnel

- [ ] Creare utente non-root `deploy`.
- [ ] Hardening SSH: no root login, no password auth, `fail2ban`.
- [ ] Firewall: consenti solo SSH. Nessuna porta 80/443, l'ingress passa dal tunnel.
- [ ] Installare Docker Engine e Compose plugin.
- [ ] Creare `/opt/middleware` con `docker-compose.prod.yml`, `.env`, `scripts/`.
- [ ] Creare il tunnel in Cloudflare Zero Trust e salvare `CLOUDFLARE_TUNNEL_TOKEN`.
- [ ] Autenticare il VPS a GHCR con `GHCR_PAT`.
- [ ] Configurare il public hostname (temporaneo) verso `http://app:3000`.
- [ ] Unit systemd per `docker compose up -d` al boot.
- [ ] Avviare lo stack e verificare che `cloudflared` risulti connesso.

Gate fase C:

- Docker attivo, compose valido.
- Tunnel connesso e healthy in dashboard Cloudflare.
- SSH solo con utente non-root, nessuna porta web aperta.
- VPS autenticato a GHCR.

### Fase D - Deploy app e CI

- [ ] Configurare i secret GitHub: `SSH_HOST`, `SSH_USER`, `SSH_KEY`.
- [ ] Configurare `.env` produzione sul VPS dalla matrice applicativa e infrastrutturale.
- [ ] Primo deploy: build arm64 in CI, push GHCR, pull sul VPS.
- [ ] `pnpm prisma:migrate:deploy` su DB vuoto.
- [ ] `pnpm auth:bootstrap-admin` per il primo admin.
- [ ] Verificare l'app sull'hostname temporaneo del tunnel.

Gate fase D:

- App raggiungibile in HTTPS sull'hostname temporaneo.
- Login CMS funziona.
- Upload media sul bucket produzione funziona.
- Media pubblico servito solo se referenziato da contenuti pubblicati.
- Redis/rate limit funzionano in production mode.
- Rollback per SHA verificato almeno una volta.

### Fase E - Osservabilità e backup

- [ ] Verificare che `AnalyticsEvent` riceva eventi reali dal sito.
- [ ] Verificare che i Web Vitals arrivino e si vedano nel CMS.
- [ ] Verificare che un errore di test finisca in `ErrorLog`.
- [ ] Verificare i boundary `error.tsx`/`global-error.tsx`.
- [ ] Verificare il job di retention telemetria.
- [ ] Configurare `scripts/backup-db.sh` con cron giornaliero.
- [ ] Eseguire un restore test su DB di prova.
- [ ] Opzionale: collegare `ALERT_WEBHOOK_URL`.
- [ ] Attivare il Workflow uptime.

Gate fase E:

- Analytics, web vitals ed errori visibili nel CMS.
- Retention telemetria attiva.
- Backup DB schedulato e restore testato.
- Uptime check attivo.

### Fase F - Go-live pubblico

- [ ] Configurare il public hostname `middleware.media` e il redirect `www` -> apex.
- [ ] Rimuovere l'hostname temporaneo di verifica.
- [ ] Smoke produzione completo.
- [ ] Verificare backup schedulati.

Gate fase F:

- Produzione HTTPS verde via tunnel.
- CMS accessibile solo ad admin/editor.
- Pubblicazione articolo funziona.
- Media pubblico rispetta il modello permessi.
- Sitemap, robots, 404 e 500 gestita verificati.
- Redirect `www` -> apex verificato.

### Fase G - Post go-live

- [ ] Monitorare log container e metriche server nelle prime 48 ore.
- [ ] Verificare analytics, web vitals ed errori nel CMS.
- [ ] Verificare consumi VPS, DB, Redis e Object Storage.
- [ ] Aggiornare questo documento con esiti reali e deviazioni.

## Runbook operativo

### Fase 1 - VPS Hetzner

1. Crea il server: Falkenstein o Norimberga, Ubuntu 24.04 LTS arm64, tipo CAX21, chiave SSH dedicata, IPv4 + IPv6.
2. Connettiti come root e aggiorna:
   ```bash
   apt update && apt upgrade -y
   adduser deploy
   usermod -aG sudo deploy
   rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
   ```
3. Firewall, solo SSH:
   ```bash
   ufw allow OpenSSH
   ufw enable
   ```
4. Hardening SSH:
   ```bash
   apt install -y fail2ban
   ```
   In `/etc/ssh/sshd_config`: `PermitRootLogin no`, `PasswordAuthentication no`, poi `systemctl restart ssh`.
5. Attiva gli snapshot automatici dalla console Hetzner.

### Fase 2 - Docker

1. Installa Docker Engine e il plugin Compose seguendo la guida ufficiale Docker per Ubuntu.
2. Aggiungi `deploy` al gruppo docker:
   ```bash
   usermod -aG docker deploy
   ```
3. Crea la cartella di deploy:
   ```bash
   mkdir -p /opt/middleware/scripts
   ```
4. Copia `docker-compose.prod.yml` e gli script, crea `.env` con le env applicative e infrastrutturali. `.env` non va mai nel repository.
5. Autentica il VPS a GHCR:
   ```bash
   echo "$GHCR_PAT" | docker login ghcr.io -u OWNER --password-stdin
   ```

### Fase 3 - Cloudflare Tunnel

1. In Cloudflare Zero Trust crea un tunnel per `middleware.media`.
2. Copia il token e mettilo in `.env` come `CLOUDFLARE_TUNNEL_TOKEN`.
3. Per la verifica iniziale configura un public hostname temporaneo verso `http://app:3000`.
4. Avvia lo stack:
   ```bash
   cd /opt/middleware
   docker compose -f docker-compose.prod.yml up -d
   ```
5. Verifica in dashboard che il tunnel sia `Healthy`.

### Fase 4 - Object Storage

1. Crea `middleware-media-prod` e il bucket backup, nella region più vicina al VPS.
2. Genera access key e secret key dedicate.
3. Salva in `.env`: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_FORCE_PATH_STYLE`.
4. Mantieni il bucket privato, abilita versioning e lifecycle rule 90 giorni sulle versioni non correnti.
5. L'accesso pubblico ai media resta via route applicative, non via bucket pubblico.

### Fase 5 - App self-hosted, verifica

Già completato in locale, da riverificare. L'unico codice nuovo oltre la baseline è l'osservabilità in-app.

1. `output: "standalone"` in `next.config.ts`.
2. `cacheComponents: true`, senza route segment config incompatibili (`runtime`, `dynamic`, `revalidate`, `fetchCache`, `dynamicParams`).
3. Bucket S3 privato, accesso pubblico via route applicative.
4. `redis` come client standard, solo `REDIS_URL`.
5. `instrumentation.ts`, collector analytics, route logging errori, `useReportWebVitals`, retention job collegati.
6. `/api/health` implementato, usato da healthcheck e uptime.
7. CSP aggiornata agli host reali e alle route interne.
8. `BETTER_AUTH_URL` e `NEXT_PUBLIC_SITE_URL` sul dominio produzione.

### Fase 6 - Dockerfile

1. `Dockerfile` standalone alla root, `node:22-slim` multi-arch.
2. Target `runner` per l'app Next standalone.
3. Target `migrator` con Prisma CLI, schema, migration files e script operativi.
4. `openssl` nel base image per Prisma.
5. La build gira in CI su runner ARM nativo, quindi la RAM del VPS non è un vincolo di build.

### Fase 7 - Deploy via GitHub Action

1. Configura i secret GitHub: `SSH_HOST`, `SSH_USER`, `SSH_KEY`.
2. Il workflow su push a `main` builda le immagini arm64 `runner` e `migrator`, pusha su GHCR, entra in SSH e lancia `scripts/deploy.sh`.
3. `deploy.sh` fa login GHCR, backup, migrate dal servizio `migrate`, swap, healthcheck e rollback automatico.
4. Per tornare più indietro: imposta `IMAGE_TAG` allo SHA voluto in `.env` e rifai `docker compose up -d app`.

### Fase 8 - Inizializzazione dati

1. Se il DB non è vuoto, esegui prima `scripts/backup-db.sh`.
2. `docker compose -f docker-compose.prod.yml --profile ops run --rm migrate`.
3. `pnpm prisma:validate` resta gate locale/CI, non comando operativo nel container standalone.
4. `docker compose -f docker-compose.prod.yml --profile ops run --rm migrate pnpm auth:bootstrap-admin`.
5. Accedi al CMS e crea contenuti minimi reali: issue, categoria, autore, articolo draft.
6. Testa publish/unpublish e la revalidation pubblica.

### Fase 9 - Verifiche pre-pubbliche

1. Gate locale: `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm prisma:validate`, `pnpm build`.
2. Sull'hostname temporaneo: home, issue, articolo, pagina ascolto, pagine statiche, login CMS, CRUD, upload immagine e audio, preview/download media, media pubblico solo se referenziato, sitemap, robots, 404, 500.
3. Revalidation dopo publish/unpublish.
4. Header CSP nel browser.
5. Redis e rate limit in production mode.
6. Analytics, web vitals ed errori che compaiono nel CMS.

### Fase 10 - Backup e disaster recovery

1. `scripts/backup-db.sh`: `pg_dump` verso il bucket backup via `rclone`, cron giornaliero, retention 30 giorni.
2. Regola fissa: backup manuale prima di ogni migrazione, già nello step della Action.
3. Versioning sul bucket media con lifecycle rule, nessun secondo bucket.
4. Backup di `docker-compose.prod.yml`, `.env` e `scripts/` fuori dal server, cifrato o nel password manager.
5. Restore test su DB di prova.
6. Rebuild minimo: nuovo VPS CAX21, Docker, ripristino `/opt/middleware`, login GHCR, ripristino DB, ricollego bucket media, riconfiguro il tunnel.

### Fase 11 - Consegna audio e media

1. L'audio della pagina di ascolto è pesante e va servito con range request. Preferisci URL firmati direttamente da S3 invece di proxarlo dal processo Node, che altrimenti tiene occupato un worker per tutta la durata dell'ascolto.
2. Le immagini passano dalle route applicative con cache Cloudflare; l'ottimizzazione `next/image` gira sulla CPU ARM, accettabile a questa scala.

## Sicurezza al bordo

- Con il tunnel non hai porte web aperte, quindi la superficie d'attacco di rete è minima.
- Su `/cms/login` aggiungi una regola di rate limit Cloudflare contro il brute force, oltre al limiter Redis applicativo.
- Non cachare `/cms/*`, `/api/trpc/*`, `/api/cms/*` e le route auth. Cache lunga su `/_next/static/*`.

## GDPR

- Analytics first-party e cookieless, visitor hash con salt giornaliero, nessun IP grezzo: nessun banner consensi necessario.
- Unico cookie è quello di autenticazione, strettamente necessario.
- Pagina privacy policy che dichiara Hetzner e Cloudflare come processor.
- Telemetria interamente self-hosted, i dati non lasciano la tua infrastruttura.
- `AUDIT_LOG_RETENTION_DAYS=365`.

## Checklist finale attiva

### Risorse

- [ ] VPS CAX21 con Ubuntu 24.04 arm64.
- [ ] Snapshot Hetzner attivi.
- [ ] Bucket media privato con versioning e lifecycle.
- [ ] Bucket backup DB creato.
- [ ] Credenziali S3 fuori dal repository.

### Dominio e ingress

- [ ] Zona `middleware.media` attiva su Cloudflare.
- [ ] Transfer su Cloudflare Registrar completato.
- [ ] Tunnel creato e `Healthy`.
- [ ] Public hostname apex configurato verso `app:3000`.
- [ ] Redirect `www` -> apex.

### Server

- [ ] Utente non-root e SSH hardening.
- [ ] Firewall solo SSH, nessuna porta web aperta.
- [ ] Docker e Compose installati.
- [ ] VPS autenticato a GHCR.
- [ ] `/opt/middleware` con compose, `.env`, script.
- [ ] Systemd al boot.

### CI/CD

- [ ] Secret GitHub configurati.
- [ ] Workflow `check` verde sulle PR.
- [ ] Build arm64 su runner ARM nativo.
- [ ] Deploy su push a `main` funzionante.
- [ ] Rollback automatico su health check verificato.

### App e osservabilità

- [ ] `prisma:migrate:deploy` su produzione.
- [ ] Admin produzione creato.
- [ ] Upload media e pubblicazione funzionanti.
- [ ] `AnalyticsEvent` popolata da traffico reale.
- [ ] Web Vitals visibili nel CMS.
- [ ] `ErrorLog` popolata da errore di test.
- [ ] Boundary errori verificati.
- [ ] Retention telemetria attiva.
- [ ] CSP verificata nel browser.

### Backup e uptime

- [ ] `backup-db.sh` schedulato.
- [ ] Restore DB testato.
- [ ] Backup compose/env/script offsite.
- [ ] Workflow uptime attivo.

## Punti di attenzione

- **Niente Coolify, lavoro spostato su di te**: proxy/TLS via tunnel, riavvio via restart policy, backup via cron, deploy e rollback via Action e script. Tutto coperto, ma è glue che mantieni tu.
- **Niente staging**: test in locale con Docker, schema locale identico a produzione, gate `pnpm check:all` come barriera reale.
- **Build ARM**: la build gira su runner ARM nativo e produce immagini arm64. Se mai usassi `ubuntu-latest`, l'immagine sarebbe amd64 e il CAX21 darebbe "exec format error".
- **GHCR privato**: il VPS deve essere autenticato con un PAT read-only, altrimenti il `pull` fallisce. Il `GITHUB_TOKEN` automatico vale solo dentro il runner.
- **Migrazioni su produzione**: backup fresco prima di ogni migrazione, sempre, ed è uno step della Action. Per cambi di schema delicati usa il pattern espandi-e-contrai.
- **Swap deploy**: container singolo, blip di un paio di secondi a ogni deploy. Due repliche se lo vuoi seamless.
- **Tabelle telemetria che crescono**: senza retention gonfiano il Postgres. Il job di pulizia va attivo dal primo giorno.
- **Log volatili**: ciò che ti serve dopo un redeploy va su Postgres o su file/bucket, non solo su stdout.
- **Error log non è triage**: la tabella errori è un registro. Rinunci a grouping ricco, source map e alerting di GlitchTip. Il webhook da `onRequestError` copre la notifica, il grouping lo aggiungi in codice quando serve.
- **Uptime esterno**: non aggirabile, il monitor non può vivere sul box che monitora. Sta su GitHub Actions.
- **Cosa NON aggiungere**: niente motore di ricerca (Postgres FTS basta), niente OTel senza backend, niente worker separato (cron container per i job leggeri).
- **Legame con Cloudflare**: il tunnel rende l'ingress dipendente da Cloudflare, compromesso scelto per non esporre porte e non gestire certificati.
- **Single point of failure**: una sola VPS, nessun failover. Backup, snapshot e rebuild documentato sono il ripristino.
- **next/image**: ottimizzazione su CPU ARM, accettabile, con cache CDN sui media pubblici.
- **Email assente**: nuovi account editor creati a mano, recupero password admin via re-bootstrap dalla shell del container. Nessun reset via mail.
