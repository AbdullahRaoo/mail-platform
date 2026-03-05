// ============================================
// JMAP Email Operations
// ============================================

import { jmapClient } from "./client";
import type {
  Email,
  EmailListItem,
  EmailFilterCondition,
  EmailSort,
  ComposeEmail,
  EmailAddress,
} from "./types";

// ─── List Emails ──────────────────────────────

const EMAIL_LIST_PROPERTIES = [
  "id",
  "threadId",
  "from",
  "to",
  "subject",
  "preview",
  "receivedAt",
  "hasAttachment",
  "keywords",
  "mailboxIds",
];

export async function getEmails(
  filter: EmailFilterCondition,
  sort: EmailSort[] = [{ property: "receivedAt", isAscending: false }],
  position: number = 0,
  limit: number = 50
): Promise<{ emails: EmailListItem[]; total: number }> {
  const accountId = jmapClient.getAccountId();

  const response = await jmapClient.request([
    [
      "Email/query",
      {
        accountId,
        filter,
        sort,
        position,
        limit,
        collapseThreads: true,
      },
      "emailQuery",
    ],
    [
      "Email/get",
      {
        accountId,
        "#ids": {
          resultOf: "emailQuery",
          name: "Email/query",
          path: "/ids",
        },
        properties: EMAIL_LIST_PROPERTIES,
      },
      "emailGet",
    ],
  ]);

  const [, queryResult] = response.methodResponses[0];
  const [, getResult] = response.methodResponses[1];
  const total = (queryResult as { total: number }).total;
  const list = (getResult as { list: Email[] }).list;

  const emails: EmailListItem[] = list.map((email) => ({
    id: email.id,
    threadId: email.threadId,
    from: email.from,
    to: email.to,
    subject: email.subject || "(No subject)",
    preview: email.preview,
    receivedAt: email.receivedAt,
    hasAttachment: email.hasAttachment,
    isRead: !!email.keywords?.["$seen"],
    isFlagged: !!email.keywords?.["$flagged"],
    isDraft: !!email.keywords?.["$draft"],
    mailboxIds: email.mailboxIds,
  }));

  return { emails, total };
}

// ─── Get Single Email (Full) ─────────────────

export async function getEmail(emailId: string): Promise<Email> {
  const accountId = jmapClient.getAccountId();

  const response = await jmapClient.request([
    [
      "Email/get",
      {
        accountId,
        ids: [emailId],
        properties: [
          "id",
          "blobId",
          "threadId",
          "mailboxIds",
          "keywords",
          "size",
          "receivedAt",
          "messageId",
          "inReplyTo",
          "references",
          "sender",
          "from",
          "to",
          "cc",
          "bcc",
          "replyTo",
          "subject",
          "sentAt",
          "hasAttachment",
          "preview",
          "bodyStructure",
          "bodyValues",
          "textBody",
          "htmlBody",
          "attachments",
        ],
        fetchAllBodyValues: true,
      },
      "getEmail",
    ],
  ]);

  const [, result] = response.methodResponses[0];
  const list = (result as { list: Email[] }).list;
  if (!list.length) throw new Error("Email not found");
  return list[0];
}

// ─── Mark Read / Unread ──────────────────────

export async function setEmailRead(
  emailIds: string[],
  isRead: boolean
): Promise<void> {
  const accountId = jmapClient.getAccountId();
  const update: Record<string, Record<string, unknown>> = {};

  for (const id of emailIds) {
    update[id] = {
      [`keywords/$seen`]: isRead ? true : null,
    };
  }

  await jmapClient.request([
    ["Email/set", { accountId, update }, "markRead"],
  ]);
}

// ─── Flag / Unflag ───────────────────────────

export async function setEmailFlagged(
  emailIds: string[],
  isFlagged: boolean
): Promise<void> {
  const accountId = jmapClient.getAccountId();
  const update: Record<string, Record<string, unknown>> = {};

  for (const id of emailIds) {
    update[id] = {
      [`keywords/$flagged`]: isFlagged ? true : null,
    };
  }

  await jmapClient.request([
    ["Email/set", { accountId, update }, "flagEmail"],
  ]);
}

