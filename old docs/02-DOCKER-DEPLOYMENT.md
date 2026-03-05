# Docker WordPress Deployment

## Stack Overview

| Service | Image | Container Name | Port |
|---------|-------|----------------|------|
| MySQL | mysql:5.7 | robionix_mysql | 3306 (internal) |
| WordPress | wordpress:latest | robionix_wordpress | 8080 (internal) |
| Nginx | nginx:alpine | robionix_nginx | 80, 443 |
| Certbot | certbot/certbot | robionix_certbot | - |

## File Locations

```
/wp/robionix/
├── docker-compose.yml    # Main Docker configuration
├── .env                  # Environment variables (passwords)
├── uploads.ini           # PHP upload settings
├── nginx/
│   └── conf.d/
│       └── robionix.conf # Nginx site configuration
└── certbot/
    └── conf/             # SSL certificates
        └── live/
            └── robionix.com/
                ├── fullchain.pem
                └── privkey.pem
```

## Docker Commands

### Basic Operations

```bash
# Navigate to project
cd /wp/robionix

# Start all services
sudo docker-compose up -d

# Stop all services
sudo docker-compose down

# Restart all services
sudo docker-compose restart

# Restart specific service
sudo docker-compose restart nginx
sudo docker-compose restart wordpress

# View running containers
sudo docker-compose ps

# View logs
sudo docker-compose logs -f
sudo docker-compose logs nginx --tail 50
sudo docker-compose logs wordpress --tail 50
sudo docker-compose logs db --tail 50
```

### Maintenance

```bash
# Update images
sudo docker-compose pull
sudo docker-compose up -d

# Remove unused images
sudo docker image prune -a

# Check disk usage
sudo docker system df
```

## Database Information

| Property | Value |
|----------|-------|
| Database Name | wordpress_db |
| Database User | wordpress_user |
| Database Password | (check /wp/robionix/.env) |
| Root Password | (check /wp/robionix/.env) |
| Host | db:3306 (internal Docker network) |

### Database Commands

```bash
# Access MySQL CLI
sudo docker exec -it robionix_mysql mysql -u root -p

# Backup database
sudo docker exec robionix_mysql mysqldump -u root -p wordpress_db > backup.sql

# Restore database
sudo docker exec -i robionix_mysql mysql -u root -p wordpress_db < backup.sql
```

## Environment Variables (.env)

```bash
# View current .env
cat /wp/robionix/.env
```

**Never share or commit the .env file!**

## PHP Configuration (uploads.ini)

```ini
file_uploads = On
memory_limit = 256M
upload_max_filesize = 64M
post_max_size = 64M
max_execution_time = 600
```

## WordPress Configuration

WordPress is configured with:
- Memory Limit: 256M
- Max Memory Limit: 512M

## Troubleshooting

### Container won't start

```bash
# Check logs
sudo docker-compose logs [service_name]

# Recreate containers
sudo docker-compose down
sudo docker-compose up -d
```

### Database connection error

```bash
# Check if MySQL is running
sudo docker-compose ps
sudo docker-compose logs db

# Restart database
sudo docker-compose restart db
sleep 30
sudo docker-compose restart wordpress
```

### Port already in use

```bash
# Check what's using port 80
sudo lsof -i :80

# Stop Apache if running
sudo systemctl stop apache2
sudo systemctl disable apache2
```

## Notes

- MySQL 5.7 is used because the VPS CPU doesn't support x86-64-v2 required by MySQL 8.0
- Nginx handles SSL termination and proxies to WordPress
- Certbot auto-renews SSL certificates
