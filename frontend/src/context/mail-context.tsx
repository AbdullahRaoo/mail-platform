"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { Mailbox, EmailListItem, Email } from "@/lib/jmap/types";
import { getMailboxes, sortMailboxes } from "@/lib/jmap/mailbox";
import { getEmails, getEmail, setEmailRead } from "@/lib/jmap/email";
import { jmapClient } from "@/lib/jmap/client";
import { useAuth } from "./auth-context";

export type ComposeMode = "new" | "reply" | "reply-all" | "forward";

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
  loadMoreEmails: () => Promise<void>;
  hasMoreEmails: boolean;

  // Selected email
  selectedEmail: Email | null;
  selectedEmailLoading: boolean;
  selectEmail: (emailId: string) => Promise<void>;
  clearSelectedEmail: () => void;

  // Compose
  isComposing: boolean;
  setIsComposing: (val: boolean) => void;
  composeMode: ComposeMode;
  setComposeMode: (mode: ComposeMode) => void;
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
  const [currentPage, setCurrentPage] = useState(0);

  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedEmailLoading, setSelectedEmailLoading] = useState(false);

  const [isComposing, setIsComposing] = useState(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>("new");
  const [replyTo, setReplyTo] = useState<Email | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  // EventSource ref for push notifications
  const eventSourceRef = useRef<EventSource | null>(null);

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
        if (page === 0) {
          setEmails(list);
        } else {
          setEmails((prev) => [...prev, ...list]);
        }
        setTotalEmails(total);
        setCurrentPage(page);
      } catch (err) {
        console.error("Failed to fetch emails:", err);
      } finally {
        setEmailsLoading(false);
      }
    },
    [searchQuery]
  );

  const loadMoreEmails = useCallback(async () => {
    if (!activeMailboxId || emailsLoading) return;
    await loadEmails(activeMailboxId, currentPage + 1);
  }, [activeMailboxId, currentPage, emailsLoading, loadEmails]);

  const hasMoreEmails = emails.length < totalEmails;

  useEffect(() => {
    if (activeMailboxId) {
      loadEmails(activeMailboxId);
    }
  }, [activeMailboxId, loadEmails]);

  // Subscribe to push notifications via EventSource
  useEffect(() => {
    if (!user || !jmapClient.isAuthenticated()) return;

    // Clean up previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = jmapClient.createEventSource(
      () => {
        // Server state changed — refresh mailboxes and current email list
        refreshMailboxes();
        if (activeMailboxId) {
          loadEmails(activeMailboxId);
        }
      },
      () => {
        // Error — EventSource will auto-reconnect
        console.warn("EventSource connection error — will auto-reconnect");
      }
    );

    eventSourceRef.current = es;

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user]); // Only reconnect when auth changes

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
        loadMoreEmails,
        hasMoreEmails,
        selectedEmail,
        selectedEmailLoading,
        selectEmail,
        clearSelectedEmail,
        isComposing,
        setIsComposing,
        composeMode,
        setComposeMode,
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
