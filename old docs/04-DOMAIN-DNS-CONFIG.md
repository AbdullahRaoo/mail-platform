# Domain & DNS Configuration

## Domain Information

| Property | Value |
|----------|-------|
| Domain | robionix.com |
| Registrar | GoDaddy |
| Nameservers | Cloudflare (after migration) |
| Website IP | 121.52.149.158 |

## DNS Records

### Required A Records

| Type | Name | Value | TTL | Purpose |
|------|------|-------|-----|---------|
| A | @ | 121.52.149.158 | 600 | Main domain |
| A | www | 121.52.149.158 | 600 | WWW subdomain |

### After Cloudflare Setup

Nameservers will be changed to Cloudflare (e.g.):
- `adam.ns.cloudflare.com`
- `bella.ns.cloudflare.com`

(Actual nameservers provided by Cloudflare)

## GoDaddy DNS Management

1. Login to GoDaddy
2. My Products → Domains → robionix.com
3. Click "DNS" or "Manage DNS"

### Change Nameservers

1. Scroll to "Nameservers" section
2. Click "Change"
3. Select "I'll use my own nameservers"
4. Enter Cloudflare nameservers
5. Save

## Cloudflare Setup

### Benefits of Cloudflare

- ✅ Free CDN (faster website)
- ✅ DDoS protection
- ✅ Free SSL management
- ✅ Free email routing
- ✅ Analytics
- ✅ Caching

### Cloudflare Dashboard

- URL: https://dash.cloudflare.com
- Account: abdullahsaleem75911@gmail.com

## DNS Propagation

After changing nameservers:
- Takes 10 minutes to 48 hours
- Usually 10-30 minutes

### Check DNS Propagation

```bash
# Check nameservers
nslookup -type=NS robionix.com

# Check A record
nslookup robionix.com 8.8.8.8
dig robionix.com +short

# Online tool
# https://dnschecker.org
```

## Troubleshooting

### Website not loading after DNS change

1. Wait for propagation (up to 48 hours)
2. Clear browser cache
3. Try incognito mode
4. Check DNS: `nslookup robionix.com 8.8.8.8`

### SSL not working

1. Ensure DNS is pointing to correct IP
2. Check Cloudflare SSL settings (Full or Full Strict)
3. Renew certificate if needed

## Important Notes

- Keep GoDaddy account active (domain registration)
- DNS management moves to Cloudflare
- Don't delete the domain from GoDaddy
- Cloudflare only manages DNS, not domain registration
