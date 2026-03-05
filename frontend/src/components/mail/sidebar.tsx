"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useMail } from "@/context/mail-context";
import { getMailboxIcon } from "@/lib/jmap/mailbox";
import { Badge, Button, Tooltip } from "@/components/ui";
import {
  PenSquare,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Avatar } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

export function Sidebar() {
  const { user, logout } = useAuth();
  const {
    mailboxes,
    activeMailboxId,
    setActiveMailboxId,
    setIsComposing,
  } = useMail();

  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(
    {}
  );

  // Separate top-level from children
  const topLevel = mailboxes.filter((m) => !m.parentId);
  const childrenOf = (parentId: string) =>
    mailboxes.filter((m) => m.parentId === parentId);

  return (
    <aside className="w-64 h-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 flex items-center gap-2 border-b border-sidebar-border">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
          M
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">MagicQC Mail</div>
          <div className="text-xs text-muted-foreground truncate">
            {user?.email}
          </div>
        </div>
      </div>

      {/* Compose button */}
      <div className="p-3">
        <Button
          variant="primary"
          className="w-full"
          onClick={() => setIsComposing(true)}
        >
          <PenSquare className="h-4 w-4" />
          Compose
        </Button>
      </div>

      {/* Mailbox list */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {topLevel.map((mailbox) => {
          const Icon = getMailboxIcon(mailbox);
          const children = childrenOf(mailbox.id);
          const hasChildren = children.length > 0;
          const isExpanded = !collapsed[mailbox.id];
          const isActive = activeMailboxId === mailbox.id;

          return (
            <div key={mailbox.id}>
              <button
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-accent text-sidebar-foreground"
                )}
                onClick={() => setActiveMailboxId(mailbox.id)}
              >
                {hasChildren ? (
                  <button
                    className="p-0.5 -ml-1 hover:bg-accent rounded cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollapsed((prev) => ({
                        ...prev,
                        [mailbox.id]: !prev[mailbox.id],
                      }));
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                ) : null}
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-left">
                  {mailbox.name}
                </span>
                {mailbox.unreadEmails > 0 && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {mailbox.unreadEmails > 99
                      ? "99+"
                      : mailbox.unreadEmails}
                  </Badge>
                )}
              </button>

              {/* Child mailboxes */}
              {hasChildren && isExpanded && (
                <div className="ml-4">
                  {children.map((child) => {
                    const ChildIcon = getMailboxIcon(child);
                    const isChildActive = activeMailboxId === child.id;
                    return (
                      <button
                        key={child.id}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
                          isChildActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-accent text-sidebar-foreground"
                        )}
                        onClick={() => setActiveMailboxId(child.id)}
                      >
                        <ChildIcon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate text-left">
                          {child.name}
                        </span>
                        {child.unreadEmails > 0 && (
                          <Badge
                            variant="secondary"
                            className="ml-auto text-[10px]"
                          >
                            {child.unreadEmails > 99
                              ? "99+"
                              : child.unreadEmails}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border flex items-center gap-2">
        <Avatar
          name={user?.name || ""}
          email={user?.email}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{user?.name}</div>
        </div>
        <Tooltip content="Settings">
          <a
            href="/settings"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
          </a>
        </Tooltip>
        <ThemeToggle />
        <Tooltip content="Sign out">
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>
    </aside>
  );
}
