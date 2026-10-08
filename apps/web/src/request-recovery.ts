import type { Schema } from "./client";

export type RecoverableRequestKind =
  Schema<"TutorRequestReceiptPublic">["kind"];
export type PendingRequestIdentity = {
  key: string;
  kind: RecoverableRequestKind;
  owner: string;
};

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const storageKey = (owner: string) => `shepherd:tutor-request:${owner}`;

/** Store identifiers only: never draft text, photos, authentication or providers. */
export function rememberRequest(identity: PendingRequestIdentity) {
  try {
    window.sessionStorage.setItem(
      storageKey(identity.owner),
      JSON.stringify(identity),
    );
  } catch {
    throw new Error(
      "This browser cannot retain a safe request receipt. Enable session storage before sending; your draft has not been sent.",
    );
  }
}

export function readRememberedRequest(
  owner: string,
): PendingRequestIdentity | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(owner));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      value &&
      typeof value === "object" &&
      "owner" in value &&
      value.owner === owner &&
      "key" in value &&
      typeof value.key === "string" &&
      uuid.test(value.key) &&
      "kind" in value &&
      ["session", "activity", "submission"].includes(String(value.kind))
    )
      return {
        key: value.key,
        kind: value.kind as RecoverableRequestKind,
        owner,
      };
  } catch {
    // An unavailable browser store cannot contain a recoverable receipt here.
  }
  return null;
}

export function forgetRequest(identity: PendingRequestIdentity) {
  const current = readRememberedRequest(identity.owner);
  if (current?.key !== identity.key) return;
  try {
    window.sessionStorage.removeItem(storageKey(identity.owner));
  } catch {
    // A remaining identity is safe to resolve again; it contains no submission.
  }
}
