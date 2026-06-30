# Primo deploy su Hetzner + Coolify

Documento operativo unico per portare il magazine Next.js su infrastruttura EU self-hosted.

Obiettivo: avviare un ambiente pulito su Hetzner + Coolify, senza migrazione di contenuti, database o immagini esistenti.

Modello di lavoro: niente staging. Il banco di prova è il locale con Docker. Sul VPS gira solo production, che segue il branch `main`. Quando il locale è verde si deploya su production.

Regola operativa: il dominio principale si punta al VPS solo dopo verifica iniziale su dominio temporaneo, upload media, login CMS, pubblicazione, backup e restore test verificati.

## Dashboard

| Area                    | Stato   | Note                                                        |
| ----------------------- | ------- | ----------------------------------------------------------- |
| Baseline locale         | Fatto   | App, DB, Redis, MinIO, S3 adapter, seed, smoke, test, build |
| Docker production image | Fatto   | `docker compose build app` completato e smoke container OK  |
| Decisioni pre-acquisto  | Fatto   | Domini, Cloudflare, Umami, GlitchTip, bucket, no staging    |
| Preflight documentale   | Fatto   | Runbook, env, DNS, backup, segreti e checklist deploy       |
| VPS Hetzner             | Da fare | Richiede acquisto/creazione server (CAX31 ARM)              |
| Coolify                 | Da fare | Richiede VPS e DNS                                          |
| Object Storage Hetzner  | Da fare | Richiede bucket reale e credenziali                         |
| Backup/restore          | Da fare | Prima del dominio production                                |
| Production              | Da fare | Solo dopo smoke locale verde e restore DB testato           |

## Stack target

- **VPS**: Hetzner CAX31, 8 vCPU ARM Ampere, 16 GB RAM, 160 GB NVMe, datacenter Falkenstein o Norimberga.
- **PaaS**: Coolify v4 per deploy, SSL, env, database e backup.
- **DB**: Postgres production gestito da Coolify.
- **Rate limit**: Redis production gestito da Coolify.
- **Media**: Hetzner Object Storage S3-compatible, bucket privato.
- **DNS/CDN**: Cloudflare.
- **Registrar**: Cloudflare Registrar, dominio trasferito dal registrar attuale.
- **Analytics**: Umami self-hosted, cookieless, solo production.
- **Errori**: GlitchTip self-hosted, solo production.
- **Monitoring**: metriche server, log container, uptime check.
- **Limiti risorse**: memory limit per container in Coolify, RAM prioritaria a Postgres e app di production.
- **Branch**: production deploya da `main`. Il branch `dev` resta il lavoro in locale.

Nota architettura: lo stack gira interamente su arm64. GlitchTip e Umami pubblicano immagini arm64 ufficiali, `node:22-slim` e `sharp` hanno build ARM native, Coolify gira su ARM. Nessun adattamento al codice rispetto alla baseline.

Nota dimensionamento: senza staging il box è scarico. CAX31 (16 GB) dà margine a GlitchTip e alle build. In alternativa si può scendere a CAX21 (8 GB) spostando le build su CI invece che sul VPS.

## Decisioni pre-acquisto

Queste decisioni non richiedono ancora acquisti e definiscono i valori da usare quando si creano VPS, DNS, bucket e ambiente Coolify.

| Area                | Decisione                                            |
| ------------------- | ---------------------------------------------------- |
| Dominio canonico    | `middleware.media`                                   |
| Redirect produzione | `www.middleware.media` -> `middleware.media`         |
| Dashboard Coolify   | `coolify.middleware.media`                           |
| Ambienti            | Solo production, nessuno staging                     |
| Branch production   | `main`                                               |
| DNS/CDN             | Cloudflare                                           |
| Registrar dominio   | Cloudflare Registrar, transfer dal registrar attuale |
| Email transazionale | Non prevista                                         |
| Analytics           | Umami self-hosted, solo production                   |
| Error tracking      | GlitchTip self-hosted, solo production               |
| Bucket media prod   | `middleware-media-prod`                              |
| Backup media        | Solo versioning sul bucket                           |
| Backup DB           | Bucket Hetzner separato                              |
| Backup DB offsite   | Non previsto                                         |
| Admin bootstrap     | Credenziali production scelte manualmente            |

