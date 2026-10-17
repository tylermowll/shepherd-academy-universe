# Computer tutor with an iPhone camera

Run the tutor on one computer and send photos from an iPhone through an expiring
QR link. The computer shows the model's reading before feedback and continues
usable readings automatically. You can also sign in for full practice on the
phone. Both workflows use the same private HTTPS address; no native iPhone app
or public deployment is required.

## 1. Prepare the computer once

Follow [README setup](../README.md#start-the-app) for the toolchain and first
administrator account. In a new checkout:

```bash
make bootstrap
make start
```

`make start` uses the standard Docker app when it is already running on port
8000; otherwise it starts the native app. Keep any printed first-account setup
link private. Existing accounts sign in at the printed app address.

For an existing installation, stop all app/worker writes and back up retained
data before upgrading. If startup reports an old database schema, run
`make migrate start` for a native app. For Docker, follow the
[container upgrade instructions](RUNBOOK.md#container-package).

Configuration/key entry below is for you to perform in your trusted local app,
not for a coding agent to read. Never paste private files or keys into chat.

## 2. Give the phone a reachable HTTPS address

The computer must stay awake. `localhost` on an iPhone means the iPhone itself.
Both desktop and phone must open the **same configured HTTPS address**.

HTTP localhost permits six-character passwords; HTTPS requires twelve. If the
administrator has a shorter local password, stop both app processes, set the
HTTPS origin and follow [password recovery](RUNBOOK.md#native-local-host) with
the existing login name. Use the runbook's Docker reset command for containers.
Network startup rejects local-only administrator passwords.

Learner passwords also need twelve characters for HTTPS. After restarting and
signing in as administrator, reset any shorter passwords under **Learners**;
those resets sign out the affected learners' browsers.

### Tailscale private access

Install Tailscale on the computer and iPhone and join your private network.
Review its current plan/terms, enable HTTPS for your tailnet, then run this on the
computer to proxy the application privately:

```bash
tailscale serve --bg --https=443 http://127.0.0.1:8000
```

Use the exact HTTPS URL reported by Tailscale (without a trailing slash) as
`APP_PUBLIC_ORIGIN` in your local `.env`, for example
`https://your-computer.your-tailnet.ts.net`. This setting's name does not make the
application publicly accessible. Use **Serve**, which is private to your network;
Funnel is a different, public feature and is not needed. Keep Tailscale connected
on the iPhone. The API still binds only to computer loopback, and both devices
need access to the configured Tailscale host. Do not expose vLLM to the internet.

Tailscale adds an external networking dependency; it does not host the app or
perform inference. See its [Serve command reference](https://tailscale.com/docs/reference/tailscale-cli/serve)
and [HTTPS setup](https://tailscale.com/docs/how-to/set-up-https-certificates).

### Entirely local Wi-Fi

Use the existing [Caddy LAN setup](RUNBOOK.md#private-https-and-phones): a stable
LAN address/name, `tls internal`, and your local CA installed and trusted on the
computer and iPhone. Allow the gateway port on your private network. No domain
purchase, AWS, Cloudflare, or router port forwarding is required. Guests on an
isolated Wi-Fi network may not be able to reach the computer. Open the HTTPS app
successfully in Safari before trying its QR links; do not bypass certificate errors.

## 3. Launch with phone access

After configuring the private HTTPS gateway and setting `APP_PUBLIC_ORIGIN`
as in section 2, continue with the matching launch method below.

### Docker app

Recreate the containers so they load the changed `.env`, then use `make start`
to print or renew the private setup/sign-in address:

```bash
docker compose -f infra/docker/compose.yaml up -d --force-recreate
make start
```

`make start` detects and attaches to the standard running Docker app; it does
not start a second API or worker. Leave the containers running behind the HTTPS
gateway. Do not run `make serve` while Docker owns port 8000.

### Native app

If the native terminal run from section 1 is still active, stop it with Ctrl+C.
Then run:

```bash
make serve
```

This loads your existing private settings, builds the app and supervises one API
on `127.0.0.1:8000` and one worker behind the gateway. Ctrl+C stops the app/worker
and preserves data; it does not stop Tailscale Serve or Caddy. For computer-only
HTTP use `make start`.

Open your configured HTTPS address on the computer and sign in as the
administrator before continuing.

## 4. Configure actual tutoring and handwriting models

Follow [provider setup](PROVIDER_STATUS.md#test-and-select-the-tutor-and-photo-reader)
in administrator **Settings**: save the exact connection and data policy,
explicitly test **Tutor** and **Photo reader**, then select both under
**Active models**. The provider guide includes native/Docker endpoint examples.
Saving or testing a connection does not activate it. Tests use synthetic data,
may incur charges and require explicit authorization.

The image-capable model can serve both roles. The default `demo` mock cannot
teach or recognize arbitrary handwriting. A cloud tutor receives photo
transcriptions even if the reader is local; review both roles' data boundaries.
The app computer must reach the model server. The iPhone never calls it directly.

## 5. Create a learner account and start practice

Create a learner account under **Learners**, record its username and password
securely, then sign out. Sign in with that learner account and open **Practice**.
Enter a topic; **Tutor options** controls how much the tutor leads. Choose
**Start session** to create both the session and its first practice activity. No
grade level or skill catalog is required.

To study from homework, paste it or use the reference-photo option. The tutor
creates distinct practice rather than answering the original.

## 6. Use your iPhone

On the computer, choose **Attach photo → Take photo with phone**. Scan the QR with the iPhone's
Camera app, tap the link, and choose **Take or choose a photo**. Preview, crop or
rotate as needed, then tap **Send to computer**. The phone needs no tutor login.
If it is already signed in, leave it signed in: the QR link opens the photo page
independently of that login, including when the browser reuses an open tab.

For the entire tutor on the phone, open the same HTTPS address and sign in with
the learner username and password created by the administrator. The administrator
can reset that password and manage signed-in browsers in **Learners**. This
account sign-in is separate from sending a photo through the QR link.

The in-app **Help → Phone setup** page also explains these workflows.

Return to the computer. Within the normal polling interval, the photo's processing
status appears in session history. The app displays the full reading and any
necessary readability advice. A usable reading proceeds to guidance
automatically—do not wait for a confirmation control. If the model reports
essential unreadable content, automatic photo tutoring stops and asks for a
specific clarification. Incidental uncertainty does not block useful feedback.
You can ask why the reader rejected the photo in the same conversation; its
report remains available as explicitly uncertain context. Clarify the relevant
line or send a clearer section when needed. Model confidence is not
proof of accuracy; if you notice a wrong reading, point it out in the discussion
or submit a corrected response.

Read the guidance, revise on paper and send another photo, or discuss the concepts
in text. Request a next activity when ready; the tutor uses recent work and your
initiative setting. It explains and uses different relevant examples rather than
giving the current answer or finishing your homework.

Links last two hours and accept one photo. Keep the phone page open while an
upload is pending; its retry button resends the same photo without creating a
second operation. If you reload or close it, rescan the original QR to check its
receipt, or choose **New QR code** on the computer if it expired. A new link cancels
the previous link. Logout/revocation, deletion, changed processing settings, or
finishing/changing the problem invalidates unused links. Links expose neither
history nor grading/admin actions; nevertheless, keep the QR private.

The photo selector sends the original to your computer for private normalization
before preview; the model receives only the submitted preview/crop. The current
limit is 8 MiB and 25 million decoded pixels (allowing 24 MP-class photos).
If the original is too large, use a lower-resolution camera image; 48 MP and RAW
originals are not supported. See Apple's [camera resolution settings](https://support.apple.com/guide/iphone/change-advanced-camera-settings-iphb362b394e/ios).
Submitted images are deleted after processing. Failed/unprocessed
photos expire within 24 hours; the worker must be running to perform cleanup.

## If something is unavailable

- No phone-photo button: check the worker, configured vision route, probe, learner
  eligibility, and the status message above the photo controls. Demo mode blocks
  uploads; use private mode. An active operation must finish or be canceled first.
- QR opens localhost or cannot connect: reopen the computer app at the configured
  HTTPS address. Check the phone's network/Tailscale connection and trusted certificate.
- Synthetic/unreadable message mentioning mock: select a real, successfully
  probed vision route. Mock tests do not measure handwriting quality.
- Photo accepted but reading fails: inspect the safe operation error and provider
  settings, then use the computer's operation retry. Cloud fallback is never automatic.
- Reading rejected: follow the legibility/organization advice and retake it.
  Do not repeatedly retry inference on a genuinely unreadable image.
- Generic or poor guidance: confirm a real tutor route is selected. The application
  does not limit you to fixed math templates, but models differ in subject,
  handwriting, and teaching quality. Evaluate the exact configured model.

Automated tests use synthetic images. Follow
[ACCEPTANCE](ACCEPTANCE.md#items-requiring-the-maintainer) for physical Safari/
Chrome, QR, HEIC and accessibility checks, and [TUTOR_EVALUATION](TUTOR_EVALUATION.md)
for handwriting and teaching trials. Record new outcomes in [TASKS](TASKS.md).
