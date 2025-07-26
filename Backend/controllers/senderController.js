const Sender = require('../models/senderModel');
const xlsx = require('xlsx');

const getSenders = async (req, res) => {
    try {
        const senders = await Sender.find({}).sort({ createdAt: -1 });
        res.status(200).json(senders);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách tài khoản gửi' });
    }
};

const addSenders = async (req, res) => {
    try {
        const senders = req.body.map(s => ({
            ...s,
            host: s.host || 'smtp.yandex.com',
            port: s.port || 465,
            secure: typeof s.secure === 'boolean' ? s.secure : true
        }));
        if (!Array.isArray(senders) || senders.length === 0) {
            return res.status(400).json({ message: 'Dữ liệu đầu vào phải là một mảng các tài khoản gửi.' });
        }
        const createdSenders = await Sender.insertMany(senders, { ordered: false });
        res.status(201).json({ message: 'Đã thêm thành công các tài khoản gửi.', data: createdSenders });
    } catch (error) {
        res.status(409).json({ message: 'Lỗi khi thêm tài khoản, có thể email đã tồn tại.', error: error.message });
    }
};

const updateSender = async (req, res) => {
    try {
        const updateFields = { ...req.body };
        if (updateFields.host === undefined) delete updateFields.host;
        if (updateFields.port === undefined) delete updateFields.port;
        if (updateFields.secure === undefined) delete updateFields.secure;
        const sender = await Sender.findByIdAndUpdate(req.params.id, updateFields, { new: true });
        if (!sender) { return res.status(404).json({ message: 'Không tìm thấy tài khoản gửi' }); }
        res.status(200).json(sender);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật tài khoản gửi' });
    }
};

const deleteSender = async (req, res) => {
    try {
        await Sender.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Đã xóa tài khoản gửi thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xóa tài khoản gửi' });
    }
};

// --- HÀM MỚI: ĐẶT LẠI SỐ LƯỢNG ĐÃ GỬI ---
const resetSentCounts = async (req, res) => {
    try {
        // Đặt lại sentCount về 0 cho tất cả các tài khoản gửi
        await Sender.updateMany({}, { $set: { sentCount: 0 } });

        // Tùy chọn: Ghi log về hành động reset
        // await Log.create({
        //     level: 'info',
        //     errorMessage: 'All sender sentCounts have been reset to 0.',
        //     // Bạn có thể thêm trường userId nếu có hệ thống xác thực để biết ai đã reset
        // });

        res.status(200).json({ message: 'Đã đặt lại số lượng gửi của tất cả tài khoản thành công.' });
    } catch (error) {
        console.error("Lỗi khi đặt lại sentCount:", error);
        res.status(500).json({ message: 'Lỗi khi đặt lại số lượng gửi của tài khoản.', error: error.message });
    }
};

