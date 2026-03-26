# ODCM Deployment Guide — HostGator Dedicated Server

This guide covers deploying the ODCM app (Next.js frontend + Express backend + PostgreSQL) on a HostGator dedicated server with cPanel/WHM.

---

## Table of Contents
1. [Server Access](#1-server-access)
2. [Install Node.js](#2-install-nodejs)
3. [Install PM2](#3-install-pm2)
4. [Install PostgreSQL](#4-install-postgresql)
5. [Create Database](#5-create-database)
6. [Fix PostgreSQL Authentication](#6-fix-postgresql-authentication)
7. [Upload Project](#7-upload-project)
8. [Configure Backend .env](#8-configure-backend-env)
9. [Configure Frontend .env](#9-configure-frontend-env)
10. [Sync Database Tables](#10-sync-database-tables)
11. [Build Frontend (Locally)](#11-build-frontend-locally)
12. [Upload .next Build to Server](#12-upload-next-build-to-server)
13. [Start Both Apps with PM2](#13-start-both-apps-with-pm2)
14. [Point Domain to Apps (Apache Proxy)](#14-point-domain-to-apps-apache-proxy)
15. [Add SSL](#15-add-ssl)
16. [Useful Commands](#16-useful-commands)
17. [Common Problems & Solutions](#17-common-problems--solutions)

---

## 1. Server Access

You have TWO terminals:
- **cPanel Terminal** — runs as your user (`ods`), limited permissions
- **WHM Terminal** — runs as `root`, full permissions. Use this for most tasks

To access WHM Terminal: WHM dashboard -> Server Configuration -> Terminal

---

## 2. Install Node.js

In WHM terminal:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
node -v   # Should show v20.x.x
```

---

## 3. Install PM2

PM2 keeps your apps running forever, even after server reboots.

```bash
npm install -g pm2
```

---

## 4. Install PostgreSQL

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

On AlmaLinux/CentOS (which your server uses):
```bash
yum install postgresql-server postgresql-contrib -y
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql
```

---

## 5. Create Database

```bash
sudo -u postgres psql
```

Inside PostgreSQL:
```sql
CREATE USER odcm_user WITH PASSWORD 'your_strong_password';
CREATE DATABASE odcms OWNER odcm_user;
GRANT ALL PRIVILEGES ON DATABASE odcms TO odcm_user;
\q
```

**IMPORTANT:** PostgreSQL lowercases unquoted names. `CREATE DATABASE ODCMS` actually creates `odcms`. Your .env must match: `PGDATABASE=odcms` (lowercase).

---

## 6. Fix PostgreSQL Authentication

### Problem
By default, PostgreSQL uses "peer" or "ident" authentication (checks Linux username, not password). Your app needs "md5" (password) authentication.

### Solution

**Step 1:** Find the config file:
```bash
sudo -u postgres psql -c "SHOW hba_file;"
```

**Step 2:** While still using peer auth, set passwords:
```bash
sudo -u postgres psql
```
```sql
ALTER USER postgres WITH PASSWORD 'your_postgres_password';
ALTER USER odcm_user WITH PASSWORD 'your_app_password';
\q
```
Note: If it says `ALTER ROLE` — that means it WORKED (success message).

**Step 3:** Edit the config file (use the path from Step 1):
```bash
nano /path/to/pg_hba.conf
```

Change `peer` and `ident` to `md5`:
```
local   all   all                md5
host    all   all   127.0.0.1/32   md5
host    all   all   ::1/128        md5
```

**Step 4:** Restart PostgreSQL:
```bash
systemctl restart postgresql
```

---

## 7. Upload Project

Option A — Git clone:
```bash
cd /home/ods/odcms.officedataghana.com
git clone https://github.com/Impulse69/ODCM.git
```

Option B — Upload via cPanel File Manager.

Then install dependencies:
```bash
cd /home/ods/odcms.officedataghana.com/ODCM
npm install
cd Backend && npm install && cd ..
cd Frontend && npm install && cd ..
```

---

## 8. Configure Backend .env

The .env file created on Windows may show as empty in `nano` due to line ending differences. Always rewrite it on the server:

```bash
cat > /home/ods/odcms.officedataghana.com/ODCM/Backend/.env << 'EOF'
PGUSER=odcm_user
PGPASSWORD=your_app_password
PGHOST=localhost
PGDATABASE=odcms
PGPORT=5432
PORT=5000
CORS_ORIGIN=https://odcms.officedataghana.com
JWT_SECRET=paste_your_secret_here
EOF
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output and paste it as `JWT_SECRET`.

Verify it saved:
```bash
cat /home/ods/odcms.officedataghana.com/ODCM/Backend/.env
```

### Problem: nano shows empty .env file
**Cause:** Windows creates files with `\r\n` line endings. Linux `nano` can't read them properly.
**Fix:** Always use `cat > file << 'EOF'` to rewrite the file on the server.

---

## 9. Configure Frontend .env

```bash
cat > /home/ods/odcms.officedataghana.com/ODCM/Frontend/.env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://odcms.officedataghana.com
EOF
```

---

## 10. Sync Database Tables

```bash
cd /home/ods/odcms.officedataghana.com/ODCM/Backend
npm run sync
```

You should see: "All tables are ready"

### Problem: "database ODCMS does not exist"
**Cause:** PostgreSQL lowercased the name to `odcms` but .env has `PGDATABASE=ODCMS`.
**Fix:** Change .env to `PGDATABASE=odcms` (lowercase).

### Problem: "ident authentication failed"
**Cause:** pg_hba.conf still uses `ident` instead of `md5`.
**Fix:** See [Step 6](#6-fix-postgresql-authentication).

---

## 11. Build Frontend (Locally)

### Problem: Server crashes during build
The server doesn't have enough RAM to build Next.js (you'll see "Segmentation fault (core dumped)"). You MUST build on your local computer.

On your Windows machine:
```bash
cd c:\Users\fawuz\Desktop\ODCM\Frontend
npm run build
```

This creates a `.next` folder. You need to upload this to the server.

### If you try building on server and it crashes:
You can try adding swap memory first:
```bash
swapoff /swapfile 2>/dev/null
rm /swapfile 2>/dev/null
dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```
Then: `NODE_OPTIONS="--max-old-space-size=1024" npm run build`

But if it still crashes, build locally.

---

## 12. Upload .next Build to Server

**Step 1:** On your Windows computer, go to `Frontend/` folder in File Explorer.
- Right-click the `.next` folder -> Compress to ZIP

**Step 2:** Open cPanel File Manager in browser.
- Navigate to: `/home/ods/odcms.officedataghana.com/ODCM/Frontend/`
- Click Upload -> upload the .next.zip file
- Right-click the uploaded zip -> Extract

**Step 3:** In WHM terminal:
```bash
pm2 restart odcm-frontend
```

### Permission errors when building on server
If you see `EACCES: permission denied, mkdir '.next'`:
- Use WHM terminal (root) instead of cPanel terminal
- Or fix permissions: `chown -R ods:ods /home/ods/odcms.officedataghana.com/ODCM/`

Note: `sudo` does NOT work in cPanel terminal. Always use WHM terminal for commands that need root.

---

## 13. Start Both Apps with PM2

```bash
cd /home/ods/odcms.officedataghana.com/ODCM
pm2 start ecosystem.config.js
```

This starts both backend (port 5000) and frontend (port 3000).

Make them survive reboots:
```bash
pm2 save
pm2 startup
```
Run whatever command `pm2 startup` outputs.

### Verify they're running:
```bash
pm2 status
```
Both should show "online" with 0 restarts.

### If frontend shows hundreds of restarts:
It's crashing because `.next` folder is missing. See [Step 12](#12-upload-next-build-to-server).

---

## 14. Point Domain to Apps (Apache Proxy)

Your server uses Apache (managed by cPanel). You need to tell Apache to forward requests to your Node.js apps.

### DO NOT use .htaccess for proxy
The `[P]` proxy flag in `.htaccess` causes 500 Internal Server Error on cPanel servers.

### Use cPanel's Apache include system instead:

```bash
mkdir -p /etc/apache2/conf.d/userdata/std/2_4/ods/odcms.officedataghana.com
```

```bash
cat > /etc/apache2/conf.d/userdata/std/2_4/ods/odcms.officedataghana.com/proxy.conf << 'EOF'
ProxyPreserveHost On
ProxyPass /api/ http://localhost:5000/api/
ProxyPassReverse /api/ http://localhost:5000/api/
ProxyPass / http://localhost:3000/
ProxyPassReverse / http://localhost:3000/
EOF
```

For HTTPS too:
```bash
mkdir -p /etc/apache2/conf.d/userdata/ssl/2_4/ods/odcms.officedataghana.com
```

```bash
cat > /etc/apache2/conf.d/userdata/ssl/2_4/ods/odcms.officedataghana.com/proxy.conf << 'EOF'
ProxyPreserveHost On
ProxyPass /api/ http://localhost:5000/api/
ProxyPassReverse /api/ http://localhost:5000/api/
ProxyPass / http://localhost:3000/
ProxyPassReverse / http://localhost:3000/
EOF
```

Rebuild and restart:
```bash
/scripts/rebuildhttpdconf
systemctl restart httpd
```

### Verify proxy modules are loaded:
```bash
httpd -M 2>/dev/null | grep proxy
```
You should see `proxy_module` and `proxy_http_module`.

---

## 15. Add SSL

```bash
certbot --apache -d odcms.officedataghana.com
```

Or use cPanel's AutoSSL (in WHM -> SSL/TLS -> AutoSSL).

---

## 16. Useful Commands

### PM2 (App Management)
| Command | What it does |
|---|---|
| `pm2 status` | See if apps are running |
| `pm2 logs` | See live logs from both |
| `pm2 logs odcm-backend --lines 20` | Last 20 backend log lines |
| `pm2 logs odcm-frontend --lines 20` | Last 20 frontend log lines |
| `pm2 restart all` | Restart both apps |
| `pm2 restart odcm-backend` | Restart backend only |
| `pm2 restart odcm-frontend` | Restart frontend only |
| `pm2 stop all` | Stop both |
| `pm2 delete all` | Remove both from PM2 |
| `pm2 save` | Save current state for reboots |

### Testing
| Command | What it does |
|---|---|
| `curl -s http://localhost:5000` | Test backend is running |
| `curl -s http://localhost:5000/api/test-db` | Test backend + database |
| `curl -s http://localhost:3000` | Test frontend is running |

### PostgreSQL
| Command | What it does |
|---|---|
| `sudo -u postgres psql` | Enter PostgreSQL |
| `\l` | List all databases |
| `\du` | List all users |
| `\c odcms` | Connect to odcms database |
| `\dt` | List all tables |
| `SELECT * FROM subscriptions;` | View all vehicles |
| `SELECT * FROM individual_customers;` | View all customers |
| `DELETE FROM subscriptions;` | Delete all vehicles |
| `\q` | Exit PostgreSQL |

### Apache
| Command | What it does |
|---|---|
| `systemctl restart httpd` | Restart Apache |
| `httpd -M \| grep proxy` | Check proxy modules |
| `/scripts/rebuildhttpdconf` | Rebuild Apache config (cPanel) |
| `tail -20 /var/log/apache2/error_log` | Check Apache errors |

### Updating Code After Changes
```bash
cd /home/ods/odcms.officedataghana.com/ODCM
git pull
cd Backend && npm install && cd ..
pm2 restart odcm-backend
```
For frontend changes, you must rebuild locally, re-upload `.next`, then `pm2 restart odcm-frontend`.

---

## 17. Common Problems & Solutions

### "Segmentation fault (core dumped)" during npm run build
**Cause:** Not enough RAM on server.
**Fix:** Build on your local computer and upload the `.next` folder.

### "EACCES: permission denied"
**Cause:** Running in cPanel terminal (no root).
**Fix:** Use WHM terminal instead. Or run `chown -R ods:ods /path/to/folder` in WHM terminal.

### "sudo: effective uid is not 0"
**Cause:** cPanel terminal doesn't support sudo.
**Fix:** Use WHM terminal (runs as root).

### "database ODCMS does not exist"
**Cause:** PostgreSQL lowercases unquoted names.
**Fix:** Use `PGDATABASE=odcms` (lowercase) in .env.

### "ident authentication failed for user"
**Cause:** PostgreSQL using system auth instead of password.
**Fix:** Change pg_hba.conf from `ident`/`peer` to `md5`, restart PostgreSQL.

### "ALTER ROLE" after ALTER USER command
**Not an error!** This is the success message.

### nano shows empty .env file
**Cause:** Windows line endings (`\r\n`).
**Fix:** Use `cat > file << 'EOF'` to rewrite the file.

### 500 Internal Server Error on domain
**Cause:** Either .htaccess proxy rules (not supported on cPanel) or frontend not running.
**Fix:** Remove .htaccess, use Apache include system. Check `pm2 status` and `pm2 logs`.

### "Could not find a production build in '.next'"
**Cause:** Frontend was never built or build folder is missing.
**Fix:** Build locally, zip `.next`, upload via cPanel File Manager, extract, restart PM2.

### Frontend restarts hundreds of times (high restart count in pm2 status)
**Cause:** `.next` folder missing, app keeps crashing and PM2 keeps restarting it.
**Fix:** Upload the `.next` build folder.

### "Connection refused: localhost:3000" in Apache error log
**Cause:** Frontend app is not running.
**Fix:** Check `pm2 logs odcm-frontend` for errors, ensure `.next` exists.

### "Text file busy" when creating swap
**Cause:** Swap file already exists and is in use.
**Fix:** `swapoff /swapfile && rm /swapfile` then recreate.

---

## Architecture Overview

```
Browser -> odcms.officedataghana.com
              |
           Apache (port 80/443)
              |
    +---------+---------+
    |                   |
  /api/*            everything else
    |                   |
  Express           Next.js
  (port 5000)       (port 3000)
    |
  PostgreSQL
  (port 5432)
```

- **Apache** receives all requests and proxies them
- `/api/*` routes go to Express backend on port 5000
- Everything else goes to Next.js frontend on port 3000
- PM2 keeps both apps running and restarts them if they crash
- PostgreSQL stores all data (customers, vehicles, plans, etc.)

---

## Default Login
- **Email:** admin@odg.com.gh
- **Password:** admin123
- **IMPORTANT:** Change this password immediately after first login!