### Matrice env target (production)

| Env                        | Production                                  |
| -------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`     | `https://middleware.media`                  |
| `BETTER_AUTH_URL`          | `https://middleware.media`                  |
| `DATABASE_URL`             | Da Postgres Coolify production              |
| `POSTGRES_URL`             | Uguale a `DATABASE_URL`                     |
| `PRISMA_DATABASE_URL`      | Uguale a `DATABASE_URL`                     |
| `REDIS_URL`                | Da Redis Coolify production                 |
| `S3_ENDPOINT`              | Da Hetzner Object Storage                   |
| `S3_REGION`                | Da bucket Hetzner scelto                    |
| `S3_BUCKET`                | `middleware-media-prod`                     |
| `S3_ACCESS_KEY`            | Access key dedicata production              |
| `S3_SECRET_KEY`            | Secret key dedicata production              |
| `S3_FORCE_PATH_STYLE`      | Valore richiesto da endpoint Hetzner        |
| `BOOTSTRAP_ADMIN_EMAIL`    | Admin production scelto manualmente         |
| `BOOTSTRAP_ADMIN_PASSWORD` | Password production scelta manualmente      |
| `BOOTSTRAP_ADMIN_NAME`     | Nome admin production scelto manualmente    |
| `BETTER_AUTH_SECRET`       | Secret production generato ad alta entropia |
| `AUDIT_LOG_RETENTION_DAYS` | `365`                                       |

Nota: nessun `NEXT_PUBLIC_NOINDEX`. Serviva solo a non indicizzare lo staging, che non esiste più. Production è indicizzabile e non richiede modifiche al codice.

### DNS target

| Host                       | Uso                 | Note                           |
| -------------------------- | ------------------- | ------------------------------ |
| `middleware.media`         | App production      | Canonico                       |
| `www.middleware.media`     | Redirect production | Redirect permanente verso apex |
| `coolify.middleware.media` | Dashboard Coolify   | Accesso dashboard dopo setup   |

### Servizi self-hosted da prevedere in Coolify

- App Next.js production (da `main`).
- Postgres production.
- Redis production.
- Umami self-hosted con il proprio Postgres.
- GlitchTip self-hosted con il proprio Postgres.

Nota: GlitchTip e Umami restano su Postgres dedicati per semplicità operativa. Sui 16 GB della CAX31 c'è margine.

## Baseline locale completata

Il branch `infra/self-hosting-prep` è pronto per essere deployato su infrastruttura reale. Il locale con Docker è ora l'unico ambiente di test prima del deploy. La baseline locale include:

- Dockerfile production standalone con `openssl` per Prisma.
- Compose locale con app, Postgres, Redis, MinIO, `minio-init` e `migrate`.
- Prisma baseline pulita per DB vuoto.
- Storage S3 adapter e route media CMS/pubbliche su bucket privato.
- Rimozione dipendenze Vercel Blob, Analytics e Speed Insights.
- Seed locale contenuti e admin locale.
- Test unitari S3 config e adapter `media-storage`.
- Smoke HTTP dev, production-like e container Docker production.
- Smoke CMS media via UI: login, upload, preview/download, rename, delete.

Gate locali verdi, da considerare il vero gate pre-deploy:

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
- [x] Preparare comando per generare `BETTER_AUTH_SECRET` production.
- [x] Preparare piano password per admin Coolify, admin production, Umami e GlitchTip.
- [x] Preparare piano DNS Cloudflare con record, proxy mode e ordine di attivazione.
- [x] Preparare piano transfer dominio su Cloudflare Registrar.
- [x] Preparare piano CSP per host app, Umami, GlitchTip e media via route applicative.
- [x] Preparare piano backup: bucket backup, retention, frequenza, restore test.
- [x] Preparare checklist smoke locale e production in ordine eseguibile.
- [x] Preparare checklist rollback/rebuild minima.

