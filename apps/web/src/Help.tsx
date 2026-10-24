import type { ReactNode } from "react";
import {
  followPage,
  pageUrl,
  roleForPage,
  type Page,
  type Navigate,
  type SignInRole,
} from "./navigation";

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
  ["signin", "Sign-in & passwords"],
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
  entryRole,
  accountRole,
}: {
  topic?: string;
  onNavigate: Navigate;
  entryRole?: SignInRole | undefined;
  accountRole?: SignInRole | undefined;
}) {
  const selected = topics.find(([id]) => id === topic) ?? topics[0];
  const recoveryRole = accountRole ?? entryRole ?? "learner";
  const link = (page: Page, label: string, help?: string) => (
    <a
      href={pageUrl(page, help, roleForPage(page) ?? entryRole)}
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
              href={pageUrl("help", id, entryRole)}
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
                  Choose what you would like help with, then tell the tutor what
                  you are working on. Add a text, notes or homework if that fits
                  your goal. Choose <strong>Start learning</strong> when you are
                  ready. You can change the defaults under{" "}
                  <strong>Adjust difficulty and guidance</strong>: choose how
                  challenging the work should be and how much guidance you would
                  like.
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
                  Choose <strong>Finish session</strong> to stop and review your
                  saved work and latest guidance.
                </li>
              </ol>
              <p>
                {link("history", "History")} holds your saved sessions.
                Switching pages keeps your unsent work in this tab; reloading or
                closing it can lose unsent text and photos.
              </p>
              <ContextHelp topic="Can I use my homework?">
                <p>
                  Choose <strong>Learn from my homework</strong>, then paste the
                  assignment or add a photo. The tutor makes different practice
                  using the same ideas. It does not complete your assignment.
                  For reading practice, include the passage you want to discuss.
                </p>
              </ContextHelp>
              <ContextHelp topic="How do I practice reading comprehension?">
                <p>
                  Choose <strong>Read and discuss a text</strong>, then paste or
                  photograph a text, ask the tutor to write one, or choose a
                  published text. Review the preview and source details before
                  starting. Next activity options keep using the same text;
                  choose different practice material to change it. Include the
                  passage itself; a book title alone does not give the tutor its
                  text.
                </p>
              </ContextHelp>
              <ContextHelp topic="Why is Start learning unavailable?">
                <p>
                  The demo cannot accept personal work. A private app and a
                  selected AI tutor are needed. Follow{" "}
                  {link("help", "Set up the app", "setup")}; an adult can check
                  the selected model in {link("settings", "Settings")}.
                </p>
              </ContextHelp>
            </>
          )}
          {selected[0] === "signin" && (
            <>
              <p>
                Choose your username from the account list on the sign-in
                screen, then enter your password. You can also enter your
                username directly. Administrator and learner passwords use 3–256
                characters, with no uppercase or symbol rules.
              </p>
              {recoveryRole === "adult" ? (
                <>
                  <h3>Change your administrator password</h3>
                  <p>
                    While signed in to Management, open <strong>Users</strong>,
                    choose <strong>Manage administrator</strong> beside your
                    account, and enter your current password and a new password
                    twice. Choose <strong>Change administrator password</strong>
                    . This browser stays signed in; other administrator browsers
                    are signed out.
                  </p>
                  <h3>Recover an existing administrator account</h3>
                  <p>
                    Contact the person running this app if you need help with
                    your administrator username or password. Administrator
                    password recovery happens on the computer running the app,
                    using the existing username.
                  </p>
                  <h3>Native installation</h3>
                  <p>
                    In the repository root on that computer, the operator runs{" "}
                    <code>make admin</code> and enters the existing username to
                    reset the administrator password.
                  </p>
                  <h3>Docker installation</h3>
                  <p>
                    The operator stops both the API and worker, then runs this
                    command from the repository root with the existing username:
                  </p>
                  <pre>
                    <code>
                      {
                        "docker compose -f infra/docker/compose.yaml run --rm api python -m math_tutor.cli admin"
                      }
                    </code>
                  </pre>
                  <p>
                    Start the services again after the reset. The reset signs
                    out administrator browsers and preserves learner accounts
                    and saved work. Recovery does not require deleting the
                    database or changing the session secret.
                  </p>
                  <h3>First-time setup</h3>
                  <p>
                    The private setup link creates the first administrator
                    account; it cannot reset an existing account. If you are
                    starting a new installation, follow{" "}
                    {link("help", "First-time setup", "setup")}.
                  </p>
                </>
              ) : (
                <>
                  <h3>Learner sign-in and passwords</h3>
                  <p>
                    Contact your administrator or the person who gave you your
                    account for your username or a password reset. Keep using
                    your existing learner account so your saved work stays with
                    you.
                  </p>
                  <p>Your administrator can reset your password:</p>
                  <ol className="steps">
                    <li>
                      Open <strong>Users</strong> and choose{" "}
                      <strong>Manage account</strong> beside your account.
                    </li>
                    <li>
                      Under <strong>Sign-in details</strong>, enter a{" "}
                      <strong>New password</strong>.
                    </li>
                    <li>
                      Choose <strong>Save sign-in details</strong> and give you
                      the new password privately.
                    </li>
                  </ol>
                  <p>
                    A password reset signs out that learner&apos;s browsers.
                    Your learner account and saved work stay the same; sign in
                    again with your existing username and the new password.
                  </p>
                </>
              )}
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
                  Open {link("learners", "Users")} as administrator and choose{" "}
                  <strong>Add learner account</strong>.
                </li>
                <li>
                  Choose a unique username, set a password, and select an age
                  group. Choose <strong>Create learner account</strong>.
                </li>
                <li>
                  Give the learner their username and password. They open{" "}
                  <strong>Learner sign-in</strong> on any device that can reach
                  this app.
                </li>
              </ol>
              <h3>If you also want to study</h3>
              <p>
                Create one learner account for your own saved work. In
                Management, choose <strong>Learner sign-in</strong> and enter
                that learner's username and password. In Learning, choose{" "}
                <strong>Administrator sign-in</strong> to manage the app.
                Management has Users, Settings and Help; Learning has Practice,
                History and Help. Each sign-in screen offers Help and a link to
                the other sign-in screen.
              </p>
              <p>
                Opening the other sign-in keeps your current account and unsent
                work available. Choose <strong>Cancel account switch</strong>,
                or the sign-in link for your current role, to return to your
                workspace. Invalid credentials or credentials for the other role
                preserve that account and work. Signing in successfully with the
                requested role switches the browser's account and clears unsent
                drafts from the previous account.
              </p>
              <h3>Passwords and signed-in browsers</h3>
              <p>
                Select a learner to change their username or reset their
                password. Resetting a password signs out their browsers. You can
                also end one browser's access or sign out all of that learner's
                browsers without changing their password.
              </p>
              <p>
                You can also correct the learner's age group without replacing
                their account or losing saved work. Changing it stops pending
                requests so the updated AI restrictions apply. Requests already
                sent to a provider cannot be recalled.
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
                {link("learners", "Users")}.
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
                Administrator and learner passwords need at least three
                characters, including for phone and HTTPS access. No uppercase
                or symbol rules apply. Invalid input stays on the form so you
                can correct it.
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
                  Open {link("settings", "Settings")} → <strong>Models</strong>{" "}
                  and choose <strong>Add new AI connection</strong>. Select
                  Ollama, vLLM, or your API type. Enter the server URL, exact
                  model name, and an API key if required, then save. Saving does
                  not activate it.
                </li>
                <li>
                  For cloud AI, enable cloud processing in{" "}
                  <strong>Data & privacy</strong>. Set the age groups who use
                  this app there too. These choices apply to all connections.
                </li>
                <li>
                  On the saved connection, choose <strong>Test tutor</strong>{" "}
                  and, if needed, <strong>Test photo reader</strong>. Tests send
                  sample material, not learner work; API providers may charge.
                  The tutor test makes two sample calls; the photo test makes
                  one.
                </li>
                <li>
                  Approve where learner work will be processed, then choose{" "}
                  <strong>Use as tutor</strong> or{" "}
                  <strong>Use as photo reader</strong> on that connection.{" "}
                  <strong>Current models</strong> shows the saved choices. Then
                  open {link("learners", "Users")} and create a learner account.
                  That learner signs in separately to practice.
                </li>
              </ol>
              <p>
                Saving or passing a test does not activate a connection. Each
                card shows its test status and active roles; a missing
                permission or matching test must be resolved before activation.
                The demo cannot teach or read handwriting. The app does not
                install or download models.
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
                  the password in Users. Use the same app address on both
                  devices. Learner passwords cannot be reset from the sign-in
                  page.
                </p>
              </ContextHelp>
              <ContextHelp topic="An activity or photo is stuck">
                <p>
                  Check that the app server and its background worker are
                  running. If a submission was interrupted, choose Check saved
                  request without reloading; this keeps your draft or prepared
                  photo. Resolve interrupted request reopens saved work or
                  safely releases an unsaved request without sending it again.
                  For a saved response that failed, use its retry button. If a
                  provider test fails, check Settings and its server
                  configuration.
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
                  Contact the person running the app. For a native installation,
                  the operator runs <code>make admin</code> from the repository
                  root with the existing username. For Docker, stop the API and
                  worker, run the administrator reset in a temporary API
                  container, then start both services again. The reset signs out
                  administrator browsers and preserves learner accounts and
                  saved work. The first-time setup link cannot reset an existing
                  account.
                </p>
              </ContextHelp>
              <ContextHelp topic="Does my password work on my phone?">
                <p>
                  Administrator and learner passwords need at least three
                  characters on both this computer and your private HTTPS
                  address. Use the same app address on your phone and sign in
                  with your existing account.
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
                delete the learner and saved work in Users.
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
