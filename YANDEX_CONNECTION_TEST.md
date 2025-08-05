# 🔍 Test Kết Nối Yandex Mail

## 📋 Chuẩn bị

### 1. Tài khoản Yandex
- Email Yandex hợp lệ
- Đã bật 2-Factor Authentication
- App Password đã được tạo

### 2. Cấu hình SMTP Yandex
```
Host: smtp.yandex.com
Port: 465 (SSL) hoặc 587 (TLS)
Secure: true
```

## 🚀 Cách Test

### Phương pháp 1: Sử dụng Script Test
```bash
cd Backend
node test-yandex-connection.js
```

### Phương pháp 2: Sử dụng Giao diện Web
1. Vào **Sender Manager**
2. Thêm tài khoản Yandex mới
3. Nhấn nút **"⚙️ Test"**

### Phương pháp 3: Test trực tiếp qua API
```bash
curl -X POST http://localhost:5000/api/senders/test-connection/[sender-id]
```

## 📝 Cách tạo App Password cho Yandex

### Bước 1: Đăng nhập Yandex
1. Vào https://passport.yandex.com
2. Đăng nhập tài khoản Yandex

### Bước 2: Bật 2-Factor Authentication
1. Vào **Security** → **Two-factor authentication**
2. Bật 2FA bằng SMS hoặc App

### Bước 3: Tạo App Password
1. Vào **Security** → **App passwords**
2. Click **"Create new password"**
3. Đặt tên: "Email System"
4. Copy password được tạo

## 🔧 Cấu hình trong hệ thống

### Thông tin cần điền:
```
Email: your-email@yandex.com
App Password: [app-password-from-yandex]
Host: smtp.yandex.com
Port: 465
Secure: true
Daily Limit: 100
Batch Size: 10
```

## ❌ Các lỗi thường gặp

### 1. Authentication failed
```
Error: Invalid login: 535 Authentication failed
```
**Giải pháp:**
- Kiểm tra App Password
- Đảm bảo đã bật 2FA
- Thử tạo App Password mới

### 2. Connection timeout
```
Error: Connection timeout
```
**Giải pháp:**
- Kiểm tra kết nối internet
- Thử port 587 thay vì 465
- Kiểm tra firewall

### 3. SSL/TLS errors
```
Error: SSL routines:ssl3_get_record:wrong version number
```
**Giải pháp:**
- Port 465: secure = true
- Port 587: secure = false
- Kiểm tra cấu hình SSL

## ✅ Kết quả thành công

Khi test thành công, bạn sẽ thấy:
```
✅ SMTP connection thành công!
✅ Email test đã được gửi thành công!
📧 Message ID: <xxx@yandex.com>
📬 Kiểm tra inbox của bạn để xem email test
```

## 📧 Email test sẽ có nội dung:
- **Subject**: "Test Connection - Email System"
- **From**: your-email@yandex.com
- **To**: your-email@yandex.com
- **Content**: Thông tin chi tiết về kết nối SMTP

## 🔄 Test với nhiều port

### Port 465 (SSL)
```javascript
{
    host: 'smtp.yandex.com',
    port: 465,
    secure: true
}
```

### Port 587 (TLS)
```javascript
{
    host: 'smtp.yandex.com',
    port: 587,
    secure: false
}
```

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra log lỗi chi tiết
2. Thử cả 2 port (465 và 587)
3. Tạo App Password mới
4. Kiểm tra cài đặt bảo mật Yandex 