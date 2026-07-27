# Production TODO

Attivita residue dopo il passaggio production su VPS Hetzner. Per accessi, comandi, backup, deploy, rollback e guardrail operativi vedere `docs/production-ops.md`.

## P0: Continuita Operativa

- [ ] Verificare periodicamente i journal dei timer locali `middleware-backup`, `middleware-restore-test` e `middleware-healthcheck`.
- [ ] Valutare uptime check esterni solo se saranno accettati servizi fuori VPS, anche free.
- [ ] Valutare alert esterni per VPS down solo se sara disponibile un sistema fuori dalla VPS.

## P1: Deploy

- [ ] Valutare GitHub Actions solo dopo aver fissato secret handling, known hosts e policy rollback.
- [ ] Ridurre progressivamente i deploy dirty: deployare da commit puliti quando le modifiche operative sono consolidate.
- [ ] Documentare in `docs/production-ops.md` ogni nuova dipendenza installata sulla VPS per il deploy manuale.

## P2: Analytics E Osservabilita

- [ ] Verificare pageview Umami production da browser reale su realtime/dashboard dopo una visita pubblica effettiva.
- [ ] Definire dashboard minima: traffico pubblico, errori app, Caddy 5xx, uso disco, backup recenti, restore test recenti.
- [ ] Decidere retention log e audit coerente con spazio disco e privacy.

## P2.5: Cache Components E Build Stability

- [ ] Trovare un pattern per cache DB pubblica che passi anche nel build Docker VPS, non solo in `pnpm build` locale.
- [ ] Investigare perche `"use cache"` su loader DB pubblici produce `USE_CACHE_TIMEOUT` nel build Docker VPS con BuildKit secret/proxy DB temporaneo.
- [ ] Reintrodurre `cacheLife`/`cacheTag` sui loader pubblici solo dopo verifica Docker VPS verde.
- [ ] Tenere navigation e legal consent fuori da cache DB-backed finche i layout-slot condivisi causano timeout nel prerender production.

## P3: Performance E Scalabilita

- [ ] Valutare CDN davanti a `middleware.media` per pagine cacheable, asset, OG image e media pubblici.
- [ ] Valutare serving diretto dei media da Object Storage con CDN o URL firmati, mantenendo bucket privato e policy accesso coerente.
- [ ] Valutare cache Caddy per `/api/public/media/blob` e immagini OG dinamiche.
- [ ] Definire rate limit specifici per media/audio e bot aggressivi.
- [ ] Preparare load test controllato su staging o finestra concordata prima di campagne social.
- [ ] Valutare scaling orizzontale dell'app Next.js o separazione media/API se il traffico audio diventa rilevante.

## Legacy Cleanup

- [ ] Rivedere vecchie note deploy fuori da questo file e archiviare quelle non piu operative dopo il passaggio a deploy manuale VPS.
- [ ] Allineare eventuali riferimenti a GHCR/GitHub Actions quando il flusso definitivo sara deciso.
