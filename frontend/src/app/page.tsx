"use client";

import { AuthProvider, useAuth } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-context";
import { MailProvider } from "@/context/mail-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { LoginPage } from "@/components/login-page";
import { MailApp } from "@/components/mail-app";
import { Spinner } from "@/components/ui";

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <MailProvider>
      <MailApp />
    </MailProvider>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
