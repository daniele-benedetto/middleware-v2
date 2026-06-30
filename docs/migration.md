# Primo deploy self-hosted del magazine Next.js

Documento operativo per portare il magazine Next.js su infrastruttura EU self-hosted.

Obiettivo: avviare produzione su Hetzner con Docker Compose diretto, Postgres, Redis, Object Storage S3-compatible, Cloudflare Tunnel e osservabilita in-app su Postgres/CMS.

Regola operativa: il dominio pubblico si attiva solo dopo verifica su hostname temporaneo, login CMS, upload media, pubblicazione, backup e restore test verificati.

## Dashboard

| Area                   | Stato    | Note                                                                          |
| ---------------------- | -------- | ----------------------------------------------------------------------------- |
| Baseline locale        | Fatto    | App, DB, Redis, MinIO, S3 adapter, seed, smoke, test, build                   |
| Runtime prod locale    | Fatto    | `docker-compose.prod.yml`, Docker target `runner`/`migrate`, `/api/health`    |
| Docker prod image      | Fatto    | Build app e migrator verificabili localmente                                  |
| Pipeline CI/CD         | Fatto    | Workflow deploy pronto, build ARM su `main`, deploy SSH gated                 |
| Script operativi       | Fatto    | `deploy.sh`, `healthcheck.sh`, `backup-db.sh`, `restore-db.sh`, README script |
| Telemetria backend     | Parziale | Modelli, migration, collector, schema/service/repository e test presenti      |
| Backup/restore locale  | Fatto    | Dump locale, retention e restore verificato su DB separato                    |
| VPS Hetzner            | Da fare  | CAX21 ARM 8 GB                                                                |
| Object Storage Hetzner | Da fare  | Bucket media e backup DB reali                                                |
| Cloudflare Tunnel      | Da fare  | VPS e zona Cloudflare                                                         |
| Osservabilita CMS      | Da fare  | Client telemetry, Web Vitals, server errors, pagine CMS, aggregati, retention |
| Backup/restore reale   | Da fare  | Prima del dominio pubblico                                                    |
| Produzione             | Da fare  | Solo dopo smoke verde e restore DB testato                                    |

## Decisioni operative

| Area                | Decisione                                              |
| ------------------- | ------------------------------------------------------ |
| Dominio canonico    | `middleware.media`                                     |
| Redirect produzione | `www.middleware.media` -> `middleware.media`           |
| Ambienti            | Solo produzione, nessuno staging                       |
| Test                | Locale con Docker                                      |
| Branch produzione   | `main`                                                 |
| Orchestrazione      | Docker Compose diretto, nessun PaaS                    |
| Deploy              | GitHub Action su push a `main`                         |
| CI gate             | `pnpm check:all` sulle PR verso `main`                 |
| Build immagini      | CI su runner ARM nativo, push app+migrator su GHCR     |
| Registry immagini   | GHCR                                                   |
| Rollback            | Redeploy dello SHA precedente con `scripts/deploy.sh`  |
| Ingress/TLS         | Cloudflare Tunnel, nessuna porta 80/443 aperta         |
| DNS/Registrar       | Cloudflare, dominio trasferito su Cloudflare Registrar |
| Email transazionale | Non prevista                                           |
| Analytics           | In-app su Postgres, cookieless con salt giornaliero    |
| Performance         | Web Vitals in-app                                      |
| Error tracking      | In-app su Postgres via `onRequestError` + boundary     |
| Alerting            | Opzionale via `ALERT_WEBHOOK_URL`                      |
| Uptime              | GitHub Action schedulata su `/api/health`              |
| Backup DB           | `pg_dump` schedulato su bucket Hetzner separato        |
| Backup media        | Versioning bucket media                                |
| Admin bootstrap     | Credenziali produzione scelte manualmente              |

