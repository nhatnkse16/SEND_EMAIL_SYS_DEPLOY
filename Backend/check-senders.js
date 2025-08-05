const mongoose = require('mongoose');
const Sender = require('./models/senderModel');

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/EMAIL_MARKETING_SYS_DB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function checkSenders() {
    try {
        console.log('🔍 Kiểm tra dữ liệu tài khoản sender...');
        
        // Lấy tất cả tài khoản
        const allSenders = await Sender.find({});
        
        console.log(`📊 Tổng số tài khoản: ${allSenders.length}`);
        
        if (allSenders.length === 0) {
            console.log('❌ Không có tài khoản nào trong database');
            return;
        }
        
        // Hiển thị 3 tài khoản đầu tiên để debug
        console.log('\n📋 3 tài khoản đầu tiên:');
        allSenders.slice(0, 3).forEach((sender, index) => {
            console.log(`${index + 1}. ${sender.email}:`);
            console.log(`   Host: ${sender.host}`);
            console.log(`   IMAP Host: ${sender.imapHost || 'N/A'}`);
            console.log(`   Email Sync: ${sender.isEmailSyncEnabled}`);
            console.log(`   Active: ${sender.isActive}`);
        });
        
        // Kiểm tra tài khoản Yandex
        const yandexSenders = allSenders.filter(s => s.host === 'smtp.yandex.com');
        console.log(`\n📧 Tài khoản Yandex: ${yandexSenders.length}`);
        
        // Kiểm tra tài khoản có IMAP
        const imapSenders = allSenders.filter(s => s.imapHost);
        console.log(`📥 Tài khoản có IMAP: ${imapSenders.length}`);
        
        // Kiểm tra tài khoản có email sync enabled
        const syncEnabledSenders = allSenders.filter(s => s.isEmailSyncEnabled);
        console.log(`🔄 Tài khoản có email sync enabled: ${syncEnabledSenders.length}`);
        
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra:', error);
    } finally {
        mongoose.connection.close();
    }
}

checkSenders(); 