# Go-Live Production

Piano residuo per portare `middleware.media` live dalla production gia preparata su Hetzner.

Questo documento non contiene lo storico del setup gia eseguito. Per accessi, comandi VPS e stato operativo corrente vedere `docs/production-ops.md`.

## Stato Corrente

| Area             | Stato                                                    |
| ---------------- | -------------------------------------------------------- |
| VPS              | Hetzner `CX43`, Ubuntu 24.04 LTS x86_64                  |
| IP               | `46.224.209.184`                                         |
| Runtime          | Docker Compose in `/opt/middleware`                      |
| App              | Next.js production via Caddy                             |
| DB               | Postgres container production                            |
| Rate limit       | Redis container production                               |
| Media            | Hetzner Object Storage, bucket privato `middlewaremedia` |
| Smoke temporaneo | `http://46.224.209.184`                                  |
| Dominio finale   | `https://middleware.media`                               |
| Redirect         | `www.middleware.media` -> `middleware.media`             |

## Config Temporanea

La production e' attualmente configurata per smoke via IP HTTP:

- `BETTER_AUTH_URL=http://46.224.209.184`
- `NEXT_PUBLIC_SITE_URL=http://46.224.209.184`
- `SITE_URL=http://46.224.209.184`
- Caddy serve `http://46.224.209.184` senza HTTPS.

I file domain-ready sono gia presenti sulla VPS:

- `/opt/middleware/Caddyfile.domain-ready`
- `/opt/middleware/compose.production.yml.domain-ready`

Comandi utili:

```bash
ssh -i ~/.ssh/middleware_hetzner_ed25519 deploy@46.224.209.184
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml ps
docker compose --env-file .env.production -f compose.production.yml logs --no-color --tail=200 app
```

## DNS

Puntare i record alla VPS solo dopo smoke IP accettato.

| Host                   | Tipo          | Target                                | Proxy iniziale |
| ---------------------- | ------------- | ------------------------------------- | -------------- |
| `middleware.media`     | `A`           | `46.224.209.184`                      | DNS only       |
| `www.middleware.media` | `A` o `CNAME` | `46.224.209.184` o `middleware.media` | DNS only       |

Se viene configurato anche IPv6, verificare prima che Caddy e firewall siano pronti per il traffico IPv6.

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
docker compose --env-file .env.production -f compose.production.yml up -d --no-build app caddy
```

## Smoke Dominio

Verificare dopo emissione certificati HTTPS:

1. `https://middleware.media` risponde `200`.
2. `https://www.middleware.media` redirige a `https://middleware.media`.
3. `/cms/login` carica senza mixed content o CSP errors.
4. Login CMS imposta cookie valido e porta a `/cms`.
5. tRPC CMS funziona.
6. `/cms/media` funziona.
7. Upload media funziona e il bucket resta privato.
8. Media pubblici sono serviti dalle route applicative.
9. Pubblicazione articolo e revalidation aggiornano il pubblico.
10. `robots.txt` e `sitemap.xml` sono coerenti con production indicizzabile.

## Cloudflare

Abilitare proxy Cloudflare solo dopo smoke HTTPS completato.

Impostazioni consigliate:

- SSL mode: `Full (strict)`.
- Nessuna cache HTML globale.
- Non cachare `/cms/*`, `/api/trpc/*`, `/api/cms/*` e route auth.
- Cache lunga consentita per `/_next/static/*`.
- Cache su `/api/public/media/blob` solo rispettando header applicativi.

## Punti Di Attenzione

- Una sola VPS e' single point of failure; non c'e' failover automatico.
- Le migrazioni colpiscono direttamente production.
- Il bucket media deve restare privato.
- `app` deve restare collegata sia a `internal` sia a `public`: senza `public` non raggiunge Object Storage.
- Non pubblicare porte dell'app; ingresso solo via Caddy.
- Dopo go-live ruotare eventuali credenziali condivise in chat durante lo smoke.
