// ============================================
// JMAP Mailbox Operations
// ============================================

import React from "react";
import { jmapClient } from "./client";
import type { Mailbox } from "./types";
import {
  Inbox,
  Send,
  FileEdit,
  Trash2,
  ShieldAlert,
  Archive,
  Star,
  Folder,
} from "lucide-react";

export async function getMailboxes(): Promise<Mailbox[]> {
  const accountId = jmapClient.getAccountId();

  const response = await jmapClient.request([
    [
      "Mailbox/get",
      {
        accountId,
        properties: [
          "id",
          "name",
          "parentId",
          "role",
          "sortOrder",
          "totalEmails",
          "unreadEmails",
          "totalThreads",
          "unreadThreads",
          "myRights",
          "isSubscribed",
        ],
      },
      "getMailboxes",
    ],
  ]);

  const [, result] = response.methodResponses[0];
  return (result as { list: Mailbox[] }).list;
}

export async function createMailbox(
  name: string,
  parentId?: string
): Promise<string> {
  const accountId = jmapClient.getAccountId();

  const response = await jmapClient.request([
    [
      "Mailbox/set",
      {
        accountId,
        create: {
          newMailbox: {
            name,
            parentId: parentId || null,
          },
        },
      },
      "createMailbox",
    ],
  ]);

  const [, result] = response.methodResponses[0];
  const created = (result as { created: Record<string, { id: string }> }).created;
  if (created?.newMailbox) {
    return created.newMailbox.id;
  }
  throw new Error("Failed to create mailbox");
}

export async function renameMailbox(
  mailboxId: string,
  newName: string
): Promise<void> {
  const accountId = jmapClient.getAccountId();

  await jmapClient.request([
    [
      "Mailbox/set",
      {
        accountId,
        update: {
          [mailboxId]: {
            name: newName,
          },
        },
      },
      "renameMailbox",
    ],
  ]);
}

export async function deleteMailbox(mailboxId: string): Promise<void> {
  const accountId = jmapClient.getAccountId();

  await jmapClient.request([
    [
      "Mailbox/set",
      {
        accountId,
        destroy: [mailboxId],
      },
      "deleteMailbox",
    ],
  ]);
}

export function getMailboxIcon(mailbox: Mailbox): React.ComponentType<{ className?: string }> {
  switch (mailbox.role) {
    case "inbox":
      return Inbox;
    case "sent":
      return Send;
    case "drafts":
      return FileEdit;
    case "trash":
      return Trash2;
    case "junk":
      return ShieldAlert;
    case "archive":
      return Archive;
    case "important":
      return Star;
    default:
      return Folder;
  }
}

export function sortMailboxes(mailboxes: Mailbox[]): Mailbox[] {
  const roleOrder: Record<string, number> = {
    inbox: 0,
    drafts: 1,
    sent: 2,
    archive: 3,
    junk: 4,
    trash: 5,
  };

  return [...mailboxes].sort((a, b) => {
    const aOrder = a.role ? (roleOrder[a.role] ?? 99) : 100 + a.sortOrder;
    const bOrder = b.role ? (roleOrder[b.role] ?? 99) : 100 + b.sortOrder;
    return aOrder - bOrder;
  });
}
