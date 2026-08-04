# Deployment Guide

This guide explains how to deploy the Exchange Management System (EMS) to a production Ubuntu server using Docker Compose and Nginx.

## Prerequisites

1. **Ubuntu Server (22.04 LTS or newer)**
2. **Domain Name** (Optional, but required for HTTPS). Point your domain's A record to the server's public IP address.
3. **Docker & Docker Compose** installed on the server.

### Install Docker on Ubuntu
If Docker is not installed, run:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```
*(Log out and log back in for the group change to take effect)*

## 1. Prepare the Server

Clone the repository to your production server:
```bash
git clone <your-repo-url> /opt/ems
cd /opt/ems
```

## 2. Environment Variables

Create the `.env` file in the root of the project:
```bash
cp .env.example .env
```

Edit the `.env` file and set secure values for production:
```ini
# .env
POSTGRES_USER=ems_admin
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=ems_db

# Security (Generate a strong secret key: openssl rand -hex 32)
SECRET_KEY=your_generated_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480 # 8 hours for office use

NEXT_PUBLIC_API_URL=/api/v1
```

## 3. Build and Start Services

Run the following command to build the production images and start the containers in detached mode:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

To view logs and ensure everything is running smoothly:
```bash
docker compose -f docker-compose.prod.yml logs -f
```

## 4. HTTPS & SSL Configuration (Optional but Recommended)

By default, the application runs on port `80` (HTTP). To secure it with HTTPS using Let's Encrypt:

1. Install Certbot:
   ```bash
   sudo apt install -y certbot
   ```
2. Stop Nginx temporarily to free up port 80:
   ```bash
   docker compose -f docker-compose.prod.yml stop nginx
   ```
3. Generate the certificate:
   ```bash
   sudo certbot certonly --standalone -d yourdomain.com
   ```
4. Update `nginx/nginx.conf`:
   - Uncomment the HTTPS block (port 443).
   - Ensure the `ssl_certificate` and `ssl_certificate_key` paths point correctly to your mapped volumes in `docker-compose.prod.yml` or host paths.
5. Restart the stack:
   ```bash
   docker compose -f docker-compose.prod.yml up -d nginx
   ```

## 5. Automated Database Backups

A backup script is provided at `scripts/backup_db.sh`. It connects to the PostgreSQL container and dumps the database.

1. Ensure the script is executable:
   ```bash
   chmod +x scripts/backup_db.sh
   ```
2. Test the script manually:
   ```bash
   ./scripts/backup_db.sh
   ```
3. Set up a Cron job to run daily at midnight. Open the crontab editor:
   ```bash
   crontab -e
   ```
4. Add the following line:
   ```cron
   0 0 * * * /opt/ems/scripts/backup_db.sh >> /var/log/ems_backup.log 2>&1
   ```

## 6. Health Checks

- Check backend API docs: `http://<your-server-ip>/docs`
- Check frontend: `http://<your-server-ip>/`

---
*Note for Internal Office Use: If the server is strictly accessible via Local Area Network (LAN), HTTPS configuration might not be necessary, but it is highly recommended if accessible remotely via VPN.*
