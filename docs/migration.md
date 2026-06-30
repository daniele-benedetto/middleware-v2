# Primo deploy su Hetzner + Coolify

Documento operativo unico per portare il magazine Next.js su infrastruttura EU self-hosted.

Obiettivo: avviare un ambiente pulito su Hetzner + Coolify, senza migrazione di contenuti, database o immagini esistenti.

Regola operativa: il dominio principale si punta al VPS solo dopo staging, upload media, login CMS, pubblicazione, backup e restore test verificati.

## Dashboard

| Area                            | Stato   | Note                                                             |
| ------------------------------- | ------- | ---------------------------------------------------------------- |
| Branch preparazione             | Fatto   | `infra/self-hosting-prep`                                        |
| Docker locale                   | Fatto   | App, Postgres, Redis, MinIO, `minio-init`, `migrate`             |
| Prisma baseline                 | Fatto   | Migration iniziale pulita per DB vuoto                           |
| Admin locale                    | Fatto   | Creato con `pnpm auth:bootstrap-admin`                           |
| Next standalone                 | Fatto   | `output: "standalone"` in `next.config.ts`                       |
| Static params build-safe        | Fatto   | Fallback per DB vuoto + Cache Components                         |
| Storage S3 adapter              | Fatto   | `lib/server/storage/*` con AWS SDK                               |
| Upload CMS                      | Fatto   | Multipart server-side su `mediaStorage.put`                      |
| Route media CMS                 | Fatto   | `/api/cms/media/blob` legge da storage adapter                   |
| Route media pubblica            | Fatto   | `/api/public/media/blob` legge da storage adapter e controlla DB |
| Media list/rename/delete        | Fatto   | Media repository/service usano `mediaStorage`                    |
| Vercel Blob                     | Fatto   | Dipendenza rimossa da `package.json`                             |
| Vercel Analytics/Speed Insights | Fatto   | Dipendenze rimosse da `package.json`                             |
| CSP/host Vercel                 | Fatto   | Da riverificare quando esistono host reali S3/CDN                |
| Test unitari S3 config          | Fatto   | Env valide e mancanti                                            |
| Test unitari adapter S3 diretto | Fatto   | Copertura diretta SDK mockato per `media-storage`                |
| Seed locale contenuti           | Fatto   | Issue, categorie, autore, 8 tag e 11 articoli pubblicati         |
| Smoke HTTP locale               | Fatto   | Dev e production-like con media pubblici da MinIO                |
| Smoke CMS media locale          | Fatto   | UI verificata: login, upload, rename, delete                     |
| Build Docker app                | Fatto   | `docker compose build app` completato, smoke container OK        |
| VPS Hetzner                     | Da fare | Richiede acquisto/creazione server                               |
| Coolify                         | Da fare | Richiede VPS e DNS                                               |
| Object Storage Hetzner          | Da fare | Richiede bucket reale e credenziali production                   |
| Staging                         | Da fare | Dopo VPS, Coolify, DB, Redis, bucket                             |
| Backup/restore                  | Da fare | Prima del dominio production                                     |
| Production                      | Da fare | Solo dopo staging verde                                          |

## Stack target

- **VPS**: Hetzner CX32, 4 vCPU, 8 GB RAM, 80 GB NVMe, datacenter Falkenstein o Norimberga.
- **PaaS**: Coolify v4 per deploy, SSL, env, database e backup.
- **DB**: Postgres gestito da Coolify.
- **Rate limit**: Redis gestito da Coolify.
- **Media**: Hetzner Object Storage S3-compatible, bucket privato.
- **DNS/CDN**: Cloudflare free oppure Bunny.net se si vuole evitare processor USA.
- **Analytics**: Umami self-hosted, cookieless.
- **Errori**: Sentry cloud oppure GlitchTip self-hosted.
- **Monitoring**: metriche server, log container, uptime check.

## Stato branch locale

Branch attivo:

```bash
infra/self-hosting-prep
```

Obiettivo del branch: rendere il progetto testabile in locale con gli stessi componenti logici della produzione self-hosted.

### Completato

