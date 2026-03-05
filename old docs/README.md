# Robionix Documentation

Complete documentation for robionix.com website deployment and management.

## Documentation Index

| # | Document | Description |
|---|----------|-------------|
| 01 | [VPS Server Info](./01-VPS-SERVER-INFO.md) | Server details, SSH access, firewall |
| 02 | [Docker Deployment](./02-DOCKER-DEPLOYMENT.md) | Docker setup, commands, configuration |
| 03 | [SSL Certificates](./03-SSL-CERTIFICATES.md) | Let's Encrypt SSL management |
| 04 | [Domain & DNS](./04-DOMAIN-DNS-CONFIG.md) | Domain settings, DNS records, Cloudflare |
| 05 | [Email Configuration](./05-EMAIL-CONFIGURATION.md) | Cloudflare email routing setup |
| 06 | [WordPress Admin](./06-WORDPRESS-ADMIN.md) | WordPress management, backups |
| 07 | [Quick Reference](./07-QUICK-REFERENCE.md) | Common commands & quick access |

## Quick Start

### Access Server
```bash
ssh -p 222 nutechadmin@121.52.149.158
```

### Access Website
- **Site:** https://robionix.com
- **Admin:** https://robionix.com/wp-admin

### Manage Docker
```bash
cd /wp/robionix
sudo docker-compose ps          # Status
sudo docker-compose restart     # Restart
sudo docker-compose logs -f     # Logs
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLOUDFLARE                           │
│            (DNS, CDN, Email Routing)                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              VPS: 121.52.149.158                        │
│  ┌────────────────────────────────────────────────┐    │
│  │                   DOCKER                        │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │    │
│  │  │  Nginx   │  │WordPress │  │    MySQL     │ │    │
│  │  │ :80/:443 │→ │  :8080   │→ │    :3306     │ │    │
│  │  └──────────┘  └──────────┘  └──────────────┘ │    │
│  │       ↑                                        │    │
│  │  ┌──────────┐                                  │    │
│  │  │ Certbot  │ (SSL auto-renewal)               │    │
│  │  └──────────┘                                  │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Important Credentials

⚠️ **Never share these publicly!**

| Service | Location |
|---------|----------|
| VPS SSH | This doc (password protected) |
| MySQL Passwords | `/wp/robionix/.env` on VPS |
| WordPress Admin | https://robionix.com/wp-admin |
| Cloudflare | https://dash.cloudflare.com |
| GoDaddy | https://godaddy.com |

## Maintenance Schedule

| Task | Frequency | How |
|------|-----------|-----|
| SSL Renewal | Automatic | Certbot handles it |
| WordPress Updates | Weekly | Admin dashboard |
| Backups | Weekly | See backup docs |
| Security Scan | Monthly | Wordfence plugin |

## Support Contacts

- **VPS Issues:** VPS Provider support
- **Domain Issues:** GoDaddy support
- **DNS/Email Issues:** Cloudflare support

---

*Last Updated: January 2026*
