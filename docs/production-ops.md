# Production Ops

Runbook operativo per lavorare sulla VPS production. Non inserire segreti in questo file.

## Regole Generali

- Usare l'utente `deploy`, non `root`.
- Non committare chiavi SSH, env file, dump DB o output con segreti.
- Non stampare `.env.production` intero in chat o log.
- Non stampare `docker compose config` senza `--quiet`: espande variabili e puo rivelare segreti.
- Non usare `docker events`/`docker inspect` in output condivisi senza redazione: possono includere command line, healthcheck e build metadata.
- Non passare password in argomenti CLI visibili, es. `redis-cli -a <password>` negli healthcheck. Usare variabili lette nel container, es. `REDISCLI_AUTH`.
- Non lasciare URL database o Redis con credenziali inline in `compose.production.yml`; usare riferimenti a variabili/env file.
- Prima di modificare file production, leggere lo stato corrente e creare una copia del file che si tocca.
- Prima di deploy o migrazioni, creare un dump DB in `/opt/middleware/backups`.
- Non usare comandi distruttivi se non richiesti esplicitamente e dopo backup verificato.
- Se durante un intervento emerge uno stato inatteso, fermarsi e fotografare stato/log prima di correggere.
- Tenere `docs/migration.md` come checklist delle cose da fare; tenere questo file come procedura operativa.

## Accesso SSH

VPS production:

```bash
ssh -i ~/.ssh/middleware_hetzner_ed25519 deploy@62.238.105.217
```

Regole SSH:

- Entrare come `deploy`.
- Usare `sudo` solo quando serve davvero.
- Non copiare chiavi private sulla VPS.
- Agent forwarding deve essere disabilitato.
- La porta SSH resta `22` finche non esiste automazione GitHub Actions o una procedura aggiornata per tutte le postazioni operative.
- Hardening atteso: `AuthenticationMethods publickey`, `PermitRootLogin no`,
  `PasswordAuthentication no`, `KbdInteractiveAuthentication no`,
  `MaxAuthTries 3`, `X11Forwarding no`, `AllowTcpForwarding no` e
  `AllowAgentForwarding no`.
- Fail2ban deve restare attivo sul jail `sshd` con ban temporanei per brute-force.

## Host E Percorsi

| Risorsa            | Valore                                       |
| ------------------ | -------------------------------------------- |
| IP VPS             | `62.238.105.217`                             |
| OS                 | Ubuntu 24.04 LTS x86_64                      |
| Workdir production | `/opt/middleware`                            |
| App artifact       | `/opt/middleware/app`                        |
| Env production     | `/opt/middleware/.env.production`            |
| Compose attivo     | `/opt/middleware/compose.production.yml`     |
| Caddy attivo       | `/opt/middleware/Caddyfile`                  |
| Caddy recovery     | `/opt/middleware/Caddyfile.production-ready` |
| Deploy source      | `/opt/middleware/DEPLOY_SOURCE`              |
| Backup DB          | `/opt/middleware/backups`                    |

## Infrastruttura Corrente

- Server Hetzner `CX33`, location `HEL1`.
- Docker Compose gestisce `postgres`, `redis`, `app`, `caddy`, `migrate`,
  `umami` e `umami-postgres`.
- Postgres e Redis girano su rete Docker `internal`.
- `app` deve stare su `internal` e `public`: `internal` per DB/Redis, `public` per egress verso Object Storage.
- `app` non deve avere porte pubblicate; Caddy resta l'unico ingresso HTTP/HTTPS.
- Bucket Object Storage: `middlewaremedia` su endpoint `https://fsn1.your-objectstorage.com`, bucket privato.
- Media serviti via route applicative, non tramite bucket pubblico.
- Analytics attivo: Umami self-hosted cookieless su `stats.middleware.media`, con database dedicato e separato dal DB applicativo.
- Immagini third-party production fissate per digest; aggiornare i digest solo
  dopo test e deploy controllato.
- Tutti i container hanno limite memoria/CPU/PID, log rotation e
  `no-new-privileges`; app, database, Redis, Umami e Caddy hanno healthcheck.
- `vm.overcommit_memory=1` e persistito per l'affidabilita Redis.
- `auditd` e attivo con watch su SSH, sudoers, env/secrets, Compose e Caddy.
- Build production richiede il plugin `docker-buildx` sulla VPS.

## Comandi Base