- [x] Creato branch `infra/self-hosting-prep`.
- [x] Aggiunto `Dockerfile` production basato su `pnpm`.
- [x] Aggiunto `.dockerignore`.
- [x] Aggiunto `docker-compose.yml` locale con app, Postgres, Redis e MinIO.
- [x] Aggiunto servizio compose `minio-init` per creare il bucket locale `middleware-media`.
- [x] Aggiunto servizio compose `migrate` per eseguire `pnpm prisma:migrate:deploy` prima dell'app.
- [x] Aggiunti script `pnpm docker:up`, `pnpm docker:down`, `pnpm docker:logs`.
- [x] Aggiunti script `pnpm docker:infra:up`, `pnpm docker:infra:down`, `pnpm docker:infra:logs`.
- [x] Aggiornato `README.md` con lo stack locale self-hosted.
- [x] Aggiornato `.env.example` con env S3/MinIO.
- [x] Spostato il vecchio `.env` remoto in `.env.remote-backup` ignorato da git.
- [x] Creato `.env` locale puntato a Postgres, Redis e MinIO su Docker.
- [x] Sostituita la cronologia Prisma storica con una migration iniziale pulita per DB vuoto.
- [x] Avviata infrastruttura locale con `pnpm docker:infra:up`.
- [x] Applicata baseline Prisma su Postgres Docker locale.
- [x] Creato admin locale con `pnpm auth:bootstrap-admin`.
- [x] Aggiunto `output: "standalone"` in `next.config.ts`.
- [x] Installato `openssl` nel base image Docker per Prisma su `node:22-slim`.
- [x] Aggiunto fallback static params per build con DB pulito e Cache Components.
- [x] Aggiunto test unitario per `ensureNonEmptyStaticParams`.
- [x] Aggiunta dipendenza `@aws-sdk/client-s3`.
- [x] Creati moduli server-only S3: `s3-config`, `s3-client`, `media-storage`.
- [x] Implementati metodi storage: `listAll`, `head`, `put`, `copy`, `delete`, `get`.
- [x] Mantenuti DTO media compatibili: `url`, `downloadUrl`, `pathname`, `contentType`, `size`, `uploadedAt`, `etag`.
- [x] Spostato upload CMS da Vercel Blob a upload multipart server-side.
- [x] Spostata route `GET /api/cms/media/blob` su storage adapter.
- [x] Spostata route `GET /api/public/media/blob` su storage adapter con controllo DB sui contenuti pubblicati.
- [x] Spostati media service `list`, `rename`, `delete` su storage adapter.
- [x] Spostata lettura JSON audio chunks su storage adapter.
- [x] Rimossi `@vercel/blob`, `@vercel/analytics`, `@vercel/speed-insights` da `package.json`.
- [x] Corretto seed locale `scripts/create-first-issue.mjs` per serializzare esplicitamente i campi JSON.
- [x] Caricata immagine locale `jolly-roger.jpg` su MinIO come `jolly-roger.jpg` senza tracciarla in git.
- [x] Eseguito seed locale contenuti con `scripts/create-first-issue.mjs`.
- [x] Creati/aggiornati 5 categorie, 8 tag, autore `Redazione`, issue pubblicata e 11 articoli pubblicati.
- [x] Assegnati 3 tag a ciascun articolo seed, per 33 relazioni `article_tags`.
- [x] Allungata la descrizione rich text del numero seed a 5 paragrafi.
- [x] Svuotato il DB locale, riapplicata la migration pulita, ricreato admin e rieseguito il seed.

### Verifiche completate

- [x] `docker compose config`
- [x] `pnpm prettier "docker-compose.yml" "package.json" "README.md" "docs/migration.md" "next.config.ts" --check`
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test:run`
- [x] `pnpm prisma:validate`
- [x] `pnpm build` con DB Docker locale migrato
- [x] `pnpm dev` con risposta HTTP da `http://localhost:3000`
- [x] Smoke S3/MinIO reale con put/head/get/delete su bucket `middleware-media`
- [x] Smoke dev: home, login CMS, issue pubblica, articolo pubblico e media pubblico `jolly-roger.jpg`
- [x] Smoke production-like: `pnpm build`, `pnpm start`, home, login CMS, issue, articolo, media pubblico, sitemap e robots
- [x] Login admin verificato via Better Auth API con cookie sessione restituito
- [x] Verifica permessi media: oggetto presente in MinIO ma non referenziato da contenuto pubblicato torna 404
- [x] Smoke CMS media locale via UI: login, upload, preview/download, rename, delete
- [x] Test unitari diretti `media-storage`: list, head, put, copy, delete, get e mapping errori S3
- [x] Pull Docker `node:22-slim` completato
- [x] `docker compose build app` completato
- [x] Smoke container app production su rete Compose con risposta HTTP `200 OK` da `http://localhost:3001`

