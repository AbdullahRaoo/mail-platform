"use client";

import React from "react";
import { Sidebar } from "@/components/mail/sidebar";
import { MailList } from "@/components/mail/mail-list";
import { MailViewer } from "@/components/mail/mail-viewer";
import { Composer } from "@/components/mail/composer";
import { SearchBar } from "@/components/mail/search-bar";
import { useMail } from "@/context/mail-context";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export function MailApp() {
  const { selectedEmail } = useMail();
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Mail list panel */}
      <div className="w-[360px] shrink-0 border-r border-border flex flex-col h-full max-lg:hidden">
        <SearchBar />
        <div className="flex-1 overflow-y-auto">
          <MailList />
        </div>
      </div>

      {/* Mobile: show either list or viewer */}
      <div className="flex-1 flex flex-col h-full lg:hidden">
        {selectedEmail ? (
          <MailViewer />
        ) : (
          <>
            <SearchBar />
            <div className="flex-1 overflow-y-auto">
              <MailList />
            </div>
          </>
        )}
      </div>

      {/* Desktop: viewer always visible */}
      <div className="flex-1 flex-col h-full hidden lg:flex">
        <MailViewer />
      </div>

      {/* Compose overlay */}
      <Composer />
    </div>
  );
}
