# Primo deploy su Hetzner + Coolify

Documento operativo unico per portare il magazine Next.js su infrastruttura EU self-hosted.

Obiettivo: avviare un ambiente pulito su Hetzner + Coolify, senza migrazione di contenuti, database o immagini esistenti.

Regola operativa: il dominio principale si punta al VPS solo dopo staging, upload media, login CMS, pubblicazione, backup e restore test verificati.

## Dashboard

| Area                    | Stato   | Note                                                        |
| ----------------------- | ------- | ----------------------------------------------------------- |
| Baseline locale         | Fatto   | App, DB, Redis, MinIO, S3 adapter, seed, smoke, test, build |
| Docker production image | Fatto   | `docker compose build app` completato e smoke container OK  |
| Decisioni pre-acquisto  | Fatto   | Domini, Cloudflare, Umami, GlitchTip, bucket, dati separati |
| Preflight documentale   | Fatto   | Runbook, env, DNS, backup, segreti e checklist deploy       |
| VPS Hetzner             | Da fare | Richiede acquisto/creazione server                          |
| Coolify                 | Da fare | Richiede VPS e DNS                                          |
| Object Storage Hetzner  | Da fare | Richiede bucket reali e credenziali                         |
| Staging                 | Da fare | Dopo VPS, Coolify, DB, Redis, bucket                        |
| Backup/restore          | Da fare | Prima del dominio production                                |
| Production              | Da fare | Solo dopo staging verde                                     |

## Stack target

- **VPS**: Hetzner CX32, 4 vCPU, 8 GB RAM, 80 GB NVMe, datacenter Falkenstein o Norimberga.
- **PaaS**: Coolify v4 per deploy, SSL, env, database e backup.
- **DB**: Postgres gestito da Coolify.
- **Rate limit**: Redis gestito da Coolify.
- **Media**: Hetzner Object Storage S3-compatible, bucket privato.
- **DNS/CDN**: Cloudflare.
- **Analytics**: Umami self-hosted, cookieless.
- **Errori**: GlitchTip self-hosted.
- **Monitoring**: metriche server, log container, uptime check.

## Decisioni pre-acquisto

Queste decisioni non richiedono ancora acquisti e definiscono i valori da usare quando si creano VPS, DNS, bucket e ambienti Coolify.

| Area                 | Decisione                                                        |
| -------------------- | ---------------------------------------------------------------- |
| Dominio canonico     | `middleware.media`                                               |
| Redirect produzione  | `www.middleware.media` -> `middleware.media`                     |
| Staging              | `staging.middleware.media`                                       |
| Dashboard Coolify    | `coolify.middleware.media`                                       |
| DNS/CDN              | Cloudflare                                                       |
| Analytics            | Umami self-hosted                                                |
| Error tracking       | GlitchTip self-hosted                                            |
| Dati staging/prod    | Separati                                                         |
| Bucket media prod    | `middleware-media-prod`                                          |
| Bucket media staging | `middleware-media-staging`                                       |
| Backup DB            | Bucket Hetzner separato                                          |
| Admin bootstrap      | Credenziali separate scelte manualmente per staging e production |

### Matrice env target

| Env                        | Staging                                  | Production                                  |
| -------------------------- | ---------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`     | `https://staging.middleware.media`       | `https://middleware.media`                  |
| `BETTER_AUTH_URL`          | `https://staging.middleware.media`       | `https://middleware.media`                  |
| `DATABASE_URL`             | Da Postgres Coolify staging              | Da Postgres Coolify production              |
| `POSTGRES_URL`             | Uguale a `DATABASE_URL` staging          | Uguale a `DATABASE_URL` production          |
| `PRISMA_DATABASE_URL`      | Uguale a `DATABASE_URL` staging          | Uguale a `DATABASE_URL` production          |
| `REDIS_URL`                | Da Redis Coolify staging                 | Da Redis Coolify production                 |
| `S3_ENDPOINT`              | Da Hetzner Object Storage                | Da Hetzner Object Storage                   |
| `S3_REGION`                | Da bucket Hetzner scelto                 | Da bucket Hetzner scelto                    |
| `S3_BUCKET`                | `middleware-media-staging`               | `middleware-media-prod`                     |
| `S3_ACCESS_KEY`            | Access key dedicata staging              | Access key dedicata production              |
| `S3_SECRET_KEY`            | Secret key dedicata staging              | Secret key dedicata production              |
| `S3_FORCE_PATH_STYLE`      | Valore richiesto da endpoint Hetzner     | Valore richiesto da endpoint Hetzner        |
| `BOOTSTRAP_ADMIN_EMAIL`    | Admin staging scelto manualmente         | Admin production scelto manualmente         |
| `BOOTSTRAP_ADMIN_PASSWORD` | Password staging scelta manualmente      | Password production scelta manualmente      |
| `BOOTSTRAP_ADMIN_NAME`     | Nome admin staging scelto manualmente    | Nome admin production scelto manualmente    |
| `BETTER_AUTH_SECRET`       | Secret staging generato ad alta entropia | Secret production generato ad alta entropia |
| `AUDIT_LOG_RETENTION_DAYS` | `365`                                    | `365`                                       |

