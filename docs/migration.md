# Go-Live Production Checklist

Piano residuo per portare `middleware.media` live e stabilizzare la production self-hosted gia preparata su Hetzner.

Questo documento contiene cosa resta da fare. Per accessi, comandi VPS, backup, deploy e guardrail operativi vedere `docs/production-ops.md`.

## Stato Corrente

| Area           | Stato                                                    |
| -------------- | -------------------------------------------------------- |
| VPS            | Hetzner `CX43`, Ubuntu 24.04 LTS x86_64                  |
| IP             | `46.224.209.184`                                         |
| Runtime        | Docker Compose in `/opt/middleware`                      |
| App            | Next.js production via Caddy                             |
| DB             | Postgres container production                            |
| Rate limit     | Redis container production                               |
| Media          | Hetzner Object Storage, bucket privato `middlewaremedia` |
| Smoke IP       | Completato su `http://46.224.209.184`                    |
| Dominio finale | `https://middleware.media`                               |
| Redirect       | `www.middleware.media` -> `middleware.media`             |

## Principi Di Go-Live

- Non fare reset distruttivi in production.
- Non pubblicare porte dirette di `app`, `postgres` o `redis`; ingresso solo da Caddy.
- Fare backup DB prima di deploy/migrazioni e prima dello switch finale a dominio.
- Applicare DNS/HTTPS prima in modalita semplice, poi Cloudflare proxy solo dopo smoke riuscito.
- Tenere Object Storage privato; i media passano dalle route applicative.
- Tenere Redis obbligatorio in production; se non funziona, non considerare la production pronta.

## Checklist Prima Del DNS

### Production VPS

- [ ] `app`, `caddy`, `postgres`, `redis` sono up.
- [ ] `postgres` e `redis` sono healthy.
- [ ] Nessun container e in restart loop.
- [ ] `docker compose --env-file .env.production -f compose.production.yml config --quiet` passa.
- [ ] Solo Caddy espone porte pubbliche.
- [ ] `app` non espone porta host.
- [ ] `postgres` e `redis` non espongono porte host.
- [ ] `app` e collegata a `middleware_internal` e `middleware_public`.
- [ ] `postgres` e `redis` sono collegati solo a `middleware_internal`.
- [ ] Firewall VPS consente solo SSH, HTTP e HTTPS dall'esterno.

### Dati E Backup

- [ ] Volume `middleware_postgres-data` verificato e non appena ricreato.
- [ ] Dump DB manuale pre-go-live creato in `/opt/middleware/backups`.
- [ ] Restore testato almeno una volta in ambiente non production o procedura verificata.
- [ ] Retention backup definita.
- [ ] Copia backup offsite pianificata o implementata.

### Variabili E Segreti

- [ ] `.env.production` non e mai stampato integralmente in chat/log.
- [ ] `BETTER_AUTH_SECRET` e forte e non riusato altrove.
- [ ] Credenziali Postgres, Redis e S3 sono production-only.
- [ ] `REDIS_URL` punta al Redis production.
- [ ] `AUDIT_LOG_RETENTION_DAYS` e impostato.
- [ ] Chiavi Object Storage hanno permessi minimi necessari sul bucket.

### Object Storage

- [ ] Bucket `middlewaremedia` privato.
- [ ] `S3_ENDPOINT=https://fsn1.your-objectstorage.com` corretto.
- [ ] Upload CMS verificato.
- [ ] Preview/download media verificati via `/api/cms/media/blob`.
- [ ] I media non sono accessibili pubblicamente dal bucket.

### Qualita Codice E Deploy

- [ ] CI verde su `main` dopo le ultime modifiche deploy.
- [ ] Branch protection/ruleset su `main` attiva con CI obbligatoria.
- [ ] Environment GitHub `production` configurato con approval, se desiderata.
- [ ] Primo deploy manuale data-safe riuscito da GitHub Actions.
- [ ] Smoke IP post-deploy riuscito.

## Config Temporanea IP

La production e attualmente configurata per IP HTTP:

