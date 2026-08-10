# Migrazione Production Completata

La production e stata migrata dalla CX43 NBG1 alla CX33 HEL1 il
`2026-08-05`. La CX43 e stata dismessa anticipatamente su autorizzazione
esplicita del proprietario.

## Stato Operativo

```text
PRODUCTION_IP=62.238.105.217
PRODUCTION_IPV6=2a01:4f9:c015:a38c::1
PRODUCTION_SERVER_ID=158983478
VERCEL_TEAM_ID=team_1nBYQGF51ql1riyCnEmrLPM5
ROOT_A_RECORD_ID=rec_4794e9f34340c664b7a94273
STATS_A_RECORD_ID=rec_df300537cb3e902c6abff23c
APP_IMAGE=middleware-app:manual-0f90287-dirty-20260805T125612Z
MIGRATE_IMAGE=middleware-migrate:manual-0f90287-dirty-20260805T125612Z
```

- CX33 serve root, `www` e `stats`; app e database sono i soli writer.
- DNS root e `stats` puntano a `62.238.105.217` con TTL `60`.
- Nessun record `AAAA` production.
- PTR IPv4 configurato su `middleware.media`.
- Workflow GitHub `Deploy Production` disabilitato.
- Timer backup, restore test e healthcheck attivi.
- Timer temporaneo `middleware-migration-observe` disabilitato.

Credenziali temporanee e recovery key restano fuori dal repository:

```text
~/.config/middleware/migration-credentials.env
~/.config/middleware/age-recovery-key.txt
```

## Evidenze Cutover

Il proprietario ha autorizzato alle `2026-08-05 09:55 UTC` l'override del gate
24 ore. Tutti i gate tecnici disponibili erano verdi.

Dump finali CX43 validati con hash identici su CX43, CX33 e workstation:

```text
app-postgres-final-20260805T100113Z.dump
SHA256=59bd9f8073155088b9a8f40faf386db4e956b94f5030fabacbad6233a11597be

umami-postgres-final-20260805T100113Z.dump
SHA256=d819e38bbf69c3dcafcff08f8a7162ffa7f8f32e32cb84ebf3c8e1d2a779d797
```

Copie workstation: `~/middleware-migration-backups`.

Conteggi source e target dopo il restore:

```text
prisma_migrations=4
users=1
articles=10
issues=1
courses=1
lessons=3
pages=3
umami_tables=19
umami_websites=1
umami_sessions=361
umami_events=1588
```

- Backup locale post-restore riuscito.
- Restore test non distruttivo riuscito.
- Ultimo backup off-host pre-dismissione: `2026-08-05 10:20 UTC`.
- Healthcheck completo riuscito, inclusi DB, Redis, S3 e heartbeat.
- Smoke pubblico e autenticato confermato dal proprietario.
- Zero unita systemd fallite, restart o OOM sulla CX33.

Hardening completato il `2026-08-05`:

- Registrazione pubblica Better Auth disabilitata.
- Autorizzazione media pubblici basata su pathname canonico esatto.
- Upload media protetto da same-origin, rate limit Redis e firme binarie.
- CSP production senza `unsafe-eval`; header framework rimossi.
- Immagini e GitHub Actions fissate a digest/commit immutabili.
- Container con CPU/memoria/PID, log rotation, `no-new-privileges` e healthcheck.
- SSH public-key-only senza forwarding; chiavi duplicate/root rimosse.
- `auditd` attivo e verificato; `vm.overcommit_memory=1` persistente.
- Cloud Firewall e UFW SSH allineati all'IP amministrativo corrente.

## Dismissione CX43

Completata il `2026-08-05 10:24 UTC`:

- Server CX43 `147442551` eliminato.
- Primary IPv4 `138933035` eliminata automaticamente.
- Primary IPv6 `138933036` eliminata automaticamente.
- Backup Hetzner legati al server eliminati con la macchina.
- Snapshot finale CX43 `416553849` disponibile e protetto.
- Retention snapshot finale indicata fino al `2026-09-04`.
- Snapshot CX33 pre-DNS `416531198` ancora disponibile e protetto.

Non esiste piu un rollback hot sulla CX43.

## Disaster Recovery

In caso di perdita della CX33:

1. Mettere il sito in maintenance via DNS o servizio sostitutivo.
2. Creare e verificare ogni dump CX33 ancora accessibile.
3. Creare una VPS da snapshot CX33 `416531198`; usare lo snapshot CX43
   `416553849` solo come recovery secondario durante la retention.
4. Assegnare Primary IP protette e applicare firewall/hardening correnti.
5. Ripristinare i dump app e Umami piu recenti dal backup locale disponibile.
6. Configurare l'endpoint S3 del bucket media primario.
7. Validare internamente app, Umami, DB, Redis, backup e heartbeat.
8. Aggiornare root e `stats` usando gli ID record correnti e
   `PATCH /v1/domains/records/{recordId}`.
9. Verificare DNS autoritativo, `1.1.1.1`, `8.8.8.8`, assenza `AAAA` e attendere
   un TTL completo.
10. Eseguire smoke pubblico e autenticato prima di riaprire le scritture.

## Attivita Residue

- [ ] Osservare CX33 per almeno 7 giorni dal `2026-08-05 10:11 UTC`.
- [ ] Verificare ogni giorno healthcheck, heartbeat, backup e log applicativi.
- [ ] Verificare il prossimo restore test schedulato.
- [ ] Ruotare token Hetzner e Vercel.
- [ ] Ruotare access key S3 dopo verifica della nuova chiave.
- [ ] Eliminare lo snapshot CX43 `416553849` dopo il `2026-09-04`.
- [ ] Rivalutare la retention dello snapshot CX33 `416531198` per limitare i costi.

Healthchecks.io e il monitor heartbeat primario. Il capability URL e salvato
solo in `/opt/middleware/secrets/monitoring.env` sulla CX33.
