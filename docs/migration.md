# Production Residual Plan

Piano residuo dopo lo switch di `middleware.media` dalla vecchia Vercel alla VPS Hetzner.

Per accessi, comandi VPS, backup, deploy e guardrail operativi vedere `docs/production-ops.md`.

PROCEDI

## Stato Attuale

| Area           | Stato                                                                   |
| -------------- | ----------------------------------------------------------------------- |
| VPS            | Hetzner `CX43`, Ubuntu 24.04 LTS x86_64                                 |
| IP             | `46.224.209.184`                                                        |
| Dominio        | `https://middleware.media` live su VPS via Caddy                        |
| Redirect `www` | `https://www.middleware.media` -> `https://middleware.media`            |
| DNS            | Nameserver Vercel; record apex, `www` e `stats` puntano alla VPS        |
| App            | Next.js production via immagine GHCR                                    |
| DB             | Postgres container production                                           |
| Rate limit     | Redis container production                                              |
| Media          | Hetzner Object Storage, bucket privato `middlewaremedia`                |
| Analytics      | Umami locale e integrazione app pronti; production non ancora abilitata |

## Prossima Attivita

Stabilizzare il go-live dominio appena completato e chiudere i residui prima di abilitare Umami production.

1. Verificare completamento del deploy GitHub Actions avviato per rebuildare l'immagine con `PRODUCTION_PUBLIC_SITE_URL=https://middleware.media`.
2. Fare smoke HTTPS post-deploy su home, `/chi-siamo`, `/privacy-policy`, `/cookie-policy`, `/cms/login`.
3. Verificare che canonical e `og:url` usino `https://middleware.media` e non `http://46.224.209.184`.
4. Verificare login CMS reale, `/cms/media` e upload media.
5. Verificare redirect legacy pubblici, almeno `/it`, `/it/privacy-policy`, `/it/articles/conricerca-e-stile-della-militanza`.
6. Installare e configurare Umami production su `https://stats.middleware.media` solo dopo smoke dominio stabile.

## Residui Operativi

- [ ] Deploy production rebuild con URL canonico HTTPS completato.
- [ ] Canonical e Open Graph URL verificati su dominio finale.
- [ ] Login CMS reale verificato dopo switch dominio.
- [ ] `/cms/media` verificato dopo switch dominio.
- [ ] Upload media verificato dopo switch dominio.
- [ ] `robots.txt` e `sitemap.xml` verificati su dominio finale.
- [ ] Redirect legacy `/it/*` verificati in production.
- [ ] Umami production installato su `stats.middleware.media`.
- [ ] Script Umami production abilitato solo sul layout pubblico.
- [ ] Pageview Umami production verificate.
- [ ] Backup DB ricorrenti automatizzati e restore test pianificato.
- [ ] Uptime check esterni configurati per `/`, `/cms/login` e, dopo rollout analytics, `stats.middleware.media`.

## Note Deploy

- Run GitHub Actions `https://github.com/daniele-benedetto/middleware-v2/actions/runs/29009496856`: fallito per cancellazione del job build; deploy saltato.
- Repo variables aggiornate prima del run:
  - `PRODUCTION_PUBLIC_SITE_URL=https://middleware.media`
  - `PRODUCTION_SMOKE_URL=https://middleware.media`
- Prossimo run: rilanciare `Deploy Production` da `main` dopo push e CI verde.
- Il deploy deve rilasciare una nuova immagine GHCR con build arg `BUILD_NEXT_PUBLIC_SITE_URL=https://middleware.media`.

## Guardrail

- Non usare `docker compose down`, reset DB, reset Prisma o rimozione volumi in production.
- Prima di deploy, migrazioni o modifiche compose, creare backup DB e backup dei file config toccati.
- Non stampare `.env.production` integralmente in chat o log.
- Non pubblicare porte dirette di `app`, `postgres`, `redis`, Umami o database analytics; ingresso pubblico solo da Caddy.
- Tenere Object Storage privato; i media passano dalle route applicative.
- Tenere Redis obbligatorio in production.
- Tenere analytics separata dai dati applicativi: Umami usa database dedicato e non entra nelle migrazioni Prisma dell'app.

## Umami Production Plan

- [ ] Creare backup DB applicativo prima di toccare production, anche se Umami usa DB separato.
- [ ] Aggiungere `umami` e database dedicato nel compose production o in compose analytics separato.
- [ ] Creare segreti production: `UMAMI_APP_SECRET`, credenziali DB analytics, eventuale admin iniziale.
- [ ] Configurare Caddy per `stats.middleware.media` con HTTPS.
- [ ] Creare sito `middleware.media` nella dashboard Umami production.
- [ ] Salvare `website-id` production nelle variabili runtime dell'app.
- [ ] Validare compose production con analytics incluso.
- [ ] Avviare solo servizi analytics necessari senza ricreare app, Postgres applicativo o Redis.
- [ ] Verificare login dashboard Umami e cambiare credenziali temporanee/default.
- [ ] Deployare app con variabili Umami production.
- [ ] Verificare che `/cms/*`, `/api/trpc/*` e `/api/cms/*` non carichino script analytics.

## Rischi Noti

- Una sola VPS e single point of failure; non c'e failover automatico.
- Le migrazioni colpiscono direttamente production.
- Il build Next.js inlines `NEXT_PUBLIC_*`; cambi a URL pubblici o Umami richiedono rebuild immagine, non solo restart container.
- `app` deve restare collegata sia a `internal` sia a `public`: senza `public` non raggiunge Object Storage.
- Il bucket media deve restare privato.
