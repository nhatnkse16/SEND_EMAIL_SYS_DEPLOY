async function testAPI() {
    try {
        console.log('🧪 Testing Email API...');
        
        const senderId = '68893f6e06fa93059ca7d638';
        const url = `http://localhost:5000/api/emails/${senderId}?folder=INBOX&page=1&limit=10`;
        
        console.log('URL:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('✅ API Response:');
        console.log('Success:', data.success);
        console.log('Data length:', data.data?.length || 0);
        
        if (data.data && data.data.length > 0) {
            console.log('\n📧 First email:');
            const firstEmail = data.data[0];
            console.log('Subject:', firstEmail.subject);
            console.log('From:', firstEmail.from);
            console.log('Sender ID:', firstEmail.senderAccountId);
            console.log('Folder:', firstEmail.folder);
        }
        
    } catch (error) {
        console.error('❌ API Error:', error.message);
    }
}

testAPI(); 