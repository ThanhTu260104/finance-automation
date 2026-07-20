# HƯỚNG DẪN CÀI ĐẶT SAW REQUESTS TRÊN MÁY KHÁC

Tài liệu này dùng để tải mã nguồn từ GitHub, cấu hình và chạy hệ thống SAW Requests trên một máy Windows mới. Phần cuối có ghi chú dành cho macOS/Linux.

Repository: <https://github.com/ThanhTu260104/finance-automation>

> Repository đang ở chế độ **Private**. Tài khoản GitHub dùng trên máy mới phải được chủ repository cấp quyền.

## 1. Những dữ liệu không có trên GitHub

GitHub chỉ lưu mã nguồn. Các dữ liệu sau được cố ý loại khỏi repository để bảo mật:

- `backend/.env`: chuỗi kết nối database, VAPID private key, SMTP và các cấu hình bí mật.
- `frontend/.env.local`: địa chỉ API theo môi trường.
- `backend/uploads`: các file người dùng đã tải lên.
- Database PostgreSQL/Neon và toàn bộ dữ liệu nghiệp vụ.
- `node_modules`, `dist`, `.next`: các file được tạo lại khi cài và build.

Không gửi nội dung `.env` qua nhóm chat công khai. Nên chuyển bằng trình quản lý mật khẩu hoặc một kênh riêng an toàn.

## 2. Chuẩn bị máy mới

Cài các phần mềm sau:

1. **Git for Windows**: <https://git-scm.com/download/win>
2. **Node.js 22 LTS (64-bit)**: <https://nodejs.org/>
3. Một trình soạn thảo, khuyến nghị **Visual Studio Code**: <https://code.visualstudio.com/>

Sau khi cài, mở PowerShell mới và kiểm tra:

```powershell
git --version
node --version
npm --version
```

Nếu cả ba lệnh đều hiện phiên bản thì có thể tiếp tục.

## 3. Cấp quyền và tải mã nguồn

### 3.1. Cấp quyền cho một tài khoản GitHub khác

Chủ repository thực hiện một lần:

1. Mở <https://github.com/ThanhTu260104/finance-automation>.
2. Vào **Settings → Collaborators**.
3. Chọn **Add people**.
4. Nhập tài khoản GitHub của người dùng máy mới và gửi lời mời.
5. Người được mời mở email/GitHub và chấp nhận lời mời.

Nếu vẫn dùng chính tài khoản `ThanhTu260104`, chỉ cần đăng nhập tài khoản đó khi Git yêu cầu.

### 3.2. Clone dự án

Chọn thư mục muốn lưu dự án, sau đó chạy:

```powershell
cd D:\
git clone https://github.com/ThanhTu260104/finance-automation.git
cd finance-automation
```

Khi GitHub yêu cầu đăng nhập, dùng trình duyệt để xác thực. Không nhập mật khẩu GitHub vào ô yêu cầu token.

## 4. Cài thư viện

Mở PowerShell tại thư mục `finance-automation`:

```powershell
cd backend
npm ci
cd ..\frontend
npm ci
cd ..
```

`npm ci` cài đúng phiên bản đã được khóa trong `package-lock.json`.

## 5. Tạo file cấu hình môi trường

### 5.1. Backend

Tạo file thật từ file mẫu:

```powershell
Copy-Item backend\.env.example backend\.env
```

Mở `backend/.env`, bỏ dấu `#` ở các dòng cần dùng và điền giá trị thật. Mẫu chạy tại máy cá nhân:

```dotenv
NODE_ENV=development
APP_NAME="SAW - REQUESTS API"

HOST=0.0.0.0
PORT=4001
API_PREFIX=api

CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

UPLOAD_DIR=uploads
UPLOAD_URL_PREFIX=/api/uploads/
MAX_UPLOAD_FILE_SIZE_MB=15

SWAGGER_ENABLED=true
SWAGGER_PATH=api/docs
BCRYPT_SALT_ROUNDS=10

FRONTEND_URL=http://localhost:3000
VAPID_SUBJECT=mailto:admin@sicom.com.vn
VAPID_PUBLIC_KEY=GIA_TRI_DUOC_CAP_RIENG
VAPID_PRIVATE_KEY=GIA_TRI_DUOC_CAP_RIENG
```