#### Account e accessi

| Accesso                | Uso                         | Stato prima acquisto                     | Dove conservarlo           |
| ---------------------- | --------------------------- | ---------------------------------------- | -------------------------- |
| Hetzner Cloud          | VPS e snapshot              | Account pronto, billing verificato       | Password manager           |
| Hetzner Object Storage | Bucket media e backup       | Accesso pronto, bucket non ancora creati | Password manager           |
| Cloudflare             | DNS/CDN e Registrar         | Dominio `middleware.media` accessibile   | Password manager           |
| GitHub                 | Repository e Coolify source | Accesso admin al repository verificato   | Account personale protetto |
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

| Segreto                    | Production | Fonte/come generarlo                  |
| -------------------------- | ---------- | ------------------------------------- |
| `BETTER_AUTH_SECRET`       | Da fare    | `openssl rand -base64 48`             |
| `BOOTSTRAP_ADMIN_EMAIL`    | Da fare    | Scelta manuale                        |
| `BOOTSTRAP_ADMIN_PASSWORD` | Da fare    | Password manager, almeno 20 caratteri |
| `BOOTSTRAP_ADMIN_NAME`     | Da fare    | Scelta manuale                        |
| `DATABASE_URL`             | Da fare    | Coolify Postgres                      |
| `POSTGRES_URL`             | Da fare    | Uguale a `DATABASE_URL`               |
| `PRISMA_DATABASE_URL`      | Da fare    | Uguale a `DATABASE_URL`               |
| `REDIS_URL`                | Da fare    | Coolify Redis                         |
| `S3_ACCESS_KEY`            | Da fare    | Hetzner Object Storage                |
| `S3_SECRET_KEY`            | Da fare    | Hetzner Object Storage                |
| Coolify admin password     | Da fare    | Password manager                      |
| Umami admin password       | Da fare    | Password manager                      |
| GlitchTip admin password   | Da fare    | Password manager                      |
| GlitchTip DSN              | Da fare    | GlitchTip project                     |
| Uptime monitor credentials | Da fare    | Provider scelto                       |

Comandi consigliati:

```bash
openssl rand -base64 48
openssl rand -base64 32
```

Usare il primo per `BETTER_AUTH_SECRET`, il secondo per password generate manualmente se non si usa il generator del password manager.

#### Dominio e transfer su Cloudflare Registrar

Il transfer su Cloudflare Registrar è possibile solo se la zona `middleware.media` è già attiva su Cloudflare. Quindi prima si sposta il DNS, poi si trasferisce la registrazione.

1. Aggiungi `middleware.media` come zona su Cloudflare e punta i nameserver al valore Cloudflare. Attendi che la zona risulti `active`.
2. Nel registrar attuale togli il registrar lock e, se blocca il transfer, disattiva la WHOIS privacy.
3. Recupera il codice di autorizzazione (auth code / EPP).
4. Verifica che il dominio sia registrato da più di 60 giorni e non sia stato trasferito negli ultimi 60 giorni.
5. Avvia il transfer su Cloudflare Registrar e approva la FOA. Il transfer aggiunge un anno alla scadenza.
6. Rinnovi successivi a prezzo di costo del registry, senza ricarico.

Il TLD `.media` è supportato da Cloudflare Registrar e risulta disponibile, quindi nessun fallback su registrar esterno.

#### DNS Cloudflare

Creare i record solo dopo avere l'IPv4/IPv6 del VPS. Prima del go-live pubblico, tenere Cloudflare in modalità DNS/proxy coerente con SSL Coolify.

| Host                       | Tipo    | Target                      | Proxy Cloudflare  | Quando attivarlo                  |
| -------------------------- | ------- | --------------------------- | ----------------- | --------------------------------- |
| `coolify.middleware.media` | A/AAAA  | IP VPS                      | DNS only iniziale | Subito dopo installazione Coolify |
| `middleware.media`         | A/AAAA  | IP VPS                      | DNS only iniziale | Solo dopo smoke e restore test OK |
| `www.middleware.media`     | CNAME/A | `middleware.media` o IP VPS | DNS only iniziale | In fase go-live                   |

