# 📧 CHỈ GỬI EMAIL CHO NGƯỜI NHẬN CÓ TRẠNG THÁI "PENDING"

## 🔄 **Thay đổi đã áp dụng:**

### **Trước đây:**
- Hệ thống gửi email cho người nhận có trạng thái **"pending"** và **"failed"**
- Điều này có thể gây spam cho email đã gửi lỗi

### **Bây giờ:**
- Hệ thống **CHỈ** gửi email cho người nhận có trạng thái **"pending"**
- Email có trạng thái "sent" hoặc "failed" sẽ **KHÔNG** được gửi lại

## ✅ **Lợi ích:**

1. **Tránh spam:** Không gửi lại email đã gửi thành công
2. **Kiểm soát tốt hơn:** Chỉ gửi cho email chưa được xử lý
3. **Hiệu quả:** Tiết kiệm tài nguyên và tránh gửi trùng lặp

## 🔧 **Cách sử dụng:**

### **1. Để gửi lại email đã lỗi:**
- Vào **Quản lý người nhận**
- Chuyển sang tab **"Lỗi"**
- Bấm nút **"Đặt lại"** ở từng email muốn gửi lại
- Hoặc bấm **"Đặt lại trạng thái tất cả"** để reset tất cả

### **2. Để gửi lại email đã gửi thành công:**
- Vào **Quản lý người nhận**
- Chuyển sang tab **"Đã gửi"**
- Bấm nút **"Đặt lại"** ở từng email muốn gửi lại

### **3. Thêm người nhận mới:**
- Người nhận mới tự động có trạng thái **"pending"**
- Có thể gửi ngay lập tức

## 📊 **Luồng hoạt động:**

```
1. Thêm người nhận → Trạng thái: "pending"
2. Gửi email → Trạng thái: "sent" hoặc "failed"
3. Muốn gửi lại → Đặt lại về "pending"
4. Gửi lại → Trạng thái: "sent" hoặc "failed"
```

## ⚠️ **Lưu ý:**

- **Email "sent"** sẽ không được gửi lại tự động
- **Email "failed"** sẽ không được gửi lại tự động
- Muốn gửi lại phải **thủ công đặt lại trạng thái** về "pending"
- Điều này giúp **kiểm soát chặt chẽ** việc gửi email

## 🚀 **Test:**

1. Thêm một số người nhận mới
2. Gửi chiến dịch
3. Kiểm tra tab "Đã gửi" và "Lỗi"
4. Đặt lại trạng thái một số email
5. Gửi lại chiến dịch → Chỉ email "pending" được gửi

---
**Kết quả:** Hệ thống giờ đây an toàn và hiệu quả hơn! 🎯 