# DevOps VPS Hostinger — CRM ma-papeterie.fr

> **VPS :** `srv1475682.hstgr.cloud`


## Prérequis

- VPS Hostinger : Ubuntu 22.04 LTS minimum (recommandé : 4 vCPU, 8 Go RAM, 100 Go SSD)
- Accès SSH root
- Nom de domaine pointant vers l'IP du VPS (ex: `srv1475682.hstgr.cloud`)
- Ports 80 et 443 ouverts chez Hostinger

---

## 1. Connexion initiale et mise à jour

```bash
ssh root@<IP_VPS>
apt update && apt upgrade -y
apt install -y curl wget git unzip ufw fail2ban
```

---

## 2. Firewall UFW

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
ufw status
```

---

## 3. Installation Docker + Docker Compose

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# Docker Compose plugin
apt install -y docker-compose-plugin
docker compose version
```

---

## 4. Structure des dossiers

```bash
mkdir -p /opt/crm-papeterie/{nginx/conf.d,nginx/ssl,postgres/data,n8n/data,uploads,backups,logs}
cd /opt/crm-papeterie
```

---

## 5. Variables d'environnement

Créer `/opt/crm-papeterie/.env` :

```bash
cat > /opt/crm-papeterie/.env << 'EOF'
# --- Base de données ---
POSTGRES_DB=crm_papeterie
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE

# --- API CRM ---
CRM_API_KEY=CHANGE_ME_RANDOM_32_CHARS
JWT_SECRET=CHANGE_ME_RANDOM_64_CHARS
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://crm_user:CHANGE_ME_STRONG_PASSWORD_HERE@postgres:5432/crm_papeterie

# --- n8n ---
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=CHANGE_ME_N8N_PASSWORD
N8N_HOST=srv1475682.hstgr.cloud
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://srv1475682.hstgr.cloud/
N8N_ENCRYPTION_KEY=CHANGE_ME_RANDOM_32_CHARS

# --- Email SMTP/IMAP Hostinger ---
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=contact@ma-papeterie.fr
SMTP_PASS=CHANGE_ME_EMAIL_PASSWORD
IMAP_HOST=imap.hostinger.com
IMAP_PORT=993
IMAP_SECURE=true

# --- IA ---
AI_PROVIDER=anthropic       # ou openai
ANTHROPIC_API_KEY=sk-ant-CHANGE_ME
OPENAI_API_KEY=sk-CHANGE_ME

# --- API Sirene INSEE ---
INSEE_API_TOKEN=CHANGE_ME_INSEE_TOKEN

# --- Domaines ---
FRONTEND_URL=https://srv1475682.hstgr.cloud
API_URL=https://srv1475682.hstgr.cloud/api
EOF

chmod 600 /opt/crm-papeterie/.env
```

---

## 6. docker-compose.yml

```yaml
# /opt/crm-papeterie/docker-compose.yml

version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: crm_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./postgres/data:/var/lib/postgresql/data
      - ./database.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
    networks:
      - crm_internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: crm_api
    restart: unless-stopped
    env_file: .env
    environment:
      NODE_ENV: production
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - crm_internal
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: crm_frontend
    restart: unless-stopped
    env_file: .env
    environment:
      NEXT_PUBLIC_API_URL: ${API_URL}
    depends_on:
      - api
    networks:
      - crm_internal

  n8n:
    image: n8nio/n8n:latest
    container_name: crm_n8n
    restart: unless-stopped
    env_file: .env
    environment:
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: ${POSTGRES_DB}
      DB_POSTGRESDB_USER: ${POSTGRES_USER}
      DB_POSTGRESDB_PASSWORD: ${POSTGRES_PASSWORD}
      N8N_HOST: srv1475682.hstgr.cloud
      N8N_PORT: 5678
      N8N_PROTOCOL: https
      N8N_PATH: /n8n/
      WEBHOOK_URL: https://srv1475682.hstgr.cloud/n8n/
      N8N_EDITOR_BASE_URL: https://srv1475682.hstgr.cloud/n8n/
    volumes:
      - ./n8n/data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - crm_internal

  nginx:
    image: nginx:stable-alpine
    container_name: crm_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - frontend
      - api
      - n8n
    networks:
      - crm_internal
      - crm_external

networks:
  crm_internal:
    driver: bridge
  crm_external:
    driver: bridge
```

---

## 7. Configuration Nginx

