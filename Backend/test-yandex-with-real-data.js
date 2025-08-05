const nodemailer = require('nodemailer');

console.log('🔍 Test Kết Nối Yandex với Thông Tin Thật');
console.log('==========================================\n');

// Cấu hình Yandex với thông tin thật (thay đổi theo tài khoản của bạn)
const yandexConfig = {
    host: 'smtp.yandex.com',
    port: 465,
    secure: true, // SSL
    auth: {
        user: 'marketing-1@adxsearch.com', // THAY BẰNG EMAIL THẬT
        pass: 'aojiajugpuoqzzbh' // THAY BẰNG APP PASSWORD THẬT
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
};

async function testYandexConnection() {
    console.log('📧 Email:', yandexConfig.auth.user);
    console.log('🌐 Host:', yandexConfig.host);
    console.log('🔌 Port:', yandexConfig.port);
    console.log('🔒 Secure:', yandexConfig.secure);
    console.log('⏳ Đang test kết nối...\n');

    try {
        // Tạo transporter
        const transporter = nodemailer.createTransport(yandexConfig);
        
        // Test kết nối SMTP
        console.log('✅ Đang verify SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection thành công!');
        
        // Test gửi email
        console.log('📤 Đang gửi email test...');
        const testResult = await transporter.sendMail({
            from: yandexConfig.auth.user,
            to: yandexConfig.auth.user, // Gửi cho chính mình
            subject: 'Test Connection - Email System',
            text: 'Đây là email test để kiểm tra kết nối SMTP Yandex. Nếu bạn nhận được email này, kết nối đã thành công!',
            html: `
                <h3>Test Connection - Email System</h3>
                <p>Đây là email test để kiểm tra kết nối SMTP Yandex.</p>
                <p>Nếu bạn nhận được email này, kết nối đã thành công!</p>
                <p><strong>Thông tin kết nối:</strong></p>
                <ul>
                    <li>Host: ${yandexConfig.host}</li>
                    <li>Port: ${yandexConfig.port}</li>
                    <li>Secure: ${yandexConfig.secure ? 'Yes' : 'No'}</li>
                    <li>Email: ${yandexConfig.auth.user}</li>
                </ul>
                <p><em>Thời gian test: ${new Date().toLocaleString('vi-VN')}</em></p>
            `
        });
        
        console.log('✅ Email test đã được gửi thành công!');
        console.log('📧 Message ID:', testResult.messageId);
        console.log('📬 Kiểm tra inbox của bạn để xem email test');
        console.log('\n🎉 Kết nối Yandex hoạt động hoàn hảo!');
        
        // Thông tin để thêm vào hệ thống
        console.log('\n📋 Thông tin để thêm vào hệ thống:');
        console.log(`Email: ${yandexConfig.auth.user}`);
        console.log(`App Password: ${yandexConfig.auth.pass}`);
        console.log(`Host: ${yandexConfig.host}`);
        console.log(`Port: ${yandexConfig.port}`);
        console.log(`Secure: ${yandexConfig.secure}`);
        
    } catch (error) {
        console.error('❌ Lỗi kết nối Yandex:');
        console.error('🔍 Error Code:', error.code);
        console.error('📝 Error Message:', error.message);
        console.error('⚡ Command:', error.command);
        
        // Hướng dẫn khắc phục
        console.log('\n🔧 Hướng dẫn khắc phục:');
        console.log('1. Kiểm tra email và App Password');
        console.log('2. Đảm bảo đã bật 2-Factor Authentication');
        console.log('3. Tạo App Password từ Yandex Account Settings');
        console.log('4. Kiểm tra kết nối internet');
        console.log('5. Thử port 587 nếu port 465 không hoạt động');
        
        console.log('\n📖 Hướng dẫn tạo App Password:');
        console.log('1. Vào https://passport.yandex.com');
        console.log('2. Đăng nhập tài khoản Yandex');
        console.log('3. Vào Security → Two-factor authentication');
        console.log('4. Bật 2FA');
        console.log('5. Vào Security → App passwords');
        console.log('6. Tạo password mới cho "Email System"');
    }
}

// Chạy test
testYandexConnection(); 