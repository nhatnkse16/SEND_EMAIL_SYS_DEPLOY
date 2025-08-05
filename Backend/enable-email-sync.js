const mongoose = require('mongoose');
const Sender = require('./models/senderModel');

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/EMAIL_MARKETING_SYS_DB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function enableEmailSync() {
    try {
        console.log('🔧 Bật email sync cho tài khoản Yandex...');
        
        // Bật email sync cho tất cả tài khoản Yandex
        const result = await Sender.updateMany(
            { 
                host: 'smtp.yandex.com',
                imapHost: 'imap.yandex.com'
            },
            { 
                $set: { 
                    isEmailSyncEnabled: true,
                    lastSyncAt: null
                } 
            }
        );
        
        console.log(`✅ Đã bật email sync cho ${result.modifiedCount} tài khoản Yandex`);
        
        // Hiển thị danh sách tài khoản đã được bật
        const senders = await Sender.find({ 
            host: 'smtp.yandex.com',
            isEmailSyncEnabled: true 
        }).select('email isEmailSyncEnabled imapHost imapPort');
        
        console.log('\n📋 Danh sách tài khoản đã bật email sync:');
        senders.forEach(sender => {
            console.log(`- ${sender.email} (IMAP: ${sender.imapHost}:${sender.imapPort})`);
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi bật email sync:', error);
    } finally {
        mongoose.connection.close();
    }
}

enableEmailSync(); 