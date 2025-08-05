# Hướng dẫn Test Connection SMTP

## Tính năng Test Connection

Tính năng này cho phép bạn kiểm tra xem tài khoản email sender có thể kết nối thành công với SMTP server hay không.

## Cách sử dụng

### 1. Trong giao diện SenderManager
- Vào tab "Danh sách tài khoản gửi"
- Tìm tài khoản bạn muốn test
- Nhấn nút **"⚙️ Test"** trong cột "Hành động"

### 2. Quá trình test
- Hệ thống sẽ thử kết nối với SMTP server
- Nếu thành công, sẽ gửi một email test đến chính tài khoản đó
- Kết quả sẽ hiển thị trong popup thông báo

## Kết quả có thể có

### ✅ Thành công
- **"Kết nối thành công! Email test đã được gửi."**
  - SMTP connection OK
  - Email test đã được gửi thành công
  - Bạn sẽ nhận được email test trong inbox

- **"Kết nối SMTP thành công nhưng gửi email test thất bại"**
  - SMTP connection OK
  - Nhưng có vấn đề khi gửi email (có thể do spam filter, etc.)

### ❌ Thất bại
- **"Kết nối thất bại"**
  - Thông tin SMTP không đúng
  - App Password sai
  - Host/Port không đúng
  - Network issues

## Các lỗi thường gặp

### 1. Authentication failed
```
Error: Invalid login: 535 Authentication failed
```
**Giải pháp:** Kiểm tra lại App Password

### 2. Connection timeout
```
Error: Connection timeout
```
**Giải pháp:** 
- Kiểm tra Host/Port
- Kiểm tra kết nối internet
- Thử port khác (587 thay vì 465)

### 3. Host not found
```
Error: getaddrinfo ENOTFOUND smtp.example.com
```
**Giải pháp:** Kiểm tra lại tên host SMTP

## Cấu hình SMTP phổ biến

### Gmail
- Host: `smtp.gmail.com`
- Port: `587` (TLS) hoặc `465` (SSL)
- Secure: `true`

### Yandex
- Host: `smtp.yandex.com`
- Port: `465`
- Secure: `true`

### Outlook/Hotmail
- Host: `smtp-mail.outlook.com`
- Port: `587`
- Secure: `true`

## Lưu ý quan trọng

1. **App Password**: Phải sử dụng App Password, không phải password thường
2. **2FA**: Tài khoản phải bật 2-Factor Authentication
3. **Less secure apps**: Một số provider yêu cầu bật "Less secure app access"
4. **Spam filter**: Email test có thể bị chặn bởi spam filter

## Troubleshooting

### Nếu test thất bại:
1. Kiểm tra App Password
2. Thử port khác (587 vs 465)
3. Kiểm tra host SMTP
4. Đảm bảo tài khoản có quyền gửi email
5. Kiểm tra firewall/antivirus

### Nếu test thành công nhưng gửi email thất bại:
1. Kiểm tra spam folder
2. Thử gửi email thật thay vì test
3. Kiểm tra daily limit của tài khoản 