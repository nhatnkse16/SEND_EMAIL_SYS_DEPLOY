# EMAIL MARKETING SYSTEM

Hệ thống gửi email marketing đa tài khoản, hỗ trợ quản lý mẫu, người nhận, log, giới hạn gửi, gửi song song, import/export dữ liệu, giao diện trực quan.

## 1. Cấu trúc dự án

```
EMAIL_MARKETING_SYSTEM_FINAL/
  ├── Backend/      # API, xử lý gửi mail, quản lý dữ liệu
  └── Frontend/     # Giao diện quản lý (React + Vite + TypeScript)
```

---

## 2. Yêu cầu hệ thống

- Node.js >= 16
- MongoDB (chạy local hoặc cloud)
- (Khuyến nghị) npm >= 8

---

## 3. Hướng dẫn cài đặt

### 3.1. Backend

```bash
cd Backend
npm install
```

#### Cấu hình kết nối MongoDB

- Sửa file `Backend/config/db.js` hoặc tạo file `.env` nếu có hướng dẫn riêng.
- Mặc định kết nối tới `mongodb://localhost:27017/email_marketing`.

#### Chạy server backend

```bash
npm start
```
- Server chạy tại: `https://send-email-sys-deploy.onrender.com`

---

### 3.2. Frontend

```bash
cd Frontend
npm install
```

#### Chạy giao diện quản lý

```bash
npm run dev
```
- Giao diện chạy tại: `http://localhost:5173` (hoặc port do Vite thông báo)

---

## 4. Tính năng chính

- Quản lý tài khoản gửi (SMTP, giới hạn/ngày, trạng thái, import Excel)
- Quản lý người nhận (import JSON/CSV, reset trạng thái)
- Quản lý mẫu email (tạo/sửa/xóa)
- Gửi chiến dịch: chọn mẫu, chọn cấu hình, gửi song song, log realtime
- Xem log gửi, thống kê lỗi, danh sách email lỗi
- Reset số lượng đã gửi, reset trạng thái người nhận
- Giao diện hiện đại, dễ sử dụng

---

## 5. Một số lệnh hữu ích

### Backend

- Khởi động server: `npm start`
- (Tuỳ chọn) Reset số lượng đã gửi: Gửi POST tới `/api/senders/reset-sent-counts`
- (Tuỳ chọn) Reset trạng thái người nhận: Gửi POST tới `/api/recipients/reset-status`

### Frontend

- Chạy dev: `npm run dev`
- Build production: `npm run build`
- Kiểm tra code: `npm run lint`

---

## 6. Ghi chú

- Khi gửi chiến dịch, hệ thống sẽ gửi cho tất cả người nhận có trạng thái `pending` **hoặc** `failed`.
- Để gửi lại cho các email đã gửi lỗi, không cần reset thủ công.
- Đảm bảo backend và frontend cùng trỏ về đúng địa chỉ (mặc định đều là localhost).

---

## 7. Liên hệ & đóng góp

- Đóng góp, báo lỗi: tạo issue hoặc pull request trên repository.
- Liên hệ: (nhatnk.sw@gmail.com)

---
