# Operations runbook

Use this guide for installation, upgrades, account recovery, retention and
encrypted backups. [TASKS](TASKS.md) records the last checked installation
state. T84 records the last verified private deployment on October 29, 2026;
later source and dependency publication is not an automatic deployment. The
current migration head is `0021_published_library`. Check the running app locally
for its actual status. [ACCEPTANCE](ACCEPTANCE.md) tracks the remaining model,
device and recovery checks.

## Native local host

Follow the README setup. `make start` loads private `.env`
settings through uv without executing shell content, creates missing private
settings, and runs one API and one worker. If no administrator account exists, it prints a
thirty-minute, one-use setup link; the account is created in the browser, not a
terminal prompt. Invalid form input does not stop the app. Subsequent starts
never reset credentials or reopen first-account creation. If the database needs
a migration, startup stops before building: stop all API/worker writes, back up
data, then run `make migrate`, `make library-import` and `make start` in that
order. Do not combine them as parallel Make goals. Ctrl+C stops both services and preserves
the persistent data. `make demo` is different: its temporary data is deleted when
it stops. `make start` supports loopback HTTP or a configured private HTTPS
gateway; `make dev` is loopback-only, and `make serve` requires the gateway.
Run native commands from the repository root. `make bootstrap` installs the
locked root Python dependencies into `.venv`, including development and
CloudFormation validation tools on the same Python 3.15.2 runtime selected by
`.python-version`.
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

Administrator and learner passwords require 3–256 characters on both loopback
HTTP and HTTPS, without uppercase or symbol requirements. Existing passwords of
at least three characters work over HTTPS without a reset; updates preserve stored
credentials. Role-specific sign-in screens list account names.

A signed-in administrator can change their password under **Users**, by
selecting the administrator account and entering the current password plus a
confirmed new password. This replaces the current session and signs out other
administrator browsers. Learner passwords are changed through **Manage account**.

For administrator recovery in a native installation, use the existing login name
with `make admin`. For Docker, use the reset command in the
[container package](#container-package). Recovery never requires deleting the
database or changing the session secret. Reset learner passwords under
**Users**. A password reset signs out that account's browsers.

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
docker compose -f infra/docker/compose.yaml run --rm api python -m math_tutor.published_library import
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

Build and validate the candidate image from clean committed source in isolation,
without private settings or data mounts, before scheduling the upgrade. Before
changing the running installation, stop both services and complete the
[encrypted backup procedure](#encrypted-backup-and-restore-rehearsal) against the
host-mounted data before migrating or replacing either service:

```bash
docker compose -f infra/docker/compose.yaml stop
```

Retain the previous immutable image identity under a rollback tag before
replacing the standard `math-practice-tutor:local` reference. After the backup
succeeds, select the exact tested candidate; do not rebuild it during cutover.
Replace `TESTED_IMAGE_ID` below with the immutable `sha256:...` identity recorded
by local validation, rather than relying on a mutable candidate tag:

```bash
docker tag TESTED_IMAGE_ID math-practice-tutor:local
docker compose -f infra/docker/compose.yaml run --rm api alembic upgrade head
docker compose -f infra/docker/compose.yaml run --rm api python -m math_tutor.published_library import
docker compose -f infra/docker/compose.yaml up -d --no-build --pull never
```

Keep the same data mount and private settings. Verify readiness through the
configured origin after startup, a fresh worker heartbeat, protected-route/cache
behavior and that both services use the tested image. If a release changes
neither the schema nor packaged corpus, no migration or import is needed; do not
downgrade the database for a same-schema image rollback. The library import installs the reviewed,
packaged public texts into the shared SQLite corpus without network or model
calls. It is idempotent and refuses a changed text under an existing ID; it
does not rewrite learner passage snapshots. For native installations use
`make library-import` after the reviewed migration. Fresh native initialization
installs the packaged corpus automatically. The corpus and learner snapshots
are covered by the same SQLite backup while retaining separate deletion rules.
See the [corpus provenance and rebuild guide](../apps/api/src/math_tutor/data/published/README.md).

Migration `0021_published_library` adds only the public corpus table. When rolling
back across that migration to an image expecting `0020_request_recovery`, stop
both services and use the newer image to downgrade to `0020_request_recovery`
before starting the compatible previous image. This removes the public library;
learner/session tables and their saved material are preserved. Later releases
that keep schema `0021_published_library` need no downgrade merely to change images.
Complete the encrypted backup/restore rehearsal before either direction of a
retained-data migration. For an administrator password reset, stop both
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

`scripts/container-smoke.sh` migrates a disposable database, imports and verifies
all packaged public selections with network disabled, and checks the non-root
API, worker readiness and built UI. It creates a synthetic administrator
through the setup link, checks renewal and stale-link rejection, and verifies
that account creation closes setup. Complete the local image scan and CycloneDX
SBOM steps below; the optional full hosted workflow also performs them.
See [TASKS](TASKS.md) for current observed results.

### Local release validation

Use a clean committed checkout and synthetic fixtures, without operator settings,
provider credentials or retained data. Exclude inherited application/provider
environment values as well as disabling environment-file loading; the latter
does not clear already-exported settings. Install the locked tools with
`make bootstrap` and the test browser with
`pnpm exec playwright install --with-deps chromium`, then run:

```bash
make verify-local
docker build -f infra/docker/Dockerfile -t math-practice-tutor:ci .
sh scripts/container-smoke.sh math-practice-tutor:ci
trivy image --scanners vuln --severity HIGH,CRITICAL --exit-code 1 math-practice-tutor:ci
trivy image --format cyclonedx --output /tmp/shepherd-sbom.json math-practice-tutor:ci
docker image inspect --format '{{.Id}}' math-practice-tutor:ci
```

Docker and Trivy must be installed locally. The checked-in `.dockerignore` admits
only public build inputs. The smoke script uses disposable storage and mock
behavior; it does not mount the installation's retained data. Scan unfixed
HIGH/CRITICAL vulnerabilities too; do not add `--ignore-unfixed`. Keep the exact
tested image identity, scan/SBOM and source/test receipts with release evidence.
These commands validate a candidate; follow the stopped-writer encrypted backup
and upgrade procedure above before deployment.

Ordinary GitHub runs perform only the automatic source checks described in
[SPECIFICATION section 16](SPECIFICATION.md#16-development-and-release-commands).
For independent full hosted validation, explicitly enable `full_validation`
when manually running **Project checks**. The default is off. Its integration,
browser and package checks remain intact; no self-hosted runner or machine access
is needed. A green automatic source check does not claim full release validation.

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
uv run --locked --no-env-file python -m math_tutor.cloud_archive put --bucket YOUR_PRIVATE_BUCKET --region YOUR_REGION --key YOUR_BACKUP_UUID --file /private/backup/tutor.enc
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
