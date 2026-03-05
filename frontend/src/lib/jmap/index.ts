// ============================================
// JMAP Barrel Export
// ============================================

export { jmapClient, JMAPError, AuthError } from "./client";
export type {
  JMAPSession,
  Mailbox,
  Email,
  EmailAddress,
  EmailBodyPart,
  EmailBodyValue,
  EmailListItem,
  ComposeEmail,
  EmailFilterCondition,
  EmailSort,
  Identity,
  Thread,
} from "./types";

export {
  getMailboxes,
  createMailbox,
  renameMailbox,
  deleteMailbox,
  getMailboxIcon,
  sortMailboxes,
} from "./mailbox";

export {
  getEmails,
  getEmail,
  setEmailRead,
  setEmailFlagged,
  moveEmails,
  deleteEmails,
  sendEmail,
  searchEmails,
  formatAddress,
  formatAddressList,
  displayName,
} from "./email";

export {
  getIdentities,
  getPrimaryIdentity,
  updateIdentity,
} from "./identity";