### DNS target

| Host                       | Uso                 | Note                           |
| -------------------------- | ------------------- | ------------------------------ |
| `middleware.media`         | App production      | Canonico                       |
| `www.middleware.media`     | Redirect production | Redirect permanente verso apex |
| `staging.middleware.media` | App staging         | Ambiente dati separato         |
| `coolify.middleware.media` | Dashboard Coolify   | Accesso dashboard dopo setup   |

### Servizi self-hosted da prevedere in Coolify

- App Next.js staging.
- App Next.js production.
- Postgres staging.
- Postgres production.
- Redis staging.
- Redis production.
- Umami self-hosted.
- GlitchTip self-hosted.

## Baseline locale completata

Il branch `infra/self-hosting-prep` è pronto per essere deployato su infrastruttura reale. La baseline locale include:

- Dockerfile production standalone con `openssl` per Prisma.
- Compose locale con app, Postgres, Redis, MinIO, `minio-init` e `migrate`.
- Prisma baseline pulita per DB vuoto.
- Storage S3 adapter e route media CMS/pubbliche su bucket privato.
- Rimozione dipendenze Vercel Blob, Analytics e Speed Insights.
- Seed locale contenuti e admin locale.
- Test unitari S3 config e adapter `media-storage`.
- Smoke HTTP dev, production-like e container Docker production.
- Smoke CMS media via UI: login, upload, preview/download, rename, delete.

Gate locali verdi:

```bash
pnpm check:all
docker compose config
docker compose build app
```

## Piano aggiornato

Da qui in avanti il lavoro è diviso in fasi operative. La fase A si completa senza pagare o creare infrastruttura permanente. Dalla fase B in poi servono VPS, DNS, bucket e servizi reali.

### Fase A - Preflight senza acquisti

Obiettivo: arrivare al momento dell'acquisto con runbook, accessi, segreti, DNS e checklist già pronti.

- [x] Preparare checklist account e accessi: Hetzner Cloud, Hetzner Object Storage, Cloudflare, GitHub, email admin.
- [x] Preparare comando e destinazione per chiave SSH dedicata.
- [x] Preparare matrice segreti senza salvare valori nel repository.
- [x] Preparare comandi per generare `BETTER_AUTH_SECRET` staging e production.
- [x] Preparare piano password per admin Coolify, admin staging, admin production, Umami e GlitchTip.
- [x] Preparare piano DNS Cloudflare con record, proxy mode e ordine di attivazione.
- [x] Preparare piano CSP per host app, Umami, GlitchTip e media via route applicative.
- [x] Preparare piano backup: bucket backup, retention, frequenza, restore test.
- [x] Preparare checklist smoke staging e production in ordine eseguibile.
- [x] Preparare checklist rollback/rebuild minima.

#### Account e accessi

| Accesso                | Uso                         | Stato prima acquisto                     | Dove conservarlo           |
| ---------------------- | --------------------------- | ---------------------------------------- | -------------------------- |
| Hetzner Cloud          | VPS e snapshot              | Account pronto, billing verificato       | Password manager           |
| Hetzner Object Storage | Bucket media e backup       | Accesso pronto, bucket non ancora creati | Password manager           |
| Cloudflare             | DNS/CDN                     | Dominio `middleware.media` accessibile   | Password manager           |
| GitHub                 | Repository e Coolify source | Accesso admin al repository verificato   | Account personale protetto |
| Email admin staging    | Bootstrap admin staging     | Scelta manualmente prima della creazione | Password manager           |
| Email admin production | Bootstrap admin production  | Scelta manualmente prima della creazione | Password manager           |
| Email operativa        | Alert, uptime, recovery     | Casella monitorata                       | Password manager           |

#### SSH