### Bloccato

- Nessun blocco locale attivo. Le prossime attività richiedono infrastruttura reale o decisioni su host/provider.

## Prossime attività tecniche

### 1. Copertura adapter storage

Stato: completato.

Obiettivo: chiudere la copertura diretta dell'adapter S3, oggi coperto soprattutto tramite route/service.

- [x] Unit test `mediaStorage.listAll` con SDK mockato.
- [x] Unit test `mediaStorage.head` con SDK mockato.
- [x] Unit test `mediaStorage.put` con content type, size e conflitto se oggetto esiste.
- [x] Unit test `mediaStorage.copy` con ETag e conflitto se target esiste.
- [x] Unit test `mediaStorage.delete` con `IfMatch`.
- [x] Unit test `mediaStorage.get` con stream valido.
- [x] Unit test mapping errori S3 verso `StorageNotFoundError`, `StorageConflictError`, `StorageAccessError`.

Gate per chiudere:

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm prisma:validate
pnpm build
docker compose config
```

### 2. Smoke CMS media locale via UI

Stato: completato.

Obiettivo: completare la parte manuale via browser del flusso reale end-to-end con MinIO locale.

Gia verificato da CLI:

- admin locale presente
- immagine seed caricata su MinIO
- seed articoli pubblicati completato
- pagine pubbliche e media pubblici serviti correttamente in `pnpm dev`
- pagine pubbliche e media pubblici serviti correttamente in `pnpm start` dopo `pnpm build`
- login admin verificato via endpoint Better Auth
- media non referenziati da contenuti pubblicati non sono pubblici
- login CMS verificato via browser
- upload media verificato via UI
- preview/download media verificati via UI
- rename media verificato via UI
- delete media verificato via UI

### 3. Riprovare build Docker app

Stato: completato.

Obiettivo: chiudere il blocco ambientale sul pull dell'immagine base.

Verifiche completate:

- `docker pull node:22-slim`
- `docker compose build app`
- smoke container production su rete Compose con porta locale alternativa `3001`, perché `3000` era già occupata

Nota residua: se la build sul VPS va in OOM, abilitare swap o spostare la build immagine su GitHub Actions.

### 4. Preparare host reali

Obiettivo: sostituire placeholder locali con valori production/staging solo quando esistono VPS, DNS e bucket.

- [ ] Definire dominio staging, production e Coolify.
- [ ] Definire endpoint Hetzner Object Storage reale.
- [ ] Aggiornare CSP agli host reali di app, S3/CDN, analytics, error tracking.
- [ ] Aggiornare `images.remotePatterns` solo se i media vengono serviti da host esterni all'app.
- [ ] Verificare `BETTER_AUTH_URL` e `NEXT_PUBLIC_SITE_URL` per ogni ambiente.

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
3. Decidi i domini operativi:
   - app staging: `staging.tuodominio.it`
   - app produzione: `tuodominio.it` e `www.tuodominio.it`
   - dashboard Coolify: `coolify.tuodominio.it`
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
   https://coolify.tuodominio.it
   ```
6. Punta il DNS di `coolify.tuodominio.it` al VPS e verifica SSL automatico.

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
   staging.tuodominio.it
   ```
6. Punta il DNS di `staging.tuodominio.it` al VPS.
7. Configura le env staging:
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_SITE_URL=https://staging.tuodominio.it`
   - `BETTER_AUTH_URL=https://staging.tuodominio.it`
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
   - usa Sentry cloud con DPA oppure GlitchTip self-hosted
   - evita Sentry self-hosted completo su questa VPS
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
   - oppure Backblaze B2 separato
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
   - `NEXT_PUBLIC_SITE_URL=https://tuodominio.it`
   - `BETTER_AUTH_URL=https://tuodominio.it`
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
   - `tuodominio.it`
   - `www.tuodominio.it`
4. Punta i record DNS A/AAAA al VPS o configura Cloudflare/Bunny come reverse proxy.
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
10. Usa Coolify solo da `https://coolify.tuodominio.it`.

### Fase 13 - CDN e DNS

1. Configura SSL mode `Full (strict)` se usi Cloudflare.
2. Cache consigliata:
   - cache lunga per `/_next/static/*`
   - cache rispettando gli header per `/api/public/media/blob`
   - nessuna cache HTML globale di default