Per la verifica pre-pubblica, usa un sottodominio temporaneo (per esempio `app.middleware.media` in DNS only) oppure tieni l'apex in DNS only finché lo smoke non è verde, poi attiva il proxy.

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

| Backup                  | Destinazione              | Frequenza                         | Retention iniziale              | Test richiesto              |
| ----------------------- | ------------------------- | --------------------------------- | ------------------------------- | --------------------------- |
| Postgres production     | Bucket backup Hetzner     | Giornaliera                       | 30 giorni                       | Restore prima del go-live   |
| DB prima di migrazione  | Bucket backup Hetzner     | Manuale, prima di ogni migrazione | Ultime 3 copie                  | Restore su DB prova         |
| Config Coolify          | Export manuale offsite    | Dopo ogni cambio rilevante        | 3 copie                         | Rebuild runbook             |
| Bucket media production | Versioning bucket Hetzner | Continuo                          | Versioni non correnti 90 giorni | Recupero oggetto cancellato |

Condizioni obbligatorie: production non va live finché un restore DB è stato completato almeno una volta; senza staging, ogni migrazione su production è preceduta da un backup fresco del DB.

Il backup media è gestito solo via versioning del bucket con lifecycle rule sulle versioni non correnti. Nessun secondo bucket di sync e nessuna copia DB offsite fuori da Hetzner.

#### Smoke locale (gate pre-deploy)

Eseguire in locale con Docker prima di ogni deploy su production:

```bash
pnpm check:all
docker compose build app
docker compose up
```

Verificare home, login CMS, upload media, publish/unpublish, revalidation, rate limit Redis e CSP nel container production-like.

#### Smoke production

Eseguire sul dominio temporaneo o con apex in DNS only, prima di attivare il proxy pubblico:

1. Aprire l'URL di verifica e controllare HTTP 200.
2. Verificare `robots.txt` e `sitemap.xml` (production indicizzabile).
3. Accedere a `/cms/login`.
4. Creare contenuto reale minimo o draft smoke.
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
19. Verificare redirect `www` -> apex.
20. Verificare 404 e pagina 500 gestita.

#### Rollback e rebuild minimo

Rollback applicativo:

1. In Coolify, redeploy dell'ultimo commit stabile di `main`.
2. Se il problema è env, ripristinare env precedente dal password manager/export Coolify.
3. Se il problema è DB migration, fermarsi e valutare restore dal backup fresco preso prima della migrazione: non improvvisare rollback manuali sul DB production.

Rebuild infrastruttura minima:

1. Creare nuovo VPS CAX31.
2. Installare Coolify.
3. Ripristinare configurazione Coolify salvata offsite.
4. Ricollegare repository GitHub.
5. Creare/ripristinare Postgres.
6. Ripristinare ultimo backup DB valido.
7. Ricollegare bucket media esistente.
8. Verificare su dominio temporaneo.
9. Spostare DNS Cloudflare al nuovo IP.
10. Verificare production pubblica.

Gate per chiudere la fase A:

- [x] `docs/migration.md` contiene checklist preflight completa.
- [x] Nessun segreto reale è committato.
- [x] Le decisioni residue sono ridotte a valori ottenibili solo dopo creazione risorse reali.

### Fase B - Acquisti e risorse base

Obiettivo: creare solo le risorse necessarie e annotare valori reali.

- [ ] Creare VPS Hetzner CAX31 (ARM) Ubuntu 24.04 LTS arm64.
- [ ] Attivare snapshot automatici VPS.
- [ ] Creare bucket media `middleware-media-prod` privato.
- [ ] Creare bucket backup DB separato.
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

### Fase D - Servizi production

Obiettivo: deployare l'app production da `main` e verificarla prima di esporla.