Stato servizi:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml ps
docker volume inspect middleware_postgres-data --format 'Name={{.Name}} Created={{.CreatedAt}} Mountpoint={{.Mountpoint}}'
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select migration_name, finished_at from \"_prisma_migrations\" order by finished_at;"'
```

Nota: usare `docker compose ... config --quiet` per validare il compose. Non stampare `docker compose ... config` completo in chat/log perche espande segreti.

Log app:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml logs --no-color --tail=200 app
```

Log Caddy:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml logs --no-color --tail=200 caddy
```

Validare compose:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml config --quiet
```

Restart app senza rebuild:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml up -d --no-build --no-deps app
```

Restart Caddy senza rebuild:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml up -d --no-build caddy
```

Healthcheck read-only:

```bash
cd /opt/middleware
./bin/healthcheck.sh
```

Lo script `bin/healthcheck.sh` non deve stampare env o segreti. Controlla host, disco, systemd, compose, Postgres, Redis, smoke HTTPS, `/api/og` e Object Storage.

Timer locali zero-cost:

```bash
systemctl list-timers --all middleware-backup.timer middleware-restore-test.timer middleware-healthcheck.timer --no-pager
sudo journalctl -u middleware-backup.service -n 80 --no-pager
sudo journalctl -u middleware-restore-test.service -n 80 --no-pager
sudo journalctl -u middleware-healthcheck.service -n 120 --no-pager
```

Avvio manuale controlli P0:

```bash
sudo systemctl start middleware-backup.service
sudo systemctl start middleware-restore-test.service
sudo systemctl start middleware-healthcheck.service
```

I timer girano sulla stessa VPS e non sostituiscono un monitor esterno: se la VPS e irraggiungibile, non possono inviare alert.
Il timer healthcheck invia il ping Healthchecks.io solo dopo tutti i controlli;
il capability URL vive esclusivamente in `/opt/middleware/secrets/monitoring.env`.

Aggiornamento allowlist SSH dopo un cambio IP pubblico:

1. Verificare il nuovo IP amministrativo da una sessione gia aperta.
2. Aggiornare prima la regola SSH del Cloud Firewall Hetzner.
3. Aggiornare UFW mantenendo aperta la sessione corrente.
4. Aprire una seconda sessione SSH e verificare l'effective config con `sshd -T`.
5. Chiudere la sessione precedente solo dopo il test positivo.

Se entrambe le allowlist bloccano l'accesso, usare Hetzner Rescue con la chiave
SSH registrata, montare il filesystem e correggere solo
`/etc/ufw/user.rules`, quindi riavviare normalmente.

Verifica audit:

```bash
sudo auditctl -s
sudo auditctl -l
sudo ausearch -k middleware_runtime --start today -i
```

## Regole Per Modificare File Sulla VPS

Prima di modificare un file:

```bash
cd /opt/middleware
cp <file> <file>.backup.$(date -u +%Y%m%dT%H%M%SZ)
```

File da trattare con massima cautela:

- `/opt/middleware/.env.production`
- `/opt/middleware/compose.production.yml`
- `/opt/middleware/Caddyfile`
- `/opt/middleware/app`
- eventuali file compose/env dedicati ad analytics e Umami

Regole:

- Non usare `git reset --hard` sulla VPS se non richiesto esplicitamente.
- Non editare config production senza prima salvare una copia.
- Non cambiare `COMPOSE_PROJECT_NAME`, nomi volume o nomi network senza piano di migrazione dati.
- Dopo ogni modifica a Compose, eseguire `docker compose --env-file .env.production -f compose.production.yml config --quiet`.
- Dopo ogni modifica a Caddy, ricreare solo `caddy` e controllare i log.
- Gli healthcheck non devono includere password come argomenti letterali. Per Redis preferire `CMD-SHELL` con `REDISCLI_AUTH` letto da env dentro il container.

## Analytics Umami Ops

Umami deve restare operativamente separato dall'applicazione editoriale. Il database analytics non e il database Prisma dell'app e non deve essere incluso in migrazioni, seed o restore applicativi.

Invarianti:

- Dominio pubblico analytics: `https://stats.middleware.media`.
- Ingresso pubblico solo via Caddy; nessuna porta host diretta per `umami` o DB analytics.
- Umami raccoglie solo statistiche aggregate e cookieless sulle pagine pubbliche.
- Umami Performance/Core Web Vitals puo essere abilitato solo se la versione deployata supporta `data-performance` (`v3.1.0` o superiore).
- Il tracker deve rispettare Do Not Track, escludere gli URL hash e usare una allowlist domini quando configurata.
- CMS, auth, tRPC e route media CMS non devono caricare script analytics.
- Le credenziali Umami e DB analytics non vanno stampate in chat/log.
- Backup e restore del DB analytics sono separati dai backup applicativi.

