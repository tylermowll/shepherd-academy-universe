# Operations runbook

Use this guide for installation, upgrades, account recovery, retention and
encrypted backups. [TASKS](TASKS.md) records the last checked installation
state. Check the running app for its current status. [ACCEPTANCE](ACCEPTANCE.md)
tracks the remaining model, device and recovery checks.

## Native local host

Follow the README setup. `make start` loads private `.env`
settings through uv without executing shell content, creates missing private
settings, and runs one API and one worker. If no administrator account exists, it prints a
thirty-minute, one-use setup link; the account is created in the browser, not a
terminal prompt. Invalid form input does not stop the app. Subsequent starts
never reset credentials or reopen first-account creation. If the database needs
a migration, startup stops before building: stop all API/worker writes, back up
data, then explicitly run `make migrate start`. Ctrl+C stops both services and preserves
the persistent data. `make demo` is different: its temporary data is deleted when
it stops. `make start` supports loopback HTTP or a configured private HTTPS
gateway; `make dev` is loopback-only, and `make serve` requires the gateway.
Run native commands from the repository root. `make bootstrap` installs the
locked root Python dependencies into `.venv`, including development and
CloudFormation validation tools on the same Python 3.15 runtime.
`make dev-api` alone is a development API reload process;
`make dev-web` alone is a frontend development server. Use the combined same-origin
application for end-to-end practice. `/health/live` reports whether the API process
is running. `/health/ready` returns unavailable if it cannot access the database
or has not received a recent worker heartbeat. Neither check calls a paid provider.

Keep the setup link private and keep startup output out of shared logs. The
browser removes the token from its address and exchanges it once for a setup
cookie. The cookie is HttpOnly, restricted to the setup API, and valid for eight
hours. It survives refreshes and API restarts with the same deployment secret.
Unsent passwords clear on reload. App updates delay their refresh action until
account creation finishes. The unopened link expires after thirty minutes;
Ctrl+C followed by `make start` issues a replacement for a native app.
No public API issues setup links, and setup cannot reset an existing account.