- [ ] Creare ambiente Coolify `production`.
- [ ] Creare Postgres production non pubblico.
- [ ] Creare Redis production non pubblico.
- [ ] Creare app production da Dockerfile, branch `main`.
- [ ] Configurare env production usando la matrice target.
- [ ] Impostare memory limit per container.
- [ ] Applicare migrazioni Prisma su production (preceduto da backup se il DB non è vuoto).
- [ ] Creare admin production.
- [ ] Verificare l'app su dominio temporaneo o apex in DNS only.

Gate per chiudere la fase D:

- App risponde in HTTPS sull'URL di verifica.
- Login CMS funziona.
- Upload media funziona sul bucket production.
- Media pubblico è servito solo se referenziato da contenuti pubblicati.
- Redis/rate limit funzionano in production mode.

### Fase E - Osservabilità e backup

Obiettivo: attivare strumenti operativi e backup prima dell'esposizione pubblica.

- [ ] Deployare Umami self-hosted con il proprio Postgres.
- [ ] Deployare GlitchTip self-hosted con il proprio Postgres.
- [ ] Configurare GlitchTip senza invio email: `EMAIL_URL=consolemail://`, `ENABLE_USER_REGISTRATION=false`, `ENABLE_OPEN_USER_REGISTRATION=false`.
- [ ] Aggiornare CSP per Umami e GlitchTip.
- [ ] Impostare memory limit per container a Umami e GlitchTip.
- [ ] Configurare backup DB production verso bucket backup separato.
- [ ] Abilitare versioning sul bucket media con lifecycle rule.
- [ ] Eseguire restore test su database di prova.
- [ ] Documentare procedura rebuild minima con backup config Coolify.

Gate per chiudere la fase E:

- Umami riceve evento dall'app.
- GlitchTip riceve errore test dall'app.
- Restore DB testato.
- Procedura rebuild documentata.

### Fase F - Go-live pubblico

Obiettivo: esporre production solo dopo smoke e backup verdi.

- [ ] Puntare `middleware.media` e `www.middleware.media` in Cloudflare.
- [ ] Verificare SSL automatico su apex e `www`.
- [ ] Attivare il proxy Cloudflare dopo verifica login CMS, cookie auth e tRPC.
- [ ] Eseguire smoke production completo.
- [ ] Verificare redirect `www.middleware.media` -> `middleware.media`.
- [ ] Verificare backup production schedulati.
- [ ] Chiudere la porta 8000.

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
- `main` deve restare sempre verde con `pnpm check:all`, perché `main` è ciò che va in production.
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
   - Cloudflare per DNS e Registrar
   - GitHub con accesso al repository
2. Genera una chiave SSH dedicata se non esiste:
   ```bash
   ssh-keygen -t ed25519
   ```
3. Usa i domini operativi già decisi:
   - app produzione canonica: `middleware.media`
   - redirect produzione: `www.middleware.media` -> `middleware.media`
   - dashboard Coolify: `coolify.middleware.media`
4. Dominio su Cloudflare Registrar:
   - Aggiungi la zona `middleware.media` su Cloudflare e sposta i nameserver, attendi stato `active`.
   - Togli il registrar lock e disattiva la WHOIS privacy se blocca il transfer.
   - Recupera il codice di autorizzazione (auth code / EPP).
   - Verifica regole 60 giorni su registrazione e transfer precedenti.
   - Avvia il transfer su Cloudflare e approva la FOA. Il transfer aggiunge un anno alla scadenza.
5. Prepara i valori production delle env:
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
   - Image: Ubuntu 24.04 LTS arm64
   - Type: CAX31 (ARM Ampere)
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

