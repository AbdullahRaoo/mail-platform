"use client";

import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils";
import { useMail } from "@/context/mail-context";
import {
  Avatar,
  Button,
  Spinner,
  Tooltip,
  EmptyState,
} from "@/components/ui";
import {
  displayName,
  formatAddress,
  formatAddressList,
} from "@/lib/jmap/email";
import {
  setEmailFlagged,
  moveEmails,
  deleteEmails,
} from "@/lib/jmap/email";
import { format } from "date-fns";
import {
  ArrowLeft,
  Reply,
  ReplyAll,
  Forward,
  Star,
  Trash2,
  Archive,
  MailOpen,
  Paperclip,
  Download,
  ExternalLink,
} from "lucide-react";
import { jmapClient } from "@/lib/jmap/client";

export function MailViewer() {
  const {
    selectedEmail: email,
    selectedEmailLoading,
    clearSelectedEmail,
    setIsComposing,
    setReplyTo,
    mailboxes,
    loadEmails,
    activeMailboxId,
  } = useMail();

  const htmlContent = useMemo(() => {
    if (!email) return "";
    // Prefer HTML body, fall back to text body
    const htmlParts = email.htmlBody || [];
    const textParts = email.textBody || [];

    for (const part of htmlParts) {
      if (!part.partId) continue;
      const value = email.bodyValues?.[part.partId];
      if (value?.value) {
        return DOMPurify.sanitize(value.value, {
          ALLOWED_TAGS: [
            "p", "br", "div", "span", "a", "img", "ul", "ol", "li",
            "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead",
            "tbody", "tr", "td", "th", "blockquote", "pre", "code",
            "b", "i", "u", "strong", "em", "hr", "sup", "sub",
          ],
          ALLOWED_ATTR: [
            "href", "src", "alt", "title", "style", "class", "target",
            "width", "height", "cellpadding", "cellspacing", "border",
            "align", "valign", "colspan", "rowspan",
          ],
          ALLOW_DATA_ATTR: false,
        });
      }
    }

    for (const part of textParts) {
      if (!part.partId) continue;
      const value = email.bodyValues?.[part.partId];
      if (value?.value) {
        // Convert plain text to basic HTML
        const escaped = value.value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br/>");
        return escaped;
      }
    }

    return "<p>No content available</p>";
  }, [email]);

  if (selectedEmailLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!email) {
    return (
      <EmptyState
        icon={<MailOpen className="h-12 w-12" />}
        title="Select an email"
        description="Choose a message from the list to read it."
      />
    );
  }

  const senderName = displayName(email.from?.[0]);
  const sentDate = email.sentAt || email.receivedAt;
  const formattedDate = sentDate
    ? format(new Date(sentDate), "MMM d, yyyy 'at' h:mm a")
    : "";

  const isFlagged = !!email.keywords?.["$flagged"];

  const handleReply = () => {
    setReplyTo(email);
    setIsComposing(true);
  };

  const handleDelete = async () => {
    // Find trash mailbox
    const trash = mailboxes.find((m) => m.role === "trash");
    if (trash) {
      await moveEmails([email.id], trash.id);
    } else {
      await deleteEmails([email.id]);
    }
    clearSelectedEmail();
    if (activeMailboxId) loadEmails(activeMailboxId);
  };

  const handleArchive = async () => {
    const archive = mailboxes.find((m) => m.role === "archive");
    if (archive) {
      await moveEmails([email.id], archive.id);
      clearSelectedEmail();
      if (activeMailboxId) loadEmails(activeMailboxId);
    }
  };

  const handleToggleFlag = async () => {
    await setEmailFlagged([email.id], !isFlagged);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={clearSelectedEmail}
          className="lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Tooltip content="Reply">
          <Button variant="ghost" size="icon" onClick={handleReply}>
            <Reply className="h-4 w-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Reply All">
          <Button variant="ghost" size="icon" onClick={handleReply}>
            <ReplyAll className="h-4 w-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Forward">
          <Button variant="ghost" size="icon" onClick={handleReply}>
            <Forward className="h-4 w-4" />
          </Button>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1" />

        <Tooltip content="Archive">
          <Button variant="ghost" size="icon" onClick={handleArchive}>
            <Archive className="h-4 w-4" />
          </Button>
        </Tooltip>
        <Tooltip content={isFlagged ? "Unflag" : "Flag"}>
          <Button variant="ghost" size="icon" onClick={handleToggleFlag}>
            <Star
              className={cn(
                "h-4 w-4",
                isFlagged && "text-amber-500 fill-amber-500"
              )}
            />
          </Button>
        </Tooltip>
        <Tooltip content="Delete">
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </Tooltip>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto">
        {/* Subject */}
        <div className="px-6 pt-5 pb-3">
          <h1 className="text-xl font-semibold text-foreground">
            {email.subject || "(No subject)"}
          </h1>
        </div>

        {/* Sender info */}
        <div className="px-6 pb-4 flex items-start gap-3">
          <Avatar
            name={senderName}
            email={email.from?.[0]?.email}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{senderName}</span>
              <span className="text-xs text-muted-foreground">
                {email.from?.[0]?.email &&
                  `<${email.from[0].email}>`}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              To: {formatAddressList(email.to)}
              {email.cc?.length
                ? ` | Cc: ${formatAddressList(email.cc)}`
                : ""}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formattedDate}
            </div>
          </div>
        </div>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Paperclip className="h-3 w-3" />
              {email.attachments.length} attachment
              {email.attachments.length > 1 ? "s" : ""}
            </div>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((att, i) => (
                <a
                  key={i}
                  href={
                    att.blobId
                      ? jmapClient.getDownloadUrl(att.blobId, att.name || "attachment", att.type || "application/octet-stream")
                      : "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-accent transition-colors text-sm"
                >
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[200px]">
                    {att.name || "Unnamed"}
                  </span>
                  {att.size != null && (
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(att.size)})
                    </span>
                  )}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-6 pb-8">
          <div
            className="email-html-content prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
}
