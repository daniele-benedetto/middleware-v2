# Production Ops

Note operative per future manutenzioni della VPS production. Non inserire segreti in questo file.

## Accesso SSH

VPS production:

```bash
ssh -i ~/.ssh/middleware_hetzner_ed25519 deploy@46.224.209.184
```

Regole:

- Usare l'utente `deploy`, non `root`.
- Non committare chiavi SSH, env file o output con segreti.
- Prima di modificare config production, leggere lo stato corrente e fare backup del file che si tocca.

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

## Comandi Base

Stato servizi:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml ps
```

Log app:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml logs --no-color --tail=200 app
```

Restart app:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml up -d --no-build app
```

Restart Caddy:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml up -d --no-build caddy
```

Validare compose:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml config --quiet
```

## Smoke Test

HTTP/IP temporaneo:

```bash
curl -I http://46.224.209.184/
curl -I http://46.224.209.184/cms/login
curl -I http://46.224.209.184/cms/media
```

Verifica DNS e Object Storage dal container app:

```bash
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml exec -T app node -e "const dns=require('node:dns'); dns.lookup('fsn1.your-objectstorage.com',{all:true},(err,addrs)=>{ if(err){ console.error(err); process.exit(1); } console.log(addrs); });"
docker compose --env-file .env.production -f compose.production.yml exec -T app node -e "fetch('https://fsn1.your-objectstorage.com',{method:'HEAD'}).then(r=>console.log(r.status)).catch(e=>{console.error(e); process.exit(1);})"
```

## Infrastruttura Corrente

- Server Hetzner `CX43`, location `NBG1`.
- Docker Compose gestisce `postgres`, `redis`, `app`, `caddy` e `migrate`.
- Postgres e Redis girano su rete Docker `internal`.
- `app` deve stare su `internal` e `public`: `internal` per DB/Redis, `public` per egress verso Object Storage.
- `app` non deve avere porte pubblicate; Caddy resta l'unico ingresso HTTP/HTTPS.
- Bucket Object Storage: `middlewaremedia` su endpoint `https://fsn1.your-objectstorage.com`, bucket privato.
- Media serviti via route applicative, non tramite bucket pubblico.

## Stato Temporaneo IP

Finche il dominio non punta alla VPS, la production usa configurazione temporanea per smoke via IP:

- `BETTER_AUTH_URL=http://46.224.209.184`
- `NEXT_PUBLIC_SITE_URL=http://46.224.209.184`
- `SITE_URL=http://46.224.209.184`
- Caddy HTTP-only su `http://46.224.209.184`

Quando DNS e HTTPS sono pronti, ripristinare i file `*.domain-ready` e riportare gli URL a `https://middleware.media`.

## Go-Live Rapido

1. Puntare `middleware.media` e `www.middleware.media` a `46.224.209.184`.
2. Ripristinare `/opt/middleware/Caddyfile.domain-ready` su `/opt/middleware/Caddyfile`.
3. Ripristinare `/opt/middleware/compose.production.yml.domain-ready` su `/opt/middleware/compose.production.yml`.
4. Aggiornare `.env.production` con URL canonici `https://middleware.media`.
5. Validare compose e ricreare `app`/`caddy`.
6. Verificare HTTPS, login CMS, cookie auth, `/cms/media`, upload media e pagine pubbliche.

## Guardrail

- Non stampare `.env.production` intero in chat o log.
- Non usare `docker compose down -v` in production.
- Non usare `git reset --hard` o comandi distruttivi sulla VPS senza richiesta esplicita.
- Prima di modificare `compose.production.yml`, creare una copia con suffisso descrittivo.
- Se `/cms/media` fallisce con `EAI_AGAIN` o `ENETUNREACH`, controllare che `app` sia collegata anche alla rete `public`.