Nota architettura: la CAX31 è ARM. Tutte le immagini Docker usate hanno build arm64 (GlitchTip, Umami, Postgres, Redis, `node:22-slim`, `sharp`), quindi il Dockerfile e lo stack non richiedono modifiche rispetto alla baseline.

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
2. Crea l'ambiente `production`.
3. Nell'ambiente `production`, aggiungi PostgreSQL.
4. Nell'ambiente `production`, aggiungi Redis.
5. Lascia Postgres e Redis non esposti pubblicamente.
6. Imposta un memory limit per ogni container, con priorità di RAM a Postgres e app production.
7. Annota le connection string interne generate da Coolify.
8. Usa il formato SSL supportato dal container Postgres effettivo; se il DB resta nella rete Docker interna, non forzare parametri SSL incompatibili.

### Fase 4 - Object Storage pulito

1. Crea il bucket Hetzner Object Storage `middleware-media-prod` e il bucket backup separato, nella region più vicina al VPS.
2. Genera access key e secret key dedicati per production.
3. Salva questi valori per Coolify:
   - `S3_ENDPOINT`
   - `S3_REGION`
   - `S3_BUCKET`
   - `S3_ACCESS_KEY`
   - `S3_SECRET_KEY`
   - `S3_FORCE_PATH_STYLE`
4. Mantieni il bucket privato come default.
5. Abilita il versioning sul bucket media e imposta una lifecycle rule per le versioni non correnti (90 giorni).
6. Mantieni l'accesso pubblico ai media attraverso le route applicative, così il server può controllare quali file sono servibili pubblicamente.
7. Usa il CDN davanti all'app o davanti a una route pubblica cacheable, non come bypass del modello di permessi CMS.

### Fase 5 - Adeguamento app self-hosted

Stato: già completato nel branch locale, da verificare di nuovo prima del deploy. Senza staging non c'è alcuna modifica al codice da aggiungere.

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
6. Verifica che `BETTER_AUTH_URL` e `NEXT_PUBLIC_SITE_URL` puntino al dominio production.

### Fase 6 - Dockerfile pnpm

Stato: completato nel branch locale.

1. Usa il `Dockerfile` alla root del progetto.
2. Usa `node:22-slim` per evitare problemi nativi comuni con `sharp` e `next/image`. L'immagine è multi-arch e copre arm64.
3. Mantieni `openssl` installato nel base image per Prisma.
4. Con 16 GB di RAM il rischio di OOM in build è basso; tieni comunque lo swap come rete di sicurezza. Se passi a CAX21 da 8 GB, sposta la build su CI.

### Fase 7 - Deploy production

1. In Coolify, crea una Application nell'ambiente `production`.
2. Seleziona il repository GitHub e il branch `main`.
3. Build pack: Dockerfile.
4. Porta interna: `3000`.
5. Per la verifica iniziale, assegna un dominio temporaneo o tieni l'apex in DNS only.
6. Configura le env production:
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
   - env S3
7. Avvia il deploy e verifica che Coolify generi il certificato SSL.

### Fase 8 - Inizializzazione dati puliti

1. Apri una shell sul container applicativo o usa un job one-shot con le stesse env.
2. Se il DB non è vuoto, esegui prima un backup fresco.
3. Applica le migrazioni Prisma:
   ```bash
   pnpm prisma:migrate:deploy
   ```
4. Verifica lo schema:
   ```bash
   pnpm prisma:validate
   ```
5. Crea il primo admin:
   ```bash
   pnpm auth:bootstrap-admin
   ```
6. Accedi al CMS.
7. Crea contenuti minimi reali o di smoke test:
   - issue
   - categoria
   - autore
   - articolo draft
   - pagina statica se necessaria
8. Testa publish/unpublish e verifica la revalidation pubblica.

### Fase 9 - Verifiche pre-pubbliche

