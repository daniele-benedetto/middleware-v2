# Production Ops

Runbook operativo per lavorare sulla VPS production. Non inserire segreti in questo file.

## Regole Generali

- Usare l'utente `deploy`, non `root`.
- Non committare chiavi SSH, env file, dump DB o output con segreti.
- Non stampare `.env.production` intero in chat o log.
- Prima di modificare file production, leggere lo stato corrente e creare una copia del file che si tocca.
- Prima di deploy o migrazioni, creare un dump DB in `/opt/middleware/backups`.
- Non usare comandi distruttivi se non richiesti esplicitamente e dopo backup verificato.
- Se durante un intervento emerge uno stato inatteso, fermarsi e fotografare stato/log prima di correggere.
- Tenere `docs/migration.md` come checklist delle cose da fare; tenere questo file come procedura operativa.

## Accesso SSH

VPS production:

```bash
ssh -i ~/.ssh/middleware_hetzner_ed25519 deploy@46.224.209.184
```

Regole SSH:

- Entrare come `deploy`.
- Usare `sudo` solo quando serve davvero.
- Non copiare chiavi private sulla VPS.
- Non lasciare agent forwarding attivo se non necessario.

## Host E Percorsi

| Risorsa              | Valore                                                |
| -------------------- | ----------------------------------------------------- |
| IP VPS               | `46.224.209.184`                                      |
| OS                   | Ubuntu 24.04 LTS x86_64                               |
| Workdir production   | `/opt/middleware`                                     |
| App artifact         | `/opt/middleware/app`                                 |
| Env production       | `/opt/middleware/.env.production`                     |
| Compose attivo       | `/opt/middleware/compose.production.yml`              |
| Caddy attivo         | `/opt/middleware/Caddyfile`                           |
| Compose domain-ready | `/opt/middleware/compose.production.yml.domain-ready` |
| Caddy domain-ready   | `/opt/middleware/Caddyfile.domain-ready`              |
| Deploy source        | `/opt/middleware/DEPLOY_SOURCE`                       |
| Backup DB            | `/opt/middleware/backups`                             |

## Infrastruttura Corrente

- Server Hetzner `CX43`, location `NBG1`.
- Docker Compose gestisce `postgres`, `redis`, `app`, `caddy` e `migrate`.
- Postgres e Redis girano su rete Docker `internal`.
- `app` deve stare su `internal` e `public`: `internal` per DB/Redis, `public` per egress verso Object Storage.
- `app` non deve avere porte pubblicate; Caddy resta l'unico ingresso HTTP/HTTPS.
- Bucket Object Storage: `middlewaremedia` su endpoint `https://fsn1.your-objectstorage.com`, bucket privato.
- Media serviti via route applicative, non tramite bucket pubblico.

## Comandi Base

Stato servizi:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml ps
docker volume inspect middleware_postgres-data --format 'Name={{.Name}} Created={{.CreatedAt}} Mountpoint={{.Mountpoint}}'
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select migration_name, finished_at from \"_prisma_migrations\" order by finished_at;"'
```

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

Regole:

- Non usare `git reset --hard` sulla VPS se non richiesto esplicitamente.
- Non editare config production senza prima salvare una copia.
- Non cambiare `COMPOSE_PROJECT_NAME`, nomi volume o nomi network senza piano di migrazione dati.
- Dopo ogni modifica a Compose, eseguire `docker compose --env-file .env.production -f compose.production.yml config --quiet`.
- Dopo ogni modifica a Caddy, ricreare solo `caddy` e controllare i log.

## Deploy Production Data-Safe

Obiettivo: aggiornare codice e container senza ricreare Postgres, senza cambiare volume dati e senza eseguire reset distruttivi.

Il workflow GitHub Actions `Deploy Production` replica questa procedura in modalita manuale. Prima di usarlo configurare almeno:

- Secret `PRODUCTION_SSH_PRIVATE_KEY` con la chiave privata deploy.
- Secret `PRODUCTION_SSH_KNOWN_HOSTS` consigliato; se assente il workflow usa `ssh-keyscan`.
- Variabile `PRODUCTION_SSH_HOST`, opzionale se resta `46.224.209.184`.
- Variabile `PRODUCTION_SSH_PORT`, opzionale se resta `22`.
- Variabile `PRODUCTION_SSH_USER`, opzionale se resta `deploy`.
- Variabile `PRODUCTION_SMOKE_URL`, opzionale; usare `http://46.224.209.184` prima del dominio e `https://middleware.media` dopo go-live.

