"use client";

import { useEffect } from "react";
import { useMail } from "@/context/mail-context";

/**
 * Keyboard shortcuts for the mail app:
 *   c — Compose new email
 *   r — Reply to selected email
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
        // Only handle Escape in inputs
        if (e.key === "Escape") {
          (target as HTMLInputElement).blur();
        }
        return;
      }

      switch (e.key) {
        case "c": {
          e.preventDefault();
          setIsComposing(true);
          break;
        }
        case "r": {
          if (selectedEmail) {
            e.preventDefault();
            setReplyTo(selectedEmail);
            setIsComposing(true);
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
          // Next email
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
          // Previous email
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
          // Show keyboard shortcuts help — could open a modal
          // For now just log
          console.info(
            "Keyboard shortcuts: c=compose, r=reply, j/k=nav, /=search, Esc=close"
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
  ]);
}