1. Esegui i controlli locali prima del deploy:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test:run
   pnpm prisma:validate
   pnpm build
   ```
2. Verifica sull'URL di verifica (dominio temporaneo o apex in DNS only):
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
   - robots indicizzabile
   - 404
   - 500 gestita
3. Verifica cache pubblica e revalidation dopo publish/unpublish.
4. Verifica header CSP nel browser e correggi eventuali blocchi legittimi.
5. Verifica che Redis sia raggiungibile e che i rate limit non falliscano in production mode.

### Fase 10 - Analytics, errori e monitoring

1. Analytics:
   - deploya Umami da Coolify con il proprio Postgres
   - aggiungi lo snippet nel layout solo dopo aver aggiornato la CSP
   - mantieni l'analytics cookieless per evitare banner non necessari
2. Error tracking:
   - deploya GlitchTip self-hosted da Coolify con il proprio Postgres
   - configura GlitchTip senza invio email: `EMAIL_URL=consolemail://`, `ENABLE_USER_REGISTRATION=false`, `ENABLE_OPEN_USER_REGISTRATION=false`
   - gli alert errori restano visibili in dashboard, eventuale webhook in futuro
   - configura il progetto GlitchTip per production
   - aggiungi DSN e CSP solo dopo verifica HTTPS
3. Email e auth:
   - nessun SMTP nel progetto
   - Better Auth senza flussi email (no reset password o verifica via mail)
   - le azioni privilegiate (pubblicazione, gestione media, gestione utenti) sono ristrette ai ruoli admin ed editor
4. Metriche server:
   - usa l'agent Coolify se sufficiente
   - aggiungi Netdata se vuoi metriche più dettagliate
5. Log:
   - usa i log container di Coolify
   - aggiungi Dozzle solo se serve una UI dedicata
6. Uptime:
   - usa Uptime Kuma self-hosted oppure UptimeRobot
   - controlla dominio pubblico e dashboard Coolify

### Fase 11 - Backup e disaster recovery

1. Configura backup schedulati di Postgres production in Coolify.
2. Usa una destinazione S3-compatible per i backup DB:
   - bucket Hetzner separato
3. Imposta cadenza giornaliera e retention coerente con il budget (30 giorni production).
4. Regola fissa: prima di ogni migrazione su production, esegui un backup manuale del DB.
5. Abilita il versioning sul bucket media con lifecycle rule sulle versioni non correnti. Nessun secondo bucket di sync.
6. Esegui backup della config Coolify:
   ```bash
   tar czf /tmp/coolify-$(date +%F).tar.gz /data/coolify/
   cp /data/coolify/source/.env /tmp/coolify-env-$(date +%F).backup
   ```
7. Sposta i backup config fuori dal server in storage cifrato o password manager.
8. Esegui un restore test su database di prova.
9. Documenta la procedura minima di rebuild:
   - creare nuovo VPS CAX31
   - installare Coolify
   - ripristinare config
   - ripristinare DB
   - ricollegare bucket media
   - puntare DNS al nuovo IP

### Fase 12 - Go-live pubblico

1. Punta i record DNS A/AAAA di apex e `www` al VPS.
2. Verifica SSL automatico su dominio principale e `www`.
3. Attiva il proxy Cloudflare come reverse proxy dopo verifica di login CMS, cookie auth e route tRPC.
4. Esegui smoke production completo.
5. Verifica il redirect `www` -> apex.
6. Chiudi la porta 8000:
   ```bash
   ufw delete allow 8000/tcp
   ```
7. Usa Coolify solo da `https://coolify.middleware.media`.

### Fase 13 - CDN e DNS

1. Configura SSL mode `Full (strict)` su Cloudflare.
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
6. Verifica i subprocessor per Hetzner, Cloudflare, analytics ed error tracking.

## Checklist finale attiva

### Preflight

- [x] Checklist account/accessi completata.
- [x] Matrice segreti pronta e salvata fuori repository.
- [x] Piano DNS Cloudflare pronto.
- [x] Piano transfer dominio su Cloudflare Registrar pronto.
- [x] Piano CSP pronto.
- [x] Piano backup e restore pronto.
- [x] Checklist smoke locale e production pronta.
- [x] Checklist rollback/rebuild pronta.

### Risorse reali

- [ ] VPS CAX31 creato con Ubuntu 24.04 LTS arm64.
- [ ] Snapshot Hetzner attivi.
- [ ] Bucket media production privato creato.
- [ ] Bucket backup DB creato.
- [ ] Credenziali S3 production salvate fuori repository.

