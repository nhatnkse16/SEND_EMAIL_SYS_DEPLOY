const mongoose = require('mongoose');
const Email = require('./models/emailModel');
const Sender = require('./models/senderModel');

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/EMAIL_MARKETING_SYS_DB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function checkEmails() {
    try {
        console.log('🔍 Kiểm tra emails trong database...');
        
        // Lấy tất cả emails
        const allEmails = await Email.find({});
        
        console.log(`📊 Tổng số emails: ${allEmails.length}`);
        
        if (allEmails.length === 0) {
            console.log('❌ Không có email nào trong database');
            return;
        }
        
        // Hiển thị 5 emails đầu tiên để debug
        console.log('\n📋 5 emails đầu tiên:');
        allEmails.slice(0, 5).forEach((email, index) => {
            console.log(`${index + 1}. Subject: ${email.subject || '(No subject)'}`);
            console.log(`   From: ${email.from?.email || 'N/A'}`);
            console.log(`   Folder: ${email.folder || 'N/A'}`);
            console.log(`   Sender ID: ${email.senderAccountId}`);
            console.log(`   Received: ${email.receivedAt}`);
            console.log(`   Read: ${email.isRead}`);
            console.log('---');
        });
        
        // Kiểm tra emails theo sender
        const senderId = '68893f6e06fa93059ca7d638';
        const senderEmails = await Email.find({ senderAccountId: senderId });
        console.log(`\n📧 Emails cho sender ${senderId}: ${senderEmails.length}`);
        
        // Kiểm tra emails theo folder
        const inboxEmails = await Email.find({ folder: 'INBOX' });
        console.log(`📥 Emails trong INBOX: ${inboxEmails.length}`);
        
        // Kiểm tra sender
        const sender = await Sender.findById(senderId);
        if (sender) {
            console.log(`\n👤 Sender info:`);
            console.log(`   Email: ${sender.email}`);
            console.log(`   Active: ${sender.isActive}`);
            console.log(`   Email Sync: ${sender.isEmailSyncEnabled}`);
        }
        
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra:', error);
    } finally {
        mongoose.connection.close();
    }
}

checkEmails(); 