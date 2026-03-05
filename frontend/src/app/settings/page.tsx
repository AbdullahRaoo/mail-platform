"use client";

import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button, Input, Spinner, Avatar } from "@/components/ui";
import { getIdentities, updateIdentity } from "@/lib/jmap/identity";
import type { Identity } from "@/lib/jmap/types";
import {
  ArrowLeft,
  Save,
  User,
  Shield,
  Mail,
  KeyRound,
  Palette,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/context/theme-context";
import { Sun, Moon, Monitor } from "lucide-react";

function ThemeSection() {
  const { theme, setTheme } = useTheme();

  const options: { value: "light" | "dark" | "system"; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
  ];

  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold">Appearance</h2>
      </div>
      <div className="flex gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
              theme === opt.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-accent text-muted-foreground"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function SettingsContent() {
  const { user, isLoading: authLoading } = useAuth();
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [htmlSignature, setHtmlSignature] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getIdentities()
      .then((ids) => {
        setIdentities(ids);
        if (ids.length > 0) {
          setDisplayName(ids[0].name || "");
          setHtmlSignature(ids[0].htmlSignature || "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    if (!identities.length) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateIdentity(identities[0].id, {
        name: displayName,
        htmlSignature,
      });
      setMessage("Settings saved successfully.");
    } catch (err) {
      console.error("Failed to save settings:", err);
      setMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">
          Please{" "}
          <Link href="/" className="text-primary hover:underline">
            sign in
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Profile section */}
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold">Profile</h2>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <Avatar name={user.name} email={user.email} size="lg" />
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
              <p className="text-xs text-muted-foreground">
                This name appears in the &quot;From&quot; field of emails you send.
              </p>
            </div>
          </div>
        </section>

        {/* Signature section */}
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold">Email Signature</h2>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">HTML Signature</label>
            <textarea
              value={htmlSignature}
              onChange={(e) => setHtmlSignature(e.target.value)}
              placeholder="<p>Best regards,<br/>Your Name</p>"
              rows={6}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            />
            <p className="text-xs text-muted-foreground">
              HTML is supported. This signature is appended to all outgoing emails.
            </p>
          </div>
        </section>

        {/* Appearance */}
        <ThemeSection />

        {/* Security info */}
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold">Security</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <KeyRound className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <div className="text-sm font-medium">Password</div>
                <div className="text-xs text-muted-foreground">
                  Password changes are managed by your administrator through the
                  Stalwart admin panel.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <div className="text-sm font-medium">
                  Encryption &amp; Authentication
                </div>
                <div className="text-xs text-muted-foreground">
                  All connections use TLS encryption. Emails are authenticated
                  using SPF, DKIM, and DMARC.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Save */}
        {message && (
          <div
            className={`text-sm px-4 py-3 rounded-lg ${
              message.includes("success")
                ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {message}
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <SettingsContent />
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
