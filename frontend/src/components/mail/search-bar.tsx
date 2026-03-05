"use client";

import React, { useState, useCallback } from "react";
import { useMail } from "@/context/mail-context";
import { Input, Button } from "@/components/ui";
import { Search, X, RefreshCw } from "lucide-react";

export function SearchBar() {
  const { searchQuery, setSearchQuery, activeMailboxId, loadEmails } =
    useMail();
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearchQuery(localQuery);
      if (activeMailboxId) loadEmails(activeMailboxId);
    },
    [localQuery, setSearchQuery, activeMailboxId, loadEmails]
  );

  const handleClear = useCallback(() => {
    setLocalQuery("");
    setSearchQuery("");
    if (activeMailboxId) loadEmails(activeMailboxId);
  }, [setSearchQuery, activeMailboxId, loadEmails]);

  const handleRefresh = useCallback(() => {
    if (activeMailboxId) loadEmails(activeMailboxId);
  }, [activeMailboxId, loadEmails]);

  return (
    <form
      onSubmit={handleSearch}
      className="flex items-center gap-2 px-4 py-2 border-b border-border"
    >
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Search emails..."
          className="pl-9 pr-8"
        />
        {localQuery && (
          <button
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button variant="ghost" size="icon" type="button" onClick={handleRefresh}>
        <RefreshCw className="h-4 w-4" />
      </Button>
    </form>
  );
}