// --- HÀM MỚI: THÊM TỪ EXCEL ---
const addSendersFromExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng tải lên một file Excel.' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0]; // Lấy tên sheet đầu tiên
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet); // Chuyển đổi sheet thành JSON

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ message: 'File Excel không chứa dữ liệu hoặc định dạng không đúng.' });
        }

        const newSenders = [];
        const errors = [];
        const existingEmails = [];

        // Lấy tất cả các email hiện có trong DB để kiểm tra trùng lặp hiệu quả hơn
        const existingSenderEmails = new Set((await Sender.find({}, { email: 1 })).map(s => s.email));

        for (const row of data) {
            const email = row['email']; // Giả định cột Email trong Excel là 'email' (viết thường)
            const appPassword = row['appPassword']; // Giả định cột AppPassword là 'appPassword' (viết thường)
            const dailyLimit = row['dailyLimit']; // Giả định cột DailyLimit là 'dailyLimit' (viết thường)
            const batchSize = row['batchSize']; // Thêm cột batchSize
            const host = row['host']; // Thêm cột host
            const port = row['port']; // Thêm cột port
            const secure = row['secure']; // Thêm cột secure

            if (!email || !appPassword) {
                errors.push(`Hàng thiếu 'email' hoặc 'appPassword': ${JSON.stringify(row)}`);
                continue;
            }

            if (existingSenderEmails.has(email)) {
                existingEmails.push(email);
                continue; // Bỏ qua nếu email đã tồn tại
            }

            // Chuyển đổi và xử lý giá trị
            const parsedDailyLimit = typeof dailyLimit === 'number' ? dailyLimit : (parseInt(dailyLimit) || 100);
            const parsedBatchSize = typeof batchSize === 'number' ? batchSize : (parseInt(batchSize) || 10);
            const parsedPort = typeof port === 'number' ? port : (parseInt(port) || 465); // Mặc định 465 nếu không có
            const parsedSecure = typeof secure === 'boolean' ? secure : (String(secure).toLowerCase() === 'true' || String(secure) === '1'); // Xử lý boolean từ string/number

            newSenders.push({
                email: String(email).trim(),
                appPassword: String(appPassword).trim(),
                dailyLimit: parsedDailyLimit,
                batchSize: parsedBatchSize,
                host: String(host || 'smtp.yandex.com').trim(), // Mặc định 'smtp.yandex.com' nếu không có
                port: parsedPort,
                secure: parsedSecure,
            });
            existingSenderEmails.add(email); // Thêm vào set để tránh trùng lặp trong cùng file
        }

        if (newSenders.length === 0 && errors.length === 0 && existingEmails.length === 0) {
            return res.status(400).json({ message: 'Không có tài khoản gửi hợp lệ nào được tìm thấy trong file Excel.' });
        }

        let insertedCount = 0;
        let finalMessage = '';

        if (newSenders.length > 0) {
            try {
                const createdSenders = await Sender.insertMany(newSenders, { ordered: false });
                insertedCount = createdSenders.length;
                finalMessage += `Đã thêm thành công ${insertedCount} tài khoản gửi. `;
            } catch (dbError) {
                console.error("Lỗi khi chèn nhiều tài khoản:", dbError);
                finalMessage += `Có lỗi xảy ra khi thêm tài khoản vào cơ sở dữ liệu. Vui lòng kiểm tra log server. `;
            }
        }

        if (existingEmails.length > 0) {
            finalMessage += `Các email sau đã tồn tại và đã được bỏ qua: ${existingEmails.join(', ')}. `;
        }
        if (errors.length > 0) {
            finalMessage += `Một số hàng bị lỗi định dạng và đã được bỏ qua: ${errors.join('; ')}.`;
        }

        res.status(200).json({
            message: finalMessage || 'File Excel đã được xử lý. Không có tài khoản gửi mới nào được thêm.',
            insertedCount,
            existingEmails,
            errors
        });

    } catch (error) {
        console.error("Lỗi khi thêm tài khoản từ Excel:", error);
        res.status(500).json({ message: 'Lỗi khi xử lý file Excel.', error: error.message });
    }
};

// Kích hoạt tất cả tài khoản đang tạm ngưng
const activateAllSenders = async (req, res) => {
    try {
        const result = await Sender.updateMany(
            { isActive: false },
            { $set: { isActive: true } }
        );
        res.status(200).json({
            message: `Đã kích hoạt ${result.modifiedCount} tài khoản gửi.`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi kích hoạt tài khoản gửi.', error: error.message });
    }
};

// Tạm ngưng tất cả tài khoản đang hoạt động
const deactivateAllSenders = async (req, res) => {
    try {
        const result = await Sender.updateMany(
            { isActive: true },
            { $set: { isActive: false } }
        );
        res.status(200).json({
            message: `Đã tạm ngưng ${result.modifiedCount} tài khoản gửi.`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi tạm ngưng tài khoản gửi.', error: error.message });
    }
};

module.exports = {
    getSenders, addSenders, updateSender, deleteSender, resetSentCounts, addSendersFromExcel,
    activateAllSenders, deactivateAllSenders
};
