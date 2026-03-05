# Quick Reference & Commands

## SSH Access
```bash
ssh -p 222 nutechadmin@121.52.149.158
```

## Important Paths
```
/wp/robionix/                    # Main deployment directory
/wp/robionix/docker-compose.yml  # Docker configuration
/wp/robionix/.env                # Passwords & config
/wp/robionix/nginx/conf.d/       # Nginx config
```

## Docker Commands (Run from /wp/robionix/)
```bash
cd /wp/robionix

# Start all
sudo docker-compose up -d

# Stop all
sudo docker-compose down

# Restart all
sudo docker-compose restart

# View status
sudo docker-compose ps

# View logs
sudo docker-compose logs -f
sudo docker-compose logs nginx --tail 50
```

## Website URLs
```
https://robionix.com              # Main site
https://robionix.com/wp-admin     # Admin panel
```

## Server IPs & Ports
```
Server IP:    121.52.149.158
SSH Port:     222
HTTP Port:    80
HTTPS Port:   443
```

## DNS (Cloudflare)
```
Dashboard:    https://dash.cloudflare.com
Domain:       robionix.com
```

## Email
```
Type:         Cloudflare Email Routing (Free)
Forwards to:  Your Gmail account
```

## SSL Certificate
```
Provider:     Let's Encrypt
Expires:      April 6, 2026
Auto-renew:   Yes
```

## Emergency Commands

### Restart everything
```bash
cd /wp/robionix && sudo docker-compose restart
```

### Check what's wrong
```bash
sudo docker-compose ps
sudo docker-compose logs --tail 50
```

### Can't access website
```bash
# Check containers
sudo docker-compose ps

# Check if ports are open
sudo ufw status

# Restart stack
sudo docker-compose down && sudo docker-compose up -d
```

### Database issues
```bash
sudo docker-compose logs db --tail 50
sudo docker-compose restart db
sleep 30
sudo docker-compose restart wordpress
```

## Backup Quick Commands
```bash
# Backup database
sudo docker exec robionix_mysql mysqldump -u root -p wordpress_db > backup.sql

# Backup files
sudo docker run --rm -v robionix_wordpress_data:/data -v $(pwd):/backup ubuntu tar czf /backup/files.tar.gz /data
```

## Contact & Support
- VPS Provider: [Your VPS Provider]
- Domain: GoDaddy
- DNS/CDN: Cloudflare
- SSL: Let's Encrypt
