# WordPress Administration

## Access URLs

| Purpose | URL |
|---------|-----|
| Website | https://robionix.com |
| Admin Dashboard | https://robionix.com/wp-admin |
| Login | https://robionix.com/wp-login.php |

## WordPress Database

| Property | Value |
|----------|-------|
| Database | wordpress_db |
| User | wordpress_user |
| Password | (check /wp/robionix/.env on VPS) |
| Host | db:3306 |

## Update Site URL (If needed)

If WordPress URLs need to be changed:

```bash
# SSH into VPS
ssh -p 222 nutechadmin@121.52.149.158

# Get the actual password from .env
cat /wp/robionix/.env

# Update URLs (replace PASSWORD with actual)
sudo docker exec robionix_mysql mysql -u root -pPASSWORD wordpress_db \
    -e "UPDATE wp_options SET option_value = 'https://robionix.com' WHERE option_name = 'siteurl';"

sudo docker exec robionix_mysql mysql -u root -pPASSWORD wordpress_db \
    -e "UPDATE wp_options SET option_value = 'https://robionix.com' WHERE option_name = 'home';"

# Verify
sudo docker exec robionix_mysql mysql -u root -pPASSWORD wordpress_db \
    -e "SELECT option_name, option_value FROM wp_options WHERE option_name IN ('siteurl', 'home');"
```

## Search-Replace URLs

If you have hardcoded IP addresses in content:

```bash
# Install WP-CLI
sudo docker exec -it robionix_wordpress bash -c \
    "curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar && \
     chmod +x wp-cli.phar && mv wp-cli.phar /usr/local/bin/wp"

# Search-replace URLs
sudo docker exec -it robionix_wordpress wp --allow-root \
    search-replace 'http://121.52.149.158' 'https://robionix.com'

sudo docker exec -it robionix_wordpress wp --allow-root \
    search-replace 'https://121.52.149.158' 'https://robionix.com'
```

## File Uploads

### PHP Limits (already configured)
- Max upload: 64MB
- Post max: 64MB
- Memory: 256MB
- Execution time: 600 seconds

### Upload Location
WordPress uploads are stored in Docker volume:
- Volume: `robionix_wordpress_data`
- Path inside container: `/var/www/html/wp-content/uploads/`

## Backup WordPress

### Database Backup
```bash
# Create backup
sudo docker exec robionix_mysql mysqldump -u root -pPASSWORD wordpress_db > /wp/robionix/backup-$(date +%Y%m%d).sql

# Download to local
scp -P 222 nutechadmin@121.52.149.158:/wp/robionix/backup-*.sql ./
```

### Files Backup
```bash
# Backup WordPress files
sudo docker run --rm \
    -v robionix_wordpress_data:/data \
    -v /wp/robionix:/backup \
    ubuntu tar czf /backup/wp-files-$(date +%Y%m%d).tar.gz /data
```

## Restore WordPress

### Database Restore
```bash
# Upload backup file to VPS first
sudo docker exec -i robionix_mysql mysql -u root -pPASSWORD wordpress_db < backup.sql
```

### Files Restore
```bash
sudo docker run --rm \
    -v robionix_wordpress_data:/data \
    -v /wp/robionix:/backup \
    ubuntu tar xzf /backup/wp-files-YYYYMMDD.tar.gz -C /
```

## Recommended Plugins

1. **All-in-One WP Migration** - Backup & migration
2. **Wordfence Security** - Security & firewall
3. **WP Super Cache** - Caching
4. **UpdraftPlus** - Automated backups
5. **Yoast SEO** - Search engine optimization

## Troubleshooting

### White screen of death
```bash
# Check WordPress logs
sudo docker-compose logs wordpress --tail 100

# Enable debug mode (edit wp-config.php)
sudo docker exec -it robionix_wordpress bash
nano /var/www/html/wp-config.php
# Add: define('WP_DEBUG', true);
```

### Can't login
```bash
# Reset admin password via database
sudo docker exec robionix_mysql mysql -u root -pPASSWORD wordpress_db \
    -e "UPDATE wp_users SET user_pass=MD5('newpassword') WHERE user_login='admin';"
```

### Permissions issues
```bash
# Fix file permissions
sudo docker exec -it robionix_wordpress chown -R www-data:www-data /var/www/html
sudo docker exec -it robionix_wordpress chmod -R 755 /var/www/html
```

## Performance Tips

1. Enable caching plugin
2. Optimize images before upload
3. Use Cloudflare CDN (automatic with Cloudflare)
4. Minimize plugins
5. Keep WordPress updated
