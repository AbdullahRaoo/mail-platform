"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { Mailbox, EmailListItem, Email } from "@/lib/jmap/types";
import { getMailboxes, sortMailboxes } from "@/lib/jmap/mailbox";
import { getEmails, getEmail, setEmailRead } from "@/lib/jmap/email";
import { useAuth } from "./auth-context";

interface MailContextType {
  // Mailboxes
  mailboxes: Mailbox[];
  activeMailboxId: string | null;
  setActiveMailboxId: (id: string) => void;
  refreshMailboxes: () => Promise<void>;

  // Email list
  emails: EmailListItem[];
  totalEmails: number;
  emailsLoading: boolean;
  loadEmails: (mailboxId: string, page?: number) => Promise<void>;

  // Selected email
  selectedEmail: Email | null;
  selectedEmailLoading: boolean;
  selectEmail: (emailId: string) => Promise<void>;
  clearSelectedEmail: () => void;

  // Compose
  isComposing: boolean;
  setIsComposing: (val: boolean) => void;
  replyTo: Email | null;
  setReplyTo: (email: Email | null) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const MailContext = createContext<MailContextType | null>(null);

export function MailProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [activeMailboxId, setActiveMailboxId] = useState<string | null>(null);

  const [emails, setEmails] = useState<EmailListItem[]>([]);
  const [totalEmails, setTotalEmails] = useState(0);
  const [emailsLoading, setEmailsLoading] = useState(false);

  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedEmailLoading, setSelectedEmailLoading] = useState(false);

  const [isComposing, setIsComposing] = useState(false);
  const [replyTo, setReplyTo] = useState<Email | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  // Load mailboxes when authenticated
  const refreshMailboxes = useCallback(async () => {
    try {
      const boxes = await getMailboxes();
      const sorted = sortMailboxes(boxes);
      setMailboxes(sorted);
      // Auto-select inbox
      if (!activeMailboxId) {
        const inbox = sorted.find(
          (m) => m.role === "inbox" || m.name.toLowerCase() === "inbox"
        );
        if (inbox) setActiveMailboxId(inbox.id);
      }
    } catch (err) {
      console.error("Failed to fetch mailboxes:", err);
    }
  }, [activeMailboxId]);

  useEffect(() => {
    if (user) {
      refreshMailboxes();
    }
  }, [user, refreshMailboxes]);

  // Load emails when active mailbox changes
  const loadEmails = useCallback(
    async (mailboxId: string, page: number = 0) => {
      setEmailsLoading(true);
      try {
        const filter = searchQuery
          ? { inMailbox: mailboxId, text: searchQuery }
          : { inMailbox: mailboxId };
        const { emails: list, total } = await getEmails(
          filter,
          [{ property: "receivedAt", isAscending: false }],
          page * 50,
          50
        );
        setEmails(list);
        setTotalEmails(total);
      } catch (err) {
        console.error("Failed to fetch emails:", err);
      } finally {
        setEmailsLoading(false);
      }
    },
    [searchQuery]
  );

  useEffect(() => {
    if (activeMailboxId) {
      loadEmails(activeMailboxId);
    }
  }, [activeMailboxId, loadEmails]);

  // Select and view an email
  const selectEmail = useCallback(async (emailId: string) => {
    setSelectedEmailLoading(true);
    try {
      const email = await getEmail(emailId);
      setSelectedEmail(email);
      // Mark as read
      if (!email.keywords?.["$seen"]) {
        await setEmailRead([emailId], true);
        // Update the list item
        setEmails((prev) =>
          prev.map((e) => (e.id === emailId ? { ...e, isRead: true } : e))
        );
      }
    } catch (err) {
      console.error("Failed to fetch email:", err);
    } finally {
      setSelectedEmailLoading(false);
    }
  }, []);

  const clearSelectedEmail = useCallback(() => {
    setSelectedEmail(null);
  }, []);

  return (
    <MailContext.Provider
      value={{
        mailboxes,
        activeMailboxId,
        setActiveMailboxId,
        refreshMailboxes,
        emails,
        totalEmails,
        emailsLoading,
        loadEmails,
        selectedEmail,
        selectedEmailLoading,
        selectEmail,
        clearSelectedEmail,
        isComposing,
        setIsComposing,
        replyTo,
        setReplyTo,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </MailContext.Provider>
  );
}

export function useMail(): MailContextType {
  const ctx = useContext(MailContext);
  if (!ctx) throw new Error("useMail must be used within MailProvider");
  return ctx;
}
