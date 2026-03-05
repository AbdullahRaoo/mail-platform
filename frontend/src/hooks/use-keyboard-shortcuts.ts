"use client";

import { useEffect } from "react";
import { useMail } from "@/context/mail-context";
import { setEmailFlagged, setEmailRead, moveEmails, deleteEmails } from "@/lib/jmap/email";

/**
 * Keyboard shortcuts for the mail app:
 *   c — Compose new email
 *   r — Reply to selected email
 *   a — Reply all to selected email
 *   f — Forward selected email
 *   e — Archive selected email
 *   # — Delete selected email
 *   / — Focus search
 *   Escape — Close compose / deselect email
 *   j/k — Navigate email list (next/prev)
 *   u — Mark unread
 *   s — Toggle star/flag
 */
export function useKeyboardShortcuts() {
  const {
    emails,
    selectedEmail,
    selectEmail,
    clearSelectedEmail,
    setIsComposing,
    isComposing,
    setReplyTo,
    setComposeMode,
    mailboxes,
    activeMailboxId,
    loadEmails,
  } = useMail();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        if (e.key === "Escape") {
          (target as HTMLInputElement).blur();
        }
        return;
      }

      switch (e.key) {
        case "c": {
          e.preventDefault();
          setComposeMode("new");
          setIsComposing(true);
          break;
        }
        case "r": {
          if (selectedEmail) {
            e.preventDefault();
            setReplyTo(selectedEmail);
            setComposeMode("reply");
            setIsComposing(true);
          }
          break;
        }
        case "a": {
          if (selectedEmail) {
            e.preventDefault();
            setReplyTo(selectedEmail);
            setComposeMode("reply-all");
            setIsComposing(true);
          }
          break;
        }
        case "f": {
          if (selectedEmail) {
            e.preventDefault();
            setReplyTo(selectedEmail);
            setComposeMode("forward");
            setIsComposing(true);
          }
          break;
        }
        case "e": {
          if (selectedEmail) {
            e.preventDefault();
            const archive = mailboxes.find((m) => m.role === "archive");
            if (archive) {
              moveEmails([selectedEmail.id], archive.id).then(() => {
                clearSelectedEmail();
                if (activeMailboxId) loadEmails(activeMailboxId);
              });
            }
          }
          break;
        }
        case "#": {
          if (selectedEmail) {
            e.preventDefault();
            const trash = mailboxes.find((m) => m.role === "trash");
            const action = trash
              ? moveEmails([selectedEmail.id], trash.id)
              : deleteEmails([selectedEmail.id]);
            action.then(() => {
              clearSelectedEmail();
              if (activeMailboxId) loadEmails(activeMailboxId);
            });
          }
          break;
        }
        case "s": {
          if (selectedEmail) {
            e.preventDefault();
            const isFlagged = !!selectedEmail.keywords?.["$flagged"];
            setEmailFlagged([selectedEmail.id], !isFlagged);
          }
          break;
        }
        case "u": {
          if (selectedEmail) {
            e.preventDefault();
            const isRead = !!selectedEmail.keywords?.["$seen"];
            setEmailRead([selectedEmail.id], !isRead);
          }
          break;
        }
        case "Escape": {
          if (isComposing) {
            setIsComposing(false);
          } else if (selectedEmail) {
            clearSelectedEmail();
          }
          break;
        }
        case "/": {
          e.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[placeholder="Search emails..."]'
          );
          searchInput?.focus();
          break;
        }
        case "j": {
          e.preventDefault();
          if (!emails.length) break;
          const currentIdx = selectedEmail
            ? emails.findIndex((em) => em.id === selectedEmail.id)
            : -1;
          const nextIdx = Math.min(currentIdx + 1, emails.length - 1);
          selectEmail(emails[nextIdx].id);
          break;
        }
        case "k": {
          e.preventDefault();
          if (!emails.length) break;
          const curIdx = selectedEmail
            ? emails.findIndex((em) => em.id === selectedEmail.id)
            : emails.length;
          const prevIdx = Math.max(curIdx - 1, 0);
          selectEmail(emails[prevIdx].id);
          break;
        }
        case "?": {
          console.info(
            "Keyboard shortcuts: c=compose, r=reply, a=reply-all, f=forward, e=archive, #=delete, s=star, u=unread, j/k=nav, /=search, Esc=close"
          );
          break;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    emails,
    selectedEmail,
    selectEmail,
    clearSelectedEmail,
    setIsComposing,
    isComposing,
    setReplyTo,
    setComposeMode,
    mailboxes,
    activeMailboxId,
    loadEmails,
  ]);
}
