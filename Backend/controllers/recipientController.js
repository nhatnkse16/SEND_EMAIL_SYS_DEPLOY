const Recipient = require('../models/recipientModel');
const csv = require('csv-parser');
const { Readable } = require('stream'); // Dùng để tạo stream từ buffer

const getRecipients = async (req, res) => {
    try {
        const { status, page = 1, pageSize = 100 } = req.query;
        const filter = status ? { status } : {};
        const skip = (parseInt(page) - 1) * parseInt(pageSize);
        const total = await Recipient.countDocuments(filter);
        const recipients = await Recipient.find(filter)
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(parseInt(pageSize));
        res.status(200).json({ recipients, total });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách người nhận' });
    }
};

const addRecipient = async (req, res) => {
    try {
        const { email, name } = req.body;
        if (!email) { return res.status(400).json({ message: 'Email là bắt buộc' }); }
        const newRecipient = new Recipient({ email, name, status: 'pending' });
        await newRecipient.save();
        res.status(201).json(newRecipient);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi thêm người nhận' });
    }
};

const addRecipientsFromJson = async (req, res) => {
    try {
        if (!req.file) { return res.status(400).json({ message: 'Vui lòng tải lên một file JSON.' }); }
        const fileContent = req.file.buffer.toString('utf8');
        const recipients = JSON.parse(fileContent);
        if (!Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ message: 'File JSON phải chứa một mảng người nhận.' });
        }
        const recipientsToInsert = recipients.map(r => ({ ...r, status: 'pending' }));
        await Recipient.insertMany(recipientsToInsert);
        res.status(201).json({ message: `Đã thêm thành công ${recipientsToInsert.length} người nhận.` });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xử lý file JSON.', error: error.message });
    }
};

const updateRecipient = async (req, res) => {
    try {
        const updatedRecipient = await Recipient.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedRecipient) { return res.status(404).json({ message: 'Không tìm thấy người nhận' }); }
        res.status(200).json(updatedRecipient);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật người nhận' });
    }
};

const deleteRecipient = async (req, res) => {
    try {
        await Recipient.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Đã xóa người nhận thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xóa người nhận' });
    }
};

const clearRecipients = async (req, res) => {
    try {
        await Recipient.deleteMany({});
        res.status(200).json({ message: 'Đã xóa tất cả người nhận' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xóa người nhận' });
    }
};

const resetRecipientsStatus = async (req, res) => {
    try {
        await Recipient.updateMany({}, { $set: { status: 'pending' } });
        res.status(200).json({ message: 'Đã reset trạng thái tất cả người nhận về "pending" thành công.' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi reset trạng thái người nhận' });
    }
};

const addRecipientsFromCsv = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng tải lên một file CSV.' });
        }

        // Tạo một Readable stream từ buffer của file đã tải lên
        const bufferStream = new Readable();
        bufferStream.push(req.file.buffer);
        bufferStream.push(null); // Báo hiệu kết thúc stream

        const recipientsToAdd = [];
        let errors = [];

        bufferStream.pipe(csv())
            .on('data', (row) => {
                // Giả định file CSV có các cột 'email' và 'name'
                // Điều chỉnh tên cột nếu CSV của bạn có tên khác (ví dụ: 'Email Address', 'Full Name')
                const { email, name } = row;

                if (email) { // Email là bắt buộc
                    recipientsToAdd.push({
                        email: email.trim(),
                        name: name ? name.trim() : '', // Name có thể không bắt buộc
                        status: 'pending' // Mặc định trạng thái là pending
                    });
                } else {
                    errors.push(`Hàng bị bỏ qua do thiếu email: ${JSON.stringify(row)}`);
                }
            })
            .on('end', async () => {
                if (recipientsToAdd.length === 0) {
                    return res.status(400).json({ message: 'Không tìm thấy người nhận hợp lệ nào trong file CSV.' });
                }

                try {
                    // Sử dụng insertMany để thêm nhiều người nhận cùng lúc
                    // ordered: false cho phép tiếp tục chèn các tài liệu khác nếu có lỗi trùng lặp (duplicate key)
                    const createdRecipients = await Recipient.insertMany(recipientsToAdd, { ordered: false });
                    res.status(201).json({
                        message: `Đã thêm thành công ${createdRecipients.length} người nhận.`,
                        errors: errors, // Trả về các lỗi nếu có hàng nào bị bỏ qua
                        data: createdRecipients
                    });
                } catch (dbError) {
                    // Xử lý lỗi từ MongoDB, ví dụ: email trùng lặp
                    if (dbError.code === 11000) { // Mã lỗi 11000 là lỗi duplicate key
                        const duplicateEmails = dbError.writeErrors.map(err => err.err.errmsg.match(/dup key: { email: "(.*?)" }/)[1]);
                        res.status(409).json({
                            message: `Đã thêm thành công một số người nhận. Có ${duplicateEmails.length} email bị trùng lặp và không được thêm vào.`,
                            duplicateEmails: duplicateEmails,
                            errors: errors // Gửi kèm các lỗi khác nếu có
                        });
                    } else {
                        console.error('Lỗi khi thêm người nhận vào DB:', dbError);
                        res.status(500).json({ message: 'Lỗi server khi thêm người nhận.' });
                    }
                }
            })
            .on('error', (err) => {
                console.error('Lỗi khi đọc file CSV:', err);
                res.status(500).json({ message: 'Lỗi khi xử lý file CSV.' });
            });

    } catch (error) {
        console.error('Lỗi tổng quát khi tải lên người nhận từ CSV:', error);
        res.status(500).json({ message: 'Lỗi server khi xử lý yêu cầu tải lên file.' });
    }
};

// Đặt lại trạng thái cho từng recipient
const resetStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const recipient = await Recipient.findById(id);
        if (!recipient) {
            return res.status(404).json({ message: 'Không tìm thấy người nhận.' });
        }
        recipient.status = 'pending';
        await recipient.save();
        res.json({ message: 'Đã đặt lại trạng thái về pending!', recipient });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi đặt lại trạng thái.', error: error.message });
    }
};

// Đặt lại trạng thái tất cả email đã gửi về pending
const resetSentStatus = async (req, res) => {
    try {
        const result = await Recipient.updateMany(
            { status: 'sent' },
            { $set: { status: 'pending' } }
        );
        res.status(200).json({
            message: `Đã đặt lại ${result.modifiedCount} email đã gửi về trạng thái pending.`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi đặt lại trạng thái email đã gửi.', error: error.message });
    }
};

// Đặt lại trạng thái tất cả email lỗi về pending
const resetFailedStatus = async (req, res) => {
    try {
        const result = await Recipient.updateMany(
            { status: 'failed' },
            { $set: { status: 'pending' } }
        );
        res.status(200).json({
            message: `Đã đặt lại ${result.modifiedCount} email lỗi về trạng thái pending.`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi đặt lại trạng thái email lỗi.', error: error.message });
    }
};

module.exports = {
    getRecipients, addRecipient, addRecipientsFromJson,
    updateRecipient, deleteRecipient, clearRecipients, resetRecipientsStatus, addRecipientsFromCsv, resetStatus, resetSentStatus, resetFailedStatus
};
