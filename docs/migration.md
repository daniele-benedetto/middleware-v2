# Production Residual Plan

Piano residuo dopo lo switch di `middleware.media` dalla vecchia Vercel alla VPS Hetzner.

Per accessi, comandi VPS, backup, deploy e guardrail operativi vedere `docs/production-ops.md`.

PROCEDI

## Stato Attuale

| Area           | Stato                                                            |
| -------------- | ---------------------------------------------------------------- |
| VPS            | Hetzner `CX43`, Ubuntu 24.04 LTS x86_64                          |
| IP             | `46.224.209.184`                                                 |
| Dominio        | `https://middleware.media` live su VPS via Caddy                 |
| Redirect `www` | `https://www.middleware.media` -> `https://middleware.media`     |
| DNS            | Nameserver Vercel; record apex, `www` e `stats` puntano alla VPS |
| App            | Next.js production via immagine GHCR                             |
| DB             | Postgres container production                                    |
| Rate limit     | Redis container production                                       |
| Media          | Hetzner Object Storage, bucket privato `middlewaremedia`         |
| Analytics      | Umami locale e integrazione app pronti; production in rollout    |

## Prossima Attivita

Stabilizzare il go-live dominio appena completato e chiudere i residui prima di abilitare Umami production.

1. Installare e configurare Umami production su `https://stats.middleware.media`.
2. Creare sito `middleware.media` nella dashboard Umami production.
3. Configurare app con variabili Umami production e redeployare solo `app`.
4. Verificare che lo script analytics carichi solo sul layout pubblico e non su `/cms/*`.

## Residui Operativi

- [ ] Umami production installato su `stats.middleware.media`.
- [ ] Script Umami production abilitato solo sul layout pubblico.
- [ ] Pageview Umami production verificate.
- [ ] Backup DB ricorrenti automatizzati e restore test pianificato.
- [ ] Uptime check esterni configurati per `/`, `/cms/login` e, dopo rollout analytics, `stats.middleware.media`.

## Note Deploy

- Run GitHub Actions `https://github.com/daniele-benedetto/middleware-v2/actions/runs/29011026346`: build immagini riuscita; deploy job rimasto in coda/cancellato.
- Repo variables aggiornate prima del run:
  - `PRODUCTION_PUBLIC_SITE_URL=https://middleware.media`
  - `PRODUCTION_SMOKE_URL=https://middleware.media`
- Deploy manuale data-safe completato su VPS con immagine GHCR `app:0d18f0de671ac552765d63614bb935d0bc88cbb8` e backup DB `postgres-predeploy-0d18f0de671ac552765d63614bb935d0bc88cbb8-20260709T103025Z.dump`.

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