### Dominio

- [ ] Zona `middleware.media` attiva su Cloudflare.
- [ ] Transfer su Cloudflare Registrar completato.

### Server e Coolify

- [ ] Utente non-root configurato.
- [ ] SSH hardening applicato.
- [ ] Firewall attivo.
- [ ] Coolify installato e accessibile via `https://coolify.middleware.media`.
- [ ] Porta 8000 chiusa dopo setup.
- [ ] GitHub App collegata.
- [ ] Memory limit per container impostati.

### Production

- [ ] Postgres production creato e non pubblico.
- [ ] Redis production creato e non pubblico.
- [ ] App production deployata da `main`.
- [ ] `pnpm prisma:migrate:deploy` eseguito su production.
- [ ] Admin production creato.
- [ ] Upload media funzionante.
- [ ] Pubblicazione e revalidation funzionanti.
- [ ] Media pubblico servito solo se referenziato da contenuti pubblicati.
- [ ] Redis/rate limit verificati in production mode.
- [ ] Header CSP verificati nel browser.
- [ ] Smoke production completato su dominio di verifica.

### Osservabilità e backup

- [ ] Umami self-hosted attivo con proprio Postgres.
- [ ] GlitchTip self-hosted attivo con proprio Postgres, senza invio email.
- [ ] Backup DB schedulati.
- [ ] Restore DB testato.
- [ ] Versioning bucket media attivo con lifecycle rule.
- [ ] Backup config Coolify salvato offsite.
- [ ] Procedura rebuild documentata.

### Go-live

- [ ] Apex e `www` puntati al VPS.
- [ ] SSL valido su `middleware.media`, `www.middleware.media` e `coolify.middleware.media`.
- [ ] Proxy Cloudflare attivo e compatibile con CMS/auth.
- [ ] Redirect `www.middleware.media` -> `middleware.media` verificato.
- [ ] Porta 8000 chiusa.
- [ ] Analytics attive.
- [ ] Error tracking attivo.
- [ ] Uptime monitor attivo.
- [ ] DPA verificati per provider coinvolti.

## Punti di attenzione

- **Niente staging**: il test avviene in locale con Docker. Tieni lo schema locale identico a production e considera il gate `pnpm check:all` più build Docker come la vera barriera pre-deploy.
- **Migrazioni su production**: senza staging colpiscono direttamente il DB live. Backup fresco del DB immediatamente prima di ogni migrazione, sempre.
- **Primo runtime in production**: Coolify fa build-then-swap, quindi una build rotta non sostituisce la versione viva. Gli errori di runtime li verifichi sul dominio temporaneo prima di attivare il proxy pubblico.
- **Database pulito**: non importare dati mock in production. Crea solo admin e contenuti iniziali reali.
- **Media privati**: il bucket resta privato; la pubblicazione passa dalle route applicative per rispettare il modello CMS.
- **Backup media**: solo versioning del bucket con lifecycle rule, nessun secondo bucket e nessuna copia DB offsite.
- **Email**: nessun SMTP nel progetto. Le azioni privilegiate sono ristrette ai ruoli admin/editor, GlitchTip non invia mail.
- **Limiti per container**: imposta un memory limit per ogni servizio in Coolify, così un container che impazzisce non porta giù production.
- **Upgrade servizi**: i major di GlitchTip, Umami e Postgres si testano prima in locale, con backup, perché non esiste più uno staging dove provarli.
- **Cache Components**: usa `cacheLife`, `cacheTag` e `revalidateTag`; non introdurre vecchie route segment config incompatibili.
- **Single point of failure**: una sola VPS non ha failover automatico. Backup, snapshot e rebuild documentato sono la strategia di ripristino.
- **Build RAM**: con 16 GB il rischio è basso. Se scendi a CAX21 da 8 GB, builda l'immagine in CI.
- **next/image**: l'ottimizzazione gira sulla CPU ARM del VPS. A questa scala è accettabile; usa cache CDN sui media pubblici.