Nota migrazioni: l'immagine Next standalone non e un ambiente operativo completo per Prisma. Le migration di produzione girano dal target `migrate`, che include workspace, Prisma CLI, schema, cartella `prisma/migrations` e script operativi come `auth:bootstrap-admin`.

Nota ARM: lo stack target e `linux/arm64`. La build immagini avviene su runner ARM nativo, senza QEMU.

## Stack target

- **VPS**: Hetzner CAX21, ARM Ampere, 4 vCPU, 8 GB RAM, 80 GB NVMe.
- **Runtime**: Docker Compose diretto sul VPS.
- **App**: Next.js standalone deployata da `main`.
- **DB**: Postgres in container.
- **Rate limit**: Redis in container.
- **Media**: Hetzner Object Storage S3-compatible, bucket privato con versioning.
- **Ingress/TLS**: Cloudflare Tunnel verso `app:3000` nella rete Compose.
- **CI/CD**: GitHub Actions, immagini app+migrator su GHCR, deploy via SSH.
- **Osservabilita**: telemetry tables su Postgres, dashboard CMS, uptime da GitHub Actions.

## Env produzione

### Env applicative

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
| `S3_ENDPOINT`              | Da bucket Hetzner                                       |
| `S3_REGION`                | Da bucket Hetzner                                       |
| `S3_BUCKET`                | `middleware-media-prod`                                 |
| `S3_ACCESS_KEY`            | Access key dedicata produzione                          |
| `S3_SECRET_KEY`            | Secret key dedicata produzione                          |
| `S3_FORCE_PATH_STYLE`      | Valore richiesto da endpoint Hetzner                    |
| `ANALYTICS_SALT_SECRET`    | `openssl rand -base64 32`                               |
| `BOOTSTRAP_ADMIN_EMAIL`    | Admin produzione                                        |
| `BOOTSTRAP_ADMIN_PASSWORD` | Password manager                                        |
| `BOOTSTRAP_ADMIN_NAME`     | Nome admin produzione                                   |
| `AUDIT_LOG_RETENTION_DAYS` | `365`                                                   |
| `TELEMETRY_RETENTION_DAYS` | `90`                                                    |
| `ALERT_WEBHOOK_URL`        | Opzionale                                               |

### Env infrastrutturali

Restano sul VPS o nei secret GitHub, mai nel repository.

| Env / Secret                | Dove vive     | Uso                            |
| --------------------------- | ------------- | ------------------------------ |
| `IMAGE_TAG`                 | `.env` VPS    | SHA immagine corrente          |
| `APP_IMAGE_REPOSITORY`      | `.env` VPS    | Repo GHCR app                  |
| `MIGRATOR_IMAGE_REPOSITORY` | `.env` VPS    | Repo GHCR migrator             |
| `CLOUDFLARE_TUNNEL_TOKEN`   | `.env` VPS    | Avvio `cloudflared`            |
| `POSTGRES_PASSWORD`         | `.env` VPS    | Container Postgres             |
| `POSTGRES_USER`             | `.env` VPS    | Utente DB, valore `middleware` |
| `GHCR_USER`                 | `.env` VPS    | Login GHCR dal VPS             |
| `GHCR_PAT`                  | `.env` VPS    | PAT read-only `read:packages`  |
| `RCLONE_REMOTE`             | `.env` VPS    | Remote backup DB               |
| `SSH_HOST`                  | Secret GitHub | Target deploy                  |
| `SSH_USER`                  | Secret GitHub | Utente `deploy`                |
| `SSH_KEY`                   | Secret GitHub | Chiave privata deploy dedicata |

Nota: il `GITHUB_TOKEN` automatico vale solo nel runner. Per il `pull` dal VPS serve un PAT read-only se il package GHCR resta privato.

## Stato repo

### Completato