Prima di modificare config analytics:

```bash
cd /opt/middleware
cp compose.production.yml compose.production.yml.backup.$(date -u +%Y%m%dT%H%M%SZ)
cp Caddyfile Caddyfile.backup.$(date -u +%Y%m%dT%H%M%SZ)
```

Se analytics usa un file env separato, copiarlo senza stamparne il contenuto:

```bash
cd /opt/middleware
cp .env.analytics.production .env.analytics.production.backup.$(date -u +%Y%m%dT%H%M%SZ)
```

Validazione compose dopo aggiunta Umami:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml config --quiet
```

Avvio o restart dei soli servizi analytics, usando i nomi effettivi definiti nel compose:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml up -d --no-build umami umami-postgres
```

Se il DB analytics e gestito in compose separato, usare quel file dedicato e non il compose applicativo. Non usare `docker compose down` come shortcut.

Controllo stato analytics:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml ps umami umami-postgres caddy
docker compose --env-file .env.production -f compose.production.yml logs --no-color --tail=200 umami
docker compose --env-file .env.production -f compose.production.yml logs --no-color --tail=200 caddy
```

Smoke HTTPS analytics:

```bash
curl -I https://stats.middleware.media/
curl -L https://middleware.media/ | grep -F 'umami'
curl -L https://middleware.media/cms/login | grep -F 'umami'
```

Interpretazione smoke:

- Il primo comando deve rispondere con HTTPS valido.
- Il secondo deve trovare lo script solo se analytics e abilitato in app.
- Il terzo non deve trovare lo script; se lo trova, fermare il rollout e correggere l'esclusione CMS.
- Se `NEXT_PUBLIC_UMAMI_PERFORMANCE=true`, verificare dalla dashboard Umami che la tab Performance riceva Core Web Vitals reali dopo traffico browser.

Backup DB analytics, se Umami usa Postgres container dedicato:

```bash
cd /opt/middleware
mkdir -p backups
backup_file="backups/umami-postgres-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T umami-postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$backup_file"
test -s "$backup_file"
ls -lh "$backup_file"
```

Rollback rapido analytics lato app:

```bash
cd /opt/middleware
cp .env.production .env.production.backup.$(date -u +%Y%m%dT%H%M%SZ)
```

Poi rimuovere o svuotare le variabili pubbliche Umami in `.env.production`, validare compose e ricreare solo app:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml config --quiet
docker compose --env-file .env.production -f compose.production.yml up -d --no-build --no-deps app
curl -L https://middleware.media/ | grep -F 'umami'
```

Il `grep` finale non deve trovare lo script. Non cancellare subito volumi o database analytics: prima decidere retention e obblighi documentali.

## Map Tiles Ops

Le mappe CMS usano Leaflet e tile OpenStreetMap. Il browser richiede immagini direttamente a `https://*.tile.openstreetmap.org`; la CSP autorizza esclusivamente tale origine. Il servizio e adatto al CMS autenticato con traffico limitato, non a pagine pubbliche o alto traffico.

## Deploy Production Data-Safe

Obiettivo: aggiornare codice e container senza ricreare Postgres, senza cambiare volume dati e senza eseguire reset distruttivi.

Al momento il deploy production e manuale via SSH sulla VPS. Se in futuro si aggiunge il workflow GitHub Actions `Deploy Production`, deve replicare questa procedura data-safe e richiedere almeno:

- Secret `PRODUCTION_SSH_PRIVATE_KEY` con la chiave privata deploy.
- Secret `PRODUCTION_SSH_KNOWN_HOSTS` obbligatorio e derivato da fingerprint verificata; nessun fallback `ssh-keyscan`.
- Variabile `PRODUCTION_SSH_HOST` obbligatoria.
- Variabile `PRODUCTION_SSH_PORT`, opzionale se resta `22`.
- Variabile `PRODUCTION_SSH_USER`, opzionale se resta `deploy`.
- Variabile `PRODUCTION_SMOKE_URL` obbligatoria e uguale a `https://middleware.media` dopo go-live.

