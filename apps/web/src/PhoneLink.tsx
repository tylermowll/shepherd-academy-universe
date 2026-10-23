import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, newKey, type Schema } from "./client";
import { ContextHelp } from "./Help";

type Props = {
  problem: string;
  version: number;
  disabled: boolean;
  act: (action: () => Promise<void>) => Promise<void>;
  onHelp?: () => void;
};

export function PhoneLink({ problem, version, disabled, act, onHelp }: Props) {
  const [link, setLink] = useState<Schema<"PhoneUploadLink"> | null>(null);
  const [pending, setPending] = useState<"create" | "cancel" | null>(null);
  const busy = pending !== null;
  const [expired, setExpired] = useState(false);
  const requestKey = useRef<string | null>(null);
  const actionPending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!link) return;
    const timer = window.setTimeout(
      () => setExpired(true),
      Math.max(0, Date.parse(link.expires_at) - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [link]);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(
    window.location.hostname,
  );
  return (
    <section className="phone-link" aria-label="Phone photograph">
      <ContextHelp topic="How do I use my phone?">
        <p>
          Choose “Take photo with phone” and scan the QR code with your phone
          camera. You can send one photo without signing in.
        </p>
        <p>
          For a full practice session on your phone, sign in with your learner
          username and password.
        </p>
        {loopback && (
          <p>
            This address only works on this computer. Open the app at its shared
            HTTPS address before creating a phone link.
          </p>
        )}
        {onHelp && <button onClick={onHelp}>Phone setup help</button>}
      </ContextHelp>
      <button
        disabled={disabled || busy}
        onClick={() =>
          void act(async () => {
            if (actionPending.current) return;
            actionPending.current = true;
            setPending("create");
            requestKey.current ??= newKey();
            try {
              const created = await api<Schema<"PhoneUploadLink">>(
                `/problems/${problem}/phone-uploads`,
                "POST",
                { version },
                requestKey.current,
              );
              requestKey.current = null;
              if (mounted.current) {
                setLink(created);
                setExpired(false);
              }
            } catch (cause) {
              if (
                cause instanceof ApiError &&
                cause.status < 500 &&
                cause.status !== 408
              )
                requestKey.current = null;
              throw cause;
            } finally {
              actionPending.current = false;
              if (mounted.current) setPending(null);
            }
          })
        }
      >
        {pending === "create"
          ? "Preparing photo link…"
          : link
            ? "New QR code"
            : "Take photo with phone"}
      </button>
      {pending && (
        <p role="status">
          {pending === "create"
            ? "Preparing your phone photo link…"
            : "Canceling your phone photo link…"}
        </p>
      )}
      {link && !disabled && !expired && (
        <div className="phone-link-details">
          <h4>Scan with your phone camera</h4>
          <QRCodeSVG
            value={link.url}
            size={256}
            marginSize={4}
            level="M"
            title="Scan to photograph your work"
          />
          <p>
            Open the link, take a photo, and send it. Its reading and feedback
            will appear with this activity.
          </p>
          <p className="fine">
            One photo; available for two hours, until{" "}
            {new Date(link.expires_at).toLocaleTimeString()}. Anyone with this
            link can send that photo. Keep it private. If you close the phone
            tab, scan this QR again or choose New QR code.
          </p>
          {loopback && (
            <p className="notice">
              Your phone cannot reach this computer-only address. Open the app
              at its shared HTTPS address first.
              {onHelp && (
                <>
                  {" "}
                  <button onClick={onHelp}>Set up phone access</button>
                </>
              )}
            </p>
          )}
          <div className="actions">
            <a href={link.url} target="_blank" rel="noreferrer">
              Open photo page
            </a>
            <button
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  if (actionPending.current) return;
                  actionPending.current = true;
                  setPending("cancel");
                  try {
                    await api(`/phone-uploads/${link.id}`, "DELETE");
                    if (mounted.current)
                      setLink((current) =>
                        current?.id === link.id ? null : current,
                      );
                  } finally {
                    actionPending.current = false;
                    if (mounted.current) setPending(null);
                  }
                })
              }
            >
              {pending === "cancel"
                ? "Canceling phone link…"
                : "Cancel phone link"}
            </button>
          </div>
        </div>
      )}
      {link && expired && !disabled && (
        <p role="status">
          The phone link expired. Create a new link to take your photo.
        </p>
      )}
    </section>
  );
}
