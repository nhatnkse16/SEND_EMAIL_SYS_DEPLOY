const nodemailer = require('nodemailer');

console.log('🔍 Quick Test Kết Nối Yandex SMTP');
console.log('==================================\n');

// Test với thông tin mẫu (sẽ fail nhưng kiểm tra được kết nối)
const testConfigs = [
    {
        name: 'Port 465 (SSL)',
        config: {
            host: 'smtp.yandex.com',
            port: 465,
            secure: true,
            auth: {
                user: 'test@yandex.com',
                pass: 'test-password'
            },
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 5000
        }
    },
    {
        name: 'Port 587 (TLS)',
        config: {
            host: 'smtp.yandex.com',
            port: 587,
            secure: false,
            auth: {
                user: 'test@yandex.com',
                pass: 'test-password'
            },
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 5000
        }
    }
];

async function testConnection(config, name) {
    console.log(`\n🔍 Testing: ${name}`);
    console.log(`🌐 Host: ${config.host}:${config.port}`);
    console.log(`🔒 Secure: ${config.secure}`);
    
    try {
        const transporter = nodemailer.createTransport(config);
        
        // Chỉ test kết nối, không gửi email
        console.log('⏳ Đang test kết nối SMTP...');
        await transporter.verify();
        console.log('✅ Kết nối SMTP thành công!');
        console.log('📧 Server sẵn sàng nhận lệnh gửi email');
        
    } catch (error) {
        if (error.code === 'EAUTH') {
            console.log('✅ Kết nối SMTP thành công!');
            console.log('❌ Lỗi authentication (đúng như mong đợi với test account)');
            console.log('📝 Lỗi:', error.message);
        } else if (error.code === 'ECONNECTION') {
            console.log('❌ Không thể kết nối đến server');
            console.log('📝 Lỗi:', error.message);
        } else {
            console.log('❌ Lỗi khác:', error.message);
        }
    }
}

async function runTests() {
    for (const test of testConfigs) {
        await testConnection(test.config, test.name);
    }
    
    console.log('\n📋 Kết luận:');
    console.log('✅ Nếu thấy "Kết nối SMTP thành công" → Server Yandex hoạt động');
    console.log('✅ Nếu thấy "Lỗi authentication" → Kết nối OK, chỉ cần thông tin đúng');
    console.log('❌ Nếu thấy "Không thể kết nối" → Có vấn đề về network/firewall');
    
    console.log('\n🚀 Để test với tài khoản thật:');
    console.log('1. Chạy: node test-yandex-real.js');
    console.log('2. Hoặc thêm tài khoản qua giao diện web');
    console.log('3. Hoặc sử dụng API test connection');
}

runTests(); 