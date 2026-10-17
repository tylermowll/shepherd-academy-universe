import type { ReactNode } from "react";
import { followPage, pageUrl, type Page, type Navigate } from "./navigation";

export function ContextHelp({
  topic,
  children,
}: {
  topic: string;
  children: ReactNode;
}) {
  return (
    <details className="context-help">
      <summary>{topic}</summary>
      <div>{children}</div>
    </details>
  );
}

const topics = [
  ["practice", "Start practicing"],
  ["accounts", "Accounts & learners"],
  ["phone", "Phone setup"],
  ["setup", "Set up the app"],
  ["providers", "Connect an AI model"],
  ["troubleshooting", "Troubleshooting"],
  ["privacy", "Saved work & privacy"],
] as const;

export function HelpPage({
  topic,
  onNavigate,
}: {
  topic?: string;
  onNavigate: Navigate;
}) {
  const selected = topics.find(([id]) => id === topic) ?? topics[0];
  const link = (page: Page, label: string, help?: string) => (
    <a
      href={pageUrl(page, help)}
      onClick={(event) => followPage(event, onNavigate, page, help)}
    >
      {label}
    </a>
  );
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    window.location.hostname,
  );
  return (
    <section aria-label="Help">
      <div className="page-heading">
        <h1 tabIndex={-1}>Help</h1>
        <p>Choose what you want to do.</p>
      </div>
      <div className="help-layout">
        <nav className="help-topics" aria-label="Help topics">
          {topics.map(([id, title]) => (
            <a
              key={id}
              href={pageUrl("help", id)}
              aria-current={selected[0] === id ? "page" : undefined}
              onClick={(event) => followPage(event, onNavigate, "help", id)}
            >
              {title}
            </a>
          ))}
        </nav>
        <article className="help-article card" key={selected[0]}>
          <h2 tabIndex={-1} data-page-focus>
            {selected[1]}
          </h2>
          {selected[0] === "practice" && (
            <>
              <ol className="steps">
                <li>
                  Sign in with your learner username and password, then open{" "}
                  {link("practice", "Practice")}.
                </li>
                <li>
                  Enter a topic, such as “writing a persuasive paragraph.” Start
                  the session to create your first activity from that topic or
                  reference material. Choose Easier, Standard, or Harder for
                  activity difficulty; you can change it during the session.
                </li>
                <li>
                  Write your work or question and choose <strong>Send</strong>.
                  Use <strong>Attach photo</strong> to upload work or choose{" "}
                  <strong>Take photo with phone</strong>.
                </li>
                <li>
                  Read the feedback. Revise your response, ask a question, or
                  ask for a hint from <strong>Help</strong>. Choose from{" "}
                  <strong>Next activity options</strong> when you are ready.
                </li>
              </ol>
              <p>
                {link("history", "History")} holds your saved sessions.
                Switching pages keeps your unsent work in this tab; reloading or
                closing it can lose unsent text and photos.
              </p>
              <ContextHelp topic="Can I use my homework?">
                <p>
                  Yes. Paste an assignment or photograph it as reference
                  material. The tutor creates different practice using the same
                  concepts. It does not complete your assignment. For reading
                  practice, include the passage you want to discuss.
                </p>
              </ContextHelp>
              <ContextHelp topic="How do I practice reading comprehension?">
                <p>
                  Choose a pasted or photographed passage, let the tutor write
                  an original passage, or choose Published story or news. Review
                  the preview and source details before starting. Next activity
                  options keep using the same text; choose different practice
                  material to change it. Include the passage itself; a book
                  title alone does not give the tutor its text.
                </p>
              </ContextHelp>
              <ContextHelp topic="Why is Start session unavailable?">
                <p>
                  The demo cannot accept personal work. A private app and a
                  selected AI tutor are needed. Follow{" "}
                  {link("help", "Set up the app", "setup")}; an adult can check
                  the selected model in {link("settings", "Settings")}.
                </p>
              </ContextHelp>
            </>
          )}
          {selected[0] === "accounts" && (
            <>
              <h3>One administrator, separate learner accounts</h3>
              <p>
                The administrator manages accounts and AI settings. Each learner
                signs in with their own username and password and can see only
                their own practice and history.
              </p>
              <ol className="steps">
                <li>
                  Open {link("learners", "Learners")} as administrator and
                  choose <strong>Add learner account</strong>.
                </li>
                <li>
                  Choose a unique username, set a password, and select an age
                  group. Choose <strong>Create learner account</strong>.
                </li>
                <li>
                  Give the learner their username and password. They use the
                  normal Sign in page on any device that can reach this app.
                </li>
              </ol>
              <h3>If you also want to study</h3>
              <p>
                Create one learner account for your own saved work. Sign out of
                the administrator account, then sign in with that learner's
                username and password.
              </p>
              <h3>Passwords and signed-in browsers</h3>
              <p>
                Select a learner to change their username or reset their
                password. Resetting a password signs out their browsers. You can
                also end one browser's access or sign out all of that learner's
                browsers without changing their password.
              </p>
              <p>
                Older profiles keep their saved work. Set a password before
                using one to sign in. If names conflicted, a numeric suffix
                distinguishes the accounts; their histories were not merged.
              </p>
            </>
          )}
          {selected[0] === "phone" && (
            <>
              {loopback && (
                <p className="notice">
                  <strong>This address works only on this computer.</strong>{" "}
                  Your phone cannot reach localhost or 127.0.0.1. Set up a
                  shared HTTPS address below, then open it on both devices.
                </p>
              )}
              <h3>Send a photo while you work on the computer</h3>
              <ol className="steps">
                <li>
                  Start an activity on the computer and choose{" "}
                  <strong>Take photo with phone</strong>.
                </li>
                <li>
                  Scan the QR code with the phone’s camera and open the link. No
                  sign-in is needed for this photo.
                </li>
                <li>
                  Choose <strong>Take or choose a photo</strong>, check the
                  preview, and tap <strong>Send to computer</strong>.
                </li>
                <li>
                  Return to the computer to see the reading and feedback. If the
                  link expires, create another one.
                </li>
              </ol>
              <h3>Use the whole tutor on the phone</h3>
              <p>
                Open the app’s shared HTTPS address and sign in with your
                learner username and password. Your administrator creates the
                account and can reset the password in{" "}
                {link("learners", "Learners")}.
              </p>
              <p>
                Signing in opens the learner's practice and history. The photo
                QR code allows one photo upload; it does not sign you in or give
                access to saved work.
              </p>
              <ContextHelp topic="Set up a shared HTTPS address">
                <p>
                  Start your own private app first. If you started it with{" "}
                  <code>make demo</code>, follow{" "}
                  {link("help", "Set up the app", "setup")} before continuing.
                </p>
                <p>
                  One supported option is Tailscale on both devices, connected
                  to the same private network. Enable HTTPS for that network,
                  then run this on the computer:
                </p>
                <pre>
                  <code>
                    tailscale serve --bg --https=443 http://127.0.0.1:8000
                  </code>
                </pre>
                <p>
                  Set <code>APP_PUBLIC_ORIGIN</code> in your local{" "}
                  <code>.env</code> to the exact HTTPS address Tailscale
                  reports, without a trailing slash. Stop the app and restart it
                  with:
                </p>
                <pre>
                  <code>make serve</code>
                </pre>
                <p>
                  Open that HTTPS address on both devices and keep the computer
                  awake. Use private Tailscale Serve; public Funnel is
                  unnecessary.
                </p>
                <p>
                  See the official{" "}
                  <a
                    href="https://tailscale.com/docs/reference/tailscale-cli/serve"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Serve instructions
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://tailscale.com/docs/how-to/set-up-https-certificates"
                    target="_blank"
                    rel="noreferrer"
                  >
                    HTTPS setup
                  </a>
                  . For a Caddy alternative on your local network, see{" "}
                  <code>docs/PHONE_SETUP.md</code> in the project folder.
                </p>
              </ContextHelp>
            </>
          )}
          {selected[0] === "setup" && (
            <>
              <p>
                <code>make demo</code> previews the app with sample data. It
                blocks tutoring and personal photos. Follow these steps to start
                your own private app.
              </p>
              <h3>First setup on your computer</h3>
              <p>
                Stop the demo with Ctrl+C. In the project folder, after
                installing the required tools listed in README:
              </p>
              <pre>
                <code>{"make bootstrap\nmake start"}</code>
              </pre>
              <p>
                The first start prints a{" "}
                <strong>Create administrator account</strong> link. Open that
                link and choose your username and password here in the browser.
                Localhost needs at least six characters; phone or HTTPS access
                needs twelve. No uppercase or symbol rules apply. Invalid input
                stays on the form so you can correct it.
              </p>
              <p>
                Open the private setup link within thirty minutes. This browser
                then has eight hours to finish setup, including after refreshes
                or app restarts. If an unopened link expires, run{" "}
                <code>make start</code> for a new one. This connects to an
                existing Docker app; for a terminal-run app, stop that run with
                Ctrl+C first. Existing accounts sign in at the app address
                printed in the terminal. Restarts keep your settings, account,
                and practice history.
              </p>
              <p>
                If you already have a private setup, keep your existing
                settings, account, and data. Use <code>make start</code> to
                restart. If startup says the database needs an upgrade, stop the
                app and worker, back up retained data, then run{" "}
                <code>make migrate start</code>. Never migrate while another
                copy is running.
              </p>
              <h3>Finish setup</h3>
              <p>
                The default model returns sample responses for testing.{" "}
                {link("help", "Connect an AI model", "providers")} for actual
                tutoring. To add your phone, follow{" "}
                {link("help", "Phone setup", "phone")}.
              </p>
            </>
          )}
          {selected[0] === "providers" && (
            <>
              <p>
                The tutor needs a model for activities and feedback. Reading
                handwriting also needs a model that accepts images. One
                image-capable model can do both jobs.
              </p>
              <ol className="steps">
                <li>
                  Open {link("settings", "Settings")} and choose{" "}
                  <strong>Add new AI connection</strong>. Select Ollama, vLLM,
                  or your API type. Enter the server URL, exact model name, and
                  an API key if required, then save. Saving does not activate
                  it.
                </li>
                <li>
                  For cloud AI, enable cloud processing in{" "}
                  <strong>Data & privacy</strong>. Set the age groups who use
                  this app there too. These choices apply to all connections.
                </li>
                <li>
                  Open <strong>Connection tests</strong> and test tutoring and,
                  if needed, photo reading. Tests send sample material, not
                  learner work; API providers may charge. The tutor test makes
                  two sample calls; the photo test makes one.
                </li>
                <li>
                  Open <strong>Active models</strong>. Choose the tutor and
                  photo reader for future learner work, approve where that work
                  will be sent, and save. Then open{" "}
                  {link("learners", "Learners")} and create a learner account.
                  That learner signs in separately to practice.
                </li>
              </ol>
              <p>
                A saved connection can be selected before it is ready; the
                selection form names each missing permission or test and links
                to the step that fixes it. The demo cannot teach or read
                handwriting. The app does not install or download models.
              </p>
              <ContextHelp topic="What is the model context limit?">
                <p>
                  This is the maximum amount the model can handle in one
                  request, including the input and its reply. It is measured in
                  tokens, the units a model uses to count input and output.
                  Enter the limit documented for your exact model and server.
                  This setting does not reserve memory or set the reply length.
                  The app accepts limits of a million tokens, while keeping
                  ordinary tutoring requests much smaller.
                </p>
              </ContextHelp>
              <ContextHelp topic="Where do I enter an API key?">
                <p>
                  In the administrator's <strong>Add new AI connection</strong>{" "}
                  form in {link("settings", "Settings")}. Saved keys are
                  encrypted on the app server and are never returned to the
                  browser. Editing lets you keep, replace, or remove a key. Keep
                  keys out of chat and source control; only enter them into your
                  own trusted app.
                </p>
              </ContextHelp>
              <ContextHelp topic="What server URL and model name do I use?">
                <p>
                  When the app runs directly on this computer, the Ollama server
                  URL is normally <code>http://127.0.0.1:11434</code>. When the
                  app runs with Docker Compose, use{" "}
                  <code>http://host.docker.internal:11434</code> instead. Use
                  the exact installed model name shown by{" "}
                  <code>ollama list</code>. For vLLM, use the corresponding
                  reachable address ending in <code>/v1</code> and the model
                  name it serves.
                </p>
                <p>
                  These addresses are reached from the app server, not from your
                  phone. A host model used from Docker must listen on a network
                  address Docker can reach; keep it behind the computer firewall
                  and do not expose it to the public Internet. If the model runs
                  elsewhere, use its reachable private address. A text-only
                  model cannot read photos; enable photo support only for an
                  image-capable model and test it.
                </p>
              </ContextHelp>
              <ContextHelp topic="Can children use a Meta or Llama model?">
                <p>
                  For Meta&apos;s hosted API, choose the allowed users only
                  after checking the current age and data terms for your
                  account. The app enforces your selection but cannot confirm
                  that the provider permits those age groups. Meta's hosted API
                  always uses cloud processing.
                </p>
                <p>
                  To serve a Meta/Llama model on your own computer or private
                  network, choose Ollama or vLLM as the connection type instead
                  and review that model&apos;s license and use policy.
                </p>
              </ContextHelp>
              <ContextHelp topic="Why is a setting managed by the server?">
                <p>
                  The person running the server can restrict cloud access and
                  allowed age groups in the server settings. Settings shows
                  those restrictions and cannot bypass them. Connections loaded
                  from a server configuration file cannot be edited here; add a
                  separate connection to manage it in the app. Bedrock uses the
                  AWS credentials and provider file configured on the server.
                </p>
              </ContextHelp>
              <ContextHelp topic="What happens to keys after a restore?">
                <p>
                  Keep your server's session secret backed up privately with its
                  settings. Saved API keys need that same secret to be
                  decrypted. If it changes or is lost, edit each affected
                  connection and enter its key again, then retest it. Never
                  paste your settings file into chat.
                </p>
              </ContextHelp>
              <ContextHelp topic="Why is a model unavailable for a learner?">
                <p>
                  The server checks the learner’s age group, the age groups
                  allowed by the connection, image support, and whether cloud
                  processing was enabled by the administrator. Check those
                  settings and the failed test message before choosing a model.
                  Tests expire after seven days. After editing a connection,
                  retest it and save your tutor/photo selections again to
                  approve the changed settings before new learner requests use
                  them.
                </p>
              </ContextHelp>
            </>
          )}
          {selected[0] === "troubleshooting" && (
            <>
              <ContextHelp topic="The phone cannot open the app">
                <p>
                  Use the same HTTPS address on both devices. A localhost
                  address reaches only the device that opens it. Keep the
                  computer awake and check the private network connection.
                  Follow {link("help", "Phone setup", "phone")}.
                </p>
              </ContextHelp>
              <ContextHelp topic="I cannot sign in as a learner">
                <p>
                  Ask your administrator to check the username and set or reset
                  the password in Learners. Use the same app address on both
                  devices. Learner passwords cannot be reset from the sign-in
                  page.
                </p>
              </ContextHelp>
              <ContextHelp topic="An activity or photo is stuck">
                <p>
                  Check that the app server and its background worker are
                  running. Reconnect and reopen the session in History. Use the
                  retry button on the failed request; it keeps the original
                  submission. If a provider test fails, check Settings and its
                  server configuration.
                </p>
              </ContextHelp>
              <ContextHelp topic="The tutor misread my handwriting">
                <p>
                  Check the displayed reading before using the feedback. Tell
                  the tutor what was misread, type your work, or retake a
                  well-lit photo. Include the whole response and separate lines
                  or steps.
                </p>
              </ContextHelp>
              <ContextHelp topic="My photo is rejected">
                <p>
                  Use JPEG, PNG, WebP, HEIC, or HEIF, up to 8 MiB and 25 million
                  pixels. Crop to the work or use a smaller photo. PDFs and
                  screenshots containing unreadably small writing will need a
                  new image.
                </p>
              </ContextHelp>
              <ContextHelp topic="I forgot the administrator password">
                <p>
                  The person running the app can run <code>make admin</code> in
                  the terminal and enter the existing login name to reset its
                  password. Saved settings load automatically. This signs that
                  administrator out on other browsers without deleting learners
                  or work. This recovery step is separate from first-time
                  browser setup.
                </p>
              </ContextHelp>
              <ContextHelp topic="My local password stops phone access">
                <p>
                  Passwords shorter than twelve characters are for HTTP
                  localhost only. After setting your HTTPS address and stopping
                  the app, run <code>make admin</code> with your existing login
                  name and a password of at least twelve characters, then
                  restart. Do not delete your database or change the session
                  secret.
                </p>
              </ContextHelp>
            </>
          )}
          {selected[0] === "privacy" && (
            <>
              <p>
                Submitted work is saved to the computer running the app. A
                learner reviews their own sessions in History. The administrator
                can download that learner&apos;s saved practice as JSON or
                delete the learner and saved work in Learners.
              </p>
              <p>
                Photos are removed after processing. Failed or unprocessed
                photos expire within 24 hours by default. Later review uses the
                saved text. Session history is kept for 30 days by default; the
                person running the server can change how long work is kept.
              </p>
              <p>
                Troubleshooting records keep the model, request type, outcome,
                timing, and available token counts. They do not copy your
                questions, answers, photos, or API keys. Submitted conversation
                content remains in session history for the period described
                above. The app does not make special copies of concerning
                messages or send safety alerts.
              </p>
              <p>
                Practice shows where text and photos are processed. A cloud
                model receives the selected content only after the administrator
                enables that service. The provider and existing backups have
                separate rules for how long they keep data.
              </p>
              <p>
                AI feedback can be wrong. It is guidance, not a verified grade.
                Ask for an explanation or correct a mistaken reading.
              </p>
              <p>
                Unsent drafts stay in this browser tab while you change pages.
                Reloading, signing out, switching learners, or closing the tab
                can lose them.
              </p>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
