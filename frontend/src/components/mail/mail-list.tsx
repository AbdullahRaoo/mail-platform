"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useMail } from "@/context/mail-context";
import { Avatar, Badge, Spinner, EmptyState, Button } from "@/components/ui";
import { displayName } from "@/lib/jmap/email";
import { formatDistanceToNow } from "date-fns";
import {
  Mail,
  Star,
  Paperclip,
} from "lucide-react";

export function MailList() {
  const {
    emails,
    emailsLoading,
    selectedEmail,
    selectEmail,
    activeMailboxId,
    hasMoreEmails,
    loadMoreEmails,
    totalEmails,
  } = useMail();

  if (emailsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!emails.length) {
    return (
      <EmptyState
        icon={<Mail className="h-12 w-12" />}
        title="No messages"
        description="This folder is empty."
      />
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {emails.map((email) => {
        const isSelected = selectedEmail?.id === email.id;
        const senderName = displayName(email.from?.[0]);
        const timeAgo = email.receivedAt
          ? formatDistanceToNow(new Date(email.receivedAt), {
              addSuffix: false,
            })
          : "";

        return (
          <button
            key={email.id}
            className={cn(
              "w-full text-left px-4 py-3 border-b border-border transition-colors cursor-pointer",
              isSelected
                ? "bg-primary/5 border-l-2 border-l-primary"
                : "hover:bg-accent/50",
              !email.isRead && "bg-accent/30"
            )}
            onClick={() => selectEmail(email.id)}
          >
            <div className="flex items-start gap-3">
              <Avatar
                name={senderName}
                email={email.from?.[0]?.email}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm truncate",
                      !email.isRead ? "font-semibold" : "font-normal"
                    )}
                  >
                    {senderName}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap shrink-0">
                    {timeAgo}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={cn(
                      "text-sm truncate",
                      !email.isRead
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {email.subject}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {email.preview}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {email.isFlagged && (
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    )}
                    {email.hasAttachment && (
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </button>
        );
      })}

      {/* Load more */}
      {hasMoreEmails && (
        <div className="flex items-center justify-center py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMoreEmails}
            disabled={emailsLoading}
          >
            {emailsLoading ? (
              <Spinner className="h-4 w-4" />
            ) : (
              `Load more (${emails.length} of ${totalEmails})`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
