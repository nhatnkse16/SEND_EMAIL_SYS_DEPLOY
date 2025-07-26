# 🔧 SỬA LỖI SSL "wrong version number"

## ❌ **Lỗi hiện tại:**
```
SSL routines:ssl3_get_record:wrong version number
```

## 🎯 **Nguyên nhân:**
- **Port 587** sử dụng **STARTTLS** (không phải SSL)
- **Port 465** mới sử dụng **SSL/TLS** trực tiếp
- Tài khoản `mailmarketing1@zohomail.com` đang cấu hình:
  - Host: `smtp.zoho.com`
  - Port: `587` 
  - Secure: `true` ← **GÂY XUNG ĐỘT**

## ✅ **Giải pháp đã áp dụng:**

### **1. 🔧 Sửa code Backend**
- Tự động điều chỉnh `secure` dựa trên port
- Port 587 → `secure: false` (STARTTLS)
- Port 465 → `secure: true` (SSL)

### **2. 📋 Cấu hình đúng cho Zoho Mail:**

#### **Option A: Sử dụng Port 587 (STARTTLS)**
```
Host: smtp.zoho.com
Port: 587
Secure: false
```

#### **Option B: Sử dụng Port 465 (SSL)**
```
Host: smtp.zoho.com
Port: 465
Secure: true
```

## 🚀 **Cách kiểm tra:**

### **1. Restart Backend:**
```bash
cd Backend
npm start
```

### **2. Test gửi email:**
- Vào giao diện Campaign Sender
- Chọn template và bắt đầu gửi
- Kiểm tra log xem còn lỗi SSL không

### **3. Nếu vẫn lỗi, thử đổi cấu hình:**
- Vào Sender Manager
- Chỉnh sửa tài khoản `mailmarketing1@zohomail.com`
- Đổi port từ 587 → 465
- Hoặc đổi port từ 465 → 587

## 📊 **Bảng cấu hình chuẩn:**

| Provider  | Port | Secure | Protocol |
| --------- | ---- | ------ | -------- |
| Zoho Mail | 587  | false  | STARTTLS |
| Zoho Mail | 465  | true   | SSL      |
| Gmail     | 587  | false  | STARTTLS |
| Gmail     | 465  | true   | SSL      |
| Outlook   | 587  | false  | STARTTLS |
| Yahoo     | 587  | false  | STARTTLS |

## 🔍 **Debug thêm:**
Nếu vẫn lỗi, thêm log để debug:
```javascript
console.log(`[DEBUG] Sender config:`, {
    host: sender.host,
    port: sender.port,
    secure: secure,
    email: sender.email
});
```

---
**Lưu ý:** Sau khi sửa, restart backend và test lại! 