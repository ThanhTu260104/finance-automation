# Hướng dẫn deploy SAW Request lên VPS InterData

Tài liệu này dùng cho VPS Ubuntu 22.04 hoặc 24.04. Cách deploy đề xuất:

- Frontend Next.js chạy nội bộ ở `127.0.0.1:3000`.
- Backend NestJS chạy nội bộ ở `127.0.0.1:4001`.
- Nginx public ra internet qua domain chính.
- PostgreSQL chạy trên VPS.
- PM2 giữ process sống sau khi reboot.
- Upload file lưu ở `/var/www/saw-request/uploads`.

Ví dụ domain trong tài liệu: `your-domain.com`. Khi deploy thật, thay bằng domain của bạn.

## 1. Chuẩn bị trên InterData

1. Tạo VPS Ubuntu 22.04 hoặc 24.04.
2. Mở firewall/security group cho các port:

| Port | Mục đích |
| --- | --- |
| `22` | SSH |
| `80` | HTTP để Certbot xác thực SSL |
| `443` | HTTPS |

3. Trỏ DNS domain về IP VPS:

| Record | Value |
| --- | --- |
| `A @` | IP VPS |
| `A www` | IP VPS |

## 2. SSH vào VPS

```bash
ssh root@YOUR_VPS_IP
```

Cập nhật hệ thống:

```bash
apt update
apt upgrade -y
apt install -y curl git unzip build-essential nginx postgresql postgresql-contrib
```

## 3. Cài Node.js 22 và PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
node -v
npm -v
pm2 -v
```

## 4. Tạo database PostgreSQL

Đổi password mẫu `CHANGE_ME_STRONG_PASSWORD` thành mật khẩu mạnh.

```bash
sudo -u postgres psql
```

Trong PostgreSQL shell:

```sql
CREATE USER saw_user WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE saw_request OWNER saw_user;
GRANT ALL PRIVILEGES ON DATABASE saw_request TO saw_user;
\q
```

Connection string dùng ở backend:

```text
postgresql://saw_user:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/saw_request?schema=public
```

## 5. Upload source code lên VPS

Cách khuyến nghị là clone repo:

```bash
mkdir -p /var/www
cd /var/www
git clone YOUR_REPO_URL saw-request
cd /var/www/saw-request
```

Nếu chưa có Git remote, có thể nén source ở máy local rồi upload bằng SFTP/SCP vào `/var/www/saw-request`.

Tạo thư mục upload:

```bash
mkdir -p /var/www/saw-request/uploads/proposals
```

## 6. Cấu hình backend env

```bash
cd /var/www/saw-request/backend
cp .env.example .env
nano .env
```

Nội dung mẫu cho VPS cùng domain:

```env
NODE_ENV=production
APP_NAME="SAW - REQUESTS API"

HOST=127.0.0.1
PORT=4001
API_PREFIX=api

CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
CORS_CREDENTIALS=true

DATABASE_URL="postgresql://saw_user:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:5432/saw_request?schema=public"

UPLOAD_DIR=/var/www/saw-request/uploads
UPLOAD_URL_PREFIX=/api/uploads/
MAX_UPLOAD_FILE_SIZE_MB=15

SWAGGER_ENABLED=false
SWAGGER_PATH=api/docs

BCRYPT_SALT_ROUNDS=10
```

Ghi chú:

- `HOST=127.0.0.1` để backend chỉ nghe nội bộ, Nginx public ra ngoài.
- `CORS_ORIGIN` phải là domain frontend thật.
- `SWAGGER_ENABLED=false` nên dùng cho production public.
- `UPLOAD_DIR` nên là đường dẫn tuyệt đối trên VPS.

## 7. Build và chạy backend

```bash
cd /var/www/saw-request/backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start npm --name saw-backend -- run start:prod
```

Seed dữ liệu mẫu chỉ chạy nếu cần demo lần đầu:

```bash
npm run prisma:seed
pm2 restart saw-backend
```

Kiểm tra backend:

```bash
pm2 logs saw-backend
curl http://127.0.0.1:4001/api
```

## 8. Cấu hình frontend env

```bash
cd /var/www/saw-request/frontend
cp .env.local.example .env.local
nano .env.local
```

Nội dung mẫu:

```env
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_API_ORIGIN=https://your-domain.com

NEXT_PUBLIC_SITE_NAME="SAW - REQUESTS"
NEXT_PUBLIC_SITE_SHORT_NAME="Xin chào!"
NEXT_PUBLIC_SITE_DESCRIPTION="Hệ thống đề xuất & phê duyệt tài chính"
NEXT_PUBLIC_SITE_LOCALE=vi
```

## 9. Build và chạy frontend

```bash
cd /var/www/saw-request/frontend
npm ci
npm run build
PORT=3000 pm2 start npm --name saw-frontend -- start
```

Kiểm tra frontend nội bộ:

```bash
pm2 logs saw-frontend
curl http://127.0.0.1:3000
```

## 10. Cấu hình Nginx reverse proxy

Tạo file Nginx:

```bash
nano /etc/nginx/sites-available/saw-request
```

Nội dung:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable site:

```bash
ln -s /etc/nginx/sites-available/saw-request /etc/nginx/sites-enabled/saw-request
nginx -t
systemctl reload nginx
```

## 11. Cài SSL bằng Certbot

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com -d www.your-domain.com
```

Kiểm tra tự gia hạn:

```bash
certbot renew --dry-run
```

## 12. Bật firewall

Chạy sau khi chắc SSH đang hoạt động.

```bash
ufw allow OpenSSH
ufw allow "Nginx Full"
ufw enable
ufw status
```

Không cần mở public port `3000` và `4001` vì Nginx proxy nội bộ.

## 13. Lưu PM2 để tự chạy sau reboot

```bash
pm2 save
pm2 startup systemd
```

PM2 sẽ in ra một command `sudo env PATH=... pm2 startup ...`. Copy command đó chạy lại một lần.

Kiểm tra:

```bash
pm2 status
```

## 14. Test sau deploy

Mở trình duyệt:

```text
https://your-domain.com
```

Test API:

```bash
curl https://your-domain.com/api
```

Nếu bật Swagger:

```text
https://your-domain.com/api/docs
```

Test upload:

1. Đăng nhập.
2. Tạo đề xuất mới.
3. Upload file PDF/ảnh nhỏ hơn 15 MB.
4. Mở chi tiết đề xuất và kiểm tra file preview được.

## 15. Lệnh update phiên bản sau này

Backend:

```bash
cd /var/www/saw-request
git pull
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart saw-backend
```

Frontend:

```bash
cd /var/www/saw-request/frontend
npm ci
npm run build
pm2 restart saw-frontend
```

Reload Nginx nếu có sửa config:

```bash
nginx -t
systemctl reload nginx
```

## 16. Checklist lỗi hay gặp

| Lỗi | Cách kiểm tra |
| --- | --- |
| Frontend không gọi được API | Kiểm tra `NEXT_PUBLIC_API_URL`, `CORS_ORIGIN`, Nginx `location /api/`. |
| Upload lỗi 413 | Tăng `client_max_body_size` trong Nginx và `MAX_UPLOAD_FILE_SIZE_MB` nếu cần. |
| File upload không mở được | Kiểm tra `UPLOAD_DIR`, `UPLOAD_URL_PREFIX`, quyền thư mục upload. |
| Database lỗi | Kiểm tra `DATABASE_URL`, user/password DB, `npx prisma migrate deploy`. |
| App tắt sau reboot | Chạy `pm2 save` và `pm2 startup systemd`. |
| Domain chưa vào được | Kiểm tra DNS A record, firewall InterData, `ufw`, Nginx và Certbot. |

## 17. Cấu hình nhanh cho cùng một domain

Backend `.env`:

```env
HOST=127.0.0.1
PORT=4001
API_PREFIX=api
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
UPLOAD_DIR=/var/www/saw-request/uploads
UPLOAD_URL_PREFIX=/api/uploads/
```

Frontend `.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_API_ORIGIN=https://your-domain.com
```
