# Primo deploy production

Documento operativo minimo per portare il sito in production su VPS Hetzner con dominio `middleware.media`.

Obiettivo: pubblicare il sito con infrastruttura essenziale, senza staging, senza migrazione di contenuti esistenti e senza servizi accessori.

Modello di lavoro: il banco di prova è il locale con Docker. Sul VPS gira solo production, allineata a `main`. Quando il locale è verde si deploya su production.

Regola operativa: il dominio principale si punta al VPS solo dopo verifica production su URL temporaneo o accesso diretto controllato.

## Decisioni fissate

| Area                | Decisione                                    |
| ------------------- | -------------------------------------------- |
| Dominio canonico    | `middleware.media`                           |
| Redirect produzione | `www.middleware.media` -> `middleware.media` |
| Ambienti            | Solo production, nessuno staging             |
| Branch production   | `main`                                       |
| VPS                 | Hetzner CAX31 ARM                            |
| Sistema operativo   | Ubuntu 24.04 LTS arm64                       |
| DNS/CDN             | Cloudflare                                   |
| Registrar dominio   | Cloudflare Registrar                         |
| Email transazionale | Non prevista                                 |
| Bucket media prod   | `middleware-media-prod`                      |
| Admin bootstrap     | Credenziali production scelte manualmente    |

## Stack minimo

- **VPS**: Hetzner CAX31, 8 vCPU ARM Ampere, 16 GB RAM, 160 GB NVMe, datacenter Falkenstein o Norimberga.
- **App**: Next.js production da `main`.
- **DB**: Postgres production.
- **Rate limit**: Redis production.
- **Media**: Hetzner Object Storage S3-compatible, bucket privato.
- **DNS/CDN**: Cloudflare.
- **Registrar**: Cloudflare Registrar.

Nota architettura: lo stack gira su arm64. `node:22-slim`, `sharp`, Postgres e Redis hanno supporto ARM; il Dockerfile production esistente non richiede modifiche per la VPS scelta.

## Env production

I valori reali vanno salvati fuori dal repository.

| Env                        | Production                                  |
| -------------------------- | ------------------------------------------- |
| `NODE_ENV`                 | `production`                                |
| `NEXT_PUBLIC_SITE_URL`     | `https://middleware.media`                  |
| `BETTER_AUTH_URL`          | `https://middleware.media`                  |
| `BETTER_AUTH_SECRET`       | Secret production generato ad alta entropia |
| `DATABASE_URL`             | Connection string Postgres production       |
| `POSTGRES_URL`             | Uguale a `DATABASE_URL`                     |
| `PRISMA_DATABASE_URL`      | Uguale a `DATABASE_URL`                     |
| `REDIS_URL`                | Connection string Redis production          |
| `S3_ENDPOINT`              | Da Hetzner Object Storage                   |
| `S3_REGION`                | Da bucket Hetzner scelto                    |
| `S3_BUCKET`                | `middleware-media-prod`                     |
| `S3_ACCESS_KEY`            | Access key dedicata production              |
| `S3_SECRET_KEY`            | Secret key dedicata production              |
| `S3_FORCE_PATH_STYLE`      | Valore richiesto da endpoint Hetzner        |
| `BOOTSTRAP_ADMIN_EMAIL`    | Admin production scelto manualmente         |
| `BOOTSTRAP_ADMIN_PASSWORD` | Password production scelta manualmente      |
| `BOOTSTRAP_ADMIN_NAME`     | Nome admin production scelto manualmente    |
| `AUDIT_LOG_RETENTION_DAYS` | `365`                                       |

Comando consigliato per generare `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 48
```

Nota: nessun `NEXT_PUBLIC_NOINDEX`. Production è indicizzabile.

## DNS target

| Host                   | Uso                 | Note                           |
| ---------------------- | ------------------- | ------------------------------ |
| `middleware.media`     | App production      | Canonico                       |
| `www.middleware.media` | Redirect production | Redirect permanente verso apex |

Creare i record solo dopo avere l'IPv4/IPv6 del VPS.

