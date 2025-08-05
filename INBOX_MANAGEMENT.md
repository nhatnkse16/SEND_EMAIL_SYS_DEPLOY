# Quản lý Inbox - Email Manager

## Tổng quan

Tính năng Quản lý Inbox cho phép bạn xem và quản lý email từ các tài khoản email đã được cấu hình trong hệ thống. Tính năng này hỗ trợ đầy đủ các chức năng như Gmail, Outlook, Yahoo Mail và các nhà cung cấp email khác.

## Tính năng chính

### 1. Chọn tài khoản email
- Hiển thị danh sách tất cả tài khoản email đã được cấu hình
- Chỉ hiển thị tài khoản có trạng thái "Active"
- Cho phép chuyển đổi giữa các tài khoản email khác nhau

### 2. Quản lý thư mục
- **Inbox**: Thư đến
- **Sent**: Thư đã gửi
- **Drafts**: Thư nháp
- **Archive**: Thư đã lưu trữ
- **Trash**: Thùng rác
- **Spam**: Thư rác

### 3. Tìm kiếm và lọc
- Tìm kiếm email theo từ khóa
- Lọc theo danh mục (Marketing, Support, Sales, Personal, Spam, Other)
- Lọc chỉ hiển thị email chưa đọc
- Sắp xếp theo thời gian, chủ đề

### 4. Thao tác với email
- **Đánh dấu đã đọc/chưa đọc**
- **Lưu trữ email**
- **Xóa email**
- **Thao tác hàng loạt** (bulk operations)

### 5. Xem chi tiết email
- Hiển thị đầy đủ nội dung email
- Thông tin người gửi, người nhận
- Thời gian nhận
- Danh mục tự động
- Độ ưu tiên

## Cách sử dụng

### Bước 1: Truy cập Quản lý Inbox
1. Mở ứng dụng Email Sender
2. Click vào menu "📥 Quản lý Inbox" trong sidebar

### Bước 2: Chọn tài khoản email
- Nếu chưa có tài khoản nào: Click "Add Email Account" để chuyển đến trang quản lý tài khoản
- Nếu đã có tài khoản: Chọn tài khoản từ dropdown menu

### Bước 3: Đồng bộ email
- Click nút "Sync" để lấy email mới từ server
- Click nút "Refresh" để làm mới danh sách email

### Bước 4: Quản lý email
- **Chọn thư mục**: Click vào tên thư mục trong sidebar
- **Tìm kiếm**: Nhập từ khóa vào ô tìm kiếm
- **Lọc**: Sử dụng các bộ lọc trong sidebar
- **Xem chi tiết**: Click vào email để xem nội dung đầy đủ

### Bước 5: Thao tác với email
- **Đánh dấu đã đọc**: Click icon checkmark
- **Lưu trữ**: Click icon archive
- **Xóa**: Click icon trash
- **Thao tác hàng loạt**: Chọn nhiều email và sử dụng các nút trong thanh bulk actions

## Cấu hình tài khoản email

### Yêu cầu
- Tài khoản email hợp lệ
- Mật khẩu ứng dụng (App Password) hoặc mật khẩu thông thường
- Cấu hình SMTP/IMAP đúng

### Các nhà cung cấp được hỗ trợ
- **Gmail**: smtp.gmail.com:587, imap.gmail.com:993
- **Outlook/Hotmail**: smtp-mail.outlook.com:587, outlook.office365.com:993
- **Yahoo**: smtp.mail.yahoo.com:587, imap.mail.yahoo.com:993
- **Yandex**: smtp.yandex.com:465, imap.yandex.com:993

## Tính năng nâng cao

### 1. Phân loại tự động
Hệ thống tự động phân loại email vào các danh mục:
- **Marketing**: Email quảng cáo, newsletter
- **Support**: Email hỗ trợ khách hàng
- **Sales**: Email liên quan đến bán hàng
- **Personal**: Email cá nhân
- **Spam**: Email rác
- **Other**: Email khác

### 2. Đánh giá spam
- Hệ thống tự động đánh giá mức độ spam của email
- Hiển thị điểm spam score
- Tự động di chuyển email spam vào thư mục Spam

### 3. Độ ưu tiên
- Tự động xác định email có độ ưu tiên cao
- Hiển thị badge "High Priority" cho email quan trọng

### 4. Đính kèm file
- Hiển thị icon đính kèm cho email có file đính kèm
- Hiển thị số lượng file đính kèm

## Xử lý lỗi

### Lỗi kết nối
- Kiểm tra cấu hình SMTP/IMAP
- Kiểm tra mật khẩu ứng dụng
- Kiểm tra kết nối internet

### Lỗi đồng bộ
- Thử lại bằng nút "Sync"
- Kiểm tra trạng thái tài khoản email
- Kiểm tra giới hạn API của nhà cung cấp email

### Lỗi hiển thị
- Refresh trang
- Kiểm tra console để xem lỗi chi tiết
- Liên hệ admin nếu lỗi vẫn tiếp tục

## Bảo mật

### Mật khẩu ứng dụng
- Sử dụng mật khẩu ứng dụng thay vì mật khẩu chính
- Không lưu trữ mật khẩu dưới dạng plain text
- Mã hóa thông tin đăng nhập

### Quyền truy cập
- Chỉ admin mới có thể thêm/sửa/xóa tài khoản email
- Người dùng chỉ có thể xem và quản lý email của tài khoản được phân quyền

### Bảo vệ dữ liệu
- Mã hóa email trong database
- Xóa email theo chính sách retention
- Backup dữ liệu định kỳ

## Hỗ trợ

Nếu gặp vấn đề khi sử dụng tính năng Quản lý Inbox, vui lòng:
1. Kiểm tra tài liệu này
2. Xem log lỗi trong console
3. Liên hệ admin hoặc support team
4. Tạo ticket hỗ trợ với thông tin chi tiết về lỗi 