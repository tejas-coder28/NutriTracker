#!/bin/bash

# NutriTrack AI - Automated SQLite & Uploads Backup Script
# Place this script on VPS at /var/www/nutritrack/deploy/backup.sh
# Add to crontab: 0 3 * * * /var/www/nutritrack/deploy/backup.sh > /dev/null 2>&1

BACKUP_DIR="/var/backups/nutritrack"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
APP_DIR="/var/www/nutritrack/backend"

mkdir -p "$BACKUP_DIR"

echo "Starting NutriTrack AI Backup [$DATE]..."

# 1. Safely copy SQLite database file
if [ -f "$APP_DIR/nutritrack.sqlite" ]; then
    cp "$APP_DIR/nutritrack.sqlite" "$BACKUP_DIR/nutritrack_$DATE.sqlite"
    echo "SQLite database backed up to $BACKUP_DIR/nutritrack_$DATE.sqlite"
fi

# 2. Archive user uploaded food photos
if [ -d "$APP_DIR/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C "$APP_DIR" uploads
    echo "Uploads directory archived to $BACKUP_DIR/uploads_$DATE.tar.gz"
fi

# 3. Prune backups older than 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "Backup complete!"