- `docker-compose.prod.yml` versionato per runtime production-like locale.
- Dockerfile con target `runner` e `migrate`.
- `/api/health` con healthcheck leggero e deep check via query.
- Script npm `docker:prod:*` e `ops:*`.
- Workflow `.github/workflows/deploy.yml` con `check`, build ARM app+migrator e deploy SSH gated da `vars.ENABLE_PRODUCTION_DEPLOY`.
- Script `scripts/deploy.sh`, `scripts/healthcheck.sh`, `scripts/backup-db.sh`.
- Modelli Prisma telemetry e migration dedicata.
- Collector `POST /api/telemetry`.
- Modulo `lib/server/modules/telemetry` con schema, service, repository e policy.
- Test unitari per schema/service telemetry.

### Da completare nel codice prima degli acquisti

- Implementare `instrumentation.ts` con `onRequestError` tipizzato Next 16 e `telemetryService.recordServerError`.
- Implementare client telemetry `lib/telemetry/client.ts` con `sendBeacon` e fallback `fetch keepalive`.
- Aggiungere pageview tracking pubblico, escludendo `/cms`, `/api`, `/_next`, prefetch e bot evidenti.
- Aggiungere componente client isolato per `useReportWebVitals` e importarlo da `app/layout.tsx` senza rendere client il root layout.
- Aggiornare `app/error.tsx`, `app/global-error.tsx` e `app/(cms)/cms/error.tsx` per inviare `client-error`.
- Creare `telemetryRouter` tRPC admin-only con output DTO validati.
- Creare `/cms/analytics`, `/cms/performance`, `/cms/errors` e navigazione CMS admin-only.
- Implementare `scripts/refresh-telemetry-aggregates.mjs` idempotente sugli ultimi N giorni.
- Implementare `scripts/prune-telemetry.mjs` governato da `TELEMETRY_RETENTION_DAYS`.
- Aggiungere script npm `telemetry:aggregate`, `telemetry:prune`, `telemetry:jobs`.
- Aggiornare CSP per collector same-origin e host finali.
- Testare localmente analytics, Web Vitals, server error, boundary error, aggregazione, prune e CMS.

### Da fare solo su infrastruttura reale

- Creare VPS Hetzner CAX21 Ubuntu 24.04 arm64.
- Creare bucket media `middleware-media-prod` privato con versioning e lifecycle.
- Creare bucket backup DB separato.
- Generare credenziali S3 produzione.
- Configurare Cloudflare zone, transfer registrar e tunnel.
- Configurare `/opt/middleware` con compose, `.env` e script.
- Configurare GitHub secrets e abilitare `ENABLE_PRODUCTION_DEPLOY=true` solo a VPS pronto.
- Testare backup su bucket reale e restore su DB separato.
- Verificare rollback reale da SHA GHCR precedente.

## Osservabilita in-app

Tutto vive dentro Next.js e Postgres. Niente servizi esterni, niente cookie analytics, niente IP grezzi salvati.

Principi:

- Raccolta browser fire-and-forget: `navigator.sendBeacon`, fallback `fetch` con `keepalive: true`.
- Collector veloce: valida, normalizza, scrive e torna `204`.
- Nessun identificatore persistente: visitor hash giornaliero, senza cookie/localStorage/fingerprint stabile.
- Nessun dato sensibile persistito: niente IP grezzo, cookie, authorization header, body, password, token, session id o contenuti editoriali completi.
- CMS su aggregati, non scansioni raw non limitate.
- Retention attiva dal primo deploy.
- Errori osservabilita non bloccanti per l'esperienza utente.

### Gia implementato

- Modelli `AnalyticsEvent`, `WebVital`, `ErrorLog`, `TelemetryDailyAggregate`, `WebVitalDailyAggregate`.
- Indici principali per data, path, visitor hash, metrica, fingerprint e deduplica Web Vitals.
- Payload Zod discriminato `analytics`, `web-vital`, `client-error`.
- Collector unico `POST /api/telemetry` con limite payload e risposta `204`.
- Hash visitatore giornaliero con `ANALYTICS_SALT_SECRET`.
- Normalizzazione path/referrer e sanitizzazione metadata.
- Upsert `ErrorLog` per fingerprint.

### Checklist restante

- [ ] Client browser `track(event, metadata?)` e `reportWebVital(metric)`.
- [ ] Pageview tracking pubblico e tracking eventi editoriali utili: `page_view`, `article_view`, `issue_view`, `listen_view`.
- [ ] Web Vitals `LCP`, `CLS`, `INP`, `FCP`, `TTFB`, `FID` se disponibile.
- [ ] `instrumentation.ts` con `onRequestError` e sanitizzazione request context.
- [ ] Boundary errori collegati al collector.
- [ ] Aggregazioni giornaliere analytics e performance.
- [ ] Retention raw telemetry e error logs.
- [ ] Router tRPC admin-only per analytics/performance/errors.
- [ ] Pagine CMS dedicate.
- [ ] Cron operativo `telemetry:jobs` dal container `migrate`.
- [ ] Test locali end-to-end della pipeline telemetry.

### Criteri di accettazione

- Una visita pubblica genera al massimo un `page_view` per navigazione reale e non blocca render o navigazione.
- Nessuna riga telemetry contiene IP grezzo, cookie, authorization header, session token o body request.
- `/cms/analytics` legge aggregati e mostra visite, visitatori, top pagine, referrer e paesi.
- `/cms/performance` mostra p75/p95 per pagina senza query raw pesanti.
- Un errore server di test crea o aggiorna un gruppo in `ErrorLog`.
- Un errore intercettato da boundary arriva in `/cms/errors`.
- `telemetry:jobs` aggiorna aggregati e cancella raw oltre retention.
- `pnpm check:all` resta verde.

## Gate locale pre-acquisto

Prima di comprare VPS o bucket reale:

```bash
pnpm check:all
docker compose config
docker compose build app
pnpm docker:prod:config
pnpm docker:prod:build
BACKUP_DIR=/tmp/middleware-backup-test ./scripts/backup-db.sh
./scripts/restore-db.sh /tmp/middleware-backup-test/<dump>.sql.gz
```

Su DB locale vuoto devono riuscire:

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
- [x] Runtime prod locale pronto.
- [x] Workflow e script operativi pronti.
- [x] Backup/restore locale testato su DB separato.
- [x] Telemetria backend base pronta.
- [ ] Osservabilita CMS, client telemetry, aggregazioni e retention implementate.
- [ ] Piano CSP per host app e route interne pronto.
- [ ] Piano backup e checklist smoke/rollback pronti.

### Fase B - Acquisti e risorse

- [ ] Creare VPS Hetzner CAX21 Ubuntu 24.04 LTS arm64.
- [ ] Attivare snapshot automatici VPS.
- [ ] Creare bucket media privato con versioning e lifecycle.
- [ ] Creare bucket backup DB separato.
- [ ] Generare access key S3 dedicate produzione.
- [ ] Annotare endpoint, region e valore corretto di `S3_FORCE_PATH_STYLE`.

### Fase C - VPS, Docker e Tunnel

- [ ] Creare utente non-root `deploy`.
- [ ] Hardening SSH: no root login, no password auth, `fail2ban`.
- [ ] Firewall solo SSH, nessuna porta 80/443.
- [ ] Installare Docker Engine e Compose plugin.
- [ ] Creare `/opt/middleware` con `docker-compose.prod.yml`, `.env`, `scripts/`.
- [ ] Autenticare il VPS a GHCR con `GHCR_PAT`.
- [ ] Creare tunnel Cloudflare e salvare `CLOUDFLARE_TUNNEL_TOKEN`.
- [ ] Configurare public hostname temporaneo verso `http://app:3000`.
- [ ] Unit systemd per `docker compose up -d` al boot.
- [ ] Avviare lo stack e verificare `cloudflared` healthy.

Gate fase C:

- Docker attivo e compose valido.
- Tunnel connesso in Cloudflare.
- SSH solo con utente non-root.
- Nessuna porta web aperta.
- VPS autenticato a GHCR.