// ─── Move to Mailbox ─────────────────────────

export async function moveEmails(
  emailIds: string[],
  toMailboxId: string
): Promise<void> {
  const accountId = jmapClient.getAccountId();
  const update: Record<string, Record<string, unknown>> = {};

  for (const id of emailIds) {
    update[id] = {
      mailboxIds: { [toMailboxId]: true },
    };
  }

  await jmapClient.request([
    ["Email/set", { accountId, update }, "moveEmails"],
  ]);
}

// ─── Delete (Destroy) ────────────────────────

export async function deleteEmails(emailIds: string[]): Promise<void> {
  const accountId = jmapClient.getAccountId();

  await jmapClient.request([
    ["Email/set", { accountId, destroy: emailIds }, "deleteEmails"],
  ]);
}

// ─── Send Email ──────────────────────────────

export async function sendEmail(compose: ComposeEmail): Promise<string> {
  const accountId = jmapClient.getAccountId();

  // Step 1: Create the email as a draft
  // Use identity for 'from' — the server also validates this
  const emailBody: Record<string, unknown> = {
    to: compose.to,
    cc: compose.cc.length > 0 ? compose.cc : undefined,
    bcc: compose.bcc.length > 0 ? compose.bcc : undefined,
    subject: compose.subject,
    keywords: { $seen: true },
    bodyValues: {
      body: {
        value: compose.htmlBody || compose.textBody,
        isEncodingProblem: false,
        isTruncated: false,
      },
    },
    textBody: compose.htmlBody
      ? undefined
      : [{ partId: "body", type: "text/plain" }],
    htmlBody: compose.htmlBody
      ? [{ partId: "body", type: "text/html" }]
      : undefined,
  };

  if (compose.inReplyTo) {
    emailBody.inReplyTo = [compose.inReplyTo];
  }
  if (compose.references) {
    emailBody.references = compose.references;
  }

  // Step 2: Create email + submission in a single request
  // Stalwart auto-sets the From header from the identity and assigns
  // the draft to the correct mailbox when using EmailSubmission/set
  // with onSuccessUpdateEmail — so we omit mailboxIds intentionally.
  const response = await jmapClient.request([
    [
      "Email/set",
      {
        accountId,
        create: {
          draft: emailBody,
        },
      },
      "createDraft",
    ],
    [
      "EmailSubmission/set",
      {
        accountId,
        create: {
          sendIt: {
            identityId: compose.identityId,
            emailId: "#draft",
            envelope: undefined, // Let server compute
          },
        },
        onSuccessUpdateEmail: {
          "#sendIt": {
            "keywords/$draft": null,
          },
        },
      },
      "submitEmail",
    ],
  ]);

  const [, createResult] = response.methodResponses[0];
  const created = (createResult as { created?: Record<string, { id: string }> })
    .created;
  if (!created?.draft) {
    throw new Error("Failed to create email draft");
  }

  return created.draft.id;
}

// ─── Search Emails ───────────────────────────

export async function searchEmails(
  query: string,
  limit: number = 30
): Promise<EmailListItem[]> {
  const { emails } = await getEmails(
    { text: query },
    [{ property: "receivedAt", isAscending: false }],
    0,
    limit
  );
  return emails;
}

// ─── Helper: Format Address ──────────────────

export function formatAddress(addr: EmailAddress | null | undefined): string {
  if (!addr) return "";
  return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
}

export function formatAddressList(
  addrs: EmailAddress[] | null | undefined
): string {
  if (!addrs || !addrs.length) return "";
  return addrs.map(formatAddress).join(", ");
}

export function displayName(addr: EmailAddress | null | undefined): string {
  if (!addr) return "Unknown";
  return addr.name || addr.email;
}
