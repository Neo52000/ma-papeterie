#!/bin/bash
# =========================================================
# Script de déploiement CRM ma-papeterie.fr
# VPS : srv1475682.hstgr.cloud
# Exécuter en root sur le VPS
# =========================================================

set -e
INSTALL_DIR="/opt/crm-papeterie"
VPS_HOST="srv1475682.hstgr.cloud"

echo "========================================"
echo "  Déploiement CRM ma-papeterie.fr"
echo "  VPS : $VPS_HOST"
echo "========================================"

# ---- 1. Mise à jour système ----
echo "[1/10] Mise à jour système..."
apt-get update -qq && apt-get upgrade -y -qq

# ---- 2. Dépendances ----
echo "[2/10] Installation dépendances..."
apt-get install -y -qq curl wget git unzip ufw fail2ban certbot

# ---- 3. Docker ----
echo "[3/10] Installation Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "  Docker déjà installé : $(docker --version)"
fi

# Docker Compose plugin
apt-get install -y -qq docker-compose-plugin
echo "  Docker Compose : $(docker compose version)"

# ---- 4. Firewall ----
echo "[4/10] Configuration UFW..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "  Firewall configuré (ports 22, 80, 443)"

# ---- 5. Dossiers ----
echo "[5/10] Création structure dossiers..."
mkdir -p $INSTALL_DIR/{nginx/conf.d,n8n/data,uploads/{quotes,invoices},backups,logs}
cd $INSTALL_DIR

# ---- 6. Fichier .env ----
echo "[6/10] Génération .env..."
if [ ! -f "$INSTALL_DIR/.env" ]; then
    # Génération de secrets aléatoires
    JWT_SECRET=$(openssl rand -hex 32)
    JWT_REFRESH=$(openssl rand -hex 32)
    API_KEY=$(openssl rand -hex 24)
    N8N_ENC_KEY=$(openssl rand -hex 16)
    DB_PASS=$(openssl rand -hex 16)

    cat > $INSTALL_DIR/.env << EOF
# =============================================
# CRM ma-papeterie.fr — Configuration VPS
# Généré le $(date)
# =============================================

# PostgreSQL
POSTGRES_DB=crm_papeterie
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=$DB_PASS

# API
PORT=4000
NODE_ENV=production
DATABASE_URL=postgresql://crm_user:$DB_PASS@postgres:5432/crm_papeterie
DATABASE_SSL=false
CORS_ORIGIN=https://$VPS_HOST

# JWT
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH

# API Key (pour n8n)
API_KEY=$API_KEY

# IA — remplir la clé API
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=REMPLIR_ICI
OPENAI_API_KEY=REMPLIR_ICI
ANTHROPIC_MODEL=claude-sonnet-4-6
OPENAI_MODEL=gpt-4o

# SMTP Hostinger
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contact@ma-papeterie.fr
SMTP_PASS=REMPLIR_ICI
SMTP_FROM_NAME=ma-papeterie.fr

# IMAP Hostinger
IMAP_HOST=imap.hostinger.com
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=contact@ma-papeterie.fr
IMAP_PASS=REMPLIR_ICI

# API INSEE Sirene
INSEE_API_TOKEN=REMPLIR_ICI

# n8n
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=REMPLIR_ICI
N8N_HOST=$VPS_HOST
N8N_PORT=5678
N8N_PROTOCOL=https
N8N_PATH=/n8n/
WEBHOOK_URL=https://$VPS_HOST/n8n/
N8N_EDITOR_BASE_URL=https://$VPS_HOST/n8n/
N8N_ENCRYPTION_KEY=$N8N_ENC_KEY

# URLs
FRONTEND_URL=https://$VPS_HOST
API_URL=https://$VPS_HOST/api
EOF

    chmod 600 $INSTALL_DIR/.env
    echo ""
    echo "  ⚠️  IMPORTANT : édite le .env avant de continuer !"
    echo "  → nano $INSTALL_DIR/.env"
    echo ""
    echo "  Valeurs à remplir obligatoirement :"
    echo "  - ANTHROPIC_API_KEY ou OPENAI_API_KEY"
    echo "  - SMTP_PASS (mot de passe email Hostinger)"
    echo "  - IMAP_PASS (même mot de passe)"
    echo "  - N8N_BASIC_AUTH_PASSWORD (ton mot de passe n8n)"
    echo "  - INSEE_API_TOKEN (optionnel au départ)"
    echo ""
    echo "  Appuie sur Entrée une fois le .env rempli..."
    read
else
    echo "  .env existant conservé"
fi

# ---- 7. Nginx config ----
echo "[7/10] Configuration Nginx..."
cat > $INSTALL_DIR/nginx/conf.d/crm.conf << 'NGINX'
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;

