# Primo deploy su Hetzner + Coolify

Runbook operativo per pubblicare il magazine Next.js su infrastruttura EU, partendo da un progetto non ancora in produzione.

Obiettivo: avviare un ambiente pulito su Hetzner + Coolify, senza migrazione di contenuti, database o immagini esistenti.

Stack target:

- **VPS**: Hetzner CX32 (4 vCPU / 8 GB / 80 GB NVMe), datacenter Falkenstein o Norimberga
- **PaaS**: Coolify v4 per deploy, SSL, env, database, backup
- **DB**: Postgres gestito da Coolify
- **Rate limit**: Redis gestito da Coolify
- **Media**: Hetzner Object Storage S3-compatibile
- **DNS/CDN**: Cloudflare free oppure Bunny.net se si vuole evitare processor USA
- **Analytics**: Umami self-hosted, cookieless
- **Errori**: Sentry cloud oppure GlitchTip self-hosted
- **Monitoring**: metriche server, log container, uptime check

Regola operativa: il dominio principale si punta al VPS solo dopo staging, upload media, login CMS, pubblicazione e backup verificati.

---

## Lavoro anticipabile senza acquisti

Questa sezione si può completare prima di acquistare VPS, Object Storage, dominio CDN o servizi esterni.

Branch attivo:

```bash
infra/self-hosting-prep
```

Obiettivo del branch: rendere il progetto testabile in locale con gli stessi componenti logici della produzione self-hosted.

### Completato in questo branch

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
- [x] Aggiunto fallback static params per build con DB pulito e Cache Components.
- [x] Aggiunto test unitario per `ensureNonEmptyStaticParams`.

Verifiche completate:

- [x] `docker compose config`
- [x] `pnpm prettier "docker-compose.yml" "package.json" "README.md" "docs/migration.md" "next.config.ts" --check`
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test:run`
- [x] `pnpm prisma:validate`
- [x] `pnpm build` con DB Docker locale migrato
- [x] `pnpm dev` con risposta HTTP da `http://localhost:3000`
- [x] Smoke S3/MinIO reale con put/head/get/delete su bucket `middleware-media`

Verifiche bloccate dall'ambiente locale:

- [ ] `docker compose build app`: bloccato dal pull di `node:22-slim` da Docker Hub (`no route to host`).

### Completato - Storage media S3

Obiettivo completato: sostituire Vercel Blob con storage S3-compatible privato, testabile con MinIO locale.

Scope completato:

1. Aggiunta dipendenza AWS SDK:
   - `@aws-sdk/client-s3`
2. Creati moduli server-only per la configurazione S3:
   - lettura `S3_ENDPOINT`
   - lettura `S3_REGION`
   - lettura `S3_BUCKET`
   - lettura `S3_ACCESS_KEY`
   - lettura `S3_SECRET_KEY`
   - lettura `S3_FORCE_PATH_STYLE`
3. Creato adapter storage interno con metodi:
   - `listAll()`
   - `head(pathname)`
   - `put(pathname, body, metadata)`
   - `copy(sourcePathname, targetPathname)`
   - `delete(pathname, options)`
   - `get(pathname)`
4. Mantenuti DTO compatibili con media service:
   - `url`
   - `downloadUrl`
   - `pathname`
   - `contentType`
   - `size`
   - `uploadedAt`
   - `etag`
5. Bucket privato come default.
6. Upload CMS spostato a multipart server-side.
7. Route `GET /api/cms/media/blob` spostata su S3.
8. Route `GET /api/public/media/blob` spostata su S3 mantenendo controllo DB sui contenuti pubblicati.
9. Media service `list`, `rename`, `delete` spostato su S3.
10. Lettura JSON audio chunks spostata su S3.
11. Rimossi `@vercel/blob`, `@vercel/analytics`, `@vercel/speed-insights`.
12. CSP e `next.config.ts` ripuliti dagli host Vercel.

Test implementati/aggiornati:

- unit test configurazione S3 con env valide
- unit test configurazione S3 con env mancanti
- route test upload CMS multipart
- route test media CMS privati
- route test media pubblici controllati da DB
- unit test media service con errori storage-neutral
- unit test audio chunks su storage interno
- unit test helper media senza URL vendor-specific