### Fase D - Deploy app e CI

- [ ] Configurare i secret GitHub: `SSH_HOST`, `SSH_USER`, `SSH_KEY`.
- [ ] Configurare `.env` produzione sul VPS.
- [ ] Configurare `APP_IMAGE_REPOSITORY`, `MIGRATOR_IMAGE_REPOSITORY`, `IMAGE_TAG`.
- [ ] Abilitare `ENABLE_PRODUCTION_DEPLOY=true`.
- [ ] Primo deploy: build arm64 in CI, push GHCR, pull sul VPS.
- [ ] Eseguire migration su DB vuoto dal servizio `migrate`.
- [ ] Eseguire `auth:bootstrap-admin` dal servizio `migrate`.
- [ ] Verificare app sull'hostname temporaneo.

Gate fase D:

- App HTTPS raggiungibile sull'hostname temporaneo.
- Login CMS funziona.
- Upload media sul bucket produzione funziona.
- Media pubblico servito solo se referenziato da contenuti pubblicati.
- Redis/rate limit funzionano in production mode.
- Rollback per SHA verificato almeno una volta.

### Fase E - Osservabilita e backup

- [ ] Verificare eventi analytics reali.
- [ ] Verificare Web Vitals reali.
- [ ] Verificare errori server e boundary in `ErrorLog`.
- [ ] Verificare pagine `/cms/analytics`, `/cms/performance`, `/cms/errors`.
- [ ] Verificare aggregazioni e retention telemetry.
- [ ] Configurare `scripts/backup-db.sh` con cron giornaliero.
- [ ] Eseguire restore test su DB di prova.
- [ ] Opzionale: collegare `ALERT_WEBHOOK_URL`.
- [ ] Attivare workflow uptime.

Gate fase E:

- Analytics, Web Vitals ed errori visibili nel CMS.
- Retention telemetria attiva.
- Aggregazioni aggiornate senza query pesanti sulle tabelle raw.
- Backup DB schedulato e restore testato.
- Uptime check attivo.

### Fase F - Go-live pubblico

- [ ] Configurare public hostname `middleware.media`.
- [ ] Configurare redirect `www` -> apex.
- [ ] Rimuovere hostname temporaneo.
- [ ] Smoke produzione completo.
- [ ] Verificare backup schedulati.

Gate fase F:

- Produzione HTTPS verde via tunnel.
- CMS accessibile solo ad admin/editor.
- Pubblicazione articolo funziona.
- Media pubblico rispetta il modello permessi.
- Sitemap, robots, 404 e 500 verificati.
- Redirect `www` -> apex verificato.

### Fase G - Post go-live

- [ ] Monitorare log container e metriche server nelle prime 48 ore.
- [ ] Verificare analytics, Web Vitals ed errori nel CMS.
- [ ] Verificare consumi VPS, DB, Redis e Object Storage.
- [ ] Aggiornare questo documento con esiti reali e deviazioni.

## Runbook VPS

### Setup server

1. Crea server Hetzner: CAX21, Ubuntu 24.04 LTS arm64, Falkenstein o Norimberga, chiave SSH dedicata.
2. Crea utente `deploy`, abilita sudo e copia la chiave SSH.
3. Configura firewall solo SSH.
4. Installa `fail2ban`.
5. Disabilita root login e password auth in SSH.
6. Installa Docker Engine e Compose plugin.
7. Aggiungi `deploy` al gruppo docker.
8. Crea `/opt/middleware/scripts`.
9. Copia `docker-compose.prod.yml`, `scripts/` e `.env`.
10. Autentica il VPS a GHCR con `GHCR_PAT`.

### Tunnel e storage

1. Crea tunnel Cloudflare Zero Trust.
2. Salva `CLOUDFLARE_TUNNEL_TOKEN` in `.env`.
3. Configura hostname temporaneo verso `http://app:3000`.
4. Crea bucket media e bucket backup DB.
5. Salva env S3 in `.env`.
6. Mantieni bucket media privato, con versioning e lifecycle.