Il workflow deve essere eseguito solo da `main`; verifica automaticamente che la CI sia verde sul commit da rilasciare prima di aprire SSH verso la VPS.

Pre-check obbligatori:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml ps
docker volume inspect middleware_postgres-data --format 'Name={{.Name}} Created={{.CreatedAt}} Mountpoint={{.Mountpoint}}'
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select migration_name, finished_at from \"_prisma_migrations\" order by finished_at;"'
```

Regole operative del deploy:

- `migrate` deve sempre girare con `run --rm --no-deps migrate pnpm prisma:migrate:deploy`, cosi Compose non ricrea `postgres` o `redis` e il comando usa l'env override esplicito.
- Il restart applicativo deve usare `up -d --no-build --no-deps app`, cosi aggiorna solo `app`.
- Prima di `migrate`, salvare gli ID container di `postgres` e `redis` e verificarli dopo `migrate`.
- Il dump pre-deploy deve essere verificato con `test -s` prima di sincronizzare o ricreare servizi.
- Nei blocchi SSH via heredoc usare `docker compose exec --interactive=false -T ...`; senza `--interactive=false`, `exec` puo consumare lo stdin del heredoc e saltare i comandi successivi.
- Per Prisma CLI, costruire una `DATABASE_URL` con user/password/db URL-encoded e passarla esplicitamente a `migrate`; il build Next e il runtime app restano sulla `DATABASE_URL` raw usata dall'adapter `pg`.
- Non usare `source .env.production`: alcuni valori possono contenere spazi o caratteri non shell-safe. Per il build usare il parser riga-per-riga gia documentato sotto.

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

Build e migrate:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml config --quiet
postgres_container_before="$(docker compose --env-file .env.production -f compose.production.yml ps -q postgres)"
redis_container_before="$(docker compose --env-file .env.production -f compose.production.yml ps -q redis)"
test -n "$postgres_container_before"
test -n "$redis_container_before"
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select 1;" >/dev/null'
docker network connect --alias postgres middleware_public middleware-postgres-1 2>/dev/null || true
while IFS="=" read -r key value; do case "$key" in ""|\#*) continue ;; *[!A-Za-z0-9_]*) continue ;; esac; export "$key=$value"; done < .env.production
encoded_database_url="$(python3 - <<'PY'
from urllib.parse import quote
import os

print(
    "postgresql://{}:{}@postgres:5432/{}?sslmode=disable".format(
        quote(os.environ["POSTGRES_USER"], safe=""),
        quote(os.environ["POSTGRES_PASSWORD"], safe=""),
        quote(os.environ["POSTGRES_DB"], safe=""),
    )
)
PY
)"
docker build --network middleware_public --target builder --build-arg BUILD_DATABASE_URL="$DATABASE_URL" --build-arg BUILD_REDIS_URL="$REDIS_URL" --build-arg BUILD_BETTER_AUTH_URL="$BETTER_AUTH_URL" --build-arg BUILD_NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" -t middleware-migrate app
docker build --network middleware_public --target runner --build-arg BUILD_DATABASE_URL="$DATABASE_URL" --build-arg BUILD_REDIS_URL="$REDIS_URL" --build-arg BUILD_BETTER_AUTH_URL="$BETTER_AUTH_URL" --build-arg BUILD_NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" -t middleware-app app
docker network disconnect middleware_public middleware-postgres-1 2>/dev/null || true
docker compose --env-file .env.production -f compose.production.yml run --rm --no-deps -e DATABASE_URL="$encoded_database_url" -e POSTGRES_URL="$encoded_database_url" -e PRISMA_DATABASE_URL="$encoded_database_url" migrate pnpm prisma:migrate:deploy
test "$(docker compose --env-file .env.production -f compose.production.yml ps -q postgres)" = "$postgres_container_before"
test "$(docker compose --env-file .env.production -f compose.production.yml ps -q redis)" = "$redis_container_before"
```

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

