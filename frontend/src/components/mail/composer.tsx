"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useMail } from "@/context/mail-context";
import type { ComposeMode } from "@/context/mail-context";
import { Button, Input, Spinner } from "@/components/ui";
import { sendEmail, displayName, formatAddressList } from "@/lib/jmap/email";
import { getPrimaryIdentity } from "@/lib/jmap/identity";
import type { EmailAddress, ComposeEmail, Identity } from "@/lib/jmap/types";
import { X, Minus, Send, Paperclip } from "lucide-react";
import { jmapClient } from "@/lib/jmap/client";

export function Composer() {
  const {
    isComposing,
    setIsComposing,
    composeMode,
    setComposeMode,
    replyTo,
    setReplyTo,
    activeMailboxId,
    loadEmails,
  } = useMail();

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [attachments, setAttachments] = useState<
    { blobId: string; name: string; type: string; size: number }[]
  >([]);

  // Load identity
  useEffect(() => {
    getPrimaryIdentity().then(setIdentity).catch(console.error);
  }, []);

  // Pre-fill based on compose mode
  useEffect(() => {
    if (!replyTo) return;

    if (composeMode === "reply") {
      // Reply: set To to original sender
      const sender = replyTo.from?.[0];
      if (sender) setTo(sender.email);
      setSubject(
        replyTo.subject?.startsWith("Re:")
          ? replyTo.subject
          : `Re: ${replyTo.subject || ""}`
      );
      const quotedText = `\n\n--- On ${replyTo.sentAt || replyTo.receivedAt}, ${displayName(sender)} wrote ---\n${replyTo.preview || ""}`;
      setBody(quotedText);
    } else if (composeMode === "reply-all") {
      // Reply All: set To to sender + all original To (except self), Cc to original Cc
      const sender = replyTo.from?.[0];
      const myEmail = identity?.email;
      const allTo = [
        ...(replyTo.from || []),
        ...(replyTo.to || []),
      ].filter((addr) => addr.email !== myEmail);
      setTo(allTo.map((a) => a.email).join(", "));
      const originalCc = (replyTo.cc || []).filter(
        (addr) => addr.email !== myEmail
      );
      if (originalCc.length > 0) {
        setCc(originalCc.map((a) => a.email).join(", "));
        setShowCcBcc(true);
      }
      setSubject(
        replyTo.subject?.startsWith("Re:")
          ? replyTo.subject
          : `Re: ${replyTo.subject || ""}`
      );
      const quotedText = `\n\n--- On ${replyTo.sentAt || replyTo.receivedAt}, ${displayName(sender)} wrote ---\n${replyTo.preview || ""}`;
      setBody(quotedText);
    } else if (composeMode === "forward") {
      // Forward: clear To, set subject Fwd:, include original message
      setTo("");
      setSubject(
        replyTo.subject?.startsWith("Fwd:")
          ? replyTo.subject
          : `Fwd: ${replyTo.subject || ""}`
      );
      const fwdHeader = [
        `---------- Forwarded message ----------`,
        `From: ${formatAddressList(replyTo.from)}`,
        `Date: ${replyTo.sentAt || replyTo.receivedAt}`,
        `Subject: ${replyTo.subject || ""}`,
        `To: ${formatAddressList(replyTo.to)}`,
        replyTo.cc?.length ? `Cc: ${formatAddressList(replyTo.cc)}` : "",
        "",
        replyTo.preview || "",
      ]
        .filter(Boolean)
        .join("\n");
      setBody(`\n\n${fwdHeader}`);
    }
  }, [replyTo, composeMode, identity]);

  const reset = useCallback(() => {
    setTo("");
    setCc("");
    setBcc("");
    setSubject("");
    setBody("");
    setShowCcBcc(false);
    setAttachments([]);
    setReplyTo(null);
    setComposeMode("new");
    setMinimized(false);
  }, [setReplyTo, setComposeMode]);

  const handleClose = () => {
    reset();
    setIsComposing(false);
  };

  const parseAddresses = (input: string): EmailAddress[] => {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((email) => ({ name: null, email }));
  };

  const handleSend = async () => {
    if (!to.trim() || !identity) return;
    setSending(true);
    try {
      const isReply = composeMode === "reply" || composeMode === "reply-all";
      const compose: ComposeEmail = {
        identityId: identity.id,
        to: parseAddresses(to),
        cc: parseAddresses(cc),
        bcc: parseAddresses(bcc),
        subject,
        textBody: body,
        inReplyTo: isReply ? (replyTo?.messageId?.[0] || null) : null,
        references: isReply ? (replyTo?.references || null) : null,
        attachments: attachments.length > 0 ? attachments : undefined,
      };
      await sendEmail(compose);
      handleClose();
      if (activeMailboxId) loadEmails(activeMailboxId);
    } catch (err) {
      console.error("Failed to send email:", err);
      alert("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const blob = await jmapClient.uploadBlob(file);
        setAttachments((prev) => [
          ...prev,
          {
            blobId: blob.blobId,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
          },
        ]);
      } catch (err) {
        console.error("Failed to upload attachment:", err);
      }
    }
    // Clear the input
    e.target.value = "";
  };

  if (!isComposing) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-0 right-6 z-50">
        <button
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-t-lg shadow-lg cursor-pointer hover:bg-primary/90 transition-colors"
          onClick={() => setMinimized(false)}
        >
          <Send className="h-4 w-4" />
          <span className="text-sm font-medium">
            {subject || "New Message"}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-6 z-50 w-[560px] max-w-[calc(100vw-2rem)] shadow-2xl rounded-t-xl border border-border bg-card flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted rounded-t-xl border-b border-border">
        <span className="text-sm font-medium">
          {composeMode === "reply"
            ? "Reply"
            : composeMode === "reply-all"
              ? "Reply All"
              : composeMode === "forward"
                ? "Forward"
                : "New Message"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMinimized(true)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Fields */}
      <div className="px-4 py-2 space-y-1 border-b border-border">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground w-8">To</label>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="border-0 focus-visible:ring-0 h-8 px-1"
          />
          {!showCcBcc && (
            <button
              className="text-xs text-primary hover:underline cursor-pointer whitespace-nowrap"
              onClick={() => setShowCcBcc(true)}
            >
              Cc/Bcc
            </button>
          )}
        </div>
        {showCcBcc && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground w-8">Cc</label>
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
                className="border-0 focus-visible:ring-0 h-8 px-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground w-8">Bcc</label>
              <Input
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="bcc@example.com"
                className="border-0 focus-visible:ring-0 h-8 px-1"
              />
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground w-8">Subj</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="border-0 focus-visible:ring-0 h-8 px-1"
          />
        </div>
      </div>

      {/* Body */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message..."
        className="flex-1 min-h-[200px] px-4 py-3 text-sm bg-transparent resize-none focus:outline-none"
      />

      {/* Attachments display */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-border flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs"
            >
              <Paperclip className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{att.name}</span>
              <button
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() =>
                  setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                }
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border">
        <Button onClick={handleSend} disabled={sending || !to.trim()}>
          {sending ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {sending ? "Sending..." : "Send"}
        </Button>
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleAttachment}
          />
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
            <Paperclip className="h-4 w-4" />
          </span>
        </label>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <Trash2Icon className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}

function Trash2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}
