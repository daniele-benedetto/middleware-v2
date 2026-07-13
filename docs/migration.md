# Production Residual Plan

Piano residuo dopo lo switch di `middleware.media` dalla vecchia Vercel alla VPS Hetzner.

Per accessi, comandi VPS, backup, deploy e guardrail operativi vedere `docs/production-ops.md`.

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
| Analytics      | Umami production attivo su `https://stats.middleware.media`      |

## Prossima Attivita

Stabilizzare Umami production e chiudere i residui operativi post-rollout.

1. Verificare da browser reale che una pageview pubblica appaia in Umami realtime/dashboard.
2. Pianificare backup ricorrenti separati per DB applicativo e DB analytics.
3. Configurare uptime check esterni per `/`, `/cms/login` e `stats.middleware.media`.
4. Pianificare hardening performance prima di campagne o picchi traffico importanti.

## Residui Operativi

- [ ] Pageview Umami production verificate.
- [ ] Backup DB ricorrenti automatizzati e restore test pianificato.
- [ ] Uptime check esterni configurati per `/`, `/cms/login` e, dopo rollout analytics, `stats.middleware.media`.
- [ ] Valutare CDN davanti a `middleware.media` per pagine cacheable, asset, OG image e media pubblici.
- [ ] Valutare serving diretto dei media da Object Storage con CDN o URL firmati, mantenendo bucket privato e policy accesso coerente.
- [ ] Valutare cache Caddy per `/api/public/media/blob` e immagini OG dinamiche.
- [ ] Definire rate limit specifici per media/audio e bot aggressivi.
- [ ] Preparare load test controllato su staging o finestra concordata prima di campagne social.
- [ ] Valutare scaling orizzontale dell'app Next.js o separazione media/API se il traffico audio diventa rilevante.

## Note Deploy

- Run GitHub Actions `https://github.com/daniele-benedetto/middleware-v2/actions/runs/29011026346`: build immagini riuscita; deploy job rimasto in coda/cancellato.
- Repo variables aggiornate prima del run:
  - `PRODUCTION_PUBLIC_SITE_URL=https://middleware.media`
  - `PRODUCTION_SMOKE_URL=https://middleware.media`
- Deploy manuale data-safe completato su VPS con immagine GHCR `app:0d18f0de671ac552765d63614bb935d0bc88cbb8` e backup DB `postgres-predeploy-0d18f0de671ac552765d63614bb935d0bc88cbb8-20260709T103025Z.dump`.
- Umami production aggiunto manualmente a Compose/Caddy con database dedicato `umami-postgres`, nessuna porta host diretta e ingresso pubblico solo via Caddy.
- Certificato HTTPS Caddy emesso per `stats.middleware.media`.
- Sito Umami production creato: `middleware.media`, website id `98d16cbd-c15e-43ae-bf77-d42b1c923167`.
- Admin Umami dedicato creato per `daniele.benedetto@outlook.it`; default `admin/umami` disabilitato.
- Password admin Umami copiata anche in locale in `umami-admin-password.local.txt`, ignorato da Git.
- App production deployata manualmente al commit `4290cff0fb62a8b932a959b96afd2a97fee96317` con build VPS e DB raggiungibile; backup DB `postgres-predeploy-4290cff0fb62a8b932a959b96afd2a97fee96317-20260709T110537Z.dump`.
- Smoke analytics: `https://stats.middleware.media` risponde, `script.js` risponde, home pubblica contiene script/id Umami, `/cms/login` non contiene script/id Umami.

## Guardrail

- Non usare `docker compose down`, reset DB, reset Prisma o rimozione volumi in production.
- Prima di deploy, migrazioni o modifiche compose, creare backup DB e backup dei file config toccati.
- Non stampare `.env.production` integralmente in chat o log.
- Non pubblicare porte dirette di `app`, `postgres`, `redis`, Umami o database analytics; ingresso pubblico solo da Caddy.
- Tenere Object Storage privato; i media passano dalle route applicative.
- Tenere Redis obbligatorio in production.
- Tenere analytics separata dai dati applicativi: Umami usa database dedicato e non entra nelle migrazioni Prisma dell'app.

## Rischi Noti

- Una sola VPS e single point of failure; non c'e failover automatico.
- Le migrazioni colpiscono direttamente production.
- Il build Next.js inlines `NEXT_PUBLIC_*`; cambi a URL pubblici o Umami richiedono rebuild immagine, non solo restart container.
- `app` deve restare collegata sia a `internal` sia a `public`: senza `public` non raggiunge Object Storage.
- Il bucket media deve restare privato.
- Il collo di bottiglia atteso in caso di crescita non sono le pagine pubbliche cache-hit, ma media/audio serviti via app e object storage.
- Senza CDN o serving diretto dei media, molti ascolti audio concorrenti possono saturare app, rete o object storage prima della CPU della VPS.
