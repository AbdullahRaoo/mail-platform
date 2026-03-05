# Email Configuration (Cloudflare Email Routing)

## Overview

| Property | Value |
|----------|-------|
| Service | Cloudflare Email Routing |
| Cost | Free |
| Type | Email forwarding |
| Destination | Personal Gmail/Outlook |

## How It Works

```
Someone sends to:     admin@robionix.com
        ↓
Cloudflare receives:  Checks routing rules
        ↓
Forwards to:          yourpersonal@gmail.com
        ↓
You read in:          Gmail inbox
```

## Email Addresses Setup

### Forwarding Rules (Configure in Cloudflare)

| Domain Email | Forwards To |
|--------------|-------------|
| admin@robionix.com | yourpersonal@gmail.com |
| info@robionix.com | yourpersonal@gmail.com |
| contact@robionix.com | yourpersonal@gmail.com |
| support@robionix.com | yourpersonal@gmail.com |
| *@robionix.com (catch-all) | yourpersonal@gmail.com |

## Cloudflare Email Routing Setup

1. Login to Cloudflare Dashboard
2. Select robionix.com
3. Go to **Email** → **Email Routing**
4. Click **Enable Email Routing**
5. Add destination email (Gmail)
6. Verify destination (click link in email)
7. Create routing rules

## Send As Domain Email (Gmail Setup)

To send emails **from** admin@robionix.com using Gmail:

### Step 1: Enable 2-Step Verification
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification

### Step 2: Create App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Generate password
4. Copy the 16-character password

### Step 3: Add to Gmail
1. Gmail → Settings ⚙️ → See all settings
2. "Accounts and Import" tab
3. "Send mail as" → "Add another email address"
4. Enter:
   - Name: Robionix
   - Email: admin@robionix.com
   - Uncheck "Treat as alias"
5. SMTP Settings:
   - Server: smtp.gmail.com
   - Port: 587
   - Username: yourpersonal@gmail.com
   - Password: (App Password from Step 2)
   - TLS: Yes
6. Enter verification code (sent to your Gmail via forwarding)

### Step 4: Send Emails
When composing in Gmail, click "From" dropdown and select admin@robionix.com

## DNS Records for Email (Cloudflare Adds Automatically)

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| MX | @ | (Cloudflare servers) | Receive mail |
| TXT | @ | v=spf1 include:_spf.mx.cloudflare.net ~all | SPF |
| TXT | _dmarc | v=DMARC1; p=none | DMARC |

## Email Client Settings (If needed)

### Receiving (IMAP) - Use Gmail
```
Server: imap.gmail.com
Port: 993
Security: SSL
```

### Sending (SMTP) - Use Gmail
```
Server: smtp.gmail.com
Port: 587
Security: TLS
Username: yourpersonal@gmail.com
Password: App Password
```

## Troubleshooting

### Not receiving emails

1. Check Cloudflare Email Routing is enabled
2. Verify destination email is confirmed
3. Check routing rules exist
4. Check spam folder in Gmail
5. Verify MX records in Cloudflare DNS

### Can't send as domain email

1. Verify Gmail "Send mail as" is configured
2. Check App Password is correct
3. Ensure 2-Step Verification is enabled
4. Re-add the email in Gmail settings

## Limitations

- No dedicated inbox (uses Gmail inbox)
- All emails mixed in one inbox (use Gmail labels/filters)
- Dependent on Gmail for sending

## Tips

### Gmail Filters
Create filters to organize domain emails:
1. Gmail → Settings → Filters
2. Create filter: To: *@robionix.com
3. Apply label: "Robionix"

### Multiple Email Addresses
You can create unlimited aliases:
- sales@robionix.com
- marketing@robionix.com
- careers@robionix.com
- yourname@robionix.com

All forward to your single Gmail!