- `BETTER_AUTH_URL=http://46.224.209.184`
- `NEXT_PUBLIC_SITE_URL=http://46.224.209.184`
- `SITE_URL=http://46.224.209.184`
- Caddy serve `http://46.224.209.184` senza HTTPS.

I file domain-ready sono gia presenti sulla VPS:

- `/opt/middleware/Caddyfile.domain-ready`
- `/opt/middleware/compose.production.yml.domain-ready`

## DNS

Preparare i record in Cloudflare in modalita iniziale **DNS only**, senza proxy.

| Host                   | Tipo          | Target                                | Proxy iniziale |
| ---------------------- | ------------- | ------------------------------------- | -------------- |
| `middleware.media`     | `A`           | `46.224.209.184`                      | DNS only       |
| `www.middleware.media` | `A` o `CNAME` | `46.224.209.184` o `middleware.media` | DNS only       |

Se viene configurato anche IPv6, verificare prima che Caddy e firewall siano pronti per traffico IPv6.

## Switch A Dominio

Sulla VPS:

```bash
cd /opt/middleware
cp Caddyfile.domain-ready Caddyfile
cp compose.production.yml.domain-ready compose.production.yml
```

Aggiornare `/opt/middleware/.env.production`:

```text
BETTER_AUTH_URL=https://middleware.media
NEXT_PUBLIC_SITE_URL=https://middleware.media
SITE_URL=https://middleware.media
```

Poi validare e ricreare i servizi necessari:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml config --quiet
docker compose --env-file .env.production -f compose.production.yml up -d --no-build --no-deps app caddy
```

## Smoke Dominio

- [ ] `https://middleware.media` risponde `200`.
- [ ] `https://www.middleware.media` redirige a `https://middleware.media`.
- [ ] `/cms/login` carica senza mixed content.
- [ ] Login CMS imposta cookie valido e porta a `/cms`.
- [ ] `/cms/media` carica.
- [ ] Upload media funziona.
- [ ] Home pubblica mostra il contenuto atteso.
- [ ] `/chi-siamo` mostra il contenuto atteso.
- [ ] Pagina issue pubblica mostra il contenuto atteso.
- [ ] `robots.txt` e `sitemap.xml` sono coerenti con production indicizzabile.
- [ ] Caddy ha emesso certificati HTTPS senza errori.

## Cloudflare Dopo Smoke HTTPS

Abilitare proxy Cloudflare solo dopo smoke HTTPS completato.

Impostazioni consigliate:

- SSL mode: `Full (strict)`.
- Nessuna cache HTML globale.
- Non cachare `/cms/*`, `/api/trpc/*`, `/api/cms/*` e route auth.
- Cache lunga consentita per `/_next/static/*`.
- Cache media solo rispettando header applicativi.

## Post-Go-Live

### Monitoring

- [ ] Uptime check esterno su `/`.
- [ ] Uptime check esterno su `/cms/login`.
- [ ] Alert per downtime.
- [ ] Alert disco VPS.
- [ ] Alert memoria/container restart.
- [ ] Controllo periodico certificati HTTPS.

### Backup Ricorrenti

- [ ] Backup DB giornaliero automatizzato.
- [ ] Retention locale definita.
- [ ] Copia offsite automatizzata.
- [ ] Restore test periodico pianificato.

### Manutenzione

- [ ] Job periodico per `pnpm audit:prune` definito.
- [ ] Procedura rollback app documentata e provata.
- [ ] Rotazione log Docker/Caddy verificata.
- [ ] Credenziali condivise durante lo smoke ruotate.
- [ ] Dependabot/Renovate valutato per dipendenze e GitHub Actions.

## Rischi Noti

- Una sola VPS e single point of failure; non c'e failover automatico.
- Le migrazioni colpiscono direttamente production.
- Il build Next.js richiede DB raggiungibile; un build con DB non raggiungibile puo produrre artifact pubblici incompleti.
- `app` deve restare collegata sia a `internal` sia a `public`: senza `public` non raggiunge Object Storage.
- Il bucket media deve restare privato.
- Auto-deploy su `main` va abilitato solo dopo CI e deploy manuali stabili.