Passwords of 6–11 characters are accepted only with an HTTP loopback origin;
the administrator is then flagged local-only. HTTPS needs at least twelve
characters, without uppercase or symbol requirements. Before enabling the
gateway, stop the app and worker. For a native installation, use the existing login name with
`make admin` to replace a short password. For Docker, use the reset command in
the [container package](#container-package). Startup and backend session/login
checks reject local-only credentials in network mode, even if a service bypasses
the native launcher. Recovery never requires deleting the database or changing
the session secret.

Learner passwords also need twelve characters for HTTPS. After the administrator
can sign in over HTTPS, reset any shorter learner passwords under **Learners**;
those resets sign out the affected learners' browsers.

For unattended use, run the API and worker separately under the host service
manager, with the same private settings and local data directory. Use a dedicated
unprivileged account, restrictive file-creation permissions (umask), encrypted local
disk and restart limits. Do not log raw requests or responses. Stop both services
before migrations and backups. Do not run multiple API workers or put SQLite on
a network or cloud-sync filesystem.

## Private HTTPS and phones

For private network setup and the iPhone QR camera workflow, see
[PHONE_SETUP](PHONE_SETUP.md). `make serve` supervises the API/worker behind the
separately configured HTTPS gateway and preserves data on exit.

Set `APP_PUBLIC_ORIGIN=https://your-reviewed-hostname` to the exact browser origin.
The backend selects Secure cookies automatically and rejects other Host/Origin
values. Run Caddy on the host using `infra/gateway/Caddyfile` and set `TUTOR_HOST`
to that hostname. Keep API port 8000 loopback-only. Caddy terminates TLS and
forwards to that local port; Uvicorn ignores forwarded client headers.

For LAN-only names, add `tls internal` and install/trust the Caddy local CA on
each device using the OS-supported process. Never bypass certificate errors.
For public DNS, use an appropriate validated certificate challenge. A firewall
that allows only 443 needs TLS-ALPN validation or a separately configured DNS
challenge; HTTP-01 requires a deliberate port-80 exception. Do not expose model,
worker, database, or administration service ports as a workaround.

For full learner practice on a phone, sign in with that learner's credentials.
The QR photo page allows one upload without a learner login.
Record actual Safari/Chrome
camera, HEIC, background/reconnect, install/update, zoom, keyboard and screen-reader
results using ACCEPTANCE. An emulator does not replace these checks.

## Container package

The image uses a digest-pinned Distroless Debian 13 runtime with no shell or
package manager (D007). Use the explicit Python/CLI commands below; rebuild for
dependency changes. The Dockerfile builds public assets and a locked Python
environment using the same managed Python runtime as native checks. Runtime UID/GID
is 10001. Compose mounts
one host data directory into both services, makes root filesystems read-only,
drops capabilities, and binds only `127.0.0.1:8000`.
The explicit Compose project name is `shepherd-academy-universe`, so changing
the checkout directory does not silently choose another Docker project.

From a fresh clone, run `make bootstrap`, then `make setup` to generate missing
private `.env` settings. Setup refuses to overwrite an existing file. Review
the public [.env example](../.env.example) for supported settings; edit the private
file locally. Then:

```bash
mkdir -p data
sudo chown 10001:10001 data
sudo chmod 700 data
docker compose -f infra/docker/compose.yaml build
docker compose -f infra/docker/compose.yaml run --rm api alembic upgrade head
docker compose -f infra/docker/compose.yaml up -d
make start
curl --fail http://127.0.0.1:8000/health/ready
```

If the public origin is HTTPS, supply its Host header for the loopback readiness
probe or request readiness through the gateway. Do not change the configured
origin merely to pass a health check. `make down` retains the host data directory.
Use `make down` when you want to stop the containers.

Open the private link printed by `make start` to choose the first administrator's
credentials in the browser. If it expires, run `make start` again while Docker
continues running. The direct operator command is
`docker compose -f infra/docker/compose.yaml exec -T api python -m math_tutor.owner_setup`.
The command uses the API's `SHEPHERD_OWNER_SOCKET` Unix socket inside its private
tmpfs directory. Directory permissions are 700; socket permissions are 600.
`make start` discovers the running API using public Docker metadata before
loading native settings or checking Node. It does not start another app.
Every new link replaces the previous unopened link. A browser that already opened
a link keeps setup access until its cookie expires after eight hours or an
administrator account is created. Once an
administrator exists, the command returns the sign-in address. Explicit
`make dev`, `make serve` and
alternate `ENV_FILE` values select native startup.

For a container upgrade, stop both services and complete the
[encrypted backup procedure](#encrypted-backup-and-restore-rehearsal) against the
host-mounted data before building or migrating:

```bash
docker compose -f infra/docker/compose.yaml stop
```

After the backup succeeds:

```bash
docker compose -f infra/docker/compose.yaml build
docker compose -f infra/docker/compose.yaml run --rm api alembic upgrade head
docker compose -f infra/docker/compose.yaml up -d
```

Keep the same data mount and private settings. Verify readiness through the
configured origin after startup. For an administrator password reset, stop both
services and run
`docker compose -f infra/docker/compose.yaml run --rm api python -m math_tutor.cli admin`
with the existing username, then start the services again. The reset revokes
administrator sessions and preserves learner accounts and saved work.

Compose reads operator `.env` itself. Browser-managed AI connections are stored
in the shared private database and configured through administrator **Settings**.
For optional file-managed connections, set an absolute container path for `PROVIDER_CONFIG`
and add an explicit **read-only** mount of the reviewed private provider YAML to
both services. For host-local Ollama/vLLM, localhost inside the container is not
the host. This Compose file maps `host.docker.internal` to the Linux host gateway
for both the API and worker; use that name in browser-managed endpoints. The
model server must listen on a private host interface reachable from the Docker
bridge. Block its port from untrusted networks and never publish it to the
Internet. No provider config or secrets are baked into the image. Supply cloud
credentials through workload identity or an explicitly managed short-lived
mechanism, not committed static keys.

`scripts/container-smoke.sh` migrates a disposable database and checks the
non-root API, worker readiness and built UI. It creates a synthetic administrator
through the setup link, checks renewal and stale-link rejection, and verifies
that account creation closes setup. CI separately scans the image and generates
a CycloneDX SBOM. See [implementation history](history/TASKS.md) for observed results.

## Retention, export and deletion

Submitted photos become inaccessible when processing completes and are then
deleted. After a crash or storage failure, a saved cleanup record lets the worker
retry deletion. Failed/unprocessed photos default to 24 hours and are capped at 24;
`PHOTO_RETENTION_HOURS` permits shorter retention. History defaults to 30 days;
`HISTORY_RETENTION_DAYS` is bounded 1–365. The worker sweeps every 60 seconds while
running. Expired photos are rejected by both the image API and the worker before
inference, including when file deletion is delayed. Monitor readiness;
downtime delays deletion of expired files.

When deleting learners or expired history, the database transaction also queues
the affected image storage keys for deletion. The worker removes those files
during its next sweep. Failed file deletions retain their queue entries across
restarts. Other cleanup and tutoring continue after a file
failure. Temporary database/storage errors in the worker loop retry after five
seconds; a failed sweep retries on its next 60-second interval. Existing job
leases and provider-call budgets still apply. `--once` exits unsuccessfully on
a sweep/database failure so scripts cannot mistake it for completed work.

Warnings report cleanup/storage categories without filenames, learner content,
SQL, or raw exception details. If they persist, check the private volume's mount,
space, ownership and write permissions. A running worker cannot repair a missing
or read-only volume by itself.

An administrator export downloads in the authenticated request, with caching
disabled. There is no reusable export link. The administrator must delete any
downloaded copies separately; the server cannot revoke them. Revocation prevents
new device requests. Learner deletion immediately revokes sessions and cancels work, purges
database content, queues image-file deletion, and records a UUID deletion marker
(tombstone) without learner content. Late worker output is discarded.
The journal `deletions.jsonl` beside the configured database is flushed to disk
with fsync before the deletion commit. Keep it private and preserve its latest
version during recovery. Audit events and tombstones contain no learner content
and are retained for recovery and accountability; no raw prompts or photos
are in provider-call logs.

## Encrypted backup and restore rehearsal

Stop API and worker writes. Backups use SQLite's backup API, then bundle referenced
photos, checksums, database and deletion ledger. AES-256-GCM encrypts the archive;
scrypt derives the key from a separately stored passphrase. Enter it through
a hidden prompt, never a command-line argument or a checked-in variable. Copying
a live main SQLite file without its write-ahead log (WAL) is not a backup
procedure. For a native installation:

```bash
make backup OUTPUT=/private/backup/tutor.enc
make restore INPUT=/private/backup/tutor.enc OUTPUT=/private/restore-rehearsal LEDGER=/private/current/deletions.jsonl
```

Both targets acknowledge that you stopped writes. The destination must not exist.
They load the same private `.env` as `make start`, including a custom database
path, and refuse to run while the native launcher holds that database's lock.
Stop independently supervised services too; the lock cannot stop those writers.
For Compose, stop both services and point the host backup settings at the mounted
`data/math_tutor.sqlite3` and its adjacent objects/ledger. Compose overrides the
database/data paths inside containers; `make backup` does not discover those
overrides or stop Docker writers. Check the host-side paths before using it.
Supply the **current** deletion ledger, even when restoring an old archive. If no
learner was ever deleted, explicitly create an empty private ledger. Never replace
a missing current ledger with an old empty one to bypass deletion preservation.
The restore authenticates before extraction, rejects unsafe archive paths, checks
hashes and SQLite integrity/foreign keys, reapplies all known deletions, checkpoints
the restored WAL, revokes all signed-in browser sessions, and cancels pending
jobs. Test a new isolated restore directory before changing production paths.
Sign the administrator and learners in again after switching to the restored
app. Retention sweeps resume with the worker.

Browser-managed connections and their encrypted API-key values are included in
the database archive. Operator environment/YAML, certificates, and the deployment
session secret are **not** included. Recover those separately from your secret
manager. Saved API keys require the original session secret for decryption; if
you rotate it, replace the affected keys in administrator **Settings** and retest
connections.
Encryption does not protect against someone who has both the database and that
secret. Restore writes `math_tutor.sqlite3`, `objects/` and `deletions.jsonl` into
the new output directory. To switch a native app, update `DATABASE_URL` in the
private settings to the restored database. For Compose, keep both services stopped while
switching the shared host data mount to that directory and set UID/GID 10001
ownership. Keep the previous directory until the restored app passes its isolated
startup and sign-in checks in [ACCEPTANCE](ACCEPTANCE.md).

The operator must enforce the default seven-day encrypted-backup retention
window; the local CLI does not schedule deletion. Keep the passphrase separately.
Account for exported downloads and old backups when fulfilling deletion requests.

Optional encrypted S3 transfer is an explicit operator CLI:

```bash
uv run --locked python -m math_tutor.cloud_archive put --bucket YOUR_PRIVATE_BUCKET --region YOUR_REGION --key YOUR_BACKUP_UUID --file /private/backup/tutor.enc
```

`get` requires a new output file; `delete` removes the current key. Transfers are
capped at 64 MiB, accept only the encrypted archive format, use TLS and role-based
SDK credentials, and never run from learner requests. Older versions in a
versioned S3 bucket expire under its lifecycle rules; DeleteObject does not
remove them immediately.

## EC2/EBS reference deployment

`infra/aws/household.json` is a CloudFormation template, validated by
`make infra-check`. It creates no resources until an operator explicitly applies
it. Select an exact reviewed Linux AMI, matching subnet/availability zone, VPC,
household/VPN client CIDR, existing secret ARN, budget and notification address.
The host uses IMDSv2, SSM administration, encrypted root disk, and a separate
retained encrypted gp3 data volume. There is no SSH ingress or public model port.
The role can read one supplied secret and transfer objects only under its private
backup bucket's `backups/` prefix. Bedrock permission is deliberately absent;
add narrowly scoped model/region permissions only if that route is selected.

Mount the attached EBS volume by filesystem UUID at the shared private data path.
Inspect the new device before formatting; never format an existing data volume.
Set UID/GID 10001 ownership for the container deployment. Require the mount before
starting services so a missing volume cannot silently write to ephemeral root
storage. On replacement, stop the old host, reattach the retained volume to one
host in the same availability zone, restore configuration, and verify integrity
and readiness before opening access. This design has downtime and no automatic
failover or cross-zone database replication.

The template retains the data volume and backup bucket on stack deletion;
retained resources continue to incur costs. Its 80% monthly budget notification
is an alert, not a hard spending cap. SSM/network/certificate access and the chosen
AMI are account-specific operator checks. No EC2 resources, secrets, DNS records,
S3 buckets, or Bedrock invocations were created during implementation.
