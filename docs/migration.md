# Production Plan

Piano operativo prioritizzato dopo lo switch di `middleware.media` dalla vecchia Vercel alla VPS Hetzner e il primo ciclo di hardening production.

Per accessi, comandi VPS, backup, deploy e guardrail operativi vedere `docs/production-ops.md`.

## Stato Attuale

| Area           | Stato                                                               |
| -------------- | ------------------------------------------------------------------- |
| VPS            | Hetzner `CX43`, Ubuntu 24.04 LTS x86_64                             |
| IP             | `46.224.209.184`                                                    |
| Dominio        | `https://middleware.media` live su VPS via Caddy                    |
| Redirect `www` | `https://www.middleware.media` -> `https://middleware.media`        |
| DNS            | Nameserver Vercel; record apex, `www` e `stats` puntano alla VPS    |
| App            | Next.js production via immagine Docker locale su VPS                |
| DB             | Postgres container production                                       |
| Rate limit     | Redis container production                                          |
| Media          | Hetzner Object Storage, bucket privato `middlewaremedia`            |
| Analytics      | Umami production attivo su `https://stats.middleware.media`         |
| Deploy         | Manuale via SSH; GitHub Actions non configurato                     |
| Healthcheck    | `/opt/middleware/bin/healthcheck.sh` sulla VPS                      |
| Backup P0      | Backup/restore/healthcheck locali via systemd, zero servizi esterni |

## Stato Interventi Completati

- [x] Dominio production live su VPS con HTTPS Caddy.
- [x] Umami self-hosted attivo e separato dal DB applicativo.
- [x] Redis production obbligatorio e autenticato.
- [x] Segreti Postgres/Redis ruotati dopo esposizione in output diagnostici.
- [x] `compose.production.yml` ripulito da credenziali inline correnti.
- [x] Healthcheck Redis corretto per non passare password come argomento CLI.
- [x] Reboot manutentivo eseguito; `reboot_required=no`.
- [x] SSH hardening applicato senza cambio porta: root/password disabilitati, `MaxAuthTries 3`, no X11/TCP forwarding.
- [x] Fail2ban `sshd` attivo con policy piu restrittiva.
- [x] `/api/og` corretto e verificato con `200 image/png`.
- [x] Dump zero-byte quarantinato e vecchie directory backup app ripulite con manifest.
- [x] Healthcheck read-only versionato in `scripts/production-healthcheck.sh` e copiato su VPS.
- [x] Backup locali automatici zero-cost configurati con timer systemd.
- [x] Restore test locale non distruttivo configurato con timer systemd.
- [x] Healthcheck locale automatico configurato ogni 15 minuti con timer systemd.

## Prossima Attivita

Stabilizzare l'operativita manuale senza GitHub Actions e ridurre i rischi legati a monitoraggio esterno e picchi di traffico.

1. Verificare periodicamente i journal dei timer locali backup/restore/healthcheck.
2. Verificare Umami da browser reale su realtime/dashboard.
3. Definire procedura deploy manuale standardizzata finche GitHub Actions non esiste.
4. Pianificare hardening performance/media prima di campagne o picchi traffico importanti.
5. Se in futuro ci sono fondi o servizi free accettati, aggiungere uptime check esterni.

## Priorita

### P0: Continuita Operativa

- [x] Backup ricorrenti automatizzati per DB applicativo.
- [x] Backup ricorrenti automatizzati per DB analytics Umami.
- [x] Restore test pianificato e documentato per dump applicativo e analytics.
- [x] Healthcheck locale ogni 15 minuti per `/`, `/cms/login`, `/cms/media`, `/api/og?title=health`, `stats.middleware.media`, DB, Redis e Object Storage.
- [ ] Uptime check esterni non configurati per vincolo zero budget/zero servizi esterni.
- [ ] Alert esterni per VPS down non disponibili senza un sistema fuori dalla VPS.

### P1: Deploy Manuale Sicuro

- [x] Standardizzare una procedura manuale di deploy senza GitHub Actions, con tag immagine univoco e `DEPLOY_SOURCE` aggiornato.
- [x] Evitare build arg con segreti reali usando BuildKit secret mount per il build Next.
- [x] Aggiungere smoke obbligatorio post-deploy tramite `/opt/middleware/bin/healthcheck.sh`.
- [x] Definire rollback manuale documentato usando `app.backup.*`, immagine precedente e backup config.
- [ ] Valutare creazione futura GitHub Actions solo dopo aver fissato secret handling e known hosts.

### P2: Analytics E Osservabilita

- [ ] Pageview Umami production verificate da browser reale.
- [ ] Verificare che CMS, auth, tRPC e route media CMS restino esclusi dallo script analytics.
- [ ] Definire dashboard minima: traffico pubblico, errori app, Caddy 5xx, uso disco, backup recenti.
- [ ] Decidere retention log e audit coerente con spazio disco e privacy.

### P3: Performance E Scalabilita

- [ ] Valutare CDN davanti a `middleware.media` per pagine cacheable, asset, OG image e media pubblici.
- [ ] Valutare serving diretto dei media da Object Storage con CDN o URL firmati, mantenendo bucket privato e policy accesso coerente.
- [ ] Valutare cache Caddy per `/api/public/media/blob` e immagini OG dinamiche.
- [ ] Definire rate limit specifici per media/audio e bot aggressivi.
- [ ] Preparare load test controllato su staging o finestra concordata prima di campagne social.
- [ ] Valutare scaling orizzontale dell'app Next.js o separazione media/API se il traffico audio diventa rilevante.

## Residui Operativi Legacy

- [ ] Rivedere vecchie note deploy sotto e archiviare quelle non piu operative dopo il passaggio a deploy manuale VPS.
- [ ] Allineare eventuali riferimenti a GHCR/GitHub Actions quando il flusso definitivo sara deciso.

## Note Deploy

- 2026-07-27: ciclo hardening production completato manualmente via SSH. Segreti Postgres/Redis ruotati, compose ripulito da credenziali inline correnti, reboot completato, `/api/og` corretto e deployato con immagine `middleware-app:ogfix-20260727T132234`.
- 2026-07-27: cleanup backup completato con manifest `/opt/middleware/backups/cleanup-manifest-20260727T133709Z.txt`.
- 2026-07-27: healthcheck operativo disponibile su VPS in `/opt/middleware/bin/healthcheck.sh` e sorgente locale in `scripts/production-healthcheck.sh`.
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