`docker compose up --build` non e sempre distruttivo, ma in production e vietato come shortcut perche rende meno esplicito cosa viene ricreato. Usare sempre build, migrate con `run --rm --no-deps migrate pnpm prisma:migrate:deploy` e restart app con `up -d --no-build --no-deps app` separati.

## Backup E Restore DB

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
docker compose --env-file .env.production -f compose.production.yml exec --interactive=false -T postgres sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl' < backups/<dump-file>.dump
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

HTTP/IP temporaneo:

```bash
curl -I http://46.224.209.184/
curl -I http://46.224.209.184/cms/login
curl -I http://46.224.209.184/cms/media
```

HTTPS/dominio:

```bash
curl -I https://middleware.media/
curl -I https://www.middleware.media/
curl -I https://middleware.media/cms/login
curl -I https://middleware.media/cms/media
```

Verifica contenuto, non solo status code:

```bash
curl -L https://middleware.media/ | grep -F '<title>Middleware | Scomporre la sicurezza</title>'
curl -L https://middleware.media/chi-siamo | grep -F '<title>Middleware | Chi siamo</title>'
curl -L https://middleware.media/uscite/scomporre-la-sicurezza-primo-numero | grep -F '<title>Middleware | Scomporre la sicurezza</title>'
```

Verifica DNS e Object Storage dal container app:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml exec -T app node -e "const dns=require('node:dns'); dns.lookup('fsn1.your-objectstorage.com',{all:true},(err,addrs)=>{ if(err){ console.error(err); process.exit(1); } console.log(addrs); });"
docker compose --env-file .env.production -f compose.production.yml exec -T app node -e "fetch('https://fsn1.your-objectstorage.com',{method:'HEAD'}).then(r=>console.log(r.status)).catch(e=>{console.error(e); process.exit(1);})"
```

## Stato Temporaneo IP

Finche il dominio non punta alla VPS, la production usa configurazione temporanea per smoke via IP:

- `BETTER_AUTH_URL=http://46.224.209.184`
- `NEXT_PUBLIC_SITE_URL=http://46.224.209.184`
- `SITE_URL=http://46.224.209.184`
- Caddy HTTP-only su `http://46.224.209.184`

Quando DNS e HTTPS sono pronti, ripristinare i file `*.domain-ready` e riportare gli URL a `https://middleware.media`. La checklist go-live vive in `docs/migration.md`.

## Go-Live Rapido

1. Creare dump DB pre-switch.
2. Puntare `middleware.media` e `www.middleware.media` a `46.224.209.184`.
3. Ripristinare `/opt/middleware/Caddyfile.domain-ready` su `/opt/middleware/Caddyfile`.
4. Ripristinare `/opt/middleware/compose.production.yml.domain-ready` su `/opt/middleware/compose.production.yml`.
5. Aggiornare `.env.production` con URL canonici `https://middleware.media`.
6. Validare compose e ricreare `app`/`caddy` con `--no-deps`.
7. Verificare HTTPS, login CMS, cookie auth, `/cms/media`, upload media e pagine pubbliche.

## Troubleshooting Rapido

- Se `/cms/media` fallisce con `EAI_AGAIN` o `ENETUNREACH`, controllare che `app` sia collegata anche alla rete `public`.
- Se `next build` fallisce con `P1001`, verificare rete build e raggiungibilita di Postgres.
- Se Caddy non emette certificati, verificare DNS, porte `80/443`, firewall e log `caddy`.
- Se login CMS fallisce dopo dominio, verificare `BETTER_AUTH_URL`, cookie domain e HTTPS.
- Se pagine pubbliche risultano 404 dopo deploy, controllare log build e presenza di errori DB durante prerender/cache.

## Guardrail

- Non stampare `.env.production` intero in chat o log.
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
