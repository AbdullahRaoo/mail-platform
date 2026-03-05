// ============================================
// JMAP Client — Communicates with Stalwart
// Handles authentication, session, and API calls
// ============================================

import type {
  JMAPSession,
  JMAPRequest,
  JMAPResponse,
  JMAPMethodCall,
} from "./types";

const JMAP_CAPABILITIES = [
  "urn:ietf:params:jmap:core",
  "urn:ietf:params:jmap:mail",
  "urn:ietf:params:jmap:submission",
];

class JMAPClient {
  private baseUrl: string;
  private session: JMAPSession | null = null;
  private token: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ||
      (typeof window !== "undefined"
        ? window.location.origin
        : process.env.JMAP_INTERNAL_URL || "http://stalwart:8080");
  }

  // ─── Authentication ─────────────────────────

  async authenticate(
    username: string,
    password: string
  ): Promise<JMAPSession> {
    // Stalwart supports Basic auth for JMAP session
    this.token = btoa(`${username}:${password}`);

    const response = await fetch(`${this.baseUrl}/.well-known/jmap`, {
      headers: {
        Authorization: `Basic ${this.token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError("Invalid username or password");
      }
      throw new JMAPError(`Session fetch failed: ${response.status}`);
    }

    this.session = await response.json();
    return this.session!;
  }

  setToken(token: string) {
    this.token = token;
  }

  getSession(): JMAPSession | null {
    return this.session;
  }

  getAccountId(): string {
    if (!this.session) throw new JMAPError("Not authenticated");
    const primaryAccount =
      this.session.primaryAccounts["urn:ietf:params:jmap:mail"];
    if (!primaryAccount) throw new JMAPError("No mail account found");
    return primaryAccount;
  }

  isAuthenticated(): boolean {
    return this.session !== null && this.token !== null;
  }

  logout() {
    this.session = null;
    this.token = null;
  }

  // ─── Core API Call ──────────────────────────

  async request(methodCalls: JMAPMethodCall[]): Promise<JMAPResponse> {
    if (!this.session || !this.token) {
      throw new JMAPError("Not authenticated — call authenticate() first");
    }

    const body: JMAPRequest = {
      using: JMAP_CAPABILITIES,
      methodCalls,
    };

    const response = await fetch(this.session.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${this.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new AuthError("Session expired");
      }
      throw new JMAPError(`API call failed: ${response.status}`);
    }

    return response.json();
  }

  // ─── Blob Upload/Download ──────────────────

  getDownloadUrl(blobId: string, name: string, type: string): string {
    if (!this.session) throw new JMAPError("Not authenticated");
    return this.session.downloadUrl
      .replace("{accountId}", this.getAccountId())
      .replace("{blobId}", blobId)
      .replace("{name}", encodeURIComponent(name))
      .replace("{type}", encodeURIComponent(type));
  }

  async uploadBlob(data: Blob | File): Promise<{ blobId: string; size: number; type: string }> {
    if (!this.session || !this.token) {
      throw new JMAPError("Not authenticated");
    }

    const uploadUrl = this.session.uploadUrl.replace(
      "{accountId}",
      this.getAccountId()
    );

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.token}`,
        "Content-Type": data.type || "application/octet-stream",
      },
      body: data,
    });

    if (!response.ok) {
      throw new JMAPError(`Upload failed: ${response.status}`);
    }

    return response.json();
  }

  // ─── EventSource (Push Notifications) ──────

  createEventSource(
    onStateChange: (data: { changed: Record<string, Record<string, string>> }) => void,
    onError?: (error: Event) => void
  ): EventSource | null {
    if (!this.session || !this.token) return null;

    // EventSource doesn't support custom headers, so we pass the
    // auth token as a query parameter (Stalwart supports this).
    const separator = this.session.eventSourceUrl.includes("?") ? "&" : "?";
    const url = `${this.session.eventSourceUrl}${separator}types=*&closeafter=no&ping=30`;
    const es = new EventSource(url);

    es.addEventListener("state", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onStateChange(data);
      } catch {
        // Ignore parse errors
      }
    });

    if (onError) {
      es.onerror = onError;
    }

    return es;
  }
}

// ─── Error Classes ────────────────────────────

export class JMAPError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JMAPError";
  }
}

export class AuthError extends JMAPError {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// ─── Singleton Export ─────────────────────────

export const jmapClient = new JMAPClient(
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_JMAP_URL
    : process.env.JMAP_INTERNAL_URL
);

export default JMAPClient;