Se abilitato, il workflow deve essere eseguito solo da `main` e deve verificare automaticamente che la CI sia verde sul commit da rilasciare prima di aprire SSH verso la VPS.

Deploy manuale standard, senza GitHub Actions:

```bash
scripts/production-deploy-manual.sh --dry-run --allow-dirty
scripts/production-deploy-manual.sh --execute --allow-dirty
```

Regole dello script manuale:

- Default `--dry-run`: esegue check locali, healthcheck VPS e `rsync --dry-run`, ma non modifica production.
- `--execute` e obbligatorio per deploy reale.
- `--allow-dirty` e obbligatorio se il worktree locale contiene modifiche non committate; in quel caso `DEPLOY_SOURCE` deve registrare `dirty=true`.
- Prima del deploy reale crea dump DB app verificato con `test -s`, backup `/opt/middleware/app` e backup `compose.production.yml`.
- Usa `rsync` verso `/opt/middleware/app` escludendo `.env*`, `.git`, `node_modules`, `.next`, backup, coverage e file locali.
- Usa BuildKit secret mount per i valori necessari al build Next, evitando `ARG` con segreti reali nei metadata immagine.
- Costruisce immagini `middleware-app:manual-<sha>[-dirty]-<timestamp>` e `middleware-migrate:<same-tag>`.
- Esegue migrazioni con `docker run --rm --network middleware_internal --env-file <file-temporaneo> ...`, non con `docker compose run migrate`.
- Verifica che gli ID container di Postgres e Redis non cambino.
- Aggiorna solo l'image `app` nel compose e ricrea solo `app` con `up -d --no-build --no-deps app`.
- Esegue `/opt/middleware/bin/healthcheck.sh` e controlla che i segreti correnti non compaiano in `docker events` recenti o metadata delle immagini prodotte.
- Rimuove file temporanei e fa prune della build cache a fine deploy.

Rollback manuale app-only:

```bash
cd /opt/middleware
cp compose.production.yml compose.production.yml.backup.rollback.$(date -u +%Y%m%dT%H%M%SZ)
```

Poi impostare nel servizio `app` di `compose.production.yml` l'immagine precedente nota, validare e ricreare solo app:

```bash
docker compose --env-file .env.production -f compose.production.yml config --quiet
docker compose --env-file .env.production -f compose.production.yml up -d --no-build --no-deps app
./bin/healthcheck.sh
```

Rollback file sorgente:

- Usare l'ultimo `app.backup.*` coerente con l'immagine scelta.
- Fare sempre backup della directory `app` corrente prima di ripristinare una vecchia copia.
- Il restore DB non e parte del rollback standard: usarlo solo dopo conferma esplicita e con dump verificato.

Pre-check obbligatori:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml ps
docker volume inspect middleware_postgres-data --format 'Name={{.Name}} Created={{.CreatedAt}} Mountpoint={{.Mountpoint}}'
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select migration_name, finished_at from \"_prisma_migrations\" order by finished_at;"'
```

Regole operative del deploy:

- `migrate` deve girare con `docker run --rm --network middleware_internal ... middleware-migrate pnpm prisma:migrate:deploy`, cosi Compose non sovrascrive la `DATABASE_URL` esplicita e non ricrea `postgres` o `redis`.
- Il restart applicativo deve usare `up -d --no-build --no-deps app`, cosi aggiorna solo `app`.
- Prima di `migrate`, salvare gli ID container di `postgres` e `redis` e verificarli dopo `migrate`.
- Il dump pre-deploy deve essere verificato con `test -s` prima di sincronizzare o ricreare servizi.
- Nei blocchi SSH via heredoc usare `docker compose exec --interactive=false -T ...`; senza `--interactive=false`, `exec` puo consumare lo stdin del heredoc e saltare i comandi successivi. Eccezione: se il comando legge intenzionalmente un file tramite `<`, usare `exec -T` per mantenere stdin aperto.
- Per Prisma CLI, costruire una `DATABASE_URL` con user/password/db URL-encoded e passarla esplicitamente a `migrate`; il build Next e il runtime app restano sulla `DATABASE_URL` raw usata dall'adapter `pg`.
- Non usare `source .env.production`: alcuni valori possono contenere spazi o caratteri non shell-safe. Per il build usare il parser riga-per-riga gia documentato sotto.
- Durante il build remoto, se il build usa la rete `middleware_public`, collegare temporaneamente `middleware-postgres-1` a `middleware_public` con alias `postgres` e scollegarlo sempre a fine build. Se `next build` logga `EAI_AGAIN postgres`, fermarsi e non deployare l'immagine.

Backup DB pre-deploy:

```bash
cd /opt/middleware
mkdir -p backups
backup_file="backups/postgres-predeploy-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$backup_file"
test -s "$backup_file"
ls -lh "$backup_file"
```

Aggiornare sorgente applicativa:

```bash
cd /opt/middleware
cp -a app app.backup.$(date -u +%Y%m%dT%H%M%SZ)
```

Sincronizzare o aggiornare `/opt/middleware/app` con il commit da deployare. Preferire artifact pulito o sync controllato. Non usare reset distruttivi come shortcut.

Build e migrate sono gestiti dallo script standard dalla workstation locale:

```bash
SSH_HOST=62.238.105.217 scripts/production-deploy-manual.sh --dry-run
SSH_HOST=62.238.105.217 scripts/production-deploy-manual.sh --execute
```

Non sostituire questi comandi con `docker build --build-arg` contenenti URL o credenziali. Lo script crea file temporanei con permessi `0600`, passa l'ambiente di build al target `runner` tramite `docker buildx build --secret id=build_env,...` e rimuove i file al termine.

Durante `next build` il DB deve essere raggiungibile e la rete di build deve avere egress internet per `next/font`. Se il build logga `P1001`, `Can't reach database server` o genera solo `empty-static-param`, fermarsi: l'artifact puo contenere pagine pubbliche prerenderizzate come 404.