server {
    listen 80;
    server_name $VPS_HOST;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $VPS_HOST;

    ssl_certificate /etc/letsencrypt/live/$VPS_HOST/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$VPS_HOST/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    client_max_body_size 10M;

    # n8n
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

    # API CRM
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://crm_api:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Uploads PDF
    location /uploads/ {
        alias /opt/crm-papeterie/uploads/;
    }

    # Frontend CRM
    location / {
        proxy_pass http://crm_frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

# ---- 8. SSL ----
echo "[8/10] Certificat SSL Let's Encrypt..."
if [ ! -d "/etc/letsencrypt/live/$VPS_HOST" ]; then
    certbot certonly --standalone \
        -d $VPS_HOST \
        --email contact@ma-papeterie.fr \
        --agree-tos \
        --no-eff-email \
        --non-interactive
    echo "  Certificat SSL obtenu"
else
    echo "  Certificat SSL existant conservé"
fi

# Renouvellement automatique
CRON_LINE="0 3 * * * root certbot renew --quiet --deploy-hook 'docker compose -f $INSTALL_DIR/docker-compose.yml restart nginx'"
grep -qF "certbot renew" /etc/crontab || echo "$CRON_LINE" >> /etc/crontab

# ---- 9. docker-compose.yml ----
echo "[9/10] Génération docker-compose.yml..."
cat > $INSTALL_DIR/docker-compose.yml << 'COMPOSE'
version: "3.9"

# Base de données : Supabase (cloud) — pas de container postgres local
# DATABASE_URL doit pointer vers db.[ref].supabase.co dans le .env

services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: crm_api
    restart: unless-stopped
    env_file: .env
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    networks:
      - crm_net
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://$VPS_HOST/api
        NEXT_PUBLIC_N8N_URL: https://$VPS_HOST/n8n
    container_name: crm_frontend
    restart: unless-stopped
    env_file: .env
    environment:
      NEXT_PUBLIC_API_URL: https://$VPS_HOST/api
      NEXT_PUBLIC_N8N_URL: https://$VPS_HOST/n8n
      PORT: 3000
    depends_on:
      - api
    networks:
      - crm_net

  n8n:
    image: n8nio/n8n:latest
    container_name: crm_n8n
    restart: unless-stopped
    env_file: .env
    environment:
      # n8n utilise Supabase via DATABASE_URL (même base que l'API CRM)
      DB_TYPE: postgresdb
      DB_POSTGRESDB_CONNECTION_URL: ${DATABASE_URL}
      N8N_HOST: $VPS_HOST
      N8N_PORT: 5678
      N8N_PROTOCOL: https
      N8N_PATH: /n8n/
      WEBHOOK_URL: https://$VPS_HOST/n8n/
      N8N_EDITOR_BASE_URL: https://$VPS_HOST/n8n/
    volumes:
      - ./n8n/data:/home/node/.n8n
    networks:
      - crm_net

  nginx:
    image: nginx:stable-alpine
    container_name: crm_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - ./uploads:/opt/crm-papeterie/uploads:ro
    depends_on:
      - frontend
      - api
      - n8n
    networks:
      - crm_net

networks:
  crm_net:
    driver: bridge
COMPOSE

# ---- 10. Backup cron ----
echo "[10/10] Configuration backup quotidien..."
cat > $INSTALL_DIR/backup.sh << 'BACKUP'
#!/bin/bash
BACKUP_DIR="/opt/crm-papeterie/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker exec papeterie-db pg_dump -U crm_user crm_papeterie \
  | gzip > "$BACKUP_DIR/crm_$DATE.sql.gz"
find "$BACKUP_DIR" -name "crm_*.sql.gz" -mtime +30 -delete
echo "[$(date)] Backup: crm_$DATE.sql.gz"
BACKUP
chmod +x $INSTALL_DIR/backup.sh
grep -qF "backup.sh" /etc/crontab || \
    echo "0 3 * * * root $INSTALL_DIR/backup.sh >> $INSTALL_DIR/logs/backup.log 2>&1" >> /etc/crontab

echo ""
echo "========================================"
echo "  Configuration terminée !"
echo "========================================"
echo ""
echo "  Étapes suivantes :"
echo ""
echo "  1. Copier les fichiers backend/ et frontend/ dans $INSTALL_DIR/"
echo "     (depuis ton poste via scp ou git clone)"
echo ""
echo "  2. Initialiser la base Supabase :"
echo "     → Supabase Dashboard → SQL Editor → New query"
echo "     → Copier le contenu de crm_ma_papeterie/database.sql → Run"
echo ""
echo "  3. Démarrer tous les services :"
echo "     docker compose up -d"
echo ""
echo "  4. Vérifier :"
echo "     docker compose ps"
echo "     docker compose logs -f"
echo ""
echo "  URLs :"
echo "  → CRM  : https://srv1475682.hstgr.cloud"
echo "  → API  : https://srv1475682.hstgr.cloud/api/health"
echo "  → n8n  : https://srv1475682.hstgr.cloud/n8n"
echo ""
echo "  Clé API pour n8n : $(grep API_KEY $INSTALL_DIR/.env | grep -v N8N | cut -d= -f2)"
echo ""