| Host                   | Tipo    | Target                      | Proxy Cloudflare  | Quando attivarlo      |
| ---------------------- | ------- | --------------------------- | ----------------- | --------------------- |
| `middleware.media`     | A/AAAA  | IP VPS                      | DNS only iniziale | Dopo smoke production |
| `www.middleware.media` | CNAME/A | `middleware.media` o IP VPS | DNS only iniziale | In fase go-live       |

Regole Cloudflare:

- SSL mode: `Full (strict)` dopo certificati validi.
- Proxy arancione solo dopo verifica login CMS, cookie auth e tRPC.
- Non applicare cache HTML globale.
- Non cachare `/cms/*`, `/api/trpc/*`, `/api/cms/*` e route auth.
- Cache lunga consentita per `/_next/static/*`.
- Cache su `/api/public/media/blob` solo rispettando header applicativi.

## Preflight locale

Eseguire in locale prima del deploy production:

```bash
pnpm check:all
docker compose config
docker compose build app
```

Verificare almeno:

- Home pubblica.
- Login CMS.
- Upload media.
- Publish/unpublish.
- Revalidation.
- Rate limit Redis.
- Build Docker production.

## Account e accessi

| Accesso                | Uso                        | Stato prima deploy                   |
| ---------------------- | -------------------------- | ------------------------------------ |
| Hetzner Cloud          | VPS                        | Account pronto, billing verificato   |
| Hetzner Object Storage | Bucket media               | Accesso pronto, bucket da creare     |
| Cloudflare             | DNS/CDN e Registrar        | Dominio `middleware.media` gestibile |
| GitHub                 | Repository                 | Accesso admin verificato             |
| Email admin production | Bootstrap admin production | Scelta manualmente                   |

## SSH

Generare una chiave dedicata alla VPS, senza riusare chiavi personali generiche:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/middleware_hetzner_ed25519 -C "middleware.media hetzner"
```

Regole operative:

- Salvare la public key in Hetzner Cloud durante la creazione VPS.
- Salvare la private key solo sulla macchina amministrativa e nel password manager se supporta allegati sicuri.
- Non committare mai chiavi SSH nel repository.
- Dopo setup, usare solo utente non-root.

## Dominio

Il transfer su Cloudflare Registrar è possibile solo se la zona `middleware.media` è già attiva su Cloudflare. Quindi prima si sposta il DNS, poi si trasferisce la registrazione.

1. Aggiungi `middleware.media` come zona su Cloudflare e punta i nameserver al valore Cloudflare.
2. Attendi che la zona risulti `active`.
3. Nel registrar attuale togli il registrar lock e, se blocca il transfer, disattiva la WHOIS privacy.
4. Recupera il codice di autorizzazione.
5. Verifica che il dominio sia registrato da più di 60 giorni e non sia stato trasferito negli ultimi 60 giorni.
6. Avvia il transfer su Cloudflare Registrar e approva la FOA.

## Setup VPS minimo

1. Crea il server in Hetzner Cloud:
   - Location: Falkenstein o Norimberga.
   - Image: Ubuntu 24.04 LTS arm64.
   - Type: CAX31 ARM.
   - SSH key: chiave pubblica dedicata.
   - Networking: IPv4 + IPv6.
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
   ufw enable
   ```
5. Installa protezione SSH minima:
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
8. Verifica accesso con utente non-root prima di chiudere la sessione root.

## Database, Redis e media

Preparare i servizi production e salvare le connection string fuori dal repository.

Postgres:

- Creare un database production vuoto.
- Tenere il database non pubblico se gira sulla stessa rete privata della VPS.
- Usare la stessa connection string per `DATABASE_URL`, `POSTGRES_URL` e `PRISMA_DATABASE_URL`.

Redis:

- Creare un Redis production.
- Tenere Redis non pubblico se gira sulla stessa rete privata della VPS.
- Configurare `REDIS_URL`.

Media:

- Creare il bucket Hetzner Object Storage `middleware-media-prod`.
- Generare access key e secret key dedicate per production.
- Mantenere il bucket privato.
- Servire i media pubblici solo tramite route applicative, così il server controlla quali file sono accessibili.

## Deploy production

Prima del deploy:

- Verificare che `main` sia verde in locale.
- Configurare tutte le env production.
- Verificare che Postgres, Redis e bucket media siano raggiungibili dalla VPS.
- Non importare dati mock in production.

Inizializzazione dati:

1. Applicare le migrazioni Prisma:
   ```bash
   pnpm prisma:migrate:deploy
   ```
2. Verificare lo schema:
   ```bash
   pnpm prisma:validate
   ```
3. Creare il primo admin:
   ```bash
   pnpm auth:bootstrap-admin
   ```
4. Accedere al CMS.
5. Creare contenuti minimi reali o di smoke test:
   - issue
   - categoria
   - autore
   - articolo draft
   - pagina statica se necessaria
6. Testare publish/unpublish e revalidation pubblica.

## Smoke production

Eseguire prima di puntare pubblicamente il dominio principale o prima di attivare il proxy Cloudflare.

1. Aprire l'URL di verifica e controllare HTTP 200.
2. Verificare `robots.txt` e `sitemap.xml`.
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
17. Verificare redirect `www` -> apex.
18. Verificare 404 e pagina 500 gestita.

## Go-live dominio

1. Puntare `middleware.media` al VPS.
2. Puntare `www.middleware.media` al VPS o al record canonico.
3. Verificare SSL valido su apex e `www`.
4. Verificare redirect permanente `www.middleware.media` -> `middleware.media`.
5. Verificare login CMS, cookie auth e tRPC.
6. Attivare il proxy Cloudflare solo dopo le verifiche auth/CMS.
7. Rieseguire smoke production sul dominio pubblico.

## Checklist finale

### Locale

- [ ] `pnpm check:all` verde.
- [ ] `docker compose config` verde.
- [ ] `docker compose build app` verde.
- [ ] Smoke locale completato.

### Risorse

- [ ] VPS CAX31 creata con Ubuntu 24.04 LTS arm64.
- [ ] Utente non-root configurato.
- [ ] SSH hardening applicato.
- [ ] Firewall attivo con SSH, 80 e 443.
- [ ] Zona `middleware.media` attiva su Cloudflare.
- [ ] Transfer su Cloudflare Registrar completato o pianificato.
- [ ] Bucket media production privato creato.
- [ ] Credenziali S3 production salvate fuori repository.
- [ ] Postgres production creato.
- [ ] Redis production creato.

### Production

- [ ] Env production configurate.
- [ ] App production deployata da `main`.
- [ ] `pnpm prisma:migrate:deploy` eseguito su production.
- [ ] Admin production creato.
- [ ] Login CMS funzionante.
- [ ] Upload media funzionante.
- [ ] Pubblicazione e revalidation funzionanti.
- [ ] Media pubblico servito solo se referenziato da contenuti pubblicati.
- [ ] Redis/rate limit verificati in production mode.
- [ ] Header CSP verificati nel browser.
- [ ] Smoke production completato.

### Dominio

- [ ] Apex puntato al VPS.
- [ ] `www` puntato al VPS o al canonico.
- [ ] SSL valido su `middleware.media` e `www.middleware.media`.
- [ ] Redirect `www.middleware.media` -> `middleware.media` verificato.
- [ ] Proxy Cloudflare attivo e compatibile con CMS/auth.

## Punti di attenzione

- **Niente staging**: il test avviene in locale con Docker. `pnpm check:all` e build Docker sono il vero gate pre-deploy.
- **Migrazioni su production**: senza staging colpiscono direttamente il DB live. Eseguire solo quando il deploy è pronto e verificato.
- **Database pulito**: non importare dati mock in production. Creare solo admin e contenuti iniziali reali.
- **Media privati**: il bucket resta privato; la pubblicazione passa dalle route applicative per rispettare il modello CMS.
- **Email**: nessun SMTP nel progetto. Le azioni privilegiate sono ristrette ai ruoli admin/editor.
- **Cache Components**: usare `cacheLife`, `cacheTag` e `revalidateTag`; non introdurre route segment config incompatibili.
- **Single point of failure**: una sola VPS non ha failover automatico. Per ora è una scelta accettata per arrivare al primo go-live.
- **Build RAM**: con 16 GB il rischio è basso. Se si scende a CAX21 da 8 GB, valutare build fuori dalla VPS.
- **next/image**: l'ottimizzazione gira sulla CPU ARM del VPS. A questa scala è accettabile; usare cache CDN sui media pubblici dove compatibile con i permessi.
