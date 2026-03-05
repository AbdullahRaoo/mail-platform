# SSL Certificate Management

## Certificate Details

| Property | Value |
|----------|-------|
| Domain | robionix.com, www.robionix.com |
| Provider | Let's Encrypt |
| Certificate Path | /wp/robionix/certbot/conf/live/robionix.com/ |
| Expires | April 6, 2026 (90 days from issue) |
| Auto-Renewal | Yes (via Certbot container) |

## Certificate Files

```
/wp/robionix/certbot/conf/live/robionix.com/
├── fullchain.pem    # Full certificate chain
├── privkey.pem      # Private key
├── cert.pem         # Domain certificate
└── chain.pem        # Intermediate certificate
```

## Renewal Commands

### Automatic Renewal

The Certbot container automatically checks for renewal every 12 hours.

### Manual Renewal

```bash
cd /wp/robionix

# Stop nginx to free port 80
sudo docker-compose stop nginx

# Renew certificate
sudo docker run --rm -p 80:80 \
    -v /wp/robionix/certbot/conf:/etc/letsencrypt \
    certbot/certbot renew

# Start nginx
sudo docker-compose start nginx
```

### Force Renewal

```bash
cd /wp/robionix

sudo docker-compose stop nginx

sudo docker run --rm -p 80:80 \
    -v /wp/robionix/certbot/conf:/etc/letsencrypt \
    certbot/certbot certonly --standalone \
    --force-renewal \
    --email abdullahsaleem75911@gmail.com \
    --agree-tos \
    --no-eff-email \
    -d robionix.com -d www.robionix.com

sudo docker-compose start nginx
```

## Check Certificate Status

```bash
# View certificate expiry
sudo docker run --rm \
    -v /wp/robionix/certbot/conf:/etc/letsencrypt \
    certbot/certbot certificates

# Test SSL
curl -I https://robionix.com
```

## Nginx SSL Configuration

Location: `/wp/robionix/nginx/conf.d/robionix.conf`

```nginx
server {
    listen 443 ssl http2;
    server_name robionix.com www.robionix.com;

    ssl_certificate /etc/letsencrypt/live/robionix.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/robionix.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of config
}
```

## Troubleshooting

### Certificate renewal failed

```bash
# Check certbot logs
sudo docker-compose logs certbot

# Verify domain DNS
nslookup robionix.com 8.8.8.8

# Make sure port 80 is accessible
curl -I http://robionix.com/.well-known/acme-challenge/test
```

### SSL not working after renewal

```bash
# Restart nginx to load new certificate
sudo docker-compose restart nginx
```

## Important Dates

- **Issued:** January 6, 2026
- **Expires:** April 6, 2026
- **Renewal Window:** After March 7, 2026 (30 days before expiry)