3. Mantieni Cloudflare/Bunny compatibile con login CMS, cookie auth e route tRPC.
4. Non cachare:
   - `/cms/*`
   - `/api/trpc/*`
   - `/api/cms/*`
   - route auth
5. Firma DPA con i processor coinvolti.
6. Verifica i subprocessor per Hetzner, CDN, analytics ed error tracking.

## Checklist finale

### Locale/branch

- [x] Branch `infra/self-hosting-prep` creato
- [x] Dockerfile pnpm presente
- [x] `.dockerignore` presente
- [x] `docker-compose.yml` locale presente
- [x] Postgres locale configurato
- [x] Redis locale configurato
- [x] MinIO locale configurato
- [x] Bucket locale `middleware-media` creato da `minio-init`
- [x] Migration Prisma iniziale pulita presente
- [x] `.env.example` con env S3/MinIO
- [x] `next.config.ts` con `output: "standalone"`
- [x] Adapter S3 interno presente
- [x] Upload CMS su storage adapter
- [x] Route media CMS su storage adapter
- [x] Route media pubblica su storage adapter
- [x] Media service `list`, `rename`, `delete` su storage adapter
- [x] `@vercel/blob` rimosso
- [x] `@vercel/analytics` e `@vercel/speed-insights` rimossi
- [x] Seed locale contenuti completato
- [x] Smoke HTTP locale completato in dev e start production-like
- [x] Unit test diretti completi per `media-storage`
- [x] Smoke CMS media locale completato via UI
- [x] `docker compose build app` completato

### Gate locali

- [x] `docker compose config` passato
- [x] `pnpm lint` passato
- [x] `pnpm typecheck` passato
- [x] `pnpm test:run` passato
- [x] `pnpm prisma:validate` passato
- [x] `pnpm build` passato con DB Docker locale migrato
- [x] `pnpm check:all` passato prima del merge finale

### Infrastruttura

- [ ] VPS creato con Ubuntu 24.04 LTS
- [ ] Utente non-root configurato
- [ ] SSH hardening applicato
- [ ] Firewall attivo con porte 80/443 e SSH
- [ ] Snapshot Hetzner attivi
- [ ] Coolify installato e accessibile via FQDN HTTPS
- [ ] Porta 8000 chiusa dopo setup
- [ ] Postgres production creato e non pubblico
- [ ] Redis production creato e non pubblico
- [ ] Bucket S3 production creato e privato
- [ ] CSP aggiornata agli host reali
- [ ] `images.remotePatterns` aggiornato se necessario

### Staging

- [ ] Deploy staging riuscito
- [ ] `pnpm prisma:migrate:deploy` eseguito su staging
- [ ] Admin staging creato
- [ ] Upload media funzionante su staging
- [ ] Pubblicazione e revalidation funzionanti su staging
- [ ] Media pubblico servito solo se referenziato da contenuti pubblicati
- [ ] Redis/rate limit verificati in production mode
- [ ] Header CSP verificati nel browser

### Backup e recovery

- [ ] Backup DB schedulati
- [ ] Restore DB testato
- [ ] Backup config Coolify salvato offsite
- [ ] Procedura rebuild documentata

### Production

- [ ] Deploy production riuscito
- [ ] `pnpm prisma:migrate:deploy` eseguito su production
- [ ] Admin production creato
- [ ] SSL valido su dominio principale, `www` e Coolify
- [ ] Smoke test production completato
- [ ] Redirect `www`/non-`www` verificato
- [ ] Analytics attive se previste
- [ ] Error tracking attivo se previsto
- [ ] Uptime monitor attivo
- [ ] DPA verificati per provider coinvolti

## Punti di attenzione

- **Database pulito**: non importare dati mock in production. Crea solo admin e contenuti iniziali reali.
- **Media privati**: il bucket resta privato; la pubblicazione passa dalle route applicative per rispettare il modello CMS.
- **Cache Components**: usa `cacheLife`, `cacheTag` e `revalidateTag`; non introdurre vecchie route segment config incompatibili.
- **Single point of failure**: una sola VPS non ha failover automatico. Backup, snapshot e rebuild documentato sono la strategia di ripristino.
- **Build RAM**: se la build Docker satura la RAM, abilita swap o builda l'immagine in CI.
- **next/image**: l'ottimizzazione gira sulla CPU del VPS. A questa scala è accettabile; usa cache CDN sui media pubblici.
