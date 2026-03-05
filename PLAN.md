# MagicQC Enterprise Mail Platform — Master Plan

> **Project**: Self-hosted enterprise email platform for MagicQC employees  
> **Domain**: `mail.magicqc.online` (webmail + admin) / `magicqc.online` (email addresses)  
> **Date**: March 5, 2026  

---

## 0. Current VPS Inventory (READ FIRST)

Before anything else — here is exactly what's already running on the target server.

| Property | Value |
|----------|-------|
| **VPS IP** | `121.52.149.158` |
| **OS** | Ubuntu 24.04 LTS |
| **SSH** | Port `222`, user `nutechadmin` |
| **Hostname** | `nutechrobo` |
| **CPU** | **4 vCPUs** (Common KVM processor, QEMU/KVM virtualization) |
| **RAM** | **15 GB** |
| **Disk** | **554 GB** (~513 GB usable EFI partition on `/dev/sda3`) |
| **Network** | Virtio NIC (`ens18`) |
| **CPU Note** | Does NOT support `x86-64-v2` (reason MySQL 8 can't run — use MySQL 5.7) |
| **Firewall (UFW)** | Ports `222` (SSH), `80` (HTTP), `443` (HTTPS) — **everything else is blocked** |
| **Docker IPv6** | **Broken** — must force IPv4 for all network ops |
| **DNS Provider** | Cloudflare (for robionix.com; magicqc.online DNS managed at Namecheap or Cloudflare) |
| **Domain Registrars** | **robionix.com** → GoDaddy / **magicqc.online** → Namecheap |

### Existing Stack #1 — Robionix (WordPress)
| Detail | Value |
|--------|-------|
| Path | `/wp/robionix/` |
| Containers | `robionix_nginx` (:80/:443), `robionix_wordpress` (:8080), `robionix_mysql` (:3306), `robionix_certbot` |
| Ports claimed | **80 and 443 on the host** (Nginx handles SSL termination + serves WordPress) |
| SSL | Let's Encrypt via Certbot, auto-renew, expires April 6 2026 |

### Existing Stack #2 — MagicQC (Laravel + React/Vite)
| Detail | Value |
|--------|-------|
| Path | `/var/www/magicqc/` |
| Containers | `magicqc_nginx` (:8081), `magicqc_app` (PHP-FPM :9000), `magicqc_worker`, `magicqc_db` (MySQL :3306) |
| Ports claimed | **8081 on the host** — then reverse-proxied by the Robionix Nginx on :80/:443 |
| Note | MagicQC web traffic goes: Internet → Robionix Nginx (:443) → reverse proxy → MagicQC Nginx (:8081) |

### Critical Implication
The **Robionix Nginx container** (`robionix_nginx`) is the **master reverse proxy** that owns ports 80/443. Any new subdomain (like `mail.magicqc.online`) must be added as a new `server {}` block inside that Nginx config at `/wp/robionix/nginx/conf.d/`. Alternatively, we migrate to a dedicated host-level reverse proxy (Caddy or Nginx).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack Decision](#3-technology-stack-decision)
4. [Core Components Deep Dive](#4-core-components-deep-dive)
5. [DNS & Email Deliverability](#5-dns--email-deliverability)
6. [Security Architecture](#6-security-architecture)
7. [Anti-Spam & Anti-Phishing Strategy](#7-anti-spam--anti-phishing-strategy)
8. [Frontend UI/UX Design](#8-frontend-uiux-design)
9. [Deployment Architecture](#9-deployment-architecture)
10. [VPS Coexistence Strategy](#10-vps-coexistence-strategy)
11. [Backup & Disaster Recovery](#11-backup--disaster-recovery)
12. [Monitoring & Observability](#12-monitoring--observability)
13. [IP Reputation & Warm-up Plan](#13-ip-reputation--warm-up-plan)
14. [Implementation Roadmap](#14-implementation-roadmap)
15. [Hardware Requirements](#15-hardware-requirements)
16. [Cost Analysis](#16-cost-analysis)

---

## 1. Executive Summary

We are building a **self-hosted, enterprise-grade email platform** for MagicQC (`magicqc.online`) employees, deployed on the existing VPS (`121.52.149.158`) alongside the Robionix WordPress site and the MagicQC Laravel app. The platform will provide:

- **Professional email** — `employee@magicqc.online` addresses
- **Modern webmail** — Beautiful, fast, responsive web interface at `mail.magicqc.online`
- **Admin dashboard** — Domain/user/alias management
- **Calendar & Contacts** — Built-in collaboration (CalDAV/CardDAV)
- **Mobile support** — IMAP/SMTP for native clients + ActiveSync-like via JMAP
- **Enterprise security** — Encryption at rest, 2FA, fail2ban, TLS everywhere
- **Spam defense** — DKIM, SPF, DMARC, ARC, greylisting, Bayesian filtering, DNSBL
- **High deliverability** — Proper DNS, IP warm-up, reputation management

### ✅ VPS Resources — More Than Sufficient

The VPS has **15 GB RAM**, **4 vCPUs**, and **554 GB disk**. The existing stacks consume:
- Robionix: Nginx + WordPress + MySQL ≈ **400–600 MB**
- MagicQC: Nginx + PHP-FPM + Worker + MySQL ≈ **400–700 MB**
- **Total existing usage**: ~1–1.3 GB out of 15 GB

Adding Stalwart (~200–400 MB) + Next.js webmail (~150–250 MB) puts us at **~1.5–2 GB total**, leaving **~13 GB free**. We have massive headroom — no upgrade needed.

### Recommended Stack: Stalwart Mail Server + Custom Next.js Frontend

After extensive research comparing **Mailcow**, **Mailu**, **custom Postfix+Dovecot**, and **Stalwart**, the recommendation is:

| Approach | Pros | Cons |
|----------|------|------|
| **Mailcow** | Battle-tested, great admin UI, Docker-based | 15+ containers, 4 GB+ RAM, PHP/Python/Ruby legacy stack, dated SOGo webmail |
| **Mailu** | Lighter than Mailcow, Docker-based | ~2 GB RAM, fewer features, smaller community |
| **Custom (Postfix+Dovecot+Rspamd)** | Full control | Complex setup, 6+ separate components to configure and maintain |
| **Stalwart** ⭐ | Single binary, Rust (memory safe), **~200 MB RAM**, built-in everything, JMAP, modern | Newer project (but production-ready, security audited) |

**Why Stalwart is the best choice for this project:**

1. **~200 MB RAM** — Lightweight, leaves ~13 GB free for the rest of the VPS
2. **Single binary** — Replaces Postfix + Dovecot + Rspamd + ClamAV + SOGo in ONE process
3. **Built in Rust** — Memory safe, no buffer overflows, excellent performance
4. **Native JMAP support** — Modern protocol perfect for building custom web clients
5. **Built-in spam filter** — Statistical classifier, DNSBL, greylisting, phishing protection, sender reputation
6. **Built-in CalDAV/CardDAV/WebDAV** — Calendar, contacts, file storage out of the box
7. **Encryption at rest** — S/MIME or OpenPGP
8. **Built-in web admin** — Full admin UI included
9. **ACME built-in** — Automatic Let's Encrypt certificates (though we'll use the existing proxy for TLS)
10. **Security audited** — Professional code audit completed
11. **Community edition is FREE** — All core features included (JMAP, IMAP, SMTP, CalDAV, CardDAV, spam filter, admin UI)

---

## 2. Architecture Overview

```
                              ┌────────────────────────────────────┐
                              │       Internet / Cloudflare DNS    │
                              └──────────────┬─────────────────────┘
                                             │
          ┌──────────────────────────────────▼──────────────────────────────────┐
          │                  VPS: 121.52.149.158                                │
          │                  Ubuntu 24.04 LTS                                  │
          │                  SSH :222 (nutechadmin)                             │
          │                                                                    │
          │  ┌──────────────────────────────────────────────────────────────┐   │
          │  │  HOST-LEVEL REVERSE PROXY (Caddy v2 — NEW, replaces current)│   │
          │  │  Ports: 80, 443 (takes over from robionix_nginx)            │   │
          │  │                                                              │   │
          │  │  robionix.com      → robionix_wordpress :8080               │   │
          │  │  magicqc.online       → magicqc_nginx :8081                    │   │
          │  │  mail.magicqc.online  → webmail :3000 (Next.js)               │   │
          │  │  mail.magicqc.online/jmap/* → stalwart :8080 (JMAP API)       │   │
          │  │  admin.magicqc.online → stalwart :8080 (Admin UI)             │   │
          │  │  autoconfig.*      → stalwart :8080                         │   │
          │  │  mta-sts.*         → static MTA-STS policy                  │   │
          │  │  Auto-HTTPS via ACME (Let's Encrypt) for ALL domains        │   │
          │  └──────────────────────────────────────────────────────────────┘   │
          │                                                                    │
          │  ┌─────── STACK 1: Robionix ────────────────────────────────────┐  │
          │  │  Path: /wp/robionix/                                         │  │
          │  │  robionix_nginx (:8080 internal, no longer on :80/:443)      │  │
          │  │  robionix_wordpress, robionix_mysql, robionix_certbot        │  │
          │  └──────────────────────────────────────────────────────────────┘  │
          │                                                                    │
          │  ┌─────── STACK 2: MagicQC App ─────────────────────────────────┐  │
          │  │  Path: /var/www/magicqc/                                     │  │
          │  │  magicqc_nginx (:8081), magicqc_app, magicqc_worker,        │  │
          │  │  magicqc_db                                                  │  │
          │  └──────────────────────────────────────────────────────────────┘  │
          │                                                                    │
Port 25 ──▶  ┌─────── STACK 3: Mail Platform (NEW) ────────────────────────┐  │
Port 465 ─▶  │  Path: /home/nutechadmin/mail-platform/                     │  │
Port 587 ─▶  │                                                              │  │
Port 993 ─▶  │  ┌──────────────────────┐  ┌───────────────────────────┐    │  │
Port 4190 ▶  │  │  Stalwart Mail Server│  │  Next.js Webmail          │    │  │
          │  │  │  (single container)  │  │  (mail.magicqc.online)       │    │  │
          │  │  │  :25, :465, :587     │  │  :3000 (internal only)    │    │  │
          │  │  │  :993, :4190         │  │                           │    │  │
          │  │  │  :8080 (HTTP/JMAP)   │  │  Talks to Stalwart via   │    │  │
          │  │  │                      │  │  JMAP on :8080            │    │  │
          │  │  │  • SMTP (MTA)        │  └───────────────────────────┘    │  │
          │  │  │  • IMAP4rev2         │                                   │  │
          │  │  │  • JMAP              │  ┌───────────────────────────┐    │  │
          │  │  │  • Spam Filter       │  │  Storage                  │    │  │
          │  │  │  • CalDAV/CardDAV    │  │  • RocksDB (embedded DB)  │    │  │
          │  │  │  • WebDAV            │  │  • Filesystem (mail blobs)│    │  │
          │  │  │  • Admin Web UI      │  └───────────────────────────┘    │  │
          │  │  └──────────────────────┘                                   │  │
          │  └─────────────────────────────────────────────────────────────┘  │
          │                                                                    │
          └────────────────────────────────────────────────────────────────────┘
```

### Key Change: Host-Level Reverse Proxy Migration

Currently, `robionix_nginx` (a container) owns ports 80/443 and reverse-proxies MagicQC. This is fragile — every new subdomain requires editing configs inside a Docker container.

**The plan**: Install **Caddy v2** directly on the host (not in Docker) as the single gateway for ALL traffic. This:
- Gives us one place to manage all domain routing
- Auto-provisions Let's Encrypt certs for all domains/subdomains
- Frees the Robionix stack from being the "master proxy"
- The Robionix Nginx container moves from `:80/:443` to `:8080` (internal only)
- MagicQC Nginx stays on `:8081` (internal only)
- Stalwart HTTP stays on `:8080` on a different Docker network
- Webmail stays on `:3000` (internal only)

**Alternative (less disruption)**: Keep `robionix_nginx` on :80/:443 and add `server {}` blocks for `mail.magicqc.online`, `admin.magicqc.online`, etc. This avoids restructuring but is harder to maintain long-term.

### Domain & URL Structure

| URL | Purpose |
|-----|---------|
| `mail.magicqc.online` | Modern Webmail UI (Next.js custom frontend) |
| `admin.magicqc.online` | Stalwart's built-in admin panel (or route under mail.) |
| `autoconfig.magicqc.online` | Auto-configuration for email clients (Thunderbird etc.) |
| `autodiscover.magicqc.online` | Auto-discovery for Outlook clients |
| `mta-sts.magicqc.online` | MTA-STS policy hosting |

### Email Addresses

| Address | Purpose |
|---------|---------|
| `admin@magicqc.online` | System administrator |
| `info@magicqc.online` | General inquiries |
| `support@magicqc.online` | Customer support |
| `firstname@magicqc.online` | Employee personal mailboxes |
| `noreply@magicqc.online` | Outbound-only system notifications |

---

## 3. Technology Stack Decision

### Backend (Mail Engine)

| Component | Technology | Why |
|-----------|-----------|-----|
| **Mail Server** | Stalwart Mail Server (Community Edition) | Single binary, Rust, all protocols built-in |
| **Storage** | RocksDB (embedded) | Zero-config, embedded, fast, no separate DB server needed |
| **Blob Storage** | Local filesystem | Email bodies, attachments stored on disk |
| **Full-Text Search** | Built-in (Stalwart's FTS) | 17 languages, no external Elasticsearch needed |
| **Spam Filter** | Built-in (Stalwart's spam filter) | Statistical classifier, DNSBL, greylisting, phishing protection |

### Frontend (Webmail)

| Component | Technology | Why |
|-----------|-----------|-----|
| **Framework** | Next.js 15 (App Router) | SSR/SSG, React Server Components, excellent DX |
| **UI Library** | shadcn/ui + Tailwind CSS 4 | Modern, accessible, customizable components |
| **State Management** | TanStack Query (React Query) | Excellent for server state, caching, optimistic updates |
| **Email Protocol** | JMAP (JSON Meta Application Protocol) | Modern REST-like API, real-time push, perfect for web clients |
| **Rich Text Editor** | TipTap (ProseMirror-based) | Feature-rich email composer, HTML/plaintext toggle |
| **Icons** | Lucide Icons | Clean, consistent, modern |
| **Auth** | Stalwart OAuth + JWT | Single sign-on with the mail server |

### Infrastructure

| Component | Technology | Why |
|-----------|-----------|-----|
| **Reverse Proxy** | Caddy v2 | Auto HTTPS, clean config, HTTP/3, easy reverse proxy |
| **Containerization** | Docker Compose | Isolated, reproducible, easy updates |
| **Process Manager** | Docker restart policies | Auto-recovery |
| **Backup** | Restic + Cron | Encrypted, deduplicated, incremental backups |
| **Monitoring** | Stalwart built-in + UptimeKuma | Health checks, email delivery monitoring |

---

## 4. Core Components Deep Dive

### 4.1 Stalwart Mail Server

Stalwart is the heart of the platform. It handles:

**Protocols Supported:**
- **JMAP** (RFC 8620/8621) — Modern API for webmail (replaces IMAP for web clients)
- **IMAP4rev2** (RFC 9051) — For desktop/mobile clients (Thunderbird, Apple Mail, Outlook)
- **IMAP4rev1** (RFC 3501) — Legacy client support
- **POP3** (RFC 1939) — If needed for legacy systems
- **SMTP** (RFC 5321) — Sending and receiving mail
- **ManageSieve** (RFC 5228) — Server-side email filtering rules
- **CalDAV** (RFC 4791) — Calendar sync
- **CardDAV** (RFC 6352) — Contact sync
- **WebDAV** — File storage and sharing

**Built-in Features:**
- Virtual domains and mailboxes
- Aliases and mailing lists
- Disk quotas per user
- Full-text search (17 languages)
- Sieve scripting for mail filtering
- Auto-configuration/discovery for clients
- ACME certificate management
- OAuth 2.0 authentication
- Two-factor authentication (TOTP)
- App-specific passwords
- REST API for administration
- Web-based admin interface

### 4.2 Custom Webmail Frontend (Next.js)

The webmail UI talks to Stalwart via the **JMAP protocol** — a modern, JSON-based API that's far superior to IMAP for web applications:

**Why JMAP over IMAP for the webmail:**
- JSON-based (no binary IMAP parsing needed)
- Stateless HTTP requests (no persistent connections)
- Efficient delta sync (only get what changed)
- Push notifications via WebSocket/EventSource
- Batch requests (multiple operations in one HTTP call)
- Binary data uploads via blob endpoints
- Built-in for contacts and calendars too

**Webmail Features to Build:**

| Category | Features |
|----------|---------|
| **Inbox** | Unified inbox, folder tree, unread counts, search, filters |
| **Reading** | HTML/plaintext rendering, inline images, attachment preview |
| **Composing** | Rich text editor, attachments, CC/BCC, reply/forward, drafts, signatures |
| **Organization** | Folders, labels/tags, drag-and-drop, bulk actions, archive |
| **Search** | Full-text search, advanced filters (from, to, date, has:attachment) |
| **Contacts** | Contact list, groups, import/export vCard, address autocomplete |
| **Calendar** | Event view (day/week/month), create/edit events, invitations, reminders |
| **Settings** | Signature, vacation auto-reply, mail filters (Sieve), 2FA, password change |
| **Mobile** | Fully responsive, PWA support, touch gestures |

### 4.3 Admin Dashboard

Stalwart includes a built-in web admin panel. We'll use it directly (at `admin.magicqc.online` or behind authentication) for:

- Creating/managing domains
- Creating/managing mailboxes
- Setting quotas
- Managing aliases and mailing lists
- Viewing mail queue
- Spam filter configuration
- DKIM key management
- Server monitoring

---

## 5. DNS & Email Deliverability

This is **THE most critical section**. Poor DNS setup = emails go to spam. Every record must be perfect.

### 5.1 Required DNS Records

All records below must be set on `magicqc.online`'s DNS management (your domain registrar or DNS provider):

#### A) MX Record (Mail Exchange)
```
magicqc.online.    IN  MX  10  mail.magicqc.online.
```

#### B) A Record for Mail Server
```
mail.magicqc.online.    IN  A    <YOUR_VPS_IPv4>
```

#### C) AAAA Record (if VPS has IPv6)
```
mail.magicqc.online.    IN  AAAA  <YOUR_VPS_IPv6>
```

#### D) PTR Record (Reverse DNS) — CRITICAL
> **Set via your VPS provider's control panel (not DNS)**
```
<YOUR_VPS_IPv4>  →  mail.magicqc.online
```
This MUST resolve. Many mail servers reject mail from IPs without matching PTR records.

#### E) SPF Record (Sender Policy Framework)
```
magicqc.online.    IN  TXT  "v=spf1 mx a:mail.magicqc.online -all"
```
- `mx` — Allow the MX server to send
- `a:mail.magicqc.online` — Allow the mail server IP
- `-all` — Hard fail for everything else (strict, recommended for new domains)

#### F) DKIM Record (DomainKeys Identified Mail)
```
<selector>._domainkey.magicqc.online.  IN  TXT  "v=DKIM1; k=rsa; p=<PUBLIC_KEY_BASE64>"
```
Stalwart will generate the DKIM key pair. You copy the public key into DNS. Use a selector like `stalwart` or `2026`.

#### G) DMARC Record
```
_dmarc.magicqc.online.  IN  TXT  "v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:dmarc-reports@magicqc.online; ruf=mailto:dmarc-forensic@magicqc.online; adkim=s; aspf=s; pct=100; fo=1"
```
- `p=quarantine` — Start with quarantine, move to `reject` after confidence builds
- `adkim=s; aspf=s` — Strict alignment
- `rua` — Aggregate reports
- `ruf` — Forensic reports
- `fo=1` — Generate failure reports on any authentication failure

#### H) DANE / TLSA Record
```
_25._tcp.mail.magicqc.online.  IN  TLSA  3 1 1 <SHA256_OF_CERT>
```
Proves your TLS certificate is authentic. Prevents man-in-the-middle.

#### I) MTA-STS Record
```
_mta-sts.magicqc.online.  IN  TXT  "v=STSv1; id=20260305"
```
And host the policy at `https://mta-sts.magicqc.online/.well-known/mta-sts.txt`:
```
version: STSv1
mode: enforce
mx: mail.magicqc.online
max_age: 604800
```

#### J) TLS-RPT Record (TLS Reporting)
```
_smtp._tls.magicqc.online.  IN  TXT  "v=TLSRPTv1; rua=mailto:tls-reports@magicqc.online"
```

#### K) Autoconfig/Autodiscover Records
```
autoconfig.magicqc.online.    IN  CNAME  mail.magicqc.online.
autodiscover.magicqc.online.  IN  CNAME  mail.magicqc.online.

; SRV records for automatic client configuration
_submission._tcp.magicqc.online.  IN  SRV  0 1 587  mail.magicqc.online.
_imaps._tcp.magicqc.online.       IN  SRV  0 1 993  mail.magicqc.online.
_pop3s._tcp.magicqc.online.       IN  SRV  0 1 995  mail.magicqc.online.
_jmap._tcp.magicqc.online.        IN  SRV  0 1 443  mail.magicqc.online.
```

### 5.2 DNS Checklist

- [ ] MX record pointing to `mail.magicqc.online`
- [ ] A record for `mail.magicqc.online` → VPS IP
- [ ] PTR (rDNS) on VPS IP → `mail.magicqc.online`
- [ ] SPF TXT record with `-all`
- [ ] DKIM TXT record with public key
- [ ] DMARC TXT record with reporting
- [ ] DANE/TLSA record for SMTP TLS
- [ ] MTA-STS TXT record + HTTPS policy file
- [ ] TLS-RPT TXT record
- [ ] Autoconfig/Autodiscover CNAME records
- [ ] SRV records for client auto-configuration

---

## 6. Security Architecture

### 6.1 Transport Security

| Layer | Protection |
|-------|-----------|
| **HTTPS** | TLS 1.2+ for all web interfaces (Caddy auto-manages via ACME/Let's Encrypt) |
| **SMTP TLS** | STARTTLS required for submission (port 587), implicit TLS on port 465 |
| **IMAPS** | Implicit TLS on port 993 (no plaintext IMAP on 143) |
| **DANE** | TLSA records to cryptographically verify mail server certificates |
| **MTA-STS** | Enforced TLS for incoming mail from supporting servers |
| **TLS Reporting** | Receive reports when TLS negotiation fails |

### 6.2 Authentication Security

| Mechanism | Implementation |
|-----------|---------------|
| **Password Hashing** | Argon2id (Stalwart default, memory-hard, resistant to GPU attacks) |
| **Two-Factor Auth (2FA)** | TOTP (Google Authenticator, Authy, etc.) — built into Stalwart |
| **App Passwords** | Separate passwords for IMAP/SMTP clients (don't expose main password) |
| **OAuth 2.0** | Token-based auth for the webmail frontend |
| **Session Management** | Short-lived JWTs, secure HttpOnly cookies, CSRF protection |
| **Rate Limiting** | Login attempt rate limiting (built-in fail2ban equivalent) |
| **Account Lockout** | Temporary lockout after N failed attempts |

### 6.3 Data Security

| Layer | Protection |
|-------|-----------|
| **Encryption at Rest** | Stalwart supports S/MIME or OpenPGP encryption of stored mail |
| **Disk Encryption** | LUKS full-disk encryption on VPS (if provider supports) |
| **Backup Encryption** | Restic provides AES-256 encrypted backups |
| **Database** | RocksDB stored in Docker volume with restricted permissions |

### 6.4 Network Security

| Layer | Protection |
|-------|-----------|
| **Firewall** | UFW/iptables — Only allow required ports (25, 465, 587, 993, 80, 443) |
| **Fail2Ban** | Stalwart built-in fail2ban + OS-level fail2ban for SSH |
| **Rate Limiting** | Per-IP and per-account rate limits on all protocols |
| **SMTP Relay Prevention** | No open relay — only authenticated users can send via submission |
| **Docker Network Isolation** | Internal bridge network, only reverse proxy exposed |
| **SSH Hardening** | Key-only auth, no root login, non-standard port |

### 6.5 Ports to Open (Firewall Rules)

```bash
# Inbound ports to ALLOW
22   (or custom) - SSH (key-only)
25   - SMTP (receiving mail from other servers)
80   - HTTP (ACME challenges + redirect to HTTPS)
443  - HTTPS (webmail, admin, autoconfig, mta-sts)
465  - SMTPS (implicit TLS submission — modern standard)
587  - SMTP Submission (STARTTLS — legacy clients)
993  - IMAPS (IMAP over TLS)
4190 - ManageSieve (optional, for Sieve filter management from clients)

# Ports to BLOCK (not exposed)
143  - IMAP plaintext (NEVER expose)
110  - POP3 plaintext (NEVER expose)
```

---

## 7. Anti-Spam & Anti-Phishing Strategy

### 7.1 Inbound Protection (Receiving)

Stalwart's built-in spam filter provides multiple layers:

| Layer | Mechanism | Description |
|-------|-----------|-------------|
| 1 | **Connection checks** | IP reputation, DNSBL (Spamhaus, Barracuda, etc.) |
| 2 | **SPF Verification** | Verify sender's IP is authorized for their domain |
| 3 | **DKIM Verification** | Verify cryptographic signature on incoming mail |
| 4 | **DMARC Verification** | Combined SPF+DKIM alignment check |
| 5 | **ARC Verification** | Authenticated Received Chain for forwarded mail |
| 6 | **Greylisting** | Temporarily defer unknown senders (real servers retry, spammers don't) |
| 7 | **Statistical Classifier** | Bayesian spam filter with automatic learning |
| 8 | **Collaborative Filtering** | Digest-based collaborative spam detection |
| 9 | **Phishing Detection** | Homographic attack detection, URL analysis, display name spoofing |
| 10 | **Trusted Reply Tracking** | Recognize genuine replies to your sent mail |
| 11 | **Sender Reputation** | Track sender reputation by IP, ASN, domain, and email |
| 12 | **Spam Traps** | Decoy addresses that catch spammers |
| 13 | **Content Filtering** | Regex-based rules, header analysis, URL reputation |
| 14 | **Attachment Filtering** | Block dangerous file types (.exe, .scr, macros) |

### 7.2 Outbound Protection (Sending)

| Mechanism | Purpose |
|-----------|---------|
| **DKIM Signing** | Cryptographically sign all outgoing mail |
| **SPF Authorization** | DNS declares only our server sends for magicqc.online |
| **DMARC Alignment** | From domain matches SPF/DKIM domain |
| **ARC Signing** | For forwarded mail chain of custody |
| **Rate Limiting** | Prevent compromised accounts from mass-spamming |
| **Outbound Scanning** | Scan outgoing mail for spam/virus (prevent reputation damage) |

### 7.3 DNSBL (DNS Blocklist) Configuration

Subscribe to these blocklists in Stalwart:

```
# IP-based blocklists
zen.spamhaus.org          (Spamhaus — industry standard)
bl.spamcop.net            (SpamCop)
b.barracudacentral.org    (Barracuda)

# Domain-based blocklists
dbl.spamhaus.org          (Spamhaus Domain Blocklist)

# URI blocklists
multi.surbl.org           (SURBL — URL reputation)
multi.uribl.com           (URIBL — URL reputation)
```

---

## 8. Frontend UI/UX Design

### 8.1 Design Philosophy

- **Modern & Clean** — Dark/light mode, minimal chrome, content-focused
- **Fast** — Server-side rendering for initial load, client-side for interactions
- **Responsive** — Desktop-first but fully functional on mobile/tablet
- **Accessible** — WCAG 2.1 AA compliant, keyboard navigation, screen reader support
- **Professional** — MagicQC branding (logo, colors, typography)

### 8.2 Page Structure

```
┌────────────────────────────────────────────────────────────────┐
│  Logo   [ Search... 🔍 ]                    🔔  👤 Settings  │
├──────────┬─────────────────────────────────────────────────────┤
│          │                                                     │
│ 📥 Inbox │  From          Subject                    Date      │
│ ⭐ Starred│  ─────────────────────────────────────────────      │
│ 📤 Sent  │  John Doe      Re: Q3 Report            2 min ago  │
│ 📝 Drafts│  Jane Smith    Meeting Tomorrow          1 hr ago   │
│ 🗑️ Trash │  Ahmed K.      Invoice #1234             3 hrs ago  │
│ 📁 Archive│  ...                                               │
│          │                                                     │
│ ── Labels│  ───────────────────────────────────────────────     │
│ 🟢 Work  │                                                     │
│ 🔵 Personal│  [ Email Preview Pane / Reading View ]            │
│ 🟡 Urgent│                                                     │
│          │                                                     │
│ ── Folders│                                                    │
│ 📁 Projects│                                                   │
│ 📁 Clients│                                                    │
│          │                                                     │
├──────────┴─────────────────────────────────────────────────────┤
│  ✏️ Compose    📅 Calendar    👥 Contacts    📁 Files          │
└────────────────────────────────────────────────────────────────┘
```

### 8.3 Key UI Components

| Component | Description |
|-----------|-------------|
| **Mail List** | Virtual scrolling for performance, unread indicators, bulk select |
| **Mail Viewer** | Safe HTML rendering (sanitized), inline image proxy, attachment chips |
| **Composer** | Rich text (TipTap), attachments via drag-drop, CC/BCC expand, signature |
| **Search** | Instant search with filters (from, to, date range, has:attachment, in:folder) |
| **Settings** | Profile, signature editor, vacation responder, mail filters, 2FA, theme |
| **Calendar** | Day/Week/Month views, event CRUD, invitations, time zone support |
| **Contacts** | List/grid view, groups, import vCard, quick add from email |
| **Notification** | Toast notifications for new mail, browser push notifications |

### 8.4 Frontend Project Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (mail)/
│   │   ├── inbox/page.tsx
│   │   ├── sent/page.tsx
│   │   ├── drafts/page.tsx
│   │   ├── trash/page.tsx
│   │   ├── search/page.tsx
│   │   └── [mailboxId]/[messageId]/page.tsx
│   ├── calendar/page.tsx
│   ├── contacts/page.tsx
│   ├── files/page.tsx
│   ├── settings/
│   │   ├── profile/page.tsx
│   │   ├── security/page.tsx
│   │   ├── filters/page.tsx
│   │   └── appearance/page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── mail/
│   │   ├── mail-list.tsx
│   │   ├── mail-viewer.tsx
│   │   ├── mail-composer.tsx
│   │   ├── folder-tree.tsx
│   │   └── search-bar.tsx
│   ├── calendar/
│   ├── contacts/
│   └── ui/ (shadcn components)
├── lib/
│   ├── jmap/
│   │   ├── client.ts          # JMAP client implementation
│   │   ├── types.ts           # JMAP type definitions
│   │   ├── mailbox.ts         # Mailbox operations
│   │   ├── email.ts           # Email operations
│   │   ├── thread.ts          # Thread operations
│   │   ├── identity.ts        # Identity/signature management
│   │   ├── submission.ts      # Email sending
│   │   ├── calendar.ts        # CalDAV operations
│   │   └── contacts.ts        # CardDAV operations
│   ├── auth.ts                # OAuth/session management
│   ├── utils.ts
│   └── hooks/
│       ├── use-mail.ts
│       ├── use-mailboxes.ts
│       └── use-search.ts
├── public/
│   └── logo.svg
├── Dockerfile
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 8.5 JMAP Client Integration

The frontend communicates with Stalwart via JMAP. Example flow:

```typescript
// 1. Session discovery
GET https://mail.magicqc.online/.well-known/jmap
→ Returns JMAP session with capabilities, API URL, upload/download URLs

// 2. Get mailboxes (folders)
POST https://mail.magicqc.online/jmap
{
  "using": ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
  "methodCalls": [
    ["Mailbox/get", { "accountId": "..." }, "a"]
  ]
}

// 3. Get emails in inbox
POST https://mail.magicqc.online/jmap
{
  "methodCalls": [
    ["Email/query", { 
      "accountId": "...", 
      "filter": { "inMailbox": "inbox-id" },
      "sort": [{ "property": "receivedAt", "isAscending": false }],
      "limit": 50
    }, "a"],
    ["Email/get", { 
      "accountId": "...", 
      "#ids": { "resultOf": "a", "path": "/ids" },
      "properties": ["from", "subject", "receivedAt", "preview", "keywords"]
    }, "b"]
  ]
}

// 4. Real-time push (new mail notifications)
EventSource: https://mail.magicqc.online/jmap/eventsource?types=*&closeafter=state&ping=30
```

---

## 9. Deployment Architecture

### 9.1 Deployment Path on the VPS

```
/home/nutechadmin/mail-platform/       ← NEW (mail platform root)
├── docker-compose.yml                 ← Stalwart + Webmail containers
├── .env                               ← Secrets (NEVER commit)
├── frontend/                          ← Next.js webmail source
│   ├── Dockerfile
│   ├── app/
│   ├── ...
│   └── package.json
├── stalwart-data/                     ← Bind mount for Stalwart (persistent)
│   └── (auto-populated by Stalwart)
└── PLAN.md                            ← This document
```

### 9.2 Docker Compose Setup

```yaml
# /home/nutechadmin/mail-platform/docker-compose.yml

services:
  # ============================================
  # Stalwart Mail Server (All-in-One)
  # ============================================
  stalwart:
    image: stalwartlabs/mail-server:latest
    container_name: stalwart-mail
    restart: unless-stopped
    ports:
      - "25:25"       # SMTP (receiving from other mail servers)
      - "465:465"     # SMTPS (submission, implicit TLS)
      - "587:587"     # SMTP Submission (STARTTLS)
      - "993:993"     # IMAPS (IMAP over TLS)
      - "4190:4190"   # ManageSieve (optional)
    # HTTP/JMAP port is NOT exposed to host — only accessible via Docker network
    # The host-level reverse proxy reaches it via the mail-network
    expose:
      - "8080"
    volumes:
      - ./stalwart-data:/opt/stalwart-mail
    environment:
      - STALWART_HOSTNAME=mail.magicqc.online
    networks:
      - mail-network
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    # IMPORTANT: Force IPv4 for DNS (Docker IPv6 is broken on this VPS)
    dns:
      - 8.8.8.8
      - 1.1.1.1

  # ============================================
  # Custom Webmail Frontend (Next.js)
  # ============================================
  webmail:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: magicqc-webmail
    restart: unless-stopped
    expose:
      - "3000"
    environment:
      - JMAP_URL=http://stalwart:8080
      - NEXT_PUBLIC_JMAP_URL=https://mail.magicqc.online
      - NODE_ENV=production
    depends_on:
      stalwart:
        condition: service_healthy
    networks:
      - mail-network
    dns:
      - 8.8.8.8
      - 1.1.1.1

networks:
  mail-network:
    driver: bridge
```

> **Note:** No volumes declaration needed — we use bind mount (`./stalwart-data`) for easy backup.

### 9.3 Reverse Proxy Strategy — Two Options

#### Option A: Host-Level Caddy (RECOMMENDED)

Install Caddy directly on the host. This becomes the single gateway for ALL sites.

```bash
# Install Caddy on Ubuntu 24.04
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

**Caddyfile** (`/etc/caddy/Caddyfile`):

```Caddyfile
# ─── Robionix WordPress ───────────────────────────────
robionix.com, www.robionix.com {
    reverse_proxy localhost:8080
    # 8080 = robionix_nginx (change its port from 80 to 8080)
}

# ─── MagicQC Laravel App ──────────────────────────────
magicqc.online, www.magicqc.online {
    reverse_proxy localhost:8081
    # 8081 = magicqc_nginx (already on this port)
}

# ─── Webmail Frontend + JMAP API ──────────────────────
mail.magicqc.online {
    # JMAP / CalDAV / CardDAV / Auth / Well-Known → Stalwart
    handle /jmap/* {
        reverse_proxy localhost:18080
    }
    handle /.well-known/jmap {
        reverse_proxy localhost:18080
    }
    handle /auth/* {
        reverse_proxy localhost:18080
    }
    handle /api/* {
        reverse_proxy localhost:18080
    }
    handle /upload/* {
        reverse_proxy localhost:18080
    }
    handle /download/* {
        reverse_proxy localhost:18080
    }
    handle /dav/* {
        reverse_proxy localhost:18080
    }
    handle /.well-known/caldav {
        reverse_proxy localhost:18080
    }
    handle /.well-known/carddav {
        reverse_proxy localhost:18080
    }

    # Everything else → Next.js webmail
    handle {
        reverse_proxy localhost:13000
    }
}

# ─── Stalwart Admin Panel ─────────────────────────────
admin.magicqc.online {
    reverse_proxy localhost:18080
}

# ─── Autoconfig / Autodiscover ────────────────────────
autoconfig.magicqc.online {
    reverse_proxy localhost:18080
}
autodiscover.magicqc.online {
    reverse_proxy localhost:18080
}

# ─── MTA-STS Policy ──────────────────────────────────
mta-sts.magicqc.online {
    header Content-Type "text/plain; charset=utf-8"
    respond /.well-known/mta-sts.txt 200 {
        body "version: STSv1
mode: enforce
mx: mail.magicqc.online
max_age: 604800"
    }
}
```

**Migration steps when switching to Caddy:**
1. Install Caddy on host
2. Change `robionix_nginx` from port `80:80` and `443:443` to `8080:80` (internal only)
3. Update `mail-platform/docker-compose.yml` to also expose Stalwart `:8080` → host `:18080` and webmail `:3000` → host `:13000`
4. Stop old Nginx, start Caddy, verify all sites work
5. Caddy auto-provisions Let's Encrypt for ALL domains

#### Option B: Add to Existing Robionix Nginx (MINIMAL DISRUPTION)

Add new `server {}` blocks to `/wp/robionix/nginx/conf.d/` and obtain additional SSL certs.

This is simpler but messier long-term. We'd need to:
- Mount the Stalwart/webmail Docker network so robionix_nginx can reach them
- Manually manage SSL certs for `mail.magicqc.online`, `admin.magicqc.online`
- All config lives inside the robionix WordPress directory (semantically wrong)

**Not recommended** unless you want zero changes to the existing setup.

### 9.4 Updated Docker Compose with Host Port Exposure (for Caddy)

If going with Option A (Caddy), update the mail-platform docker-compose to also expose HTTP ports to the host:

```yaml
services:
  stalwart:
    # ... same as above, but also:
    ports:
      - "25:25"
      - "465:465"
      - "587:587"
      - "993:993"
      - "4190:4190"
      - "127.0.0.1:18080:8080"   # JMAP/Admin HTTP — only reachable from localhost (Caddy)

  webmail:
    # ... same as above, but also:
    ports:
      - "127.0.0.1:13000:3000"   # Webmail HTTP — only reachable from localhost (Caddy)
```

Binding to `127.0.0.1` ensures these ports are NOT accessible from the internet — only through Caddy.

---

## 10. VPS Coexistence Strategy

Your VPS already hosts `robionix.com` and `magicqc.online`. Here's how to add the mail platform without disrupting existing services:

### 10.1 Port Conflict Avoidance

| Service | Port | Status |
|---------|------|--------|
| Existing Nginx/Caddy | 80, 443 | Already in use → route mail subdomains to Docker |
| Stalwart SMTP | 25 | New — unlikely to conflict (most web servers don't use 25) |
| Stalwart SMTPS | 465 | New |
| Stalwart Submission | 587 | New |
| Stalwart IMAPS | 993 | New |
| Stalwart HTTP | 8080 | Internal only — proxied via existing reverse proxy |
| Webmail Next.js | 3000 | Internal only — proxied via existing reverse proxy |

### 10.2 Integration with Existing Reverse Proxy

**If you're using Nginx**, add new server blocks for `mail.magicqc.online`, `admin.magicqc.online`, etc. 

**If you're using Caddy**, add new site blocks as shown above.

**If you're NOT using a reverse proxy yet**, this is the time to set one up. Caddy is recommended for its simplicity and automatic HTTPS.

### 10.3 Resource Allocation

With **15 GB RAM** and **4 vCPUs**, we have massive headroom. Expected usage for the mail platform (<50 users):

| Resource | Stalwart | Webmail (Next.js) | Total Added | % of VPS |
|----------|----------|-------------------|-------------|----------|
| RAM | ~200-400 MB | ~150-250 MB | ~400-650 MB | **~4% of 15 GB** |
| CPU | Minimal (spikes during mail processing) | Minimal | Low | **< 10% avg** |
| Disk | ~50 MB binary + mail storage | ~100 MB (build) | Mail dependent | **500+ GB free** |

---

## 11. Backup & Disaster Recovery

### 11.1 What to Back Up

| Data | Location | Priority |
|------|----------|----------|
| Stalwart data (all mail, config, DB) | Docker volume `stalwart-data` | **CRITICAL** |
| DKIM private keys | Inside Stalwart data | **CRITICAL** (lose this = re-setup DKIM) |
| Docker Compose files | `/home/nutechadmin/mail-platform/` | HIGH |
| Frontend source code | Git repository | HIGH |
| Caddy/Nginx config | System config | HIGH |
| DNS records | Documented in this plan | MEDIUM |

### 11.2 Backup Strategy

```bash
# Daily incremental backup with Restic (encrypted, deduplicated)
# Stored on external storage (Backblaze B2, S3, or second server)

# Backup script (/opt/scripts/backup-mail.sh)
#!/bin/bash
set -euo pipefail

export RESTIC_REPOSITORY="s3:s3.amazonaws.com/magicqc-backups/mail"
export RESTIC_PASSWORD_FILE="/root/.restic-password"

# 1. Backup Stalwart data volume
docker run --rm \
  -v stalwart-data:/data:ro \
  -v /root/.restic-password:/password:ro \
  restic/restic backup /data \
  --tag stalwart-mail

# 2. Backup configs
restic backup /home/abdullah/Deploy/mail-platform/ \
  --tag mail-platform-config

# 3. Retention policy: keep 7 daily, 4 weekly, 6 monthly
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
```

### 11.3 Recovery Plan

1. Spin up fresh Docker containers
2. Restore Stalwart data volume from Restic backup
3. Verify DNS records still point to correct IP
4. Test sending/receiving
5. Estimated RTO: < 1 hour

---

## 12. Monitoring & Observability

### 12.1 Health Checks

| Check | Method | Frequency |
|-------|--------|-----------|
| Stalwart process alive | Docker healthcheck | 30s |
| SMTP port 25 responds | UptimeKuma TCP check | 60s |
| IMAP port 993 responds | UptimeKuma TCP check | 60s |
| Webmail HTTP 200 | UptimeKuma HTTP check | 60s |
| SSL certificate expiry | UptimeKuma cert check | 24h |
| Disk usage | Cron + alert | 6h |
| Mail queue size | Stalwart API | 5min |

### 12.2 Alerting

- **Email alerts** (to a personal Gmail/external email) — for irony-free monitoring
- **Webhook to Discord/Telegram** — for real-time team notifications

### 12.3 Log Management

Stalwart logs to stdout (captured by Docker). Use:

```bash
# View real-time logs
docker logs -f stalwart-mail

# Search logs
docker logs stalwart-mail 2>&1 | grep "error"

# Optional: ship logs to Loki/Grafana for retention
```

---

## 13. IP Reputation & Warm-up Plan

**A brand new IP sending email will be treated suspiciously by Gmail, Outlook, etc.** This is the #1 reason self-hosted email goes to spam. Follow this plan carefully:

### 13.1 Pre-Launch Checklist

- [ ] VPS IP is NOT on any blocklists (check at mxtoolbox.com/blacklists.aspx)
- [ ] PTR/rDNS is set correctly
- [ ] SPF, DKIM, DMARC all pass (test with mail-tester.com)
- [ ] HELO/EHLO hostname matches PTR and A record
- [ ] TLS certificate is valid

### 13.2 IP Warm-up Schedule

| Week | Daily Volume | Target Recipients |
|------|-------------|-------------------|
| 1 | 5-10 emails | Internal testing, personal accounts |
| 2 | 20-30 emails | Known contacts who will reply |
| 3 | 50-100 emails | Business contacts, gradual increase |
| 4+ | Normal volume | Full usage |

### 13.3 Warm-up Best Practices

1. **Start sending to people who will REPLY** — Replies signal legitimacy to Gmail/Outlook
2. **Ask recipients to mark as "Not Spam"** if it lands in spam — This trains Google/Microsoft
3. **Add to contacts** — Ask early recipients to add your address to contacts
4. **Don't send bulk/marketing email initially** — Only transactional/personal mail
5. **Register postmaster tools:**
   - [Google Postmaster Tools](https://postmaster.google.com/) — Monitor Gmail reputation
   - [Microsoft SNDS](https://sendersupport.olc.protection.outlook.com/snds/) — Monitor Outlook reputation
   - [Yahoo Postmaster](https://senders.yahooinc.com/) — Monitor Yahoo reputation
6. **Register for feedback loops (FBLs):**
   - Gmail: Automatic via DMARC reports
   - Outlook: Via SNDS/JMRP
   - Yahoo: Via CFL

### 13.4 Deliverability Testing

Test every configuration change with:

| Tool | URL | Purpose |
|------|-----|---------|
| **mail-tester.com** | mail-tester.com | Send a test email, get a 10/10 score |
| **MXToolbox** | mxtoolbox.com | DNS, blocklist, SMTP diagnostics |
| **DKIM Validator** | dkimvalidator.com | Verify DKIM signing |
| **DMARC Analyzer** | dmarcanalyzer.com | DMARC report analysis |
| **Learndmarc** | learndmarc.com | Interactive SPF/DKIM/DMARC tester |

---

## 14. Implementation Roadmap

### Phase 1: Foundation (Days 1-2)
> **Goal**: Mail server running, can send/receive email

- [ ] Set up DNS records (MX, A, SPF, DKIM, DMARC, PTR)
- [ ] Deploy Stalwart via Docker Compose
- [ ] Configure Stalwart (hostname, domain, TLS)
- [ ] Generate DKIM keys and add to DNS
- [ ] Create admin account
- [ ] Create first user mailboxes
- [ ] Test send/receive with external email (Gmail)
- [ ] Verify SPF/DKIM/DMARC pass (mail-tester.com)
- [ ] Score 10/10 on mail-tester.com

### Phase 2: Security Hardening (Days 2-3)
> **Goal**: Production-grade security

- [ ] Configure firewall (UFW) — only allow required ports
- [ ] Enable encryption at rest
- [ ] Configure fail2ban / rate limiting
- [ ] Set up MTA-STS
- [ ] Set up DANE/TLSA
- [ ] Configure TLS-RPT
- [ ] Set up 2FA for admin account
- [ ] Configure password policies (minimum length, complexity)
- [ ] Test with SSL Labs, Hardenize, Internet.nl

### Phase 3: Anti-Spam Tuning (Days 3-4)
> **Goal**: Spam filter catching junk, no false positives

- [ ] Configure DNSBL sources
- [ ] Enable greylisting
- [ ] Configure spam score thresholds
- [ ] Set up spam traps (if desired)
- [ ] Configure attachment filtering (block dangerous types)
- [ ] Test with known spam samples
- [ ] Set up automatic Bayesian training (ham/spam folders)

### Phase 4: Webmail Frontend (Days 4-14)
> **Goal**: Beautiful, functional webmail at mail.magicqc.online

- [ ] Initialize Next.js project with shadcn/ui
- [ ] Implement JMAP client library
- [ ] Build authentication flow (OAuth with Stalwart)
- [ ] Build mailbox sidebar (folder tree with counts)
- [ ] Build email list view (virtual scrolled, responsive)
- [ ] Build email viewer (safe HTML rendering, attachments)
- [ ] Build email composer (rich text, attachments, signature)
- [ ] Build search functionality
- [ ] Build settings page (signature, vacation, filters, 2FA)
- [ ] Build contacts integration (CardDAV)
- [ ] Build calendar integration (CalDAV)
- [ ] Implement dark/light mode
- [ ] Implement push notifications (JMAP EventSource)
- [ ] Mobile responsive testing
- [ ] Deploy via Docker

### Phase 5: Polish & Launch (Days 14-17)
> **Goal**: Production ready for MagicQC employees

- [ ] Integration testing (all flows end-to-end)
- [ ] Performance testing (load test webmail)
- [ ] Set up monitoring (UptimeKuma)
- [ ] Set up backup automation (Restic cron)
- [ ] Configure autoconfig/autodiscover for desktop/mobile clients
- [ ] Create employee onboarding documentation
- [ ] Register with Google Postmaster Tools, Microsoft SNDS
- [ ] Begin IP warm-up schedule
- [ ] Gradual employee rollout (admin first, then team leads, then all)

### Phase 6: Ongoing (Post-Launch)
> **Goal**: Maintain, monitor, improve

- [ ] Monitor deliverability via postmaster tools
- [ ] Review DMARC reports weekly
- [ ] Review spam filter accuracy monthly
- [ ] Update Stalwart and frontend regularly
- [ ] Verify backups monthly (test restore)
- [ ] Gradually move DMARC from `p=quarantine` to `p=reject`

---

## 15. Hardware Requirements

### Mail Platform Requirements vs Actual VPS

| Resource | Minimum Needed | Our VPS Has | Verdict |
|----------|---------------|-------------|----------|
| **CPU** | 2 vCPU | **4 vCPU** (KVM) | ✅ 2× minimum |
| **RAM** | 2 GB (for mail stack alone) | **15 GB** total (~13 GB free) | ✅ 6.5× minimum |
| **Disk** | 20 GB for mail | **554 GB** (~513 GB partition) | ✅ 25× minimum |
| **Bandwidth** | 1 TB/month | Unmetered (check with provider) | ✅ |
| **Dedicated IPv4** | Required | `121.52.149.158` | ✅ |

### Estimated Resource Breakdown After Deployment

| Stack | RAM Usage | Disk Usage |
|-------|-----------|------------|
| Robionix (WordPress + MySQL + Nginx) | ~500 MB | ~2–5 GB |
| MagicQC (Laravel + PHP-FPM + MySQL + Nginx) | ~600 MB | ~2–5 GB |
| **Mail Platform (Stalwart + Next.js)** | **~400–650 MB** | **~200 MB + mail storage** |
| Host-level Caddy | ~30 MB | ~50 MB |
| OS + Docker overhead | ~500 MB | ~5 GB |
| **Total** | **~2–2.3 GB** | **~15 GB + mail** |
| **Free headroom** | **~12.7 GB** | **~500 GB** |

This VPS can comfortably handle the mail platform with years of email storage and room to grow.

---

## 16. Cost Analysis

### One-Time Costs

| Item | Cost |
|------|------|
| Stalwart Community Edition | **FREE** (open source) |
| Domain (magicqc.online) | Already owned |
| VPS | Already running |
| SSL Certificates | **FREE** (Let's Encrypt via ACME) |
| DNS hosting | Usually free with registrar |

### Monthly Costs

| Item | Cost |
|------|------|
| VPS (current plan, no upgrade needed) | Already paid (no additional cost) |
| Backup storage (Backblaze B2) | ~$1-3/month (for 10-50 GB) |
| Domain renewal | ~$1/month (amortized) |
| **Total** | **~$1-4/month** (just backup storage + domain renewal) |

### Compared to Alternatives

| Solution | Monthly Cost (10 users) |
|----------|------------------------|
| **Self-hosted (this plan)** | **~$1-4/month** (VPS already paid for) |
| Google Workspace | $70/month ($7/user) |
| Microsoft 365 | $60/month ($6/user) |
| Zoho Mail | $10-30/month ($1-3/user) |
| Hostinger hPanel Email | Included in hosting |

---

## Summary

This plan delivers an enterprise-grade, self-hosted email platform using:

1. **Stalwart Mail Server** — Modern, Rust-based, all-in-one backend
2. **Custom Next.js Webmail** — Beautiful, modern frontend via JMAP protocol
3. **Proper DNS** — Full SPF/DKIM/DMARC/DANE/MTA-STS configuration
4. **Enterprise Security** — Encryption at rest, 2FA, fail2ban, strict TLS
5. **Multi-Layer Spam Defense** — DNSBL, Bayesian, greylisting, phishing detection
6. **Docker Deployment** — Containerized, alongside existing VPS services
7. **Automated Backups** — Encrypted, incremental, with tested recovery
8. **IP Warm-up Plan** — Systematic reputation building for deliverability

**Estimated timeline**: 2-3 weeks from start to full employee rollout  
**Estimated cost**: ~$1-4/month (backup storage only — VPS already paid for, vs $60-70/month for Google/Microsoft for 10 users)  
**VPS resources**: 15 GB RAM, 4 vCPU, 554 GB disk — mail platform uses ~4% of available RAM  

The platform will be accessible at **`mail.magicqc.online`** with email addresses like **`name@magicqc.online`**.
