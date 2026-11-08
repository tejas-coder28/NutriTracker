# NutriTrack AI - VPS Deployment Guide

This guide walks you step-by-step through setting up and running **NutriTrack AI** on a $5–$6/month Ubuntu VPS (e.g. DigitalOcean, Hetzner, or Linode).

---

## 1. VPS Provisioning & Initial Setup

1. **Create Ubuntu VPS Droplet / Server**:
   - OS: **Ubuntu 22.04 LTS** or **24.04 LTS**
   - Plan: 1GB RAM / 1 vCPU (Plenty for solo/personal use)
   - Authentication: SSH key only (disable root password auth)

2. **SSH into your VPS**:
   ```bash
   ssh root@YOUR_VPS_IP
   ```

3. **System Security & Firewall Setup**:
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

---

## 2. Install Node.js & Dependencies

```bash
# Install Node.js 20+ LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git pm2

# Verify installation
node -v
npm -v
pm2 -v
```

---

## 3. Clone Repository & Setup Backend

```bash
# Create application directory
sudo mkdir -p /var/www/nutritrack
sudo chown -R $USER:$USER /var/www/nutritrack

# Clone or copy codebase
cd /var/www/nutritrack
git clone <YOUR_GIT_REPO_URL> .

# Setup backend environment variables
cd /var/www/nutritrack/backend
npm install --production

# Create .env file
nano .env
```

Paste your production secrets into `.env`:
```env
PORT=5000
JWT_SECRET=your_super_strong_random_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
GEMINI_MODEL=gemini-2.5-flash
DB_PATH=./nutritrack.sqlite
UPLOADS_DIR=./uploads
```

---

## 4. Run Process Persistently with PM2

```bash
cd /var/www/nutritrack
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup
```

*PM2 will automatically restart your app on system reboots or unhandled crashes.*

---

## 5. Configure Nginx Reverse Proxy & Free SSL

1. **Configure Nginx Site**:
   ```bash
   sudo cp /var/www/nutritrack/deploy/nginx.conf /etc/nginx/sites-available/nutritrack
   sudo ln -s /etc/nginx/sites-available/nutritrack /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl reload nginx
   ```

2. **Obtain Free Let's Encrypt HTTPS Certificate**:
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

---

## 6. Setup Automated SQLite & Uploads Cron Backups

```bash
# Grant execution permissions
chmod +x /var/www/nutritrack/deploy/backup.sh

# Edit crontab
crontab -e
```

Add the daily 3 AM backup line:
```cron
0 3 * * * /var/www/nutritrack/deploy/backup.sh > /dev/null 2>&1
```

---

## 7. Connecting Your Mobile App

Open **Profile** -> **VPS / Server Connection** in the NutriTrack AI mobile app and enter your VPS HTTPS endpoint:
`https://api.yourdomain.com` (or `http://YOUR_VPS_IP:5000` for raw IP access).
