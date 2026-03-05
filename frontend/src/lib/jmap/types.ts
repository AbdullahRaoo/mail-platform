// ============================================
// JMAP Type Definitions (RFC 8620 / 8621)
// Typed for Stalwart Mail Server
// ============================================

// --- Core JMAP Types ---

export interface JMAPSession {
  capabilities: Record<string, unknown>;
  accounts: Record<string, JMAPAccount>;
  primaryAccounts: Record<string, string>;
  username: string;
  apiUrl: string;
  downloadUrl: string;
  uploadUrl: string;
  eventSourceUrl: string;
  state: string;
}

export interface JMAPAccount {
  name: string;
  isPersonal: boolean;
  isReadOnly: boolean;
  accountCapabilities: Record<string, unknown>;
}

export interface JMAPRequest {
  using: string[];
  methodCalls: JMAPMethodCall[];
}

export type JMAPMethodCall = [string, Record<string, unknown>, string];

export interface JMAPResponse {
  methodResponses: JMAPMethodResponse[];
  sessionState: string;
}

export type JMAPMethodResponse = [string, Record<string, unknown>, string];

// --- Mailbox (Folder) ---

export interface Mailbox {
  id: string;
  name: string;
  parentId: string | null;
  role: MailboxRole | null;
  sortOrder: number;
  totalEmails: number;
  unreadEmails: number;
  totalThreads: number;
  unreadThreads: number;
  myRights: MailboxRights;
  isSubscribed: boolean;
}

export type MailboxRole =
  | "inbox"
  | "drafts"
  | "sent"
  | "trash"
  | "junk"
  | "archive"
  | "important"
  | null;

export interface MailboxRights {
  mayReadItems: boolean;
  mayAddItems: boolean;
  mayRemoveItems: boolean;
  maySetSeen: boolean;
  maySetKeywords: boolean;
  mayCreateChild: boolean;
  mayRename: boolean;
  mayDelete: boolean;
  maySubmit: boolean;
}

// --- Email ---

export interface Email {
  id: string;
  blobId: string;
  threadId: string;
  mailboxIds: Record<string, boolean>;
  keywords: Record<string, boolean>;
  size: number;
  receivedAt: string;
  messageId: string[];
  inReplyTo: string[] | null;
  references: string[] | null;
  sender: EmailAddress[] | null;
  from: EmailAddress[] | null;
  to: EmailAddress[] | null;
  cc: EmailAddress[] | null;
  bcc: EmailAddress[] | null;
  replyTo: EmailAddress[] | null;
  subject: string;
  sentAt: string;
  hasAttachment: boolean;
  preview: string;
  bodyStructure: EmailBodyPart;
  bodyValues: Record<string, EmailBodyValue>;
  textBody: EmailBodyPart[];
  htmlBody: EmailBodyPart[];
  attachments: EmailBodyPart[];
}

export interface EmailAddress {
  name: string | null;
  email: string;
}

export interface EmailBodyPart {
  partId: string | null;
  blobId: string | null;
  size: number;
  name: string | null;
  type: string;
  charset: string | null;
  disposition: string | null;
  cid: string | null;
  subParts: EmailBodyPart[] | null;
}

export interface EmailBodyValue {
  value: string;
  isEncodingProblem: boolean;
  isTruncated: boolean;
}

// --- Email Submission ---

export interface EmailSubmission {
  id: string;
  identityId: string;
  emailId: string;
  threadId: string;
  envelope: Envelope | null;
  sendAt: string;
  undoStatus: "pending" | "final" | "canceled";
  deliveryStatus: Record<string, DeliveryStatus> | null;
}

export interface Envelope {
  mailFrom: EnvelopeAddress;
  rcptTo: EnvelopeAddress[];
}

export interface EnvelopeAddress {
  email: string;
  parameters: Record<string, string | null> | null;
}

export interface DeliveryStatus {
  smtpReply: string;
  delivered: "queued" | "yes" | "no" | "unknown";
  displayed: "yes" | "unknown";
}

// --- Identity ---

export interface Identity {
  id: string;
  name: string;
  email: string;
  replyTo: EmailAddress[] | null;
  bcc: EmailAddress[] | null;
  textSignature: string;
  htmlSignature: string;
  mayDelete: boolean;
}

// --- Thread ---

export interface Thread {
  id: string;
  emailIds: string[];
}

// --- Search / Filter ---

export interface EmailFilterCondition {
  inMailbox?: string;
  inMailboxOtherThan?: string[];
  before?: string;
  after?: string;
  minSize?: number;
  maxSize?: number;
  allInThreadHaveKeyword?: string;
  someInThreadHaveKeyword?: string;
  noneInThreadHaveKeyword?: string;
  hasKeyword?: string;
  notKeyword?: string;
  hasAttachment?: boolean;
  text?: string;
  from?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  header?: string[];
}

export interface EmailSort {
  property: string;
  isAscending?: boolean;
}

// --- Convenience / App-Level Types ---

export interface EmailListItem {
  id: string;
  threadId: string;
  from: EmailAddress[] | null;
  to: EmailAddress[] | null;
  subject: string;
  preview: string;
  receivedAt: string;
  hasAttachment: boolean;
  isRead: boolean;
  isFlagged: boolean;
  isDraft: boolean;
  mailboxIds: Record<string, boolean>;
}

export interface ComposeEmail {
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  subject: string;
  htmlBody?: string;
  textBody: string;
  inReplyTo?: string | null;
  references?: string[] | null;
  attachments?: { blobId: string; name: string; type: string; size: number }[];
  identityId?: string;
}
