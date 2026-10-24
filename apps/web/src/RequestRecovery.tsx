import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type Schema } from "./client";
import type { PendingRequestIdentity } from "./request-recovery";

export function RequestRecovery({
  identity,
  offline,
  autoCheck = false,
  act,
  onAccepted,
  onNotAccepted,
  onBusyChange,
}: {
  identity: PendingRequestIdentity;
  offline: boolean;
  autoCheck?: boolean;
  act: (action: () => Promise<void>) => Promise<void>;
  onAccepted: (receipt: Schema<"TutorRequestReceiptPublic">) => Promise<void>;
  onNotAccepted: () => Promise<void> | void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(
    "Check whether the server saved this request, or resolve it before continuing. These actions do not resend your work.",
  );
  const checking = useRef(false);
  const checkedOnMount = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onBusyChange(false);
    };
  }, [onBusyChange]);
  const recover = useCallback(
    async (resolve = false) => {
      if (checking.current) return;
      checking.current = true;
      setBusy(true);
      onBusyChange(true);
      let found = false;
      try {
        let receipt: Schema<"TutorRequestReceiptPublic">;
        if (resolve) {
          const result = await api<Schema<"TutorRequestResolutionPublic">>(
            `/tutor/request-receipts/${identity.key}/resolve`,
            "POST",
            { learner_id: identity.owner },
          );
          if (!mounted.current) return;
          if (result.status === "not_accepted") {
            await onNotAccepted();
            return;
          }
          if (!result.receipt)
            throw new Error("Missing saved request receipt.");
          receipt = result.receipt;
        } else {
          receipt = await api<Schema<"TutorRequestReceiptPublic">>(
            `/tutor/request-receipts/${identity.key}?learner_id=${identity.owner}`,
          );
        }
        if (!mounted.current) return;
        if (receipt.kind !== identity.kind)
          throw new Error(
            "The saved request does not match this interrupted request.",
          );
        found = true;
        await onAccepted(receipt);
      } catch (cause) {
        if (!mounted.current) throw cause;
        setNotice(
          found
            ? "Your request was saved, but its current state could not be refreshed. Choose Check saved request to try again."
            : cause instanceof ApiError && cause.status === 404
              ? "The server has not confirmed whether your request was saved. Choose Check saved request to try again, or Resolve interrupted request to reopen saved work or safely clear the request. Keep this tab open to retain your draft."
              : "Your interrupted request could not be checked. Reconnect and choose Check saved request before continuing.",
        );
        if (!(cause instanceof ApiError && cause.status === 404)) throw cause;
      } finally {
        checking.current = false;
        if (mounted.current) {
          setBusy(false);
          onBusyChange(false);
        }
      }
    },
    [
      identity.key,
      identity.kind,
      identity.owner,
      onAccepted,
      onNotAccepted,
      onBusyChange,
    ],
  );
  useEffect(() => {
    if (autoCheck && !offline && !checkedOnMount.current) {
      checkedOnMount.current = true;
      void act(() => recover());
    }
  }, [act, autoCheck, offline, recover]);
  return (
    <div role="status" className="notice">
      <p>{busy ? "Checking your saved request…" : notice}</p>
      <div className="actions">
        <button
          disabled={offline || busy}
          onClick={() => void act(() => recover())}
        >
          Check saved request
        </button>
        <button
          disabled={offline || busy}
          onClick={() => void act(() => recover(true))}
        >
          Resolve interrupted request
        </button>
      </div>
    </div>
  );
}