Ricreare solo app:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml up -d --no-build --no-deps app
docker compose --env-file .env.production -f compose.production.yml ps
```

Aggiornare deploy marker:

```bash
cd /opt/middleware
printf 'branch=main\ncommit=<commit-sha>\nsynced_at=%s\nmethod=<git-or-rsync-or-artifact>\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > DEPLOY_SOURCE
grep -F 'commit=<commit-sha>' DEPLOY_SOURCE
```

## Comandi Vietati In Production Standard

Non usare per deploy standard:

```bash
docker compose down
docker compose down -v
docker volume rm middleware_postgres-data
docker compose up --build
docker compose run migrate
docker compose up -d app
prisma migrate reset
prisma db push --force-reset
```

Per analytics valgono anche questi divieti:

```bash
docker compose rm -f umami-postgres
docker volume rm <volume-analytics>
dropdb <umami-db>
```

Usarli solo dopo richiesta esplicita, backup verificato e decisione documentata sulla retention dei dati analytics.

`docker compose up --build` non e sempre distruttivo, ma in production e vietato come shortcut perche rende meno esplicito cosa viene ricreato. Usare sempre build, migrate con `docker run --rm --network middleware_internal ... middleware-migrate pnpm prisma:migrate:deploy` e restart app con `up -d --no-build --no-deps app` separati.

## Backup E Restore DB

Retention operativa:

- I dump DB validi devono essere non vuoti (`test -s`).
- I dump da `0` byte non sono backup validi: spostarli in `backups/quarantine/` e registrare l'azione in un manifest.
- Le directory `app.backup.*` sono backup deploy temporanei. Tenere almeno le 6 piu recenti salvo esigenze specifiche di rollback.
- Prima di rimuovere backup o directory storiche, creare un manifest `backups/cleanup-manifest-<timestamp>.txt` con policy, elementi mantenuti, elementi rimossi/quarantinati e spazio disco prima/dopo.
- Non cancellare dump DB applicativi o analytics validi senza una decisione esplicita di retention.

Backup automatici locali zero-cost:

- Script VPS: `/opt/middleware/bin/backup-databases.sh`.
- Sorgente repo: `scripts/production-backup-databases.sh`.
- Timer: `middleware-backup.timer`, alle `00:15`, `05:15`, `10:15`, `15:15` e `20:15 UTC` con jitter.
- Output: `/opt/middleware/backups/automated/daily`.
- Weekly snapshot: `/opt/middleware/backups/automated/weekly`, creato la domenica UTC.
- Manifest: `/opt/middleware/backups/automated/manifests`.
- Ogni coppia e scritta prima come `.partial`, validata con `pg_restore --list` e rinominata atomicamente.
- Il job usa `flock`, controlla spazio libero e non esegue prune se il backup fallisce.
- Retention attuale: 70 generazioni per DB, 8 weekly per DB, 90 manifest.

Divergenza aperta (rilevata 2026-08-10, non ancora risolta):

- `middleware-backup.service` e `middleware-healthcheck.service` sono in stato `failed`.
- Causa: il drop-in `/etc/systemd/system/middleware-backup.service.d/offsite.conf`
  dichiara `EnvironmentFile=/opt/middleware/secrets/backup-offsite.env`, file non
  piu presente. systemd non avvia affatto l'unit
  (`Failed to load environment files`).
- Il drop-in e residuo della rimozione dell'offsite backup (commit `79bb64c`):
  `bin/backup-databases.sh` e `bin/healthcheck-timer.sh` sulla VPS non
  referenziano piu `offsite`, solo il drop-in non e stato riconciliato.
- Ultimo backup automatico riuscito: `2026-08-10T05:24:04Z`. Le esecuzioni
  successive sono fallite, quindi non c'e heartbeat esterno.
- `bin/healthcheck.sh` fallisce su `test "$failed_units" = "0"`, quindi blocca
  anche il gate di `scripts/production-deploy-manual.sh`.
- Mitigazione applicata il `2026-08-10T15:41Z` senza `sudo`: ricreato
  `/opt/middleware/secrets/backup-offsite.env` come placeholder vuoto e commentato
  (mode `600`, utente `deploy`), cosi systemd riesce a caricare l'EnvironmentFile.
  `bin/backup-databases.sh` non referenzia piu alcuna variabile offsite, quindi il
  file resta intenzionalmente vuoto e non riabilita l'offsite backup.
- Backup verificato eseguendo `./bin/backup-databases.sh` come `deploy` (stesso
  utente dell'unit): manifest `backup-20260810T154241Z.txt`, dump app e analytics
  con sha256, exit 0.
- Residuo da chiudere, richiede `sudo`: rimuovere il drop-in orfano
  `middleware-backup.service.d/offsite.conf`, poi `daemon-reload` ed eliminare il
  placeholder. Finche le due unit restano in stato `failed`, `bin/healthcheck.sh`
  esce 1 e blocca il gate di `scripts/production-deploy-manual.sh`: serve
  `systemctl reset-failed` oppure attendere il firing del timer, che a quel punto
  va a buon fine da solo.

Restore test locale non distruttivo:

- Script VPS: `/opt/middleware/bin/restore-test.sh`.
- Sorgente repo: `scripts/production-restore-test.sh`.
- Timer: `middleware-restore-test.timer`, mensile.
- Crea DB temporanei `middleware_restore_test_<timestamp>` e li elimina a fine test.
- Manifest: `/opt/middleware/backups/automated/restore-tests`.
- Non sostituisce un restore completo: verifica solo che l'ultimo dump locale sia leggibile e ripristinabile sulla VPS.

Healthcheck automatico locale:

- Script VPS: `/opt/middleware/bin/healthcheck-timer.sh`.
- Sorgente repo: `scripts/production-healthcheck-timer.sh`.
- Timer: `middleware-healthcheck.timer`, ogni 15 minuti.
- Fallisce se uno dei due dump manca, e vuoto/non valido o ha piu di 5 ore e 45 minuti.
- Fallisce se manifest completato o marker backup cifrato off-host mancano/hanno piu di 5 ore e 45 minuti.
- I log restano locali in `journalctl`; senza servizi esterni non c'e alert se la VPS e down.
- Il timer invia un heartbeat esterno solo dopo tutti i controlli; 30 minuti senza
  heartbeat devono generare alert.

Dump manuale on-demand:

```bash
cd /opt/middleware
mkdir -p backups
backup_file="backups/postgres-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$backup_file"
test -s "$backup_file"
ls -lh "$backup_file"
```

Verifica esistenza dump:

```bash
cd /opt/middleware
ls -lh backups/*.dump
```

Restore da dump, solo dopo conferma esplicita:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml stop app
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" dropdb -U "$POSTGRES_USER" "$POSTGRES_DB" && PGPASSWORD="$POSTGRES_PASSWORD" createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose --env-file .env.production -f compose.production.yml exec -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl' < backups/<dump-file>.dump
docker compose --env-file .env.production -f compose.production.yml up -d --no-build --no-deps app
```

Recupero seed, solo se i dati reali non servono:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml run --rm --no-deps migrate pnpm auth:bootstrap-admin
docker compose --env-file .env.production -f compose.production.yml run --rm --no-deps migrate pnpm seed:articles
```

Note:

- Il seed usa upsert per issue/articoli e salta bootstrap admin se esiste gia un admin.
- Il seed non e un backup e non recupera contenuti editoriali reali cancellati.
- Se Postgres logga `initdb`, il volume montato era vuoto: controllare subito `docker volume inspect middleware_postgres-data` e cercare snapshot/dump precedenti.

## Smoke Test

Verifica diretta VPS, senza dipendere dal resolver locale:

```bash
curl --resolve middleware.media:443:62.238.105.217 -I https://middleware.media/
curl --resolve middleware.media:443:62.238.105.217 -I https://middleware.media/cms/login
curl --resolve stats.middleware.media:443:62.238.105.217 -I https://stats.middleware.media/
```

HTTPS/dominio:

```bash
curl -I https://middleware.media/
curl -I https://www.middleware.media/
curl -I https://middleware.media/cms/login
curl -I https://middleware.media/cms/media
curl -I 'https://middleware.media/api/og?title=health'
```

Verifica contenuto, non solo status code:

```bash
curl -L https://middleware.media/ | grep -F '<title>Middleware | Scomporre la sicurezza</title>'
curl -L https://middleware.media/chi-siamo | grep -F '<title>Middleware | Chi siamo</title>'
curl -L https://middleware.media/uscite/scomporre-la-sicurezza-primo-numero | grep -F '<title>Middleware | Scomporre la sicurezza</title>'
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' 'https://middleware.media/api/og?title=health'
```

Lo smoke `/api/og` deve rispondere `200 image/png`. Se risponde `502`, controllare che la route OG non stia risolvendo asset con origin interno `0.0.0.0:3000`.

Verifica DNS e Object Storage dal container app:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml exec -T app node -e "const dns=require('node:dns'); dns.lookup('fsn1.your-objectstorage.com',{all:true},(err,addrs)=>{ if(err){ console.error(err); process.exit(1); } console.log(addrs); });"
docker compose --env-file .env.production -f compose.production.yml exec -T app node -e "fetch('https://fsn1.your-objectstorage.com',{method:'HEAD'}).then(r=>console.log(r.status)).catch(e=>{console.error(e); process.exit(1);})"
```

## Stato Production

- URL canonico: `https://middleware.media`.
- Analytics: `https://stats.middleware.media`.
- Record A root e `stats`: `62.238.105.217`, TTL `60`.
- `www` resta alias di `middleware.media`; nessun record `AAAA` production.
- PTR IPv4: `62.238.105.217 -> middleware.media`.
- La CX43 precedente e stata eliminata il `2026-08-05`; il recovery host resta
  possibile dallo snapshot protetto `416553849` e dai dump off-host descritti in
  `docs/migration.md`.

## Troubleshooting Rapido

- Se `/cms/media` fallisce con `EAI_AGAIN` o `ENETUNREACH`, controllare che `app` sia collegata anche alla rete `public`.
- Se `next build` fallisce con `P1001`, verificare rete build e raggiungibilita di Postgres.
- Se Caddy non emette certificati, verificare DNS, porte `80/443`, firewall e log `caddy`.
- Se login CMS fallisce dopo dominio, verificare `BETTER_AUTH_URL`, cookie domain e HTTPS.
- Se pagine pubbliche risultano 404 dopo deploy, controllare log build e presenza di errori DB durante prerender/cache.

## Guardrail

- Non stampare `.env.production` intero in chat o log.
- Non stampare output completi che possono includere segreti espansi, inclusi `docker compose config`, `docker events`, `docker inspect` e command line con password.
- Prima di ogni deploy che tocca app/migration, creare un dump DB in `/opt/middleware/backups`.
- Verificare che `middleware_postgres-data` esista e non sia appena stato ricreato prima di migrare.
- Non usare `docker compose down -v` in production.
- Non usare `docker compose down` come deploy standard; usare `up -d --no-build --no-deps app`.
- Non usare `prisma migrate reset` o `prisma db push --force-reset` in production.
- Non cambiare `COMPOSE_PROJECT_NAME` o nomi volume senza piano di migrazione dati.
- Non usare `git reset --hard` o comandi distruttivi sulla VPS senza richiesta esplicita.
- Prima di modificare `compose.production.yml`, creare una copia con suffisso descrittivo.
- Prima di modificare `Caddyfile`, creare una copia con suffisso descrittivo.
- Se lo stato della VPS non corrisponde a questo documento, aggiornare prima il runbook o annotare la divergenza.
