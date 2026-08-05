# Migrazione Production CX43 NBG1 -> CX33 HEL1

Checklist completa per migrare `middleware.media` dalla VPS Hetzner corrente
`CX43` in `NBG1` a una nuova `CX33` in `HEL1`.

Questo documento copre l'intero intervento: acquisto in Hetzner Cloud Console,
provisioning, sicurezza, replica, restore, cutover DNS, rollback, osservazione,
ottimizzazione e dismissione della vecchia VPS.

Per le operazioni ordinarie dopo la migrazione vedere `docs/production-ops.md`.

## Obiettivi E Invarianti

- Migrare senza distruggere o modificare irreversibilmente la VPS corrente.
- Avviare sulla nuova VPS lo stesso artifact attivo in production.
- Non includere un nuovo rilascio applicativo nella migrazione.
- Conservare il bucket Object Storage Hetzner esistente.
- Conservare gli stessi secret applicativi durante il cutover.
- Migrare sia il database applicativo sia il database Umami.
- Non copiare il volume Redis: il suo contenuto corrente non e persistente.
- Non pubblicare direttamente Postgres, Redis, app, Umami o il DB Umami.
- Mantenere Caddy come unico ingresso pubblico su porte `80` e `443`.
- Mantenere la VPS corrente disponibile per rollback per almeno 7 giorni.
- Non cancellare la VPS corrente senza approvazione esplicita.

Artifact production da clonare:

```text
middleware-app:manual-9960908-dirty-20260805T085340Z
```

Il precedente candidato `middleware-app:umami-hotfix-20260729T133119Z` non e piu
autorizzato al cutover: contiene `next@16.2.9`, vulnerabile ad advisory runtime
high corretti in `next@16.2.11`. Il repository rileva inoltre advisory Better Auth
corretti da `1.6.22`. Preparare prima una release di sicurezza sulla CX43,
eseguire CI, scan e 24 ore di osservazione, quindi registrare qui il nuovo tag e
clonare quel medesimo artifact senza build o cambio codice durante la migrazione.

Stato sorgente dichiarato dalla production:

```text
branch=main
commit=9960908
method=manual-vps-rsync
```

L'unica modifica applicativa autorizzata prima della migrazione e la release di
sicurezza della fase 0.2, da stabilizzare prima sulla CX43. Ogni altra feature o
refactor locale resta esclusa fino alla stabilizzazione della nuova VPS.

## Variabili Operative

Impostare queste variabili sulla workstation prima di usare i comandi del
documento. Non inserirle nel repository.

```bash
export OLD_IP="46.224.209.184"
export NEW_IP="62.238.105.217"
export NEW_IPV6="2a01:4f9:c015:a38c::1"
export ADMIN_IPV4_CIDR="77.93.247.186/32"
export ADMIN_IPV6_CIDR=""
export SSH_KEY="$HOME/.ssh/middleware_hetzner_ed25519"
export OLD_SSH="deploy@$OLD_IP"
export NEW_ROOT_SSH="root@$NEW_IP"
export NEW_SSH="deploy@$NEW_IP"
```

Regole:

- Verificare sempre che `NEW_IP` sia `62.238.105.217` prima di eseguire comandi.
- Non stampare file `.env` o secret in terminali condivisi.
- Non salvare dump, env o chiavi dentro il repository.
- Non usare `StrictHostKeyChecking=no`.
- Verificare le fingerprint SSH dalla console Hetzner prima di accettarle.
- Conservare un log operativo senza password, token, URL con credenziali o env.

## Fase 0: Preparazione Dell'Intervento

### 0.1 Parametri Vincolanti

- [ ] Nuovo piano: Hetzner `CX33`.
- [ ] Location: Helsinki `HEL1`.
- [ ] Architettura: x86-64.
- [ ] Sistema operativo: Ubuntu 24.04 LTS.
- [ ] Primary IPv4 pubblica abilitata e fatturata separatamente dal server.
- [ ] Primary IPv6 pubblica abilitata e gratuita.
- [ ] IPv6 attiva sull'host ma senza record DNS `AAAA` durante o dopo la migrazione.
- [ ] Backup Hetzner abilitato sulla nuova VPS.
- [ ] Object Storage esistente mantenuto in `FSN1`.
- [ ] Artifact da clonare: release security-patched approvata e gia stabile sulla CX43.
- [ ] Nessun deploy di nuovo codice durante la migrazione.
- [ ] Finestra di cutover concordata.
- [ ] Freeze editoriale concordato con tutti gli editor.
- [ ] Tempo di osservazione prima della cancellazione della CX43: almeno 7 giorni.

Obiettivi operativi vincolanti:

| Ambito                          | Obiettivo                                      |
| ------------------------------- | ---------------------------------------------- |
| Downtime pianificato            | massimo 2 ore                                  |
| RPO database applicativo        | massimo 6 ore                                  |
| RPO Umami                       | massimo 24 ore                                 |
| RPO media Object Storage        | massimo 24 ore                                 |
| RTO servizio completo           | massimo 4 ore                                  |
| Retention dump locali           | 70 generazioni e 8 settimanali                 |
| Retention dump cifrati off-host | 14 giorni completi, 30 giornalieri, 12 mensili |

Ogni rehearsal deve registrare durata, eta del backup usato e RPO/RTO realmente
raggiunti. Se il restore completo supera 4 ore, il cutover e `NO-GO`.

### 0.2 Gate Sicurezza Artifact

Prima di acquistare o pianificare il cutover:

- [ ] Aggiornare almeno Next.js a `16.2.11`, Better Auth e adapter a `1.6.22` e
      Sharp/libvips a una versione non vulnerabile agli advisory applicabili.
- [ ] Eseguire `pnpm audit --prod` e classificare ogni finding residuo runtime.
- [ ] Eseguire lint, typecheck, test, build e scan dell'immagine finale.
- [ ] Non accettare finding `critical`; ogni `high` residuo richiede eccezione
      scritta con owner, mitigazione e scadenza massima 7 giorni.
- [ ] Generare SBOM e registrare digest SHA-256 dell'immagine app e migrate.
- [ ] Rendere `S3Client` singleton anche in production, configurare connect/socket
      timeout, retry limitati e verificare cleanup degli stream abortiti.
- [ ] Eseguire test concorrente degli upload massimi senza crescita RSS monotona.
- [ ] Rilasciare la correzione sulla CX43 e osservarla per almeno 24 ore.
- [x] Artifact approvato: `middleware-app:manual-9960908-dirty-20260805T085340Z`.

La migrazione non e autorizzata finche questo gate non e completamente verde.

### 0.3 Stato DNS Da Verificare

I nameserver correnti sono Vercel DNS, non Hetzner DNS:

```text
ns1.vercel-dns.com
ns2.vercel-dns.com
```

Verificare dalla workstation:

```bash
dig +noall +answer middleware.media A
dig +noall +answer middleware.media AAAA
dig +noall +answer www.middleware.media
dig +noall +answer stats.middleware.media A
dig +noall +answer middleware.media NS
```

Stato atteso prima della migrazione:

- `middleware.media A` punta a `46.224.209.184`.
- `stats.middleware.media A` punta a `46.224.209.184`.
- `www.middleware.media` e un CNAME di `middleware.media`.
- Non esiste un record `AAAA` production.
- TTL dei record A: `60` secondi.

Se il TTL non e piu `60`, abbassarlo almeno 24 ore prima del cutover.

### 0.4 Stato Della VPS Corrente

Eseguire:

```bash
ssh -i "$SSH_KEY" "$OLD_SSH" '/opt/middleware/bin/healthcheck.sh'
```

Confermare:

- [ ] Tutti i container sono attivi.
- [ ] Postgres e Redis sono healthy.
- [ ] Homepage, CMS, OG, Umami e Object Storage rispondono.
- [ ] Nessuna unita systemd e fallita.
- [ ] Il backup automatico piu recente ha meno di 26 ore.
- [ ] L'ultimo restore test e riuscito.
- [ ] Il disco ha spazio sufficiente.
- [ ] Non risultano OOM recenti.
- [ ] Il volume `middleware_postgres-data` esiste.
- [ ] Il volume `middleware_umami-postgres-data` esiste.

### 0.5 Backup Pre-Acquisto

Creare un dump manuale di entrambi i database sulla VPS corrente:

```bash
ssh -i "$SSH_KEY" "$OLD_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p backups

app_dump="backups/app-postgres-pre-migration-${stamp}.dump"
umami_dump="backups/umami-postgres-pre-migration-${stamp}.dump"

docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  > "$app_dump"

docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T umami-postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  > "$umami_dump"

test -s "$app_dump"
test -s "$umami_dump"
docker compose --env-file .env.production -f compose.production.yml \
  exec -T postgres pg_restore --list < "$app_dump" > /dev/null
docker compose --env-file .env.production -f compose.production.yml \
  exec -T umami-postgres pg_restore --list < "$umami_dump" > /dev/null
sha256sum "$app_dump" "$umami_dump"
REMOTE
```

- [ ] Registrare nomi, dimensioni e SHA-256 dei due dump.
- [ ] Non copiare i dump nel repository.
- [ ] Verificare che il backup Hetzner della CX43 sia attivo.
- [ ] Non eliminare backup o snapshot della CX43.

Registrare i percorsi prodotti e conservarne una copia fuori dalla VPS prima del
cutover:

```bash
export PRE_APP_DUMP="<percorso-dump-app-pre-migrazione>"
export PRE_UMAMI_DUMP="<percorso-dump-umami-pre-migrazione>"
install -d -m 700 "$HOME/middleware-migration-backups"
scp -i "$SSH_KEY" "$OLD_SSH:/opt/middleware/$PRE_APP_DUMP" \
  "$HOME/middleware-migration-backups/"
scp -i "$SSH_KEY" "$OLD_SSH:/opt/middleware/$PRE_UMAMI_DUMP" \
  "$HOME/middleware-migration-backups/"
shasum -a 256 "$HOME/middleware-migration-backups/$(basename "$PRE_APP_DUMP")" \
  "$HOME/middleware-migration-backups/$(basename "$PRE_UMAMI_DUMP")"
```

- [ ] Gli SHA-256 locali coincidono con quelli registrati sulla CX43.
- [ ] La copia off-host e leggibile solo dall'utente operativo.
- [ ] La workstation ha cifratura disco attiva; altrimenti usare un supporto cifrato.

## Fase 1: Acquisto In Hetzner Cloud Console

### 1.1 Account, Progetto E Accessi

Aprire Hetzner Cloud Console e selezionare il progetto `Middleware`.

Prima di creare risorse:

- [ ] Account owner e secondo amministratore hanno 2FA attiva.
- [ ] Recovery code conservati nel password manager operativo, non sulla VPS.
- [ ] Metodo di pagamento valido e project limit sufficiente per CX33, due Primary
      IP, backup, snapshot temporanei e un eventuale clone di recovery.
- [ ] Ruoli progetto revisionati secondo minimo privilegio.
- [ ] Owner tecnico, owner fatturazione e approvatore cancellazione registrati.
- [ ] Accesso a supporto Hetzner e Vercel DNS verificato da due amministratori.
- [ ] In `Security -> SSH Keys`, fingerprint della chiave caricata confrontata con:

```bash
ssh-keygen -lf "$SSH_KEY.pub"
```

Caricare esclusivamente la chiave `.pub` se non e gia presente. Non caricare mai
la chiave privata.

### 1.2 Cloud Firewall Prima Del Server

Creare un firewall dedicato `middleware-production` prima della CX33. Non
riusare firewall condivisi e non creare mai la VPS pubblica senza firewall gia
associato.

Regole inbound definitive:

| Protocollo | Porta | Sorgente                               | Scopo              |
| ---------- | ----- | -------------------------------------- | ------------------ |
| TCP        | 22    | `$ADMIN_IPV4_CIDR`, `$ADMIN_IPV6_CIDR` | SSH amministrativo |
| TCP        | 80    | `0.0.0.0/0`, `::/0`                    | HTTP e ACME        |
| TCP        | 443   | `0.0.0.0/0`, `::/0`                    | HTTPS              |
| UDP        | 443   | `0.0.0.0/0`, `::/0`                    | HTTP/3             |
| ICMP       | tutte | `0.0.0.0/0`, `::/0`                    | PMTU e diagnostica |

Decisioni definitive:

- [ ] TCP/22 non e mai aperta a `0.0.0.0/0` o `::/0`.
- [ ] Se cambia l'IP amministrativo, aggiornare prima il Cloud Firewall dalla
      Console usando un accesso amministrativo alternativo.
- [ ] Non creare regole outbound. In Hetzner, nessuna regola outbound significa
      egress consentito; aggiungerne una introdurrebbe implicit deny sul resto.
- [ ] Applicare label `environment=production` e `service=middleware` al firewall.

### 1.3 Creazione Server

Selezionare `Add Server` e impostare:

- [ ] Location: `Helsinki` / `HEL1`.
- [ ] Image: `Ubuntu 24.04`.
- [ ] Type: `Shared vCPU`.
- [ ] Server: `CX33`.
- [ ] Architecture: x86.
- [ ] Networking: IPv4 pubblica abilitata.
- [ ] Networking: IPv6 abilitata, senza pubblicare ancora record `AAAA`.
- [ ] Networks: nessuna Network privata.
- [ ] SSH key: chiave pubblica associata a `middleware_hetzner_ed25519`.
- [ ] Firewalls: `middleware-production`, gia creato.
- [ ] Backups: abilitati durante la creazione.
- [ ] Volumes: nessun volume aggiuntivo.
- [ ] Placement group: nessuno, essendoci una sola istanza.
- [ ] Cloud config: nessuna configurazione non revisionata.
- [ ] Name: `middleware-hel1`.
- [ ] Label obbligatoria: `environment=production`.
- [ ] Label obbligatoria: `service=middleware`.
- [ ] Label temporanea: `migration=from-nbg1`.
- [ ] Riepilogo prezzo e costo backup verificati prima di `Create & Buy Now`.
- [ ] Creazione completata con evento `Activity=success`.

Non riutilizzare il nome della vecchia VPS finche entrambe esistono.

### 1.4 Backup Hetzner

Essendo gia selezionati nell'ordine, subito dopo la creazione:

- [ ] Aprire la sezione `Backups` della nuova VPS.
- [ ] Abilitare i backup automatici.
- [ ] Confermare il costo aggiuntivo del 20% del server.
- [ ] Verificare che la funzione risulti `Enabled`.
- [ ] Annotare che il primo backup puo richiedere fino al ciclo successivo.
- [ ] Non considerare il backup attivo finche non compare almeno un restore point.

I backup Hetzner non sostituiscono i dump Postgres consistenti.
Sono giornalieri, server-bound e crash-consistent: coprono il disco primario ma
non garantiscono consistenza applicativa e vengono eliminati con il server. I dump
Postgres verificati restano la fonte di recovery dei database.

### 1.5 Protection Server E Primary IP

Aprire la sezione `Protection` della nuova VPS:

- [ ] Abilitare `Delete protection`.
- [ ] Abilitare `Rebuild protection`.

Mantenere le protezioni abilitate anche dopo il go-live. Disabilitarle solo per
un'operazione esplicitamente approvata.

In `Primary IPs`, aprire separatamente IPv4 e IPv6 assegnate alla CX33:

- [ ] Abilitare deletion protection su entrambe.
- [ ] Impostare `auto delete` disabilitato su entrambe: la cancellazione degli IP
      deve essere sempre un'azione esplicita e separata.
- [ ] Registrare ID Primary IP, IPv4, prefisso IPv6 `/64`, protection e auto-delete.
- [ ] Verificare `Firewall -> Resources`: associato solo a `middleware-hel1`.

Una Primary IP protetta puo impedire la cancellazione del server. Questo e
intenzionale; durante la dismissione le protezioni vanno rimosse nel corretto
ordine e solo dalla risorsa approvata.

### 1.6 Informazioni Da Registrare

- [ ] Nuova IPv4.
- [ ] Nuovo prefisso IPv6.
- [ ] IPv6 host effettiva `<prefisso>::1`.
- [ ] ID server Hetzner.
- [ ] ID Primary IPv4 e Primary IPv6.
- [ ] Location `HEL1`.
- [ ] Data e ora UTC di creazione.
- [ ] Stato backup.
- [ ] Stato delete/rebuild protection.
- [ ] Firewall associato.
- [ ] Prezzo orario/mensile atteso e owner fatturazione.

Non registrare password o token nel documento.

## Fase 2: Primo Accesso E Verifica Host

### 2.1 Fingerprint SSH

Una CX33 creata con chiave SSH non riceve una password root via email. In Hetzner
Console usare `Rescue -> Root Password` per generare una password temporanea,
aprire la console VNC e leggere localmente le fingerprint host:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
ssh-keygen -lf /etc/ssh/ssh_host_rsa_key.pub
```

Dalla workstation acquisire le chiavi una sola volta in un file temporaneo:

```bash
scan_file="$(mktemp)"
chmod 600 "$scan_file"
ssh-keyscan -H -t ed25519,rsa "$NEW_IP" > "$scan_file"
ssh-keygen -lf "$scan_file"
```

Confrontare le fingerprint del medesimo file con la console. Solo dopo:

```bash
cat "$scan_file" >> "$HOME/.ssh/known_hosts"
rm -f "$scan_file"
```

- [ ] Fingerprint ED25519 verificata.
- [ ] Nessun warning di host key inattesa.
- [ ] La chiave non e stata accettata alla cieca.

### 2.2 Primo Login Root

```bash
ssh -i "$SSH_KEY" "$NEW_ROOT_SSH"
```

Verificare:

```bash
hostnamectl
cat /etc/os-release
uname -a
ip address
ip route
ip -6 address
ip -6 route
timedatectl
df -hT
free -h
```

Atteso:

- [ ] Ubuntu 24.04 LTS x86_64.
- [ ] 4 vCPU.
- [ ] Circa 8 GB RAM.
- [ ] Circa 80 GB disco.
- [ ] IPv4 corretta.
- [ ] Route IPv6 presente, anche senza record DNS pubblico.
- [ ] IPv6 host uguale a `$NEW_IPV6` e gateway link-local `fe80::1` presente.
- [ ] `curl -4` e `curl -6` outbound funzionano.
- [ ] Orologio sincronizzato.

Da una sorgente non inclusa nei CIDR amministrativi verificare che TCP/22 sia
bloccata sia su IPv4 sia su IPv6. L'assenza di un record `AAAA` non protegge
l'indirizzo IPv6 diretto.

## Fase 3: Provisioning Base

Eseguire questa fase come `root` dalla console SSH verificata.

### 3.1 Hostname, Timezone E Aggiornamenti

```bash
hostnamectl set-hostname middleware
timedatectl set-timezone UTC
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get full-upgrade -y
apt-get install -y \
  ca-certificates \
  age \
  curl \
  fail2ban \
  git \
  jq \
  rclone \
  rsync \
  socat \
  sysstat \
  ufw \
  unattended-upgrades \
  zstd
```

- [ ] Nessun errore apt.
- [ ] Nessun repository non atteso.
- [ ] `timedatectl` mostra UTC e sincronizzazione attiva.

Se `/var/run/reboot-required` esiste, riavviare prima di continuare:

```bash
reboot
```

Riconnettersi e verificare il kernel attivo.

### 3.2 Creazione Utente Deploy

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
install -m 600 -o deploy -g deploy /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
```

Creare una regola sudo dedicata:

```bash
visudo -f /etc/sudoers.d/deploy
```

Contenuto:

```text
deploy ALL=(ALL:ALL) NOPASSWD: ALL
```

L'utente non ha una password locale; senza `NOPASSWD` il sudo operativo via SSH
non sarebbe utilizzabile. L'appartenenza successiva al gruppo Docker concede gia
privilegi equivalenti a root, quindi questa regola non amplia sostanzialmente il
modello di fiducia della VPS dedicata.

Poi:

```bash
chmod 440 /etc/sudoers.d/deploy
visudo -cf /etc/sudoers.d/deploy
```

Aprire una seconda sessione, senza chiudere quella root:

```bash
ssh -i "$SSH_KEY" "$NEW_SSH"
```

Verificare:

```bash
id
sudo -v
```

- [ ] Login `deploy` riuscito.
- [ ] Autenticazione con chiave, non password.
- [ ] `sudo` funzionante.

### 3.3 Installazione Docker

Per mantenere coerenza con Ubuntu 24.04 corrente:

```bash
sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker deploy
```

Chiudere e riaprire la sessione `deploy`, quindi:

```bash
docker --version
docker compose version
docker info
```

- [ ] `deploy` puo eseguire Docker senza `sudo`.
- [ ] Docker e attivo al boot.
- [ ] Compose v2 e disponibile.

L'appartenenza al gruppo Docker equivale sostanzialmente a privilegi root. Non
aggiungere altri utenti al gruppo.

### 3.4 Configurazione Docker Daemon

Prima di creare `/etc/docker/daemon.json`, verificare che non esista gia:

```bash
sudo test ! -e /etc/docker/daemon.json || sudo ls -l /etc/docker/daemon.json
```

Applicare questa configurazione per limitare crescita log e mantenere i container
durante un riavvio del daemon:

```json
{
  "live-restore": true,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
```

Validare il JSON prima del restart:

```bash
jq empty /etc/docker/daemon.json
sudo systemctl restart docker
sudo systemctl --no-pager --full status docker
```

- [ ] Docker riparte senza errori.
- [ ] Log rotation configurata.
- [ ] Nessun container esiste ancora sulla nuova VPS.

### 3.5 Swap E Pressione Memoria

La CX33 ha 8 GB RAM. Creare 4 GB di swap come protezione da picchi, non come
sostituto della RAM:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
printf '/swapfile none swap sw 0 0\n' | sudo tee -a /etc/fstab
```

Impostare swappiness conservativa:

```bash
printf 'vm.swappiness=10\n' | sudo tee /etc/sysctl.d/90-middleware-memory.conf
sudo sysctl --system
```

Verificare:

```bash
swapon --show
free -h
sysctl vm.swappiness
```

- [ ] Swap da 4 GB attiva.
- [ ] Permessi `/swapfile` uguali a `600`.
- [ ] Nessuna entry duplicata in `/etc/fstab`.

### 3.6 Sysstat

Abilitare raccolta storica CPU, RAM, rete e I/O:

```bash
sudo systemctl enable --now sysstat
sudo systemctl --no-pager status sysstat
```

Verificare dopo almeno 10 minuti:

```bash
sar -u 1 3
sar -r 1 3
sar -n DEV 1 3
```

## Fase 4: Hardening Host

### 4.1 SSH

Creare `/etc/ssh/sshd_config.d/99-middleware-hardening.conf`:

```text
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
AllowTcpForwarding no
AllowUsers deploy
```

Prima di ricaricare SSH:

```bash
sudo sshd -t
sudo sshd -T | grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|maxauthtries|x11forwarding|allowtcpforwarding|allowusers) '
```

Mantenere aperta la sessione corrente. Ricaricare, senza restart distruttivo:

```bash
sudo systemctl reload ssh
```

Aprire una nuova sessione `deploy` e verificare login e `sudo`.

- [ ] Nuova sessione `deploy` riuscita.
- [ ] Login root SSH rifiutato.
- [ ] Login password rifiutato.
- [ ] Console Hetzner ancora disponibile per recovery.

### 4.2 UFW

Docker puo aggirare alcune regole UFW quando vengono pubblicate porte container.
La protezione principale resta non pubblicare porte per app, DB, Redis e Umami.

Configurare UFW:

```bash
admin_ipv4_cidr="77.93.247.186/32"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw default deny routed
sudo ufw allow from "$admin_ipv4_cidr" to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw logging low
sudo ufw enable
sudo ufw status verbose
```

- [ ] Solo `22`, `80`, `443/tcp` e `443/udp` sono pubbliche.
- [ ] Nessuna porta `3000`, `5432` o `6379` e pubblica.
- [ ] Regole IPv6 equivalenti presenti.
- [ ] SSH resta raggiungibile dopo l'attivazione.

### 4.3 Fail2ban

Creare `/etc/fail2ban/jail.d/sshd.local`:

```ini
[sshd]
enabled = true
port = ssh
backend = systemd
maxretry = 3
findtime = 10m
bantime = 1h
```

Poi:

```bash
sudo fail2ban-client -t
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

