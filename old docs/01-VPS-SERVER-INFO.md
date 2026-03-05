# VPS Server Information

## Server Details

| Property | Value |
|----------|-------|
| **Provider** | Custom VPS |
| **IP Address** | 121.52.149.158 |
| **SSH Port** | 222 |
| **OS** | Ubuntu 24.04 LTS |
| **Username** | nutechadmin |

## SSH Access

```bash
ssh -p 222 nutechadmin@121.52.149.158
```

## Server Specifications

- Check RAM: `free -h`
- Check Disk: `df -h`
- Check CPU: `lscpu`

## Firewall Rules (UFW)

| Port | Service | Status |
|------|---------|--------|
| 22 | SSH (custom 222) | Allowed |
| 80 | HTTP | Allowed |
| 443 | HTTPS | Allowed |

### Firewall Commands

```bash
# Check status
sudo ufw status

# Allow port
sudo ufw allow 80/tcp

# Deny port
sudo ufw deny 8080/tcp
```

## Important Paths

| Path | Description |
|------|-------------|
| `/wp/robionix/` | WordPress Docker deployment |
| `/wp/robionix/docker-compose.yml` | Docker configuration |
| `/wp/robionix/.env` | Environment variables |
| `/wp/robionix/nginx/conf.d/` | Nginx configuration |
| `/wp/robionix/certbot/conf/` | SSL certificates |

## Services Running

- Docker
- Docker Compose
- UFW Firewall

## Notes

- Apache2 was disabled to free port 80/443 for Docker
- MySQL 5.7 is used (instead of 8.0) due to CPU compatibility