### Primo deploy

1. Configura secret GitHub `SSH_HOST`, `SSH_USER`, `SSH_KEY`.
2. Verifica workflow `check` sulle PR.
3. Abilita deploy con `ENABLE_PRODUCTION_DEPLOY=true` solo a VPS pronto.
4. Esegui push su `main`.
5. Verifica migration, bootstrap admin e healthcheck.
6. Accedi al CMS e crea contenuti minimi reali.
7. Testa publish/unpublish, revalidation e media.

### Backup e disaster recovery

- `scripts/backup-db.sh` usa `pg_dump`, gzip, retention locale con `BACKUP_RETENTION_DAYS` e `rclone` se `RCLONE_REMOTE` e configurato.
- `scripts/restore-db.sh <backup.sql.gz>` ripristina su Postgres Compose, rifiuta DB non vuoti di default e verifica tabelle minime.
- Backup manuale prima di ogni migrazione: lo script deploy lo prevede.
- Cron giornaliero backup DB su bucket backup dopo configurazione `rclone` reale.
- Restore locale testato su DB separato; resta da testare restore da dump scaricato dal bucket reale.
- Backup offsite cifrato o password manager per `docker-compose.prod.yml`, `.env` e `scripts/`.
- Rebuild minimo: nuovo VPS CAX21, Docker, ripristino `/opt/middleware`, login GHCR, restore DB, ricollego bucket media, riconfiguro tunnel.

## Smoke pre-pubblico

- Home, issue, articolo, pagina ascolto e pagine statiche.
- Login CMS, CRUD editoriale, upload immagine/audio, preview/download media.
- Media pubblico solo se referenziato da contenuti pubblicati.
- Sitemap, robots, 404, 500.
- Revalidation dopo publish/unpublish.
- Header CSP nel browser.
- Redis e rate limit in production mode.
- Analytics, Web Vitals ed errori visibili nel CMS.
- Backup e restore testati.
- Rollback per SHA verificato.

## Sicurezza e GDPR

- Con Cloudflare Tunnel non ci sono porte web aperte sul VPS.
- `/cms/login` puo avere rate limit Cloudflare oltre al limiter Redis applicativo.
- Non cachare `/cms/*`, `/api/trpc/*`, `/api/cms/*` e auth routes.
- Cache lunga su `/_next/static/*` e media pubblici cacheabili.
- Analytics first-party e cookieless, visitor hash con salt giornaliero, nessun IP grezzo.
- Cookie auth strettamente necessario.
- Privacy policy: dichiarare Hetzner e Cloudflare come processor.
- Telemetria self-hosted su Postgres.
- `AUDIT_LOG_RETENTION_DAYS=365`.

## Punti di attenzione

- Niente Coolify: proxy/TLS, riavvio, backup, deploy e rollback sono glue gestita dal progetto.
- Niente staging: locale Docker e `pnpm check:all` sono la barriera reale.
- Build ARM: usare runner ARM nativo, altrimenti rischio `exec format error` su CAX21.
- GHCR privato: il VPS deve avere PAT read-only.
- Migrazioni produzione: backup fresco prima di ogni migration, schema compatibile expand-contract.
- Swap deploy: container singolo, possibile blip di pochi secondi.
- DB rollback non automatico: per schema rotto valutare restore dal dump pre-migrazione.
- Tabelle telemetria: retention obbligatoria dal primo giorno.
- Log stdout volatili: cio che deve sopravvivere va su Postgres o bucket.
- Uptime esterno: GitHub Actions, non il box monitorato.
- Audio pesante: preferire range request o URL firmati S3 diretti, evitando proxy Node per stream lunghi.
- Single point of failure: una sola VPS, ripristino tramite backup, snapshot e rebuild documentato.