Nếu hệ thống cần gửi email tạo tài khoản, bổ sung:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-account@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM="SAW - REQUESTS <your-account@gmail.com>"
```

Lưu ý:

- Muốn máy mới dùng đúng người dùng và đề xuất hiện tại: dùng `DATABASE_URL` của database Neon hiện tại.
- Không đổi cặp `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` nếu muốn tiếp tục dùng hệ thống push hiện tại.
- Không commit hoặc gửi file `backend/.env` lên GitHub.

### 5.2. Frontend

Tạo file cấu hình:

```powershell
Copy-Item frontend\.env.local.example frontend\.env.local
```

Với máy chạy cả frontend và backend tại local, dùng:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4001/api
NEXT_PUBLIC_API_ORIGIN=http://localhost:4001

NEXT_PUBLIC_SITE_NAME="SAW - REQUESTS"
NEXT_PUBLIC_SITE_SHORT_NAME="Xin chào!"
NEXT_PUBLIC_SITE_DESCRIPTION="Hệ thống đề xuất & phê duyệt tài chính"
NEXT_PUBLIC_SITE_LOCALE=vi
```

Nếu frontend gọi API qua domain thật, thay hai địa chỉ `localhost:4001` bằng domain API, ví dụ `https://saw-api.example.com`.

## 6. Chuẩn bị database

### Trường hợp A — dùng chung database hiện tại

Đây là cách phù hợp nếu máy mới chỉ thay thế máy đang chạy hoặc dùng để phát triển trên cùng dữ liệu.

```powershell
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..
```

Không chạy seed trên database thật nếu không có chủ đích tạo dữ liệu mẫu.

### Trường hợp B — tạo database mới hoàn toàn

1. Tạo PostgreSQL/Neon database mới.
2. Điền URL mới vào `backend/.env`.
3. Chạy:

```powershell
cd backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
cd ..
```

Seed hiện tạo dữ liệu khởi đầu và tài khoản mẫu với mật khẩu ban đầu `Admin@123`. Phải đổi mật khẩu ngay sau lần đăng nhập đầu tiên và không dùng mật khẩu này trên môi trường thật.

## 7. Chạy hệ thống để phát triển

Mỗi dịch vụ chạy trong một cửa sổ PowerShell riêng.

### Cửa sổ 1 — Backend

```powershell
cd D:\finance-automation\backend
npm run start:dev
```

Backend mặc định: <http://localhost:4001/api>

Swagger: <http://localhost:4001/api/docs>

### Cửa sổ 2 — Frontend

```powershell
cd D:\finance-automation\frontend
npm run dev
```

Mở phần mềm: <http://localhost:3000>

Chế độ dev chỉ dùng trên máy lập trình. Không đưa `next dev` qua domain/proxy vì WebSocket HMR có thể báo lỗi 502.

## 8. Chạy bản production trên máy

Build lại sau mỗi lần cập nhật code.

### Build backend

```powershell
cd D:\finance-automation\backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start:prod
```

### Build frontend

Mở cửa sổ PowerShell khác:

```powershell
cd D:\finance-automation\frontend
npm ci
npm run build
npm run start
```

Thứ tự khuyến nghị khi khởi động hằng ngày:

1. Khởi động backend bằng `npm run start:prod`.
2. Khởi động frontend bằng `npm run start`.
3. Truy cập frontend và thử đăng nhập.

Lưu ý: `start:prod` của backend chỉ chạy được sau khi đã có thư mục `dist` từ `npm run build`. Frontend cũng chỉ `npm run start` được sau `npm run build`.

## 9. Sao chép file đính kèm cũ

Nếu dùng database hiện tại nhưng không chép `backend/uploads`, danh sách đề xuất vẫn tồn tại nhưng các đường dẫn file đính kèm cũ có thể không mở được.

Để chuyển đầy đủ hệ thống sang máy mới:

1. Dừng backend trên máy cũ để tránh phát sinh file trong lúc sao chép.
2. Sao chép toàn bộ thư mục `backend/uploads` từ máy cũ sang `backend/uploads` trên máy mới bằng USB mã hóa, mạng nội bộ hoặc kênh truyền file an toàn.
3. Giữ nguyên cấu trúc thư mục con và tên file.
4. Khởi động lại backend và mở thử một file đính kèm cũ.

Không đưa thư mục uploads lên GitHub vì có thể chứa tài liệu nội bộ.

## 10. Kiểm tra sau khi cài

Thực hiện lần lượt:

1. Mở <http://localhost:4001/api/docs> để xác nhận backend hoạt động.
2. Mở <http://localhost:3000> và đăng nhập.
3. Vào **Danh sách đề xuất**, kiểm tra 10 bản ghi đầu và cuộn để tải thêm.
4. Mở một đề xuất và kiểm tra file đính kèm.
5. Tạo một đề xuất thử, gửi duyệt và đổi trạng thái.
6. Kiểm tra chuông thông báo trong web.
7. Nếu thử push desktop, cho phép thông báo khi trình duyệt hỏi và để tab chạy nền.

Push notification trên iPhone chỉ hoạt động ổn định khi ứng dụng chạy bằng HTTPS, được **Thêm vào Màn hình chính**, người dùng đã cho phép thông báo và backend có cặp VAPID hợp lệ. `localhost` trên máy tính không phải cách kiểm tra push cho iPhone.

## 11. Lấy code mới từ GitHub

Trước khi cập nhật, kiểm tra và lưu các thay đổi đang làm dở. Sau đó:

```powershell
cd D:\finance-automation
git pull origin main

cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build

cd ..\frontend
npm ci
npm run build
```

Sau build, dừng tiến trình cũ và chạy lại backend/frontend production.

## 12. Đưa thay đổi từ máy mới lên GitHub

Không dùng `git add .` trước khi kiểm tra file bí mật. Quy trình an toàn:

```powershell
cd D:\finance-automation
git status
git add backend docs frontend
git status
git commit -m "Mô tả ngắn nội dung thay đổi"
git push origin main
```

Trước khi commit, xác nhận không có các file sau trong danh sách staged:

- `backend/.env`
- `frontend/.env.local`
- `backend/uploads/**`
- file database dump, file khóa hoặc file chứa mật khẩu/token.

## 13. Lỗi thường gặp

### `git` hoặc `node` không được nhận diện

Đóng PowerShell, mở lại sau khi cài Git/Node.js. Nếu vẫn lỗi, khởi động lại Windows.

### Frontend báo API 500

Kiểm tra cửa sổ backend trước. Nguyên nhân thường gặp:

- Backend chưa chạy.
- `DATABASE_URL` sai hoặc database chặn kết nối.
- Chưa chạy `npx prisma generate`/`npx prisma migrate deploy`.
- Frontend đang trỏ sai `NEXT_PUBLIC_API_URL`.

### WebSocket `/_next/webpack-hmr` báo 502

Frontend đang chạy `npm run dev` qua domain/proxy. Build và chạy production bằng:

```powershell
npm run build
npm run start
```

### CORS chặn request

Đặt `CORS_ORIGIN` trong `backend/.env` đúng địa chỉ frontend. Nhiều địa chỉ được ngăn cách bằng dấu phẩy:

```dotenv
CORS_ORIGIN=http://localhost:3000,https://saw.example.com
```

Sau khi sửa `.env`, phải khởi động lại backend.

### Không nhận push notification

Kiểm tra:

- `VAPID_PUBLIC_KEY` và `VAPID_PRIVATE_KEY` có cùng một cặp.
- Trình duyệt/iPhone đã cấp quyền thông báo.
- Website production sử dụng HTTPS.
- iPhone đã thêm website vào Màn hình chính và mở từ icon đó.
- Không bật Focus/Không làm phiền hoặc tắt thông báo của ứng dụng.

### Có dữ liệu nhưng file đính kèm bị 404

Database đã được kết nối nhưng thư mục `backend/uploads` chưa được chuyển từ máy cũ.

### Cổng 3000 hoặc 4001 đang bị chiếm

Kiểm tra trên Windows:

```powershell
netstat -ano | Select-String ':3000|:4001'
```

Xác định đúng PID của tiến trình dự án trước khi dừng. Không dừng tiến trình hệ thống hoặc PID không rõ nguồn gốc.

## 14. Ghi chú cho macOS/Linux

Các bước giống Windows, chỉ thay cú pháp đường dẫn và lệnh copy:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
cd backend && npm ci
cd ../frontend && npm ci
```

Chạy hai terminal riêng cho backend và frontend. Đường dẫn ví dụ là `~/finance-automation/backend` và `~/finance-automation/frontend`.

## 15. Checklist bàn giao máy mới

- [ ] Git, Node.js và npm hoạt động.
- [ ] Clone được repository Private.
- [ ] Đã tạo `backend/.env` và `frontend/.env.local`.
- [ ] Không đưa file bí mật lên GitHub.
- [ ] Prisma generate và migration thành công.
- [ ] Backend chạy ở cổng 4001.
- [ ] Frontend chạy ở cổng 3000.
- [ ] Đăng nhập và xem được dữ liệu.
- [ ] File đính kèm cũ mở được (nếu có chuyển uploads).
- [ ] Chuông web và push notification đã được kiểm tra.
- [ ] Đã đổi mật khẩu mặc định nếu dùng database seed mới.