Generare una chiave dedicata alla VPS, senza riusare chiavi personali generiche:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/middleware_hetzner_ed25519 -C "middleware.media hetzner"
```

Regole operative:

- Salvare la public key in Hetzner Cloud durante la creazione VPS.
- Salvare la private key solo sulla macchina amministrativa e nel password manager se supporta allegati sicuri.
- Non committare mai chiavi SSH nel repository.
- Dopo setup, usare solo utente `deploy`, non `root`.

#### Matrice segreti

I valori reali vanno salvati in password manager o nelle env Coolify, mai nel repository.

| Segreto                    | Staging | Production | Fonte/come generarlo                  |
| -------------------------- | ------- | ---------- | ------------------------------------- |
| `BETTER_AUTH_SECRET`       | Da fare | Da fare    | `openssl rand -base64 48`             |
| `BOOTSTRAP_ADMIN_EMAIL`    | Da fare | Da fare    | Scelta manuale                        |
| `BOOTSTRAP_ADMIN_PASSWORD` | Da fare | Da fare    | Password manager, almeno 20 caratteri |
| `BOOTSTRAP_ADMIN_NAME`     | Da fare | Da fare    | Scelta manuale                        |
| `DATABASE_URL`             | Da fare | Da fare    | Coolify Postgres                      |
| `POSTGRES_URL`             | Da fare | Da fare    | Uguale a `DATABASE_URL`               |
| `PRISMA_DATABASE_URL`      | Da fare | Da fare    | Uguale a `DATABASE_URL`               |
| `REDIS_URL`                | Da fare | Da fare    | Coolify Redis                         |
| `S3_ACCESS_KEY`            | Da fare | Da fare    | Hetzner Object Storage                |
| `S3_SECRET_KEY`            | Da fare | Da fare    | Hetzner Object Storage                |
| Coolify admin password     | N/A     | Da fare    | Password manager                      |
| Umami admin password       | N/A     | Da fare    | Password manager                      |
| GlitchTip admin password   | N/A     | Da fare    | Password manager                      |
| GlitchTip DSN              | Da fare | Da fare    | GlitchTip project                     |
| Uptime monitor credentials | N/A     | Da fare    | Provider scelto                       |

Comandi consigliati:

```bash
openssl rand -base64 48
openssl rand -base64 32
```

Usare il primo per `BETTER_AUTH_SECRET`, il secondo per password generate manualmente se non si usa il generator del password manager.

#### DNS Cloudflare

Creare i record solo dopo avere l'IPv4/IPv6 del VPS. Prima del deploy staging, tenere Cloudflare in modalità DNS/proxy coerente con SSL Coolify.

| Host                       | Tipo    | Target                      | Proxy Cloudflare  | Quando attivarlo                    |
| -------------------------- | ------- | --------------------------- | ----------------- | ----------------------------------- |
| `coolify.middleware.media` | A/AAAA  | IP VPS                      | DNS only iniziale | Subito dopo installazione Coolify   |
| `staging.middleware.media` | A/AAAA  | IP VPS                      | DNS only iniziale | Prima del deploy staging            |
| `middleware.media`         | A/AAAA  | IP VPS                      | DNS only iniziale | Solo dopo staging e restore test OK |
| `www.middleware.media`     | CNAME/A | `middleware.media` o IP VPS | DNS only iniziale | Solo in fase production             |

Regole Cloudflare post-verifica:

- SSL mode: `Full (strict)` dopo certificati validi su Coolify.
- Proxy arancione solo dopo verifica login CMS, cookie auth e tRPC.
- Non applicare cache HTML globale.
- Non cachare `/cms/*`, `/api/trpc/*`, `/api/cms/*`, route auth.
- Cache lunga consentita per `/_next/static/*`.
- Cache su `/api/public/media/blob` solo rispettando header applicativi.

#### Piano CSP

La CSP definitiva si aggiorna dopo host reali e script effettivi. Piano previsto:

| Direttiva     | Host previsti                                   | Note                                      |
| ------------- | ----------------------------------------------- | ----------------------------------------- |
| `script-src`  | `'self'`, eventuale host Umami                  | Aggiungere Umami solo quando installato   |
| `connect-src` | `'self'`, Umami, GlitchTip                      | Necessario per analytics/error reporting  |
| `img-src`     | `'self'`, `data:`, `blob:`                      | Media serviti via route applicative       |
| `media-src`   | `'self'`, `blob:`                               | Audio via route applicative               |
| `frame-src`   | Nessuno di default                              | Aggiungere solo se necessario             |
| `style-src`   | `'self'`, `'unsafe-inline'` se ancora richiesto | Da mantenere finché necessario a Next/CSS |

`images.remotePatterns` resta invariato se i media continuano a passare da route applicative. Aggiornarlo solo se si decide di servire immagini direttamente da CDN/S3.

#### Piano backup

| Backup                  | Destinazione              | Frequenza                  | Retention iniziale | Test richiesto              |
| ----------------------- | ------------------------- | -------------------------- | ------------------ | --------------------------- |
| Postgres staging        | Bucket backup Hetzner     | Giornaliera                | 7 giorni           | Restore su DB prova         |
| Postgres production     | Bucket backup Hetzner     | Giornaliera                | 30 giorni          | Restore prima del go-live   |
| Config Coolify          | Export manuale + offsite  | Dopo ogni cambio rilevante | 3 copie            | Rebuild runbook             |
| Bucket media staging    | Versioning o sync manuale | Da decidere dopo bucket    | Da decidere        | Recupero oggetto cancellato |
| Bucket media production | Versioning o sync manuale | Da decidere dopo bucket    | Da decidere        | Recupero oggetto cancellato |

Condizione obbligatoria: production non va live finché un restore DB è stato completato almeno una volta.

#### Smoke staging

Eseguire in ordine:

1. Aprire `https://staging.middleware.media` e verificare HTTP 200.
2. Verificare `robots.txt` e `sitemap.xml`.
3. Accedere a `/cms/login`.
4. Creare categoria, autore e issue smoke.
5. Caricare immagine.
6. Caricare audio se previsto dal contenuto.
7. Creare articolo draft con media.
8. Pubblicare articolo.
9. Verificare pagina articolo pubblica.
10. Verificare `/api/public/media/blob` per media referenziato.
11. Verificare 404 per media non referenziato da contenuti pubblicati.
12. Verificare rename media e sincronizzazione riferimenti.
13. Verificare delete media e pulizia riferimenti.
14. Verificare revalidation dopo publish/unpublish.
15. Verificare rate limit con Redis in production mode.
16. Verificare CSP nel browser.
17. Verificare evento Umami.
18. Verificare errore test GlitchTip.

#### Smoke production

Eseguire solo dopo staging verde e restore DB testato:

1. Aprire `https://middleware.media` e verificare HTTP 200.
2. Verificare redirect `https://www.middleware.media` -> `https://middleware.media`.
3. Verificare login CMS production.
4. Creare contenuto reale minimo o draft smoke.
5. Caricare media reale.
6. Pubblicare articolo reale o smoke autorizzato.
7. Verificare articolo pubblico.
8. Verificare media pubblico solo se referenziato.
9. Verificare sitemap e robots.
10. Verificare 404 e pagina errore gestita.
11. Verificare backup production schedulato.
12. Verificare Umami production.
13. Verificare GlitchTip production.

#### Rollback e rebuild minimo

Rollback applicativo:

1. In Coolify, redeploy dell'ultimo commit stabile.
2. Se il problema è env, ripristinare env precedente dal password manager/export Coolify.
3. Se il problema è DB migration, fermarsi e valutare restore: non improvvisare rollback manuali sul DB production.

Rebuild infrastruttura minima:

1. Creare nuovo VPS.
2. Installare Coolify.
3. Ripristinare configurazione Coolify salvata offsite.
4. Ricollegare repository GitHub.
5. Creare/ripristinare Postgres.
6. Ripristinare ultimo backup DB valido.
7. Ricollegare bucket media esistenti.
8. Verificare staging.
9. Spostare DNS Cloudflare al nuovo IP.
10. Verificare production.

Gate per chiudere la fase A:

- [x] `docs/migration.md` contiene checklist preflight completa.
- [x] Nessun segreto reale è committato.
- [x] Le decisioni residue sono ridotte a valori ottenibili solo dopo creazione risorse reali.

### Fase B - Acquisti e risorse base

Obiettivo: creare solo le risorse necessarie e annotare valori reali.

- [ ] Creare VPS Hetzner CX32 Ubuntu 24.04 LTS.
- [ ] Attivare snapshot automatici VPS.
- [ ] Creare bucket media `middleware-media-staging` privato.
- [ ] Creare bucket media `middleware-media-prod` privato.
- [ ] Creare bucket backup DB separato.
- [ ] Generare access key S3 dedicate per staging.
- [ ] Generare access key S3 dedicate per production.
- [ ] Annotare endpoint, region e valore corretto di `S3_FORCE_PATH_STYLE`.

Gate per chiudere la fase B:

- VPS raggiungibile via SSH.
- Bucket creati e privati.
- Credenziali salvate fuori dal repository.

### Fase C - VPS e Coolify

Obiettivo: rendere il server sicuro e installare il PaaS.

- [ ] Creare utente non-root `deploy`.
- [ ] Applicare hardening SSH: no root login, no password auth.
- [ ] Configurare firewall con SSH, 80, 443 e 8000 solo durante setup.
- [ ] Installare Coolify.
- [ ] Configurare `https://coolify.middleware.media`.
- [ ] Collegare GitHub App al repository.
- [ ] Chiudere porta 8000 dopo conferma HTTPS su Coolify.

Gate per chiudere la fase C:

- Coolify accessibile via HTTPS.
- SSH funziona con utente non-root.
- Porta 8000 chiusa.

### Fase D - Servizi staging

Obiettivo: deployare staging con dati separati e verificare end-to-end.

- [ ] Creare ambiente Coolify `staging`.
- [ ] Creare Postgres staging non pubblico.
- [ ] Creare Redis staging non pubblico.
- [ ] Creare app staging da Dockerfile.
- [ ] Configurare env staging usando la matrice target.
- [ ] Puntare `staging.middleware.media` in Cloudflare.
- [ ] Applicare migrazioni Prisma su staging.
- [ ] Creare admin staging.
- [ ] Eseguire smoke staging completo.

Gate per chiudere la fase D:

- Home staging risponde in HTTPS.
- Login CMS staging funziona.
- Upload media funziona su bucket staging.
- Media pubblico è servito solo se referenziato da contenuti pubblicati.
- Redis/rate limit funzionano in production mode.

### Fase E - Osservabilità e backup staging

Obiettivo: attivare strumenti operativi prima della produzione.

- [ ] Deployare Umami self-hosted.
- [ ] Deployare GlitchTip self-hosted.
- [ ] Aggiornare CSP per Umami e GlitchTip.
- [ ] Configurare backup DB staging e production verso bucket backup separato.
- [ ] Eseguire restore test su database di prova.
- [ ] Documentare procedura rebuild minima con backup config Coolify.

Gate per chiudere la fase E:

- Umami riceve evento da staging.
- GlitchTip riceve errore test da staging.
- Restore DB testato.
- Procedura rebuild documentata.

### Fase F - Production

Obiettivo: creare produzione solo dopo staging, osservabilità e backup verdi.

- [ ] Creare ambiente Coolify `production`.
- [ ] Creare Postgres production non pubblico.
- [ ] Creare Redis production non pubblico.
- [ ] Creare app production da Dockerfile.
- [ ] Configurare env production usando la matrice target.
- [ ] Puntare `middleware.media` e `www.middleware.media` in Cloudflare.
- [ ] Applicare migrazioni Prisma su production.
- [ ] Creare admin production.
- [ ] Eseguire smoke production completo.
- [ ] Verificare redirect `www.middleware.media` -> `middleware.media`.
- [ ] Verificare backup production schedulati.

Gate per chiudere la fase F:

- Production HTTPS verde.
- CMS production accessibile solo ad admin/editor.
- Pubblicazione articolo funziona.
- Media pubblico rispetta il modello permessi.
- Sitemap, robots, 404 e 500 gestita verificati.

### Fase G - Post go-live

Obiettivo: stabilizzare il sistema dopo il primo deploy pubblico.

- [ ] Monitorare log container e metriche server nelle prime 48 ore.
- [ ] Verificare eventi Umami.
- [ ] Verificare alert/errori GlitchTip.
- [ ] Verificare consumi VPS, DB, Redis e Object Storage.
- [ ] Verificare cache Cloudflare e bypass su CMS/API.
- [ ] Aggiornare `docs/migration.md` con esiti reali e deviazioni dal piano.

## Regola sui test failing

- I test failing sono utili solo nel branch o in PR draft per guidare l'implementazione.
- `main` deve restare sempre verde con `pnpm check:all`.
- Se un test descrive comportamento futuro ma non è ancora implementabile, usare `it.skip` con una descrizione precisa.
- Ogni PR pronta al merge deve rimuovere skip non più necessari o trasformarli in test attivi.
- Non abbassare la qualità dei gate per far passare la migrazione infrastrutturale.

## Runbook operativo

Questa sezione descrive le attività da fare quando si acquistano VPS, Object Storage, dominio CDN o servizi esterni.

### Fase 0 - Prerequisiti

1. Registra o prepara gli account necessari:
   - Hetzner Cloud
   - Hetzner Object Storage
   - Coolify via VPS
   - registrar o provider DNS del dominio
   - GitHub con accesso al repository
2. Genera una chiave SSH dedicata se non esiste:
   ```bash
   ssh-keygen -t ed25519
   ```
3. Usa i domini operativi già decisi:
   - app staging: `staging.middleware.media`
   - app produzione canonica: `middleware.media`
   - redirect produzione: `www.middleware.media` -> `middleware.media`
   - dashboard Coolify: `coolify.middleware.media`
4. Prepara i valori production delle env:
   - `NEXT_PUBLIC_SITE_URL`
   - `DATABASE_URL`
   - `POSTGRES_URL`
   - `PRISMA_DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL`
   - `BOOTSTRAP_ADMIN_EMAIL`
   - `BOOTSTRAP_ADMIN_PASSWORD`
   - `BOOTSTRAP_ADMIN_NAME`
   - `AUDIT_LOG_RETENTION_DAYS`
   - `REDIS_URL`
   - `S3_ENDPOINT`
   - `S3_REGION`
   - `S3_BUCKET`
   - `S3_ACCESS_KEY`
   - `S3_SECRET_KEY`
   - `S3_FORCE_PATH_STYLE`

### Fase 1 - VPS Hetzner

1. Crea il server in Hetzner Cloud:
   - Location: Falkenstein o Norimberga
   - Image: Ubuntu 24.04 LTS
   - Type: CX32
   - SSH key: chiave pubblica dedicata
   - Networking: IPv4 + IPv6
2. Collegati come root:
   ```bash
   ssh root@IP_DEL_SERVER
   ```
3. Aggiorna il sistema e crea un utente non-root:
   ```bash
   apt update && apt upgrade -y
   adduser deploy
   usermod -aG sudo deploy
   rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
   ```
4. Configura il firewall:
   ```bash
   ufw allow OpenSSH
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw allow 8000/tcp
   ufw enable
   ```
5. Applica l'hardening SSH minimo:
   ```bash
   apt install -y fail2ban
   ```
6. In `/etc/ssh/sshd_config`, imposta:
   ```text
   PermitRootLogin no
   PasswordAuthentication no
   ```
7. Riavvia SSH:
   ```bash
   systemctl restart ssh
   ```
8. Attiva gli snapshot automatici del VPS dalla console Hetzner.

### Fase 2 - Installazione Coolify

1. Installa Coolify sul VPS:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
   ```
2. Apri `http://IP_DEL_SERVER:8000` e crea subito l'account admin.
3. In Coolify, valida il server locale `localhost`.
4. Collega GitHub da Sources -> GitHub e installa la GitHub App sul repository.
5. Configura l'FQDN della dashboard in Settings -> Configuration:
   ```text
   https://coolify.middleware.media
   ```
6. Punta il DNS di `coolify.middleware.media` al VPS e verifica SSL automatico.

### Fase 3 - Progetto, Postgres e Redis

1. Crea un progetto Coolify, per esempio `magazine`.
2. Crea gli ambienti `staging` e `production`.
3. Nell'ambiente `production`, aggiungi PostgreSQL.
4. Nell'ambiente `production`, aggiungi Redis.
5. Ripeti o clona le risorse per `staging` se vuoi separare completamente i dati di test.
6. Lascia Postgres e Redis non esposti pubblicamente.
7. Annota le connection string interne generate da Coolify.
8. Usa il formato SSL supportato dal container Postgres effettivo; se il DB resta nella rete Docker interna, non forzare parametri SSL incompatibili.

### Fase 4 - Object Storage pulito

1. Crea un bucket Hetzner Object Storage nella region più vicina al VPS.
2. Genera access key e secret key dedicati all'app.
3. Salva questi valori per Coolify:
   - `S3_ENDPOINT`
   - `S3_REGION`
   - `S3_BUCKET`
   - `S3_ACCESS_KEY`
   - `S3_SECRET_KEY`
   - `S3_FORCE_PATH_STYLE`
4. Mantieni il bucket privato come default.
5. Mantieni l'accesso pubblico ai media attraverso le route applicative, così il server può controllare quali file sono servibili pubblicamente.
6. Usa il CDN davanti all'app o davanti a una route pubblica cacheable, non come bypass del modello di permessi CMS.

### Fase 5 - Adeguamento app self-hosted

Stato: già completato nel branch locale, da verificare di nuovo prima del deploy.

1. Mantieni `output: "standalone"` in `next.config.ts`.
2. Mantieni `cacheComponents: true` e non aggiungere route segment config incompatibili:
   - `runtime`
   - `dynamic`
   - `revalidate`
   - `fetchCache`
   - `dynamicParams`
3. Mantieni bucket S3 privato e accesso pubblico via route applicative.
4. Mantieni `redis` come client Redis standard e configura solo `REDIS_URL`.
5. Aggiorna CSP e `images.remotePatterns` agli host reali quando saranno noti.
6. Verifica che `BETTER_AUTH_URL` e `NEXT_PUBLIC_SITE_URL` puntino al dominio corretto per ogni ambiente.

### Fase 6 - Dockerfile pnpm

Stato: completato nel branch locale.

1. Usa il `Dockerfile` alla root del progetto.
2. Usa `node:22-slim` per evitare problemi nativi comuni con `sharp` e `next/image`.
3. Mantieni `openssl` installato nel base image per Prisma.
4. Se la build sul VPS va in OOM, abilita swap o sposta la build immagine su GitHub Actions.

### Fase 7 - Deploy staging

1. In Coolify, crea una Application nell'ambiente `staging`.
2. Seleziona il repository GitHub.
3. Build pack: Dockerfile.
4. Porta interna: `3000`.
5. Imposta il dominio:
   ```text
   staging.middleware.media
   ```
6. Punta il DNS di `staging.middleware.media` al VPS.
7. Configura le env staging:
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_SITE_URL=https://staging.middleware.media`
   - `BETTER_AUTH_URL=https://staging.middleware.media`
   - `BETTER_AUTH_SECRET`
   - `DATABASE_URL`
   - `POSTGRES_URL`
   - `PRISMA_DATABASE_URL`
   - `REDIS_URL`
   - `AUDIT_LOG_RETENTION_DAYS`
   - `BOOTSTRAP_ADMIN_EMAIL`
   - `BOOTSTRAP_ADMIN_PASSWORD`
   - `BOOTSTRAP_ADMIN_NAME`
   - env S3
8. Avvia il deploy e verifica che Coolify generi il certificato SSL.

### Fase 8 - Inizializzazione dati puliti

1. Apri una shell sul container applicativo o usa un job one-shot con le stesse env.
2. Applica le migrazioni Prisma:
   ```bash
   pnpm prisma:migrate:deploy
   ```
3. Verifica lo schema:
   ```bash
   pnpm prisma:validate
   ```
4. Crea il primo admin:
   ```bash
   pnpm auth:bootstrap-admin
   ```
5. Accedi al CMS su staging.
6. Crea contenuti minimi reali o di smoke test:
   - issue
   - categoria
   - autore
   - articolo draft
   - pagina statica se necessaria
7. Testa publish/unpublish e verifica la revalidation pubblica.

### Fase 9 - Verifiche staging

1. Esegui i controlli locali prima del merge/deploy finale:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test:run
   pnpm prisma:validate
   pnpm build
   ```
2. Verifica sullo staging:
   - home pubblica
   - pagina issue
   - pagina articolo
   - pagina ascolto articolo se usata
   - pagine statiche pubbliche
   - login CMS
   - CRUD CMS principali
   - upload immagine
   - upload audio
   - preview/download media CMS
   - media pubblico solo quando referenziato da contenuti pubblicati
   - sitemap
   - robots
   - 404
   - 500 gestita
3. Verifica cache pubblica e revalidation dopo publish/unpublish.
4. Verifica header CSP nel browser e correggi eventuali blocchi legittimi.
5. Verifica che Redis sia raggiungibile e che i rate limit non falliscano in production mode.

### Fase 10 - Analytics, errori e monitoring

1. Analytics:
   - deploya Umami da Coolify oppure usa un servizio esterno con DPA adeguato
   - aggiungi lo snippet nel layout solo dopo aver aggiornato la CSP
   - mantieni l'analytics cookieless se vuoi evitare banner non necessari
2. Error tracking:
   - deploya GlitchTip self-hosted da Coolify
   - configura il progetto GlitchTip per staging e production
   - aggiungi DSN e CSP solo dopo verifica HTTPS
3. Metriche server:
   - usa l'agent Coolify se sufficiente
   - aggiungi Netdata se vuoi metriche più dettagliate
4. Log:
   - usa i log container di Coolify
   - aggiungi Dozzle solo se serve una UI dedicata
5. Uptime:
   - usa Uptime Kuma self-hosted oppure UptimeRobot
   - controlla dominio pubblico, staging e dashboard Coolify

### Fase 11 - Backup e disaster recovery

1. Configura backup schedulati di Postgres in Coolify.
2. Usa una destinazione S3-compatible per i backup DB:
   - bucket Hetzner separato
3. Imposta cadenza giornaliera e retention coerente con il budget.
4. Abilita versioning sul bucket media o sync periodico verso un secondo bucket.
5. Esegui backup della config Coolify:
   ```bash
   tar czf /tmp/coolify-$(date +%F).tar.gz /data/coolify/
   cp /data/coolify/source/.env /tmp/coolify-env-$(date +%F).backup
   ```
6. Sposta i backup config fuori dal server in storage cifrato o password manager.
7. Esegui un restore test su database di prova.
8. Documenta la procedura minima di rebuild:
   - creare nuovo VPS
   - installare Coolify
   - ripristinare config
   - ripristinare DB
   - ricollegare bucket media
   - puntare DNS al nuovo IP

### Fase 12 - Deploy produzione

1. Crea o clona l'app Coolify nell'ambiente `production`.
2. Configura le env production:
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_SITE_URL=https://middleware.media`
   - `BETTER_AUTH_URL=https://middleware.media`
   - `BETTER_AUTH_SECRET`
   - `DATABASE_URL`
   - `POSTGRES_URL`
   - `PRISMA_DATABASE_URL`
   - `REDIS_URL`
   - `AUDIT_LOG_RETENTION_DAYS`
   - `BOOTSTRAP_ADMIN_EMAIL`
   - `BOOTSTRAP_ADMIN_PASSWORD`
   - `BOOTSTRAP_ADMIN_NAME`
   - env S3 production
3. Aggiungi i domini all'app:
   - `middleware.media`
   - `www.middleware.media`
4. Punta i record DNS A/AAAA al VPS e configura Cloudflare come reverse proxy.
5. Verifica SSL automatico su dominio principale e `www`.
6. Applica le migrazioni Prisma in production:
   ```bash
   pnpm prisma:migrate:deploy
   ```
7. Crea il primo admin production:
   ```bash
   pnpm auth:bootstrap-admin
   ```
8. Esegui smoke test produzione:
   - home
   - CMS login
   - creazione draft
   - upload media
   - pubblicazione articolo
   - pagina articolo pubblica
   - sitemap
   - robots
   - redirect `www`/non-`www`
9. Chiudi la porta 8000:
   ```bash
   ufw delete allow 8000/tcp
   ```
10. Usa Coolify solo da `https://coolify.middleware.media`.

### Fase 13 - CDN e DNS

1. Configura SSL mode `Full (strict)` se usi Cloudflare.
2. Cache consigliata:
   - cache lunga per `/_next/static/*`
   - cache rispettando gli header per `/api/public/media/blob`
   - nessuna cache HTML globale di default
3. Mantieni Cloudflare compatibile con login CMS, cookie auth e route tRPC.
4. Non cachare:
   - `/cms/*`
   - `/api/trpc/*`
   - `/api/cms/*`
   - route auth
5. Firma DPA con i processor coinvolti.
6. Verifica i subprocessor per Hetzner, CDN, analytics ed error tracking.

## Checklist finale attiva

### Preflight

- [x] Checklist account/accessi completata.
- [x] Matrice segreti pronta e salvata fuori repository.
- [x] Piano DNS Cloudflare pronto.
- [x] Piano CSP pronto.
- [x] Piano backup e restore pronto.
- [x] Checklist smoke staging e production pronta.
- [x] Checklist rollback/rebuild pronta.

### Risorse reali

- [ ] VPS creato con Ubuntu 24.04 LTS.
- [ ] Snapshot Hetzner attivi.
- [ ] Bucket media staging privato creato.
- [ ] Bucket media production privato creato.
- [ ] Bucket backup DB creato.
- [ ] Credenziali S3 staging e production salvate fuori repository.

### Server e Coolify

- [ ] Utente non-root configurato.
- [ ] SSH hardening applicato.
- [ ] Firewall attivo.
- [ ] Coolify installato e accessibile via `https://coolify.middleware.media`.
- [ ] Porta 8000 chiusa dopo setup.
- [ ] GitHub App collegata.

### Staging

- [ ] Postgres staging creato e non pubblico.
- [ ] Redis staging creato e non pubblico.
- [ ] Deploy staging riuscito.
- [ ] `pnpm prisma:migrate:deploy` eseguito su staging.
- [ ] Admin staging creato.
- [ ] Upload media funzionante su staging.
- [ ] Pubblicazione e revalidation funzionanti su staging.
- [ ] Media pubblico servito solo se referenziato da contenuti pubblicati.
- [ ] Redis/rate limit verificati in production mode.
- [ ] Header CSP verificati nel browser.

### Osservabilità e backup

- [ ] Umami self-hosted attivo.
- [ ] GlitchTip self-hosted attivo.
- [ ] Backup DB schedulati.
- [ ] Restore DB testato.
- [ ] Backup config Coolify salvato offsite.
- [ ] Procedura rebuild documentata.

### Production

- [ ] Postgres production creato e non pubblico.
- [ ] Redis production creato e non pubblico.
- [ ] Deploy production riuscito.
- [ ] `pnpm prisma:migrate:deploy` eseguito su production.
- [ ] Admin production creato.
- [ ] SSL valido su `middleware.media`, `www.middleware.media` e `coolify.middleware.media`.
- [ ] Smoke test production completato.
- [ ] Redirect `www.middleware.media` -> `middleware.media` verificato.
- [ ] Analytics attive.
- [ ] Error tracking attivo.
- [ ] Uptime monitor attivo.
- [ ] DPA verificati per provider coinvolti.

## Punti di attenzione

- **Database pulito**: non importare dati mock in production. Crea solo admin e contenuti iniziali reali.
- **Media privati**: il bucket resta privato; la pubblicazione passa dalle route applicative per rispettare il modello CMS.
- **Cache Components**: usa `cacheLife`, `cacheTag` e `revalidateTag`; non introdurre vecchie route segment config incompatibili.
- **Single point of failure**: una sola VPS non ha failover automatico. Backup, snapshot e rebuild documentato sono la strategia di ripristino.
- **Build RAM**: se la build Docker satura la RAM, abilita swap o builda l'immagine in CI.
- **next/image**: l'ottimizzazione gira sulla CPU del VPS. A questa scala è accettabile; usa cache CDN sui media pubblici.
