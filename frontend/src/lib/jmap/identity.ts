// ============================================
// JMAP Identity Operations
// ============================================

import { jmapClient } from "./client";
import type { Identity } from "./types";

// ─── Get All Identities ─────────────────────

export async function getIdentities(): Promise<Identity[]> {
  const accountId = jmapClient.getAccountId();

  const response = await jmapClient.request([
    [
      "Identity/get",
      { accountId, ids: null },
      "getIdentities",
    ],
  ]);

  const [, result] = response.methodResponses[0];
  return (result as { list: Identity[] }).list;
}

// ─── Get Primary Identity ───────────────────

export async function getPrimaryIdentity(): Promise<Identity | null> {
  const identities = await getIdentities();
  // Prefer the one that may be primary, or just pick the first one
  return identities[0] ?? null;
}

// ─── Update Identity ────────────────────────

export async function updateIdentity(
  identityId: string,
  changes: Partial<Pick<Identity, "name" | "htmlSignature" | "textSignature" | "replyTo" | "bcc">>
): Promise<void> {
  const accountId = jmapClient.getAccountId();

  await jmapClient.request([
    [
      "Identity/set",
      {
        accountId,
        update: {
          [identityId]: changes,
        },
      },
      "updateIdentity",
    ],
  ]);
}