- [ ] Jail `sshd` attivo.
- [ ] Nessun errore di parsing.
- [ ] Non testare il ban dalla sola postazione senza accesso console alternativo.

### 4.4 Aggiornamenti Automatici

```bash
sudo dpkg-reconfigure -plow unattended-upgrades
sudo systemctl enable --now unattended-upgrades
sudo systemctl --no-pager status unattended-upgrades
```

Verificare che siano applicati aggiornamenti di sicurezza, ma non configurare
riavvii automatici non supervisionati durante la migrazione.

Policy definitiva:

- [ ] Controllo aggiornamenti e `reboot-required` ogni lunedi alle `09:00 UTC`.
- [ ] Patch security OS installate entro 7 giorni; entro 24 ore se sfruttate
      attivamente o classificate critical dal vendor.
- [ ] Riavvio supervisionato nella finestra domenicale `05:00-06:00 UTC`, dopo
      dump verificato, con owner operativo e smoke test.
- [ ] Nessun host resta con `/var/run/reboot-required` per oltre 7 giorni.
- [ ] Aggiornamento immagini/app mensile; emergency release entro 24 ore per
      vulnerabilita runtime critical o attivamente sfruttate.

### 4.5 Journald

Creare `/etc/systemd/journald.conf.d/90-middleware.conf`:

```ini
[Journal]
SystemMaxUse=500M
SystemKeepFree=2G
MaxRetentionSec=30day
Compress=yes
```

Poi:

```bash
sudo systemctl restart systemd-journald
journalctl --disk-usage
```

### 4.6 Verifica Security Baseline

```bash
sudo ufw status verbose
sudo fail2ban-client status sshd
sudo sshd -T | grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|maxauthtries|x11forwarding|allowtcpforwarding) '
sudo systemctl --failed --no-pager
ss -lntup
```

Criterio go/no-go:

- [ ] Nessuna unita fallita.
- [ ] Solo SSH e i listener di sistema attesi sono pubblici.
- [ ] Root/password SSH disabilitati.
- [ ] UFW e Hetzner Cloud Firewall attivi.
- [ ] Fail2ban attivo.

### 4.7 Recovery Drill Hetzner

Eseguire prima di copiare i dati production, quando un reboot non crea impatto:

1. Da Hetzner Console verificare accesso VNC con una root password temporanea.
2. Attivare Rescue `linux64` con la chiave SSH operativa.
3. Riavviare entro 60 minuti, altrimenti l'attivazione Rescue scade.
4. Usare un file `known_hosts` separato per la host key Rescue; non rimuovere o
   sovrascrivere la fingerprint production verificata.
5. Da Rescue eseguire `lsblk`, identificare il filesystem root e montarlo in sola
   lettura sotto `/mnt`.
6. Verificare hostname, `/etc`, `/opt` e filesystem senza modificare dati.
7. Smontare, riavviare per uscire da Rescue e verificare nuovamente SSH `deploy`,
   fingerprint production, Docker, UFW e Fail2ban.

- [ ] Drill VNC riuscito.
- [ ] Drill Rescue riuscito.
- [ ] Nessuna host key accettata alla cieca.
- [ ] Timestamp e operatore registrati.

La password root generata dalla Console non scade automaticamente. Dopo il drill:

```bash
sudo passwd -l root
sudo passwd -S root
```

Per ogni futura sessione VNC generare una nuova password, usarla e bloccarla di
nuovo al termine.

### 4.8 Baseline Metriche Hetzner

In `Server -> Metrics` registrare baseline CPU, disk I/O e rete dopo provisioning.
I grafici Hetzner non espongono RAM o capacita filesystem: per queste restano
obbligatori `sysstat`, `free`, `df` e alert esterni.

- [ ] Screenshot o timestamp baseline conservato nel log operativo.
- [ ] Nessun picco CPU/I/O inatteso a host vuoto.

## Fase 5: Preparazione Directory Production

Come `deploy` sulla nuova VPS:

```bash
sudo install -d -m 750 -o deploy -g deploy /opt/middleware
install -d -m 700 /opt/middleware/backups
install -d -m 700 /opt/middleware/secrets
```

- [ ] `/opt/middleware` appartiene a `deploy:deploy`.
- [ ] Backup e secret non sono world-readable.

## Fase 6: Replica Configurazione E Sorgente

### 6.1 Controllo Riferimenti Secret

Sulla vecchia VPS, senza espandere Compose:

```bash
ssh -i "$SSH_KEY" "$OLD_SSH" \
  'cd /opt/middleware && grep -nE "env_file|secret|\.env" compose.production.yml'
```

- [ ] Identificare tutti i file env referenziati.
- [ ] Identificare eventuali file sotto `/opt/middleware/secrets` realmente usati.
- [ ] Non trasferire vecchi secret ruotati o backup di env.

### 6.2 Trasferimento File Runtime

Trasferire attraverso due connessioni SSH cifrate, senza creare copie locali:

```bash
set -o pipefail
ssh -i "$SSH_KEY" "$OLD_SSH" 'tar -C /opt/middleware -czf - \
  app \
  bin \
  compose.production.yml \
  compose.production.yml.domain-ready \
  Caddyfile \
  Caddyfile.domain-ready \
  .env.production \
  .env.umami.production \
  .env.umami-db.production \
  DEPLOY_SOURCE' \
| ssh -i "$SSH_KEY" "$NEW_SSH" 'tar -C /opt/middleware -xzf -'
```

Trasferire separatamente solo gli eventuali file secret attualmente referenziati.
Non trasferire l'intera directory `secrets` alla cieca.