> **Routing sur un seul domaine `srv1475682.hstgr.cloud` :**
> - `/` → CRM Frontend
> - `/api/` → Backend Node.js
> - `/n8n/` → n8n (existant sur le VPS)

```nginx
# /opt/crm-papeterie/nginx/conf.d/crm.conf

limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;

# Redirection HTTP → HTTPS
server {
    listen 80;
    server_name srv1475682.hstgr.cloud;
    return 301 https://$host$request_uri;
}

# Serveur principal — CRM + API + n8n
server {
    listen 443 ssl http2;
    server_name srv1475682.hstgr.cloud;

    ssl_certificate /etc/letsencrypt/live/srv1475682.hstgr.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/srv1475682.hstgr.cloud/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # n8n — accessible sur https://srv1475682.hstgr.cloud/n8n/
    location /n8n/ {
        proxy_pass http://crm_n8n:5678/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        chunked_transfer_encoding on;
    }

    # API Node.js
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://crm_api:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Fichiers uploadés
    location /uploads/ {
        alias /opt/crm-papeterie/uploads/;
        internal;
    }

    # Frontend Next.js (tout le reste)
    location / {
        proxy_pass http://crm_frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 8. SSL Let's Encrypt

```bash
apt install -y certbot
certbot certonly --standalone -d srv1475682.hstgr.cloud -d srv1475682.hstgr.cloud \
  --email contact@ma-papeterie.fr --agree-tos --no-eff-email

# Renouvellement automatique
echo "0 3 * * * root certbot renew --quiet --post-hook 'docker compose -f /opt/crm-papeterie/docker-compose.yml restart nginx'" >> /etc/crontab
```

---

## 9. Déploiement initial

```bash
cd /opt/crm-papeterie

# Construire et démarrer
docker compose up -d --build

# Vérifier les logs
docker compose logs -f

# Vérifier les services
docker compose ps
```

---

## 10. Backup automatique PostgreSQL

```bash
# Créer le script de backup
cat > /opt/crm-papeterie/backup.sh << 'BACKUP'
#!/bin/bash
set -e
BACKUP_DIR="/opt/crm-papeterie/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="crm_backup_${DATE}.sql.gz"
RETAIN_DAYS=30

# Export PostgreSQL
docker exec crm_postgres pg_dump \
  -U crm_user crm_papeterie | gzip > "${BACKUP_DIR}/${FILENAME}"

# Supprimer les backups anciens
find "${BACKUP_DIR}" -name "crm_backup_*.sql.gz" -mtime +${RETAIN_DAYS} -delete

echo "[$(date)] Backup réussi : ${FILENAME}"
BACKUP

chmod +x /opt/crm-papeterie/backup.sh

# Cron quotidien à 3h
echo "0 3 * * * root /opt/crm-papeterie/backup.sh >> /opt/crm-papeterie/logs/backup.log 2>&1" >> /etc/crontab
```

---

## 11. Commandes de maintenance

```bash
# Voir les logs d'un service
docker compose logs -f api
docker compose logs -f n8n

# Redémarrer un service
docker compose restart api

# Mettre à jour et redéployer
git pull
docker compose up -d --build api frontend

# Restaurer un backup
gunzip -c /opt/crm-papeterie/backups/crm_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i crm_postgres psql -U crm_user crm_papeterie

# Accéder à PostgreSQL en CLI
docker exec -it crm_postgres psql -U crm_user -d crm_papeterie

# Importer les workflows n8n
# Via l'interface web n8n → Settings → Import workflow

# Vérifier l'espace disque
df -h
docker system df
```

---

## 12. Monitoring minimal

```bash
# Script de vérification santé (à mettre en cron toutes les 5 min)
cat > /opt/crm-papeterie/healthcheck.sh << 'HC'
#!/bin/bash
API_URL="http://localhost/api/health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${API_URL})
if [ "$STATUS" != "200" ]; then
  echo "[$(date)] ALERTE : API CRM down (status $STATUS)" | \
    mail -s "CRM ALERTE" contact@ma-papeterie.fr
fi
HC
chmod +x /opt/crm-papeterie/healthcheck.sh
echo "*/5 * * * * root /opt/crm-papeterie/healthcheck.sh" >> /etc/crontab
```

---

## Récapitulatif des URLs

| Service   | URL                                   |
|-----------|---------------------------------------|
| CRM App   | https://srv1475682.hstgr.cloud           |
| API       | https://srv1475682.hstgr.cloud/api       |
| n8n       | https://srv1475682.hstgr.cloud           |