Gate attesi per chiudere la prossima attività:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:run`
- `pnpm prisma:validate`
- `pnpm build`
- `docker compose config`
- smoke S3/MinIO put/head/get/delete

### Prossima attività - Smoke CMS media locale

1. Avviare `pnpm docker:infra:up`.
2. Eseguire `pnpm prisma:migrate:deploy`.
3. Eseguire `pnpm auth:bootstrap-admin` se admin assente.
4. Avviare `pnpm dev`.
5. Login CMS.
6. Upload immagine reale e verifica oggetto su MinIO.
7. Upload audio reale e verifica oggetto su MinIO.
8. Creazione articolo con immagine/audio.
9. Pubblicazione articolo.
10. Verifica media pubblico via `/api/public/media/blob`.
11. Verifica rename media e sincronizzazione articolo.
12. Verifica delete media e pulizia riferimenti articolo.

### Regola sui test failing

- I test failing sono utili solo nel branch o in PR draft per guidare l'implementazione.
- `main` deve restare sempre verde con `pnpm check:all`.
- Se un test descrive comportamento futuro ma non è ancora implementabile, usare `it.skip` con una descrizione precisa.
- Ogni PR pronta al merge deve rimuovere skip non più necessari o trasformarli in test attivi.
- Non abbassare la qualità dei gate per far passare la migrazione infrastrutturale.

---

## Fase 0 - Prerequisiti

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
   - env S3 per endpoint, bucket, region, access key e secret key

---

## Fase 1 - VPS Hetzner

1. Crea il server in Hetzner Cloud:
   - Location: Falkenstein (FSN1) o Norimberga (NBG1)
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

---

## Fase 2 - Installazione Coolify

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

---

## Fase 3 - Progetto, Postgres e Redis

1. Crea un progetto Coolify, per esempio `magazine`.
2. Crea gli ambienti:
   - `staging`
   - `production`
3. Nell'ambiente `production`, aggiungi PostgreSQL.
4. Nell'ambiente `production`, aggiungi Redis.
5. Ripeti o clona le risorse per `staging` se vuoi separare completamente i dati di test.
6. Lascia Postgres e Redis non esposti pubblicamente.
7. Annota le connection string interne generate da Coolify.
8. Usa il formato SSL supportato dal container Postgres effettivo. Se il DB resta nella rete Docker interna, non forzare parametri SSL incompatibili.

---

## Fase 4 - Object Storage pulito

1. Crea un bucket Hetzner Object Storage nella region più vicina al VPS.
2. Genera access key e secret key dedicati all'app.
3. Salva questi valori per Coolify:
   - `S3_ENDPOINT`
   - `S3_REGION`
   - `S3_BUCKET`
   - `S3_ACCESS_KEY`
   - `S3_SECRET_KEY`
4. Mantieni il bucket privato come default.
5. Mantieni l'accesso pubblico ai media attraverso le route applicative, così il server può controllare quali file sono servibili pubblicamente.
6. Usa il CDN davanti all'app o davanti a una route pubblica cacheabile, non come bypass del modello di permessi CMS.

---

## Fase 5 - Adeguamento media a S3

1. Usa l'integrazione S3-compatible privata gia presente nel progetto.
2. Mantieni le responsabilità esistenti:
   - upload CMS autenticato
   - lista media CMS
   - preview/download CMS autenticati
   - route pubblica per media usati da contenuti pubblicati
   - rename e delete con protezione da conflitti
3. Implementa upload con presigned URL o upload server-side controllato.
4. Conserva le route applicative:
   - `POST /api/cms/media/upload`
   - `GET /api/cms/media/blob`
   - `GET /api/public/media/blob`
5. Aggiorna `lib/media/blob.ts` per usare pathname e URL compatibili con S3.
6. Aggiorna repository e service media per i comandi S3 equivalenti a list, head, copy e delete.
7. Aggiorna i test unitari media e route blob.
8. Mantieni assenti dipendenze e URL vendor-specific per lo storage media.

---

## Fase 6 - Adeguamento Next.js self-hosted

1. In `next.config.ts`, abilita l'output standalone:
   ```ts
   const nextConfig: NextConfig = {
     output: "standalone",
     cacheComponents: true,
     experimental: {
       authInterrupts: true,
       viewTransition: true,
     },
   };
   ```
2. Mantieni `cacheComponents: true` e non aggiungere route segment config incompatibili:
   - `runtime`
   - `dynamic`
   - `revalidate`
   - `fetchCache`
   - `dynamicParams`
3. Aggiorna la Content Security Policy per rimuovere host Vercel non usati e aggiungere gli host effettivi di S3/CDN/analytics/error tracking.
4. Aggiorna `images.remotePatterns` se i media vengono serviti da host esterni all'app.
5. Aggiungi eventuali analytics solo quando viene scelto il provider definitivo.
6. Mantieni `redis` come client Redis standard e configura solo `REDIS_URL`.
7. Verifica che `BETTER_AUTH_URL` e `NEXT_PUBLIC_SITE_URL` puntino al dominio corretto per ogni ambiente.

---

## Fase 7 - Dockerfile pnpm

1. Crea un `Dockerfile` alla root del progetto:

   ```dockerfile
   FROM node:22-slim AS base
   ENV PNPM_HOME=/pnpm
   ENV PATH=$PNPM_HOME:$PATH
   RUN corepack enable

   FROM base AS deps
   WORKDIR /app
   COPY package.json pnpm-lock.yaml ./
   RUN pnpm install --frozen-lockfile

   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN pnpm prisma:generate
   RUN pnpm build

   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV=production
   RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nextjs
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   USER nextjs
   EXPOSE 3000
   ENV PORT=3000
   ENV HOSTNAME=0.0.0.0
   CMD ["node", "server.js"]
   ```

2. Usa `node:22-slim` per evitare problemi nativi comuni con `sharp` e `next/image`.
3. Se la build sul VPS va in OOM, abilita swap o sposta la build immagine su GitHub Actions.

---

## Fase 8 - Deploy staging

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

---

## Fase 9 - Inizializzazione dati puliti

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

---

## Fase 10 - Verifiche staging

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

---

## Fase 11 - Analytics, errori e monitoring

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

---

## Fase 12 - Backup e disaster recovery

1. Configura backup schedulati di Postgres in Coolify.
2. Usa una destinazione S3-compatibile per i backup DB:
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

---

## Fase 13 - Deploy produzione

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

---

## Fase 14 - CDN e DNS

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

---

## Checklist finale

- [ ] VPS creato con Ubuntu 24.04 LTS
- [ ] Utente non-root configurato
- [ ] SSH hardening applicato
- [ ] Firewall attivo con porte 80/443 e SSH
- [ ] Snapshot Hetzner attivi
- [ ] Coolify installato e accessibile via FQDN HTTPS
- [ ] Porta 8000 chiusa dopo setup
- [ ] Postgres production creato e non pubblico
- [ ] Redis production creato e non pubblico
- [ ] Bucket S3 creato e privato
- [x] Integrazione media S3-compatible privata attiva
- [x] `@vercel/blob` rimosso
- [x] `@vercel/analytics` e `@vercel/speed-insights` rimossi
- [ ] `next.config.ts` con `output: "standalone"`
- [ ] CSP aggiornata agli host reali
- [ ] Dockerfile pnpm presente
- [ ] Deploy staging riuscito
- [ ] `pnpm prisma:migrate:deploy` eseguito su staging
- [ ] Admin staging creato
- [ ] Upload media funzionante su staging
- [ ] Pubblicazione e revalidation funzionanti su staging
- [ ] `pnpm lint` passato
- [ ] `pnpm typecheck` passato
- [ ] `pnpm test:run` passato
- [ ] `pnpm prisma:validate` passato
- [ ] `pnpm build` passato
- [ ] Backup DB schedulati
- [ ] Restore DB testato
- [ ] Backup config Coolify salvato offsite
- [ ] Deploy production riuscito
- [ ] `pnpm prisma:migrate:deploy` eseguito su production
- [ ] Admin production creato
- [ ] SSL valido su dominio principale, `www` e Coolify
- [ ] Smoke test production completato
- [ ] Analytics attive se previste
- [ ] Error tracking attivo se previsto
- [ ] Uptime monitor attivo
- [ ] DPA verificati per provider coinvolti

---

## Punti di attenzione

- **Database pulito**: non importare dati mock in production. Crea solo admin e contenuti iniziali reali.
- **Media privati**: il bucket resta privato; la pubblicazione passa dalle route applicative per rispettare il modello CMS.
- **Cache Components**: usa `cacheLife`, `cacheTag` e `revalidateTag`; non introdurre vecchie route segment config incompatibili.
- **Single point of failure**: una sola VPS non ha failover automatico. Backup, snapshot e rebuild documentato sono la strategia di ripristino.
- **Build RAM**: se la build Docker satura la RAM, abilita swap o builda l'immagine in CI.
- **next/image**: l'ottimizzazione gira sulla CPU del VPS. A questa scala è accettabile; usa cache CDN sui media pubblici.