Correggere i permessi sulla nuova VPS:

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
chmod 600 .env.production .env.umami.production .env.umami-db.production
chmod 640 Caddyfile Caddyfile.domain-ready
chmod 750 bin
chmod 750 bin/*.sh
docker compose --env-file .env.production -f compose.production.yml config --quiet
REMOTE
```

- [ ] Compose valida senza stampare configurazione espansa.
- [ ] Nessun env e stato stampato.
- [ ] Nessun backup storico e stato copiato.
- [ ] Nessun riferimento al vecchio IP dentro gli env canonici.
- [ ] `BETTER_AUTH_URL`, `SITE_URL` e `NEXT_PUBLIC_SITE_URL` restano sul dominio HTTPS.
- [ ] Endpoint e credenziali Object Storage restano invariati.

### 6.3 Hash File Operativi

Confrontare gli hash senza includere env e secret:

```bash
ssh -i "$SSH_KEY" "$OLD_SSH" \
  'cd /opt/middleware && sha256sum compose.production.yml Caddyfile Caddyfile.domain-ready'

ssh -i "$SSH_KEY" "$NEW_SSH" \
  'cd /opt/middleware && sha256sum compose.production.yml Caddyfile Caddyfile.domain-ready'
```

- [ ] Hash identici.

### 6.4 Audit Configurazione Production Effettiva

Prima del trasferimento dati creare un inventario secret-free e revisionarlo:

```bash
ssh -i "$SSH_KEY" "$OLD_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml config --images
docker compose --env-file .env.production -f compose.production.yml config --services
docker compose --env-file .env.production -f compose.production.yml ps
docker inspect $(docker compose --env-file .env.production -f compose.production.yml ps -q) \
  --format '{{.Name}} user={{.Config.User}} restart={{.HostConfig.RestartPolicy.Name}} privileged={{.HostConfig.Privileged}} readonly={{.HostConfig.ReadonlyRootfs}} pids={{.HostConfig.PidsLimit}} memory={{.HostConfig.Memory}}'
REMOTE
```

Go/no-go obbligatorio:

- [ ] Ogni servizio ha restart policy e healthcheck coerenti.
- [ ] Nessun container e `privileged` o monta `/var/run/docker.sock`.
- [ ] Solo Caddy pubblica porte host.
- [ ] App, Postgres, Redis e Umami usano solo network necessarie.
- [ ] Nessun volume dati usa bind mount fragile o percorso inatteso.
- [ ] Log Docker sono limitati dal daemon.
- [ ] Stop grace period consente shutdown pulito di app e database.
- [ ] Configurazioni production secret-free e sei unita systemd vengono salvate
      nel repository dopo il cutover come source of truth revisionabile.

Non introdurre nuovi limiti container durante il cutover. La loro assenza deve
essere registrata come rischio temporaneo e risolta entro 48 ore con le misure
della fase 17; i controlli host e lo swap restano compensazioni temporanee.

## Fase 7: Replica Esatta Delle Immagini Docker

Non eseguire `docker compose pull` con tag mobili durante la migrazione.

### 7.1 Immagini Da Trasferire

```text
middleware-app:manual-9960908-dirty-20260805T085340Z
middleware-migrate:manual-9960908-dirty-20260805T085340Z
postgres:16-alpine
redis:7-alpine
caddy:2-alpine
ghcr.io/umami-software/umami@sha256:8edfe4beaef13f9d1300619fa264ef250a3688df9cc54d24ca830ca31cb475ec
```

Verificare che esistano sulla vecchia VPS:

```bash
ssh -i "$SSH_KEY" "$OLD_SSH" 'docker image inspect \
  middleware-app:manual-9960908-dirty-20260805T085340Z \
  middleware-migrate:manual-9960908-dirty-20260805T085340Z \
  postgres:16-alpine \
  redis:7-alpine \
  caddy:2-alpine \
  ghcr.io/umami-software/umami@sha256:8edfe4beaef13f9d1300619fa264ef250a3688df9cc54d24ca830ca31cb475ec \
  --format "{{.Id}} {{index .RepoTags 0}}"'
```

### 7.2 Streaming Immagini

```bash
set -o pipefail
ssh -i "$SSH_KEY" "$OLD_SSH" 'set -o pipefail; docker save \
  middleware-app:manual-9960908-dirty-20260805T085340Z \
  middleware-migrate:manual-9960908-dirty-20260805T085340Z \
  postgres:16-alpine \
  redis:7-alpine \
  caddy:2-alpine \
  ghcr.io/umami-software/umami@sha256:8edfe4beaef13f9d1300619fa264ef250a3688df9cc54d24ca830ca31cb475ec | zstd -T0 -3' \
| ssh -i "$SSH_KEY" "$NEW_SSH" 'set -o pipefail; zstd -d | docker load'
```

Verificare gli ID immagine su entrambi i server.

- [ ] Immagine app identica.
- [ ] Immagine migrate identica.
- [ ] Umami identica.
- [ ] Immagini infrastrutturali identiche.
- [ ] Nessuna immagine e stata ricostruita.
- [ ] Nessun secret e presente nella command line delle immagini.

Registrare anche digest e scan degli artifact esatti:

```bash
ssh -i "$SSH_KEY" "$OLD_SSH" 'docker image inspect \
  middleware-app:manual-9960908-dirty-20260805T085340Z \
  middleware-migrate:manual-9960908-dirty-20260805T085340Z \
  postgres:16-alpine redis:7-alpine caddy:2-alpine \
  ghcr.io/umami-software/umami:<tag-immutabile> \
  --format "{{join .RepoDigests \",\"}} id={{.Id}}"'
```

- [ ] Nessun tag `latest` resta come unica identificazione di un'immagine.
- [ ] Digest di app, migrate, Postgres, Redis, Caddy e Umami registrati.
- [ ] Scan dei digest senza finding critical; high con eccezione come fase 0.2.
- [ ] SBOM app/migrate archiviata con il record di release.

## Fase 8: Avvio Infrastruttura Sulla Nuova VPS

Non avviare ancora Caddy, app o Umami.

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml config --quiet
docker compose --env-file .env.production -f compose.production.yml up -d --no-build \
  postgres redis umami-postgres
docker compose --env-file .env.production -f compose.production.yml ps
REMOTE
```

Verificare:

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select 1;"'
docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T redis sh -lc \
  'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping'
docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T umami-postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select 1;"'
REMOTE
```

- [ ] Tutti e tre i servizi healthy.
- [ ] Nessuna porta host pubblicata.
- [ ] Volumi con nomi `middleware_*` corretti.
- [ ] Nessun `initdb` inatteso dopo il primo avvio.

## Fase 9: Restore Di Prova

Questa fase usa una copia recente dei dati mentre la CX43 resta production.

### 9.1 Creazione Dump Rehearsal

Sulla vecchia VPS:

```bash
ssh -i "$SSH_KEY" "$OLD_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
app_dump="backups/app-postgres-rehearsal-${stamp}.dump"
umami_dump="backups/umami-postgres-rehearsal-${stamp}.dump"

docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  > "$app_dump"
docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T umami-postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  > "$umami_dump"
test -s "$app_dump"
test -s "$umami_dump"
sha256sum "$app_dump" "$umami_dump"
REMOTE
```

Registrare i due nomi in variabili locali:

```bash
export REHEARSAL_APP_DUMP="<percorso-dump-app>"
export REHEARSAL_UMAMI_DUMP="<percorso-dump-umami>"
export REHEARSAL_APP_NAME="$(basename "$REHEARSAL_APP_DUMP")"
export REHEARSAL_UMAMI_NAME="$(basename "$REHEARSAL_UMAMI_DUMP")"
```

### 9.2 Trasferimento Dump

```bash
scp -3 -i "$SSH_KEY" \
  "$OLD_SSH:/opt/middleware/$REHEARSAL_APP_DUMP" \
  "$NEW_SSH:/opt/middleware/backups/"

scp -3 -i "$SSH_KEY" \
  "$OLD_SSH:/opt/middleware/$REHEARSAL_UMAMI_DUMP" \
  "$NEW_SSH:/opt/middleware/backups/"
```

Confrontare SHA-256 tra vecchia e nuova VPS.

### 9.3 Restore Rehearsal

Tenere app e Umami fermi. Ricreare entrambi i database prima del restore, cosi
nessun oggetto non incluso nel dump rehearsal puo sopravvivere:

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" \
  "REHEARSAL_APP_NAME='$REHEARSAL_APP_NAME' REHEARSAL_UMAMI_NAME='$REHEARSAL_UMAMI_NAME' bash -s" <<'REMOTE'
set -euo pipefail
cd /opt/middleware
app_dump="backups/$REHEARSAL_APP_NAME"
umami_dump="backups/$REHEARSAL_UMAMI_NAME"
test -s "$app_dump"
test -s "$umami_dump"

docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T postgres sh -lc \
  'export PGPASSWORD="$POSTGRES_PASSWORD"; dropdb -U "$POSTGRES_USER" --if-exists --force "$POSTGRES_DB"; createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose --env-file .env.production -f compose.production.yml \
  exec -T postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --single-transaction' \
  < "$app_dump"

docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T umami-postgres sh -lc \
  'export PGPASSWORD="$POSTGRES_PASSWORD"; dropdb -U "$POSTGRES_USER" --if-exists --force "$POSTGRES_DB"; createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose --env-file .env.production -f compose.production.yml \
  exec -T umami-postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --single-transaction' \
  < "$umami_dump"
REMOTE
```

### 9.4 Verifica Dati

Confrontare su entrambi i server almeno:

- Numero migrazioni Prisma.
- Numero utenti.
- Numero articoli.
- Numero uscite.
- Numero pagine.
- Numero corsi.
- Numero lezioni.
- Numero website Umami.
- Numero sessioni Umami.
- Numero eventi Umami.

Non stampare contenuti editoriali, email o dati sessione.

### 9.5 Avvio App E Umami Senza Caddy

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml up -d --no-build --no-deps app umami
docker compose --env-file .env.production -f compose.production.yml ps

docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T app node -e \
  "fetch('http://127.0.0.1:3000/').then(async r=>{console.log(r.status,r.headers.get('content-type')); if(!r.ok) process.exit(1)}).catch(e=>{console.error(e.name);process.exit(1)})"

docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T umami node -e \
  "fetch('http://127.0.0.1:3000/').then(async r=>{console.log(r.status,r.headers.get('content-type')); if(!r.ok) process.exit(1)}).catch(e=>{console.error(e.name);process.exit(1)})"
REMOTE
```

### 9.6 Object Storage Da Helsinki

Verificare prima che il comando sia eseguito davvero dalla nuova VPS:

```bash
test "$(ssh -i "$SSH_KEY" "$NEW_SSH" 'curl -4 -fsS https://ifconfig.co/ip')" = "$NEW_IP"
ssh -i "$SSH_KEY" "$NEW_SSH" 'hostnamectl --static; docker info --format "{{.Name}}"'
```

Eseguire poi un ciclo autenticato `PutObject`/`GetObject`/`DeleteObject` su una
chiave temporanea univoca. Questo verifica i permessi realmente necessari senza
richiedere `ListBucket`; il comando non stampa nomi oggetto o secret:

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T app node -e \
  "import('@aws-sdk/client-s3').then(async ({S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand})=>{const c=new S3Client({endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,forcePathStyle:process.env.S3_FORCE_PATH_STYLE!=='false',credentials:{accessKeyId:process.env.S3_ACCESS_KEY,secretAccessKey:process.env.S3_SECRET_KEY}}),Bucket=process.env.S3_BUCKET,Key='migration-probe-'+Date.now(),body='middleware-s3-probe';try{await c.send(new PutObjectCommand({Bucket,Key,Body:body}));const r=await c.send(new GetObjectCommand({Bucket,Key}));if(await r.Body.transformToString()!==body)throw new Error('S3 probe mismatch');console.log('authenticated S3 write/read/delete: ok')}finally{await c.send(new DeleteObjectCommand({Bucket,Key}));c.destroy()}}).catch(e=>{console.error(e.name);process.exit(1)})"
REMOTE
```

Misurare piu richieste e registrare latenza, senza stampare credenziali o chiavi.

### 9.7 Protezione E DR Object Storage In Hetzner

Il bucket `middlewaremedia` in FSN1 resta autoritativo. Hetzner non replica
automaticamente un bucket in un'altra location, quindi configurare esplicitamente:

1. In `Object Storage -> middlewaremedia -> Settings`, abilitare bucket deletion
   protection.
2. Abilitare versioning sul bucket FSN1.
3. Impostare lifecycle: versioni non correnti conservate 30 giorni; incomplete
   multipart upload eliminate dopo 7 giorni.
4. Creare bucket privato `middlewaremedia-dr-hel1` in HEL1.
5. Abilitare deletion protection e versioning anche sul bucket DR.
6. Creare credenziali dedicate alla replica, limitate ai soli bucket source/DR;
   conservarle nel password manager e non negli env applicativi.
7. Configurare sync notturno unidirezionale FSN1 -> HEL1 senza propagazione
   immediata delle cancellazioni e con log di conteggio oggetti/byte/errori.
8. Conservare nel DR gli oggetti cancellati per almeno 30 giorni.
9. Eseguire restore mensile di un oggetto campione dal DR e registrare durata.
10. Creare l'oggetto immutabile `healthchecks/sentinel.txt`, aggiungere
    `S3_HEALTHCHECK_KEY=healthchecks/sentinel.txt` all'env app e verificarlo con
    `HeadObject`; non cancellarlo durante i cleanup media.

Prima del cutover:

- [ ] Prima replica completa terminata senza errori.
- [ ] Conteggio oggetti e byte source/DR registrato e coerente.
- [ ] Put/Get/Delete dell'app continua a funzionare con versioning attivo.
- [ ] Recupero di una versione cancellata verificato.
- [ ] RPO media massimo 24 ore rispettato.
- [ ] Nessun bucket e pubblico e nessuna credenziale DR e disponibile all'app.

CX33 HEL1 e bucket FSN1 appartengono entrambi alla network zone `eu-central`; il
traffico interno e gratuito secondo Hetzner. Registrare comunque p95/p99, error
rate e timeout: gratuita non significa priva di latenza o failure cross-region.

### 9.8 Resource Check Rehearsal

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" 'free -h; df -h /; docker stats --no-stream; systemctl --failed --no-pager'
```

Criteri go/no-go:

- [ ] RAM disponibile dopo warm-up almeno 1.5 GB.
- [ ] Nessun uso continuativo di swap.
- [ ] Nessun OOM o container restart.
- [ ] Disco sotto 40%.
- [ ] CPU sotto 80% nel test e load average sotto il numero di vCPU.
- [ ] p95 pagina pubblica interna sotto 500 ms e p99 sotto 1 s a cache calda.
- [ ] p95 pubblico dalla workstation sotto 1.5 s dopo il cutover.
- [ ] Almeno 25% di headroom RAM rispetto al massimo misurato nel rehearsal.
- [ ] App e Umami rispondono internamente.
- [ ] Object Storage raggiungibile.
- [ ] Dati rehearsal coerenti.
- [ ] Nessun errore Postgres, Redis o Caddy nei log.

Eseguire un soak di almeno 30 minuti sulla CX33 rehearsal con mix di homepage,
articoli, OG, immagini, audio, login page e Umami. Campionare ogni minuto CPU,
RSS, swap, I/O, FD, socket S3, connessioni Postgres/Redis, p95/p99 e restart.
Eseguire inoltre tre upload concorrenti di file di test alla dimensione massima
realmente ammessa, poi cancellarli e verificare memoria/stream.

Trigger di resize gia approvato: passare al primo piano x86 Hetzner con almeno
16 GB RAM se RAM disponibile scende sotto 1 GB, swap supera 1 GB per 15 minuti,
si verifica un OOM, CPU resta sopra 80% per 15 minuti o p95 supera 1.5 s per 15
minuti sotto traffico normale. Il resize richiede dump, maintenance, shutdown,
resize dalla Console, boot, verifica filesystem e smoke completo.

## Fase 10: Installazione Timer Operativi

Installare sulla CX33 le versioni revisionate nel repository, non copie VPS
obsolete:

```bash
scp -i "$SSH_KEY" scripts/production-backup-databases.sh \
  "$NEW_SSH:/opt/middleware/bin/backup-databases.sh"
scp -i "$SSH_KEY" scripts/production-restore-test.sh \
  "$NEW_SSH:/opt/middleware/bin/restore-test.sh"
scp -i "$SSH_KEY" scripts/production-healthcheck.sh \
  "$NEW_SSH:/opt/middleware/bin/healthcheck.sh"
scp -i "$SSH_KEY" scripts/production-healthcheck-timer.sh \
  "$NEW_SSH:/opt/middleware/bin/healthcheck-timer.sh"
scp -i "$SSH_KEY" scripts/production-backup-offsite.sh \
  "$NEW_SSH:/opt/middleware/bin/backup-offsite.sh"
scp -i "$SSH_KEY" scripts/production-replicate-media.sh \
  "$NEW_SSH:/opt/middleware/bin/replicate-media.sh"
ssh -i "$SSH_KEY" "$NEW_SSH" 'chmod 750 /opt/middleware/bin/*.sh'
```

Confrontare gli SHA-256 workstation/CX33. Gli script devono avere backup atomici,
lock, validazione `pg_restore --list`, controllo di entrambi i DB, marker off-host,
HTTP fail-closed e test S3 autenticato sul sentinel.

Creare le stesse unita della VPS corrente:

- `middleware-backup.service`
- `middleware-backup.timer`
- `middleware-restore-test.service`
- `middleware-restore-test.timer`
- `middleware-healthcheck.service`
- `middleware-healthcheck.timer`

Trasferire concretamente le unita attive dalla CX43 e installarle come root sulla
CX33. Il trasferimento fallisce se anche una sola estremita della pipeline fallisce:

```bash
set -o pipefail
ssh -i "$SSH_KEY" "$OLD_SSH" 'sudo tar -C /etc/systemd/system -czf - \
  middleware-backup.service \
  middleware-backup.timer \
  middleware-restore-test.service \
  middleware-restore-test.timer \
  middleware-healthcheck.service \
  middleware-healthcheck.timer' \
| ssh -i "$SSH_KEY" "$NEW_SSH" 'sudo tar -C /etc/systemd/system -xzf - \
  --no-same-owner --no-same-permissions'
```

Confrontare gli hash dei sei file tra le due VPS prima di proseguire.
Verificare inoltre sulla CX43 che `systemctl show <unita> -p DropInPaths` non
indichi drop-in. Se ne esistono, trasferire e revisionare anche quelli prima di
continuare. Sulla CX33 validare le unita installate:

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" \
  'sudo systemd-analyze verify /etc/systemd/system/middleware-*.service /etc/systemd/system/middleware-*.timer'
```

Configurazione attesa:

| Timer            | Frequenza                                |
| ---------------- | ---------------------------------------- |
| Backup DB        | ogni 5 ore da `00:15 UTC` con jitter 10m |
| Restore test     | mensile con jitter 30m                   |
| Healthcheck      | ogni 15 minuti                           |
| Replica media DR | `02:30` e `14:30 UTC` con jitter 10m     |

Applicare override al timer backup:

```ini
[Timer]
OnCalendar=
OnCalendar=*-*-* 00,05,10,15,20:15:00 UTC
RandomizedDelaySec=10m
Persistent=true
```

Crearlo sotto `/etc/systemd/system/middleware-backup.timer.d/schedule.conf`, poi
eseguire `systemd-analyze verify`, `daemon-reload` e controllare il prossimo run.

Creare `/opt/middleware/secrets/backup-offsite.env` con permessi `600` e sole
variabili `AGE_RECIPIENT`, `RCLONE_DB_DESTINATION` e configurazione rclone S3
del remote DR. Aggiungerlo al backup service con un drop-in:

```ini
[Service]
EnvironmentFile=/opt/middleware/secrets/backup-offsite.env
```

Creare `/opt/middleware/secrets/media-replication.env` con permessi `600`, remote
rclone source/DR e `RCLONE_MEDIA_SOURCE`, `RCLONE_MEDIA_DESTINATION`. Installare:

```ini
# /etc/systemd/system/middleware-media-replication.service
[Unit]
Description=Replicate production media to HEL1 DR
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=deploy
WorkingDirectory=/opt/middleware
EnvironmentFile=/opt/middleware/secrets/media-replication.env
ExecStart=/opt/middleware/bin/replicate-media.sh
```

```ini
# /etc/systemd/system/middleware-media-replication.timer
[Unit]
Description=Daily media DR replication

[Timer]
OnCalendar=*-*-* 02,14:30:00 UTC
Persistent=true
RandomizedDelaySec=10m

[Install]
WantedBy=timers.target
```

Creare `/opt/middleware/secrets/monitoring.env` con `HOST_HEARTBEAT_URL`, permessi
`600`, e aggiungerlo come `EnvironmentFile` al service healthcheck. Il monitor
heartbeat esterno deve allertare dopo 30 minuti senza ping.

Prima del cutover installare le unita ma non avviare ancora i timer che eseguono
smoke pubblici, per evitare risultati riferiti alla vecchia VPS.

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" \
  'sudo systemctl daemon-reload && systemctl list-unit-files "middleware-*" --no-pager'
```

- [ ] Unita presenti.
- [ ] Timer non ancora attivi prima del cutover.

## Fase 11: Piano Di Cutover

### 11.1 Finestra

Riservare:

- 30 minuti per freeze e restore finale.
- 30-60 minuti per verifica con freeze editoriale ancora attivo.
- Almeno 2 ore di osservazione immediata.

Scegliere una fascia a traffico basso.

Registrare nel log operativo inizio/fine UTC pianificati, operatore primario,
secondo operatore, rollback authority e contatto editoriale.

### 11.2 Blocco Automazioni Di Deploy

Il workflow e lo script correnti puntano ancora alla CX43. Prima del freeze:

```bash
gh workflow disable deploy-production.yml
```

- [ ] Workflow `Deploy Production` risulta disabled in GitHub Actions.
- [ ] Environment `production` richiede reviewer e non consente self-approval.
- [ ] Nessuno esegue `scripts/production-deploy-manual.sh` durante la finestra.
- [ ] Nessun cron, webhook o runner esterno puo avviare deploy sulla CX43.
- [ ] `PRODUCTION_SSH_KNOWN_HOSTS` sara obbligatorio; nessun fallback a
      `ssh-keyscan` non verificato e autorizzato alla riattivazione.

Il workflow resta disabilitato anche dopo il cutover finche token, migrazione,
pin delle Actions e restart non sono allineati ai guardrail. Nel frattempo il
metodo production deciso e deploy manuale controllato di immagini immutabili.
La variabile repository `PRODUCTION_DEPLOY_ENABLED` deve restare assente o
`false`; il job ha un guard esplicito e puo essere riabilitato solo impostandola
`true` dopo approvazione.

### 11.3 Comunicazione Freeze

- [ ] Nessun editor entra nel CMS.
- [ ] Nessun contenuto viene creato, modificato o cancellato.
- [ ] Nessun media viene caricato, rinominato o cancellato.
- [ ] Nessuna modifica utenti o ruoli.
- [ ] Nessun deploy durante la finestra.
- [ ] Nessuna rotazione secret durante la finestra.

Il freeze organizzativo serve solo a preparare la finestra. Prima del dump finale
viene imposto anche un freeze tecnico: Caddy risponde `503` e app e Umami vengono
fermate. Non affidarsi alla sola comunicazione agli editor.

### 11.4 Go/No-Go Prima Del Dump Finale

Su entrambe le VPS:

- [ ] Nessuna unita fallita.
- [ ] Dischi con spazio sufficiente.
- [ ] Orari UTC sincronizzati.
- [ ] Nuova app rehearsal funzionante.
- [ ] Restore rehearsal riuscito.
- [ ] DNS TTL 60.
- [ ] Accesso Vercel DNS disponibile.
- [ ] Console Hetzner disponibile.
- [ ] Vecchia VPS protetta e funzionante.
- [ ] Copia off-host dei dump pre-migrazione verificata tramite SHA-256.
- [ ] Workflow e ogni automazione verso la CX43 disabilitati.
- [ ] Artifact security-patched e digest verificati.
- [ ] Nessun finding runtime critical aperto.
- [ ] Operatore disponibile per almeno 2 ore dopo il cutover.

Se un controllo fallisce, rinviare il cutover.

## Fase 12: Dump Finale E Restore

### 12.1 Dump Finale Sulla CX43

Prima rendere indisponibili tutte le route sulla CX43 con una risposta di
maintenance, poi fermare app e Umami. In questo modo nessuna scrittura puo
avvenire dopo lo snapshot, nemmeno da sessioni CMS gia aperte o API client.

```bash
ssh -i "$SSH_KEY" "$OLD_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
app_dump="backups/app-postgres-final-migration-${stamp}.dump"
umami_dump="backups/umami-postgres-final-migration-${stamp}.dump"

test ! -e Caddyfile.pre-migration
cp Caddyfile Caddyfile.pre-migration
cat > Caddyfile <<'CADDY'
middleware.media, www.middleware.media, stats.middleware.media {
  respond "Servizio temporaneamente in manutenzione" 503
}
CADDY
docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T caddy caddy validate --config /etc/caddy/Caddyfile
docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T caddy caddy reload --config /etc/caddy/Caddyfile
for host in middleware.media www.middleware.media stats.middleware.media; do
  test "$(curl --resolve "$host:443:127.0.0.1" -sS -o /dev/null -w '%{http_code}' "https://$host/")" = "503"
done
docker compose --env-file .env.production -f compose.production.yml stop app umami

docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  > "$app_dump"

docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T umami-postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  > "$umami_dump"

test -s "$app_dump"
test -s "$umami_dump"
docker compose --env-file .env.production -f compose.production.yml \
  exec -T postgres pg_restore --list < "$app_dump" > /dev/null
docker compose --env-file .env.production -f compose.production.yml \
  exec -T umami-postgres pg_restore --list < "$umami_dump" > /dev/null
sha256sum "$app_dump" "$umami_dump"
REMOTE
```

Da questo momento la CX43 deve restare in maintenance e `app`/`umami` devono
restare fermi fino alla riapertura sulla CX33 o a un rollback esplicito.

Registrare:

```bash
export FINAL_APP_DUMP="<percorso-dump-app-finale>"
export FINAL_UMAMI_DUMP="<percorso-dump-umami-finale>"
export FINAL_APP_NAME="$(basename "$FINAL_APP_DUMP")"
export FINAL_UMAMI_NAME="$(basename "$FINAL_UMAMI_DUMP")"
```

### 12.2 Trasferimento Finale

```bash
scp -3 -i "$SSH_KEY" \
  "$OLD_SSH:/opt/middleware/$FINAL_APP_DUMP" \
  "$NEW_SSH:/opt/middleware/backups/"

scp -3 -i "$SSH_KEY" \
  "$OLD_SSH:/opt/middleware/$FINAL_UMAMI_DUMP" \
  "$NEW_SSH:/opt/middleware/backups/"

scp -i "$SSH_KEY" "$OLD_SSH:/opt/middleware/$FINAL_APP_DUMP" \
  "$HOME/middleware-migration-backups/"
scp -i "$SSH_KEY" "$OLD_SSH:/opt/middleware/$FINAL_UMAMI_DUMP" \
  "$HOME/middleware-migration-backups/"
shasum -a 256 "$HOME/middleware-migration-backups/$(basename "$FINAL_APP_DUMP")" \
  "$HOME/middleware-migration-backups/$(basename "$FINAL_UMAMI_DUMP")"

ssh -i "$SSH_KEY" "$OLD_SSH" \
  "cd /opt/middleware && sha256sum '$FINAL_APP_DUMP' '$FINAL_UMAMI_DUMP'"
ssh -i "$SSH_KEY" "$NEW_SSH" \
  "cd /opt/middleware/backups && sha256sum '$FINAL_APP_NAME' '$FINAL_UMAMI_NAME'"
```

- [ ] SHA-256 sorgente e destinazione identici.
- [ ] SHA-256 delle copie off-host identici alla sorgente.
- [ ] Dump non vuoti.
- [ ] Nomi contenenti timestamp UTC.
- [ ] Conservare anche i dump finali sulla CX43 per tutta la finestra di rollback.

### 12.3 Restore Finale Sulla CX33

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" \
  "FINAL_APP_NAME='$FINAL_APP_NAME' FINAL_UMAMI_NAME='$FINAL_UMAMI_NAME' bash -s" <<'REMOTE'
set -euo pipefail
cd /opt/middleware
app_dump="backups/$FINAL_APP_NAME"
umami_dump="backups/$FINAL_UMAMI_NAME"
test -s "$app_dump"
test -s "$umami_dump"

docker compose --env-file .env.production -f compose.production.yml stop app umami

docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T postgres sh -lc \
  'export PGPASSWORD="$POSTGRES_PASSWORD"; dropdb -U "$POSTGRES_USER" --if-exists --force "$POSTGRES_DB"; createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose --env-file .env.production -f compose.production.yml \
  exec -T postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --single-transaction' \
  < "$app_dump"

docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T umami-postgres sh -lc \
  'export PGPASSWORD="$POSTGRES_PASSWORD"; dropdb -U "$POSTGRES_USER" --if-exists --force "$POSTGRES_DB"; createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose --env-file .env.production -f compose.production.yml \
  exec -T umami-postgres sh -lc \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl --single-transaction' \
  < "$umami_dump"

docker compose --env-file .env.production -f compose.production.yml up -d --no-build --no-deps app umami
docker compose --env-file .env.production -f compose.production.yml ps
REMOTE
```

### 12.4 Confronto Finale

Confrontare vecchia e nuova VPS:

- [ ] 4 migrazioni Prisma.
- [ ] Conteggio utenti identico.
- [ ] Conteggio articoli identico.
- [ ] Conteggio uscite identico.
- [ ] Conteggio corsi e lezioni identico.
- [ ] Conteggio pagine identico.
- [ ] 19 tabelle Umami.
- [ ] Conteggio eventi Umami identico al dump finale.
- [ ] Nessun errore `pg_restore`.

## Fase 13: Cutover DNS

### 13.1 Preparazione Maintenance CX33 E DNS

Non esporre ancora l'app. Conservare il Caddyfile production-ready e predisporre
anche sulla CX33 la stessa risposta di maintenance:

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
test ! -e Caddyfile.production-ready
cp Caddyfile Caddyfile.production-ready
cat > Caddyfile <<'CADDY'
middleware.media, www.middleware.media, stats.middleware.media {
  respond "Servizio temporaneamente in manutenzione" 503
}
CADDY
docker compose --env-file .env.production -f compose.production.yml \
  run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile
REMOTE
```

Nel pannello Vercel DNS aggiornare:

```text
middleware.media       A       <NEW_IP>       TTL 60
stats.middleware.media A       <NEW_IP>       TTL 60
```

Non modificare:

```text
www.middleware.media   CNAME   middleware.media
```

Non aggiungere ancora un record `AAAA`.

### 13.2 Verifica Propagazione

```bash
dig @ns1.vercel-dns.com +short middleware.media A
dig @ns1.vercel-dns.com +short stats.middleware.media A
dig @1.1.1.1 +short middleware.media A
dig @8.8.8.8 +short middleware.media A
dig @1.1.1.1 +short stats.middleware.media A
dig @8.8.8.8 +short stats.middleware.media A
```

Attendere che tutti mostrino `NEW_IP`, poi attendere ancora almeno un TTL completo.
Fino ad allora la CX43 continua a servire maintenance e la CX33 puo risultare
temporaneamente non raggiungibile; non avviare Caddy nuovo mentre le challenge
ACME possono ancora raggiungere la vecchia VPS.

### 13.3 Avvio Caddy In Maintenance E Certificati

Dopo la convergenza DNS avviare Caddy sulla nuova VPS:

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
docker compose --env-file .env.production -f compose.production.yml up -d --no-build --no-deps caddy
docker compose --env-file .env.production -f compose.production.yml logs --no-color --tail=200 caddy
REMOTE
```

Controllare i log senza stampare env:

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" \
  'cd /opt/middleware && docker compose --env-file .env.production -f compose.production.yml logs --no-color --tail=300 caddy'
```

Verificare certificati direttamente sulla nuova IP:

```bash
curl --resolve "middleware.media:443:$NEW_IP" -I https://middleware.media/
curl --resolve "www.middleware.media:443:$NEW_IP" -I https://www.middleware.media/
curl --resolve "stats.middleware.media:443:$NEW_IP" -I https://stats.middleware.media/
```

- [ ] Certificato valido per `middleware.media`.
- [ ] Certificato valido per `www.middleware.media`.
- [ ] Certificato valido per `stats.middleware.media`.
- [ ] Tutti e tre gli host rispondono `503`, non contenuto applicativo.
- [ ] Nessun loop di redirect.
- [ ] Nessun rate limit ACME.

### 13.4 Passaggio Atomico Dell'Ingresso

Quando DNS e certificati sono verdi, fermare il vecchio Caddy e verificare che i
vecchi writer siano fermi:

```bash
ssh -i "$SSH_KEY" "$OLD_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
test "$(docker compose --env-file .env.production -f compose.production.yml ps --status running -q app umami | wc -l | tr -d ' ')" = "0"
docker compose --env-file .env.production -f compose.production.yml stop caddy
REMOTE
```

Solo dopo, sostituire la maintenance CX33 con la configurazione production-ready:

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
test -s Caddyfile.production-ready
cp Caddyfile.production-ready Caddyfile
docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T caddy caddy validate --config /etc/caddy/Caddyfile
docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T caddy caddy reload --config /etc/caddy/Caddyfile
REMOTE
```

Da questo istante la CX33 e l'unico ingresso e l'unico writer. La perdita degli
eventi analytics durante la maintenance e accettata.

In Hetzner `Primary IP -> Reverse DNS`, impostare il PTR IPv4 a
`middleware.media` e verificare forward-confirmed reverse DNS:

```bash
dig -x "$NEW_IP" +short
dig middleware.media A +short
```

Mantenere il PTR IPv6 predefinito finche non esiste un record `AAAA`. Non
pubblicare `AAAA` in questa migrazione; IPv6 pubblico richiede un rollout separato.

## Fase 14: Smoke Test Completo

### 14.1 Pagine Pubbliche

```bash
curl -I https://middleware.media/
curl -I https://www.middleware.media/
curl -I https://middleware.media/chi-siamo
curl -I https://middleware.media/uscite
curl -I https://middleware.media/contro-formazione
curl -I 'https://middleware.media/api/og?title=health'
```

Verificare anche contenuto, non solo status code:

```bash
curl -L https://middleware.media/ | grep -F '<title>Middleware | Scomporre la sicurezza</title>'
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' \
  'https://middleware.media/api/og?title=health'
```

Atteso per OG:

```text
200 image/png
```

### 14.2 CMS E Auth

- [ ] Eseguire login CMS e verificare cookie Secure, dashboard e sessione.
- [ ] Verificare articoli, audit log e accesso utenti riservato ad ADMIN.
- [ ] Nessun errore Better Auth origin/cookie.

### 14.3 Media E Object Storage

- [ ] Lista media CMS caricata.
- [ ] Immagini pubbliche caricate.
- [ ] Audio pubblico riproducibile.
- [ ] DNS Object Storage risolto dal container app.
- [ ] Nessun `EAI_AGAIN`, `ENETUNREACH` o timeout S3.
- [ ] Latenza media da HEL1 registrata.

- [ ] Caricare e cancellare un media di test non editoriale.

### 14.4 Umami

```bash
curl -I https://stats.middleware.media/
curl -L https://middleware.media/ | grep -F 'umami'
curl -L https://middleware.media/cms/login | grep -F 'umami'
```

Atteso:

- Script presente sulla pagina pubblica.
- Script assente dal CMS.
- Dashboard Umami accessibile.
- Una visita browser reale compare nel realtime.
- Dati storici presenti.

### 14.5 Healthcheck Nuova VPS

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" '/opt/middleware/bin/healthcheck.sh'
```

- [ ] Healthcheck completamente verde.
- [ ] Output riferito ai domini ora risolti sulla nuova VPS.

## Fase 15: Riapertura Editoriale

Mantenere il freeze almeno 30 minuti dopo il primo smoke verde.

Quando:

- DNS pubblici puntano alla CX33;
- certificati sono validi;
- smoke test e login sono verdi;
- media e analytics funzionano;
- non esistono errori critici;

allora:

- [ ] Eseguire una modifica editoriale non critica e verificarne persistenza.
- [ ] Creare immediatamente un dump sulla nuova VPS.
- [ ] Mantenere il freeze organizzativo ed eseguire integralmente la fase 16.

Non fermare ancora:

- Postgres vecchio.
- Postgres Umami vecchio.
- Redis vecchio.

Questi servizi mantengono il rollback disponibile.

## Fase 16: Backup E Timer Sulla Nuova VPS

Questa fase e un gate obbligatorio prima della riapertura editoriale. Non basta
che il sito sia raggiungibile: backup, restore, copia off-host e alert devono
essere gia funzionanti.

### 16.1 Avvio Manuale Controlli

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
sudo systemctl start middleware-backup.service
sudo systemctl start middleware-restore-test.service
sudo systemctl start middleware-media-replication.service
sudo systemctl start middleware-healthcheck.service
sudo journalctl -u middleware-backup.service -n 100 --no-pager
sudo journalctl -u middleware-restore-test.service -n 100 --no-pager
sudo journalctl -u middleware-media-replication.service -n 100 --no-pager
sudo journalctl -u middleware-healthcheck.service -n 150 --no-pager
systemctl show middleware-backup.service middleware-restore-test.service \
  middleware-media-replication.service middleware-healthcheck.service \
  -p Result -p ExecMainStatus --no-pager
REMOTE
```

- [ ] Dump app non vuoto.
- [ ] Dump Umami non vuoto.
- [ ] Restore test app riuscito.
- [ ] Restore test Umami riuscito.
- [ ] Backup cifrato off-host e marker della stessa generazione riusciti.
- [ ] Replica media e relativo marker riusciti.
- [ ] Healthcheck timer riuscito.

### 16.2 Abilitazione Timer

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
sudo systemctl enable --now \
  middleware-backup.timer \
  middleware-restore-test.timer \
  middleware-media-replication.timer \
  middleware-healthcheck.timer
systemctl list-timers --all \
  middleware-backup.timer \
  middleware-restore-test.timer \
  middleware-media-replication.timer \
  middleware-healthcheck.timer \
  --no-pager
REMOTE
```

Disabilitare i timer sulla vecchia VPS solo dopo che quelli nuovi sono verificati:

```bash
ssh -i "$SSH_KEY" "$OLD_SSH" 'sudo systemctl disable --now \
  middleware-backup.timer \
  middleware-restore-test.timer \
  middleware-healthcheck.timer'
```

Non cancellare i vecchi backup.

### 16.3 Backup Hetzner

Nella Cloud Console:

- [ ] Verificare che sia comparso almeno un backup CX33.
- [ ] Controllare timestamp e dimensione.
- [ ] Verificare che il backup appartenga alla nuova VPS.
- [ ] Non eliminare i backup della CX43 durante l'osservazione.

Il primo restore point Hetzner e obbligatorio per dichiarare completata la
migrazione, ma non blocca da solo la riapertura CMS se dump locale, restore test
e copia cifrata off-host sono gia verificati.

Prima della dismissione CX43 testare quel restore point:

1. Creare Network temporanea `recovery-isolated` con subnet privata e nessuna
   route custom.
2. Creare temporaneamente dal backup una CX33 x86 senza Primary IP pubbliche e
   collegarla solo a `recovery-isolated`.
3. Non collegarla al firewall production. Appena avviata, accedere da VNC e
   fermare writer e timer eventualmente partiti per restart policy.
4. Verificare boot, filesystem, `/opt/middleware`, Docker,
   unita systemd e presenza dump.
5. Non collegare il clone al DNS o alle reti production.
6. Spegnere e cancellare clone, subnet e Network; verificare assenza di server,
   IP, volume o Network temporanei residui e fatturabili.

Dopo 24 ore stabili e un dump verificato, creare snapshot
`middleware-hel1-post-cutover-<UTC>`, abilitarne protection e conservarlo fino a
30 giorni dopo la dismissione CX43. Lo snapshot a server acceso e destinato solo
al recovery dell'host ed e crash-consistent; per i database usare esclusivamente
i dump verificati. Lo snapshot sopravvive al server ed e fatturato finche non
viene cancellato esplicitamente.

### 16.4 Backup DB Cifrato Off-Host

Configurare un job successivo al dump locale che:

1. acquisisce un lock esclusivo con `flock`;
2. seleziona solo la coppia app/Umami con manifest `backup_finished`;
3. valida entrambi i dump con `pg_restore --list` e SHA-256;
4. cifra ogni dump e manifest con `age` verso una chiave pubblica recovery;
5. carica gli artifact cifrati nel bucket privato DR, sotto prefisso `db/`;
6. rilegge metadata/dimensione remoti e crea un marker locale `offsite_ok`;
7. non cancella dump locali se upload o verifica falliscono;
8. conserva tutte le generazioni per 14 giorni, 30 copie giornaliere e 12 copie
   mensili, eliminando solo artifact cifrati oltre retention dopo upload riuscito.

La chiave privata `age` deve stare nel password manager/recovery storage di due
amministratori e mai sulla VPS. Le credenziali upload devono poter scrivere solo
nel prefisso backup e non leggere/cancellare media production.

- [ ] Primo upload app e Umami completato.
- [ ] Download, decrypt, checksum e `pg_restore --list` verificati fuori dalla VPS.
- [ ] Restore test completo concluso entro RTO 4 ore.
- [ ] Timer backup ogni 5 ore con jitter massimo 10 minuti per rispettare RPO 6 ore.
- [ ] Alert backup scatta se ultimo marker offsite ha oltre 5 ore e 45 minuti.

### 16.5 Monitoraggio Esterno Prima Della Riapertura

Provider deciso: UptimeRobot, account operativo con 2FA e due contatti alert.

Creare e testare:

- [ ] Monitor HTTPS `middleware.media/`, intervallo 5 minuti, keyword attesa nel
      titolo, timeout e redirect HTTPS verificati.
- [ ] Monitor HTTPS `stats.middleware.media/`, intervallo 5 minuti.
- [ ] Monitor scadenza TLS con alert almeno 14 e 7 giorni prima.
- [ ] Alert email/app inviato a owner primario e secondario.
- [ ] Maintenance window UptimeRobot configurata solo per il cutover previsto.
- [ ] Test reale: mettere temporaneamente il nuovo Caddy in maintenance e
      confermare ricezione e recovery alert, poi ripristinare config validata.

Gli alert host locali sono fail-closed al 70% di disco/inode, RAM disponibile
sotto 1 GB, swap usata oltre 1 GB, OOM/restart, unita systemd fallite, backup
oltre 5 ore e 45 minuti, replica media oltre 13 ore, errori S3 e
`reboot-required` oltre 7 giorni. Il 70% apre escalation operativa; all'85% sono
bloccati deploy e operazioni non necessarie fino al rientro.

### 16.6 Riapertura CMS

Riaprire solo quando tutte le sezioni 16.1-16.5 sono verdi:

- [ ] Rimuovere freeze organizzativo e comunicare la riapertura agli editor.
- [ ] Registrare timestamp UTC, RPO/RTO ottenuti e owner che approva.
- [ ] Creare un ulteriore dump entro 6 ore dalla riapertura.

## Fase 17: Ottimizzazione Specifica Per 8 GB

Applicare queste ottimizzazioni dopo il cutover stabile, una alla volta, con
backup e smoke test tra ogni modifica.

### 17.1 Build Policy

La build completa ha raggiunto circa 2.2 GB nel test isolato. L'app ha avuto un
picco storico di circa 4.6 GB.

Regole:

- [ ] Non eseguire build sulla VPS production.
- [ ] Costruire e scansionare in CI, poi promuovere immagini per digest immutabile.
- [ ] Mantenere il workflow deploy disabilitato finche non e corretto e revisionato.
- [ ] Pulire periodicamente cache BuildKit e immagini obsolete.
- [ ] Conservare almeno immagine attiva e 5 rollback applicativi.

Controlli periodici:

```bash
docker buildx ls
docker buildx du
docker system df
df -h /
```

### 17.2 Limiti Container

Dopo 48 ore di metriche sulla CX33 applicare questi limiti iniziali:

| Servizio       | Limite iniziale |
| -------------- | --------------- |
| app            | 5 GB            |
| umami          | 768 MB          |
| postgres       | 512 MB          |
| umami-postgres | 512 MB          |
| redis          | 128 MB          |
| caddy          | 128 MB          |

I limiti devono essere inseriti in `compose.production.yml` con backup preventivo,
validazione `config --quiet`, restart di un servizio alla volta e smoke test. Una
deroga richiede misure registrate, owner e nuova scadenza massima 7 giorni.

Non impostare un limite app inferiore al picco storico senza aver corretto e
misurato il consumo S3/immagini.

### 17.3 Problema Memoria App

Finding gia rilevati:

- RSS app stabile intorno a 2.5 GB.
- Picco storico circa 4.6 GB.
- Cache Next su disco circa 19 MB.
- Numerose connessioni persistenti verso Object Storage.
- `getS3Client()` non riusa il client in production.
- `/api/og` rigenera immagini a ogni healthcheck.
- Sharp/libvips e OG possono mantenere memoria nativa.

Queste correzioni fanno parte dell'artifact security-patched della fase 0.2; dopo
la migrazione resta solo la verifica sul nuovo host:

- [ ] Confermare riuso singleton `S3Client` in production.
- [ ] Confermare timeout HTTP S3 e retry limitati.
- [ ] Verificare chiusura/cancellazione stream media.
- [ ] Aggiungere test sul lifecycle client.
- [ ] Misurare RSS, heap, external, arrayBuffers, FD e socket.
- [ ] Correlare memoria con `/api/og` e `/_next/image`.
- [ ] Valutare cache HTTP per OG healthcheck.
- [ ] Valutare limiti pixel e dimensione immagini upload.
- [ ] Non usare solo `NODE_OPTIONS` come soluzione alla memoria nativa.

### 17.4 Postgres

I database sono piccoli. Non applicare tuning aggressivo.

- [ ] Conservare configurazione Postgres di default inizialmente.
- [ ] Misurare connessioni, cache hit e query lente prima di modificare parametri.
- [ ] Non aumentare `shared_buffers` senza motivo su una VPS da 8 GB.
- [ ] Eseguire `VACUUM` tramite autovacuum, non job manuali frequenti.
- [ ] Verificare crescita WAL e log.

### 17.5 Redis

Redis e usato per rate limiting e attualmente contiene pochi o zero record.

- [ ] Impostare `maxmemory 128mb`.
- [ ] Impostare `maxmemory-policy volatile-ttl` e verificare che tutte le chiavi
      rate-limit abbiano TTL.
- [ ] Non esporre Redis fuori dalla rete Docker internal.
- [ ] Mantenere autenticazione.

### 17.6 Docker Storage

Policy obbligatoria:

- [ ] Controllo spazio settimanale.
- [ ] Prune BuildKit dopo deploy riusciti.
- [ ] Rimozione immagini solo dopo inventario rollback.
- [ ] Nessun `docker system prune -a --volumes`.
- [ ] Nessuna rimozione volumi automatica.
- [ ] Manifest prima di cleanup rilevanti.
- [ ] Alert al 70% e blocco deploy all'85% del disco.

### 17.7 Object Storage Cross-Region

- [ ] Misurare latenza HEL1 -> FSN1.
- [ ] Misurare tempi `HeadObject` e `GetObject`.
- [ ] Confermare nei costi che HEL1 e FSN1 restano in `eu-central`.
- [ ] Non rendere pubblico il bucket.
- [ ] Nessuna CDN introdotta da questa migrazione.
- [ ] Nessun serving diretto: media restano privati e serviti dal proxy applicativo.

## Fase 18: Sicurezza Post-Go-Live

### 18.1 Verifiche Settimanali Iniziali

```bash
sudo ufw status verbose
sudo fail2ban-client status sshd
sudo systemctl --failed --no-pager
sudo sshd -T | grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|maxauthtries|x11forwarding|allowtcpforwarding) '
ss -lntup
docker compose --env-file /opt/middleware/.env.production \
  -f /opt/middleware/compose.production.yml ps
```

- [ ] Solo porte attese pubbliche.
- [ ] Nessun container privilegiato inatteso.
- [ ] Nessun mount Docker socket nell'app.
- [ ] Nessun secret stampato nei log.
- [ ] Nessun secret nei metadata immagini.

### 18.2 Rotazione Secret

Non ruotare secret durante il cutover. Dopo stabilizzazione:

- [ ] Creare una seconda access key Object Storage.
- [ ] Aggiornare la CX33 e verificare media.
- [ ] Revocare la vecchia access key solo dopo test.
- [ ] Completare rotazione S3 entro 7 giorni dal cutover.
- [ ] Non ruotare password Postgres/Redis solo per la migrazione; ruotarle entro
      24 ore se si sospetta esposizione, altrimenti nella manutenzione trimestrale.
- [ ] Non ruotare `BETTER_AUTH_SECRET` senza accettare invalidazione sessioni.
- [ ] Non conservare vecchi secret ruotati sulla nuova VPS.
- [ ] Conservare credenziali recovery fuori dalla VPS.

### 18.3 Backup Offsite DB

I dump locali non sopravvivono alla perdita completa della VPS.

Configurazione obbligatoria gia completata nella fase 16.4; verificare ogni mese:

- [ ] Cifrare i dump con `age` o strumento equivalente.
- [ ] Conservare la chiave privata fuori dalla VPS.
- [ ] Caricare dump cifrati in storage offsite.
- [ ] Definire lifecycle e retention.
- [ ] Verificare periodicamente download, decrypt e restore.
- [ ] Non caricare dump non cifrati nel bucket media.

### 18.4 Monitoraggio Esterno

I timer locali non rilevano una VPS completamente irraggiungibile.

- [ ] Configurare uptime check esterno per homepage.
- [ ] Configurare uptime check esterno per `stats.middleware.media`.
- [ ] Configurare alert su HTTPS/certificato.
- [ ] Configurare un destinatario alert realmente monitorato.
- [ ] Evitare check che includano dati personali o token.
- [ ] Documentare provider e retention dei log di monitoraggio.
- [ ] Eseguire test alert mensile e registrare tempo di consegna.

## Fase 19: Aggiornamenti Repository E Operativita

Dopo almeno 24 ore stabili aggiornare:

### 19.1 Documentazione

- [ ] `docs/production-ops.md`: nuova IPv4.
- [ ] `docs/production-ops.md`: server `CX33`, location `HEL1`.
- [ ] `docs/production-ops.md`: RAM, CPU e disco correnti.
- [ ] `docs/production-ops.md`: nuova host key/fingerprint, senza chiavi private.
- [ ] Rimuovere sezioni temporanee riferite al vecchio IP.
- [ ] Registrare data cutover e finestra rollback.

### 19.2 Script Locali

- [ ] Impostare esplicitamente `SSH_HOST=$NEW_IP`; lo script non ha fallback IP.
- [ ] Aggiornare esempi smoke che usano il vecchio IP.
- [ ] Eseguire dry-run verso la nuova VPS.
- [ ] Non deployare finche dry-run e healthcheck non sono verdi.

### 19.3 GitHub Actions

- [ ] Aggiornare variabile `PRODUCTION_SSH_HOST`.
- [ ] Aggiornare `PRODUCTION_SMOKE_URL` a `https://middleware.media`.
- [ ] Aggiornare `PRODUCTION_PUBLIC_SITE_URL` a `https://middleware.media`.
- [ ] Rigenerare `PRODUCTION_SSH_KNOWN_HOSTS` dalla fingerprint verificata.
- [ ] Non affidarsi a `ssh-keyscan` non verificato come stato finale.
- [ ] Verificare environment protection `production`.
- [ ] Revisionare il workflow prima di riabilitarlo.

Il workflow esistente usa ancora percorsi deploy non allineati a tutti i guardrail
manuali correnti. Non eseguirlo sulla CX33 senza revisione.

### 19.4 Marker Deploy

Aggiornare `/opt/middleware/DEPLOY_SOURCE` sulla nuova VPS:

```text
branch=main
commit=9960908
dirty=false
synced_at=<timestamp-utc-cutover>
method=migration-clone-nbg1-to-hel1
image=middleware-app:manual-9960908-dirty-20260805T085340Z
```

## Fase 20: Osservazione

### Prime 2 Ore

- [ ] Healthcheck ogni 15 minuti verde.
- [ ] Nessun 5xx Caddy.
- [ ] Nessun restart container.
- [ ] Nessun OOM.
- [ ] Swap quasi inutilizzata.
- [ ] Login CMS funzionante.
- [ ] Upload media funzionante.
- [ ] Umami riceve eventi.

### Prime 24 Ore

- [ ] Backup DB automatico riuscito.
- [ ] Backup Hetzner presente.
- [ ] Disco stabile.
- [ ] RSS app misurata.
- [ ] Socket S3 misurati.
- [ ] Latenza pubblica e S3 registrata.
- [ ] Certificati Caddy validi.

### Prime 72 Ore

- [ ] Nessuna crescita memoria monotona.
- [ ] Nessuna crescita anomala Docker/containerd.
- [ ] Nessun errore backup.
- [ ] Nessun problema editoriale segnalato.
- [ ] Nessuna divergenza dati.
- [ ] Alert esterni attivi e consegna verificata.

### Giorno 7

- [ ] Restore test recente riuscito.
- [ ] Almeno un backup Hetzner valido.
- [ ] Dump finali off-host ancora disponibili e checksum verificati.
- [ ] Repository e runbook aggiornati.
- [ ] Nessun rollback richiesto.
- [ ] Approvazione esplicita alla dismissione CX43.

## Rollback

### Rollback Prima Dell'Esposizione Della CX33

Se la CX33 serve ancora maintenance e nessuna richiesta pubblica ha raggiunto app
o Umami, fermarne comunque i writer prima di riattivare la CX43:

1. Fermare app, Umami e Caddy sulla CX33.
2. Ripristinare il Caddyfile originale e riavviare app, Caddy e Umami sulla CX43.
3. Verificare direttamente sulla vecchia IPv4 che tutti i servizi rispondano.
4. Riportare in Vercel DNS i record A a `46.224.209.184`.
5. Attendere propagazione TTL.
6. Verificare certificati, homepage, CMS, media e Umami.
7. Mantenere entrambi i database per analisi.

Blocco CX33:

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" \
  'cd /opt/middleware && docker compose --env-file .env.production -f compose.production.yml stop app umami caddy'
```

Comando riavvio vecchia VPS:

```bash
ssh -i "$SSH_KEY" "$OLD_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
test -s Caddyfile.pre-migration
cp Caddyfile.pre-migration Caddyfile
docker compose --env-file .env.production -f compose.production.yml up -d --no-build --wait \
  postgres redis app caddy umami-postgres umami
docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T caddy caddy validate --config /etc/caddy/Caddyfile
docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T caddy caddy reload --config /etc/caddy/Caddyfile
REMOTE
```

Verificare dalla workstation senza dipendere dal DNS corrente:

```bash
curl --resolve "middleware.media:443:$OLD_IP" -I https://middleware.media/
curl --resolve "stats.middleware.media:443:$OLD_IP" -I https://stats.middleware.media/
```

### Rollback Dopo L'Esposizione Della CX33

Dal momento in cui viene caricata la configurazione production-ready, assumere
sempre che siano avvenute scritture sulla CX33. Non puntare semplicemente il DNS
indietro.

Prima imporre tecnicamente la maintenance sulla CX33 e fermare tutti i writer:

```bash
ssh -i "$SSH_KEY" "$NEW_SSH" 'bash -s' <<'REMOTE'
set -euo pipefail
cd /opt/middleware
test ! -e Caddyfile.pre-rollback
cp Caddyfile Caddyfile.pre-rollback
cat > Caddyfile <<'CADDY'
middleware.media, www.middleware.media, stats.middleware.media {
  respond "Servizio temporaneamente in manutenzione" 503
}
CADDY
docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T caddy caddy validate --config /etc/caddy/Caddyfile
docker compose --env-file .env.production -f compose.production.yml \
  exec --interactive=false -T caddy caddy reload --config /etc/caddy/Caddyfile
for host in middleware.media www.middleware.media stats.middleware.media; do
  test "$(curl --resolve "$host:443:127.0.0.1" -sS -o /dev/null -w '%{http_code}' "https://$host/")" = "503"
done
docker compose --env-file .env.production -f compose.production.yml stop app umami
REMOTE
```

Poi:

1. Creare dump app e Umami sulla CX33 ormai priva di writer.
2. Verificare dimensioni e checksum dei dump.
3. Trasferire i dump sulla CX43 e confrontare nuovamente i checksum.
4. Fermare app e Umami sulla CX43, se non sono gia fermi.
5. Ricreare entrambi i database CX43 con `dropdb --force` e `createdb` come nella fase 12.3.
6. Ripristinare i dump CX33 sulla CX43 in transazione singola.
7. Ripristinare `Caddyfile.pre-migration` e avviare i servizi CX43.
8. Confrontare conteggi, migrazioni e dati Umami sulla CX43.
9. Verificare direttamente la vecchia IPv4 con `curl --resolve`.
10. Riportare DNS alla vecchia IPv4.
11. Eseguire lo smoke completo e attendere la propagazione.
12. Rimuovere il freeze solo dopo verifica; mantenere ferma la CX33.

Non eseguire un rollback post-scritture senza avere prima bloccato tecnicamente
la CX33 e verificato i suoi dump.

## Dismissione CX43

La dismissione richiede approvazione esplicita.

Prima della cancellazione:

- [ ] Creare dump aggiornati app e Umami sulla CX33, fonte dati autoritativa.
- [ ] Creare manifest con hash e conteggi.
- [ ] Conservare una copia cifrata offsite e verificarne gli hash.
- [ ] Eseguire un restore test dei dump CX33 conservati.
- [ ] Conservare i dump finali della CX43 creati al cutover per analisi storica.
- [ ] Verificare che DNS non punti piu alla CX43.
- [ ] Verificare che GitHub Actions non punti alla CX43.
- [ ] Verificare che script locali non puntino alla CX43.
- [ ] Verificare che nessun timer necessario sia attivo sulla CX43.
- [ ] Verificare backup e restore CX33.
- [ ] Verificare almeno 7 giorni di stabilita CX33.

In Hetzner Cloud Console:

1. Confermare l'ID della vecchia CX43.
2. Confermare che la nuova CX33 abbia delete protection attiva.
3. Inventariare Primary IPv4 e IPv6 della CX43, protection e `auto delete`.
4. Inventariare tutti gli snapshot CX43; mantenere solo uno snapshot finale
   protetto con scadenza a 30 giorni e cancellare gli altri.
5. Disabilitare protection solo su CX43 e sui suoi IP, mai sulla CX33.
6. Cancellare la CX43; ricordare che spegnerla non interrompe la fatturazione.
7. In `Primary IPs`, cancellare esplicitamente IPv4 e IPv6 vecchie rimaste
   unassigned. La IPv4 continua a essere fatturata; la IPv6 e gratuita ma va
   rimossa come risorsa obsoleta.
8. Verificare cessazione dei backup server-bound CX43.
9. Verificare liste `Servers`, `Primary IPs`, `Snapshots`, `Volumes`, `Networks`
   e `Object Storage` per risorse residue.
10. Rimuovere label temporanea `migration=from-nbg1` dalla CX33.
11. Verificare che Object Storage e snapshot CX33 protetto non siano cancellati.
12. Alla scadenza, rimuovere protection e cancellare lo snapshot finale CX43.
13. Controllare subito il riepilogo costi e poi la fattura successiva.

Non cancellare:

- progetto Hetzner;
- bucket `middlewaremedia`;
- access key Object Storage in uso;
- nuova Primary IPv4;
- nuova Primary IPv6;
- backup CX33;
- firewall production;
- chiave SSH del progetto.

## Lifecycle Futuro CX33

Quando la CX33 sara sostituita, applicare lo stesso processo controllato:

1. Approvare sostituzione, finestra, owner e rollback.
2. Completare cutover DNS verso il successore con freeze tecnico single-writer.
3. Creare dump finali app/Umami e sync media DR; verificare copie off-host con
   restore test entro RTO.
4. Fermare writer e timer CX33, mantenendo database disponibili per rollback.
5. Se un backup deve sopravvivere al server, creare uno snapshot protetto con ID
   e scadenza: i backup server-bound vengono eliminati con la CX33.
6. Inventariare server, Primary IPv4/IPv6, snapshot, firewall, Network e Volume.
7. Dopo la retention approvata, rimuovere protection nell'ordine IP -> server,
   cancellare CX33 e cancellare esplicitamente entrambe le Primary IP.
8. Eliminare firewall e chiave SSH solo se non condivisi con altre risorse.
9. Cancellare gli snapshot alla scadenza e verificare subito costi e fattura
   successiva.

## Criteri Di Migrazione Completata

La migrazione e conclusa solo quando:

- [ ] DNS root, `www` e `stats` servono la CX33.
- [ ] HTTPS e certificati sono validi.
- [ ] CMS e Better Auth funzionano.
- [ ] Tutti i dati editoriali sono presenti.
- [ ] Tutti i dati Umami storici sono presenti.
- [ ] Media e audio funzionano da Object Storage.
- [ ] Backup locale automatico funziona.
- [ ] Restore test funziona.
- [ ] Backup Hetzner CX33 e presente.
- [ ] Restore drill da backup Hetzner riuscito e clone temporaneo eliminato.
- [ ] Snapshot post-cutover CX33 protetto e retention registrata.
- [ ] Bucket FSN1 e DR HEL1 protetti, versionati e sincronizzati.
- [ ] Backup DB cifrato off-host e monitoraggio esterno funzionano.
- [ ] Timer systemd sono attivi.
- [ ] Hardening SSH, UFW e Fail2ban sono verificati.
- [ ] Nessuna porta interna e pubblica.
- [ ] RAM, swap e disco sono entro soglie sicure.
- [ ] Workflow e script puntano alla nuova VPS.
- [ ] `docs/production-ops.md` e aggiornato.
- [ ] La CX43 e stata mantenuta per almeno 7 giorni.
- [ ] La CX43 e stata cancellata solo dopo approvazione.

## Attivita Post-Migrazione Non Bloccanti

- [ ] Ridurre RSS app e verificare memoria nativa.
- [ ] Aggiungere limiti container dopo misurazione.
- [ ] Valutare cache OG e media.
- [ ] Valutare CDN solo dopo misure HEL1 -> FSN1.
- [ ] Reintrodurre cache DB pubblica solo dopo build Docker verde.
- [ ] Eseguire load test controllato prima di campagne ad alto traffico.

## Riferimenti Ufficiali Hetzner

- Server: <https://docs.hetzner.com/cloud/servers/getting-started/creating-a-server/>
- Primary IP: <https://docs.hetzner.com/cloud/servers/primary-ips/overview/>
- Primary IP protection: <https://docs.hetzner.com/cloud/servers/primary-ips/faq/>
- Firewall: <https://docs.hetzner.com/cloud/firewalls/getting-started/creating-a-firewall/>
- Firewall behavior: <https://docs.hetzner.com/cloud/firewalls/faq/>
- Backup e snapshot: <https://docs.hetzner.com/cloud/servers/backups-snapshots/overview/>
- VNC: <https://docs.hetzner.com/cloud/servers/getting-started/vnc-console/>
- Rescue: <https://docs.hetzner.com/cloud/servers/getting-started/rescue-system/>
- IPv6: <https://docs.hetzner.com/cloud/servers/primary-ips/primary-ip-configuration/>
- Location/network zone: <https://docs.hetzner.com/cloud/general/locations/>
- Object Storage: <https://docs.hetzner.com/storage/object-storage/overview/>
- Bucket e versioning: <https://docs.hetzner.com/storage/object-storage/faq/buckets-objects/>
- Credenziali S3: <https://docs.hetzner.com/storage/object-storage/faq/s3-credentials/>
