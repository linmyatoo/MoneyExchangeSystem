#!/bin/bash

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/ems_backup_${TIMESTAMP}.sql"
CONTAINER_NAME="moneyexchangesystem-db-1" # Update this to your actual DB container name from docker-compose ps
DB_USER="postgres"
DB_NAME="ems_db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Run pg_dump inside the docker container
echo "Starting backup to ${BACKUP_FILE}..."
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" -F c > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Backup completed successfully."
    # Optional: Keep only last 7 days of backups
    find "$BACKUP_DIR" -type f -name "*.sql" -mtime +7 -delete
    echo "Old backups cleaned up."
else
    echo "Backup failed!"
    exit 1
fi
