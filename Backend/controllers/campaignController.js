const nodemailer = require('nodemailer');
const { default: pLimit } = require('p-limit'); // Giữ nguyên cách require này
const colors = require('colors');
const Sender = require('../models/senderModel');
const Recipient = require('../models/recipientModel');
const Log = require('../models/logModel');
const Template = require('../models/templateModel');
const Campaign = require('../models/campaignModel');

// Hàm tạo độ trễ ngẫu nhiên giữa các lần gửi
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// Hàm gửi email cho một nhóm người nhận cụ thể từ một tài khoản gửi
const sendChunk = async (sender, recipientsChunk, selectedTemplates, brandName, minDelay, maxDelay, logs) => {
    let successes = 0;
    let failures = 0;
    for (const recipient of recipientsChunk) {
        try {
            // Kiểm tra giới hạn gửi hàng ngày của tài khoản gửi
            if (sender.sentCount >= sender.dailyLimit) {
                failures++;
                logs.push(`[${sender.email}] Đạt giới hạn gửi trong ngày, bỏ qua ${recipient.email}`);
                // Ghi log nếu sender vượt quá giới hạn hàng ngày
                await Log.create({
                    senderEmail: sender.email,
                    recipientEmail: recipient.email,
                    errorMessage: 'Sender reached daily limit, skipping.',
                    status: 'failed'
                });
                continue; // Bỏ qua người nhận này nếu tài khoản gửi đã đạt giới hạn
            }

            // Chọn một mẫu email ngẫu nhiên từ danh sách đã chọn
            const randomTemplate = selectedTemplates[Math.floor(Math.random() * selectedTemplates.length)];

            // Cấu hình transporter cho nodemailer
            // Tự động điều chỉnh secure dựa trên port
            let secure = sender.secure;
            if (sender.port === 587) {
                secure = false; // Port 587 sử dụng STARTTLS, không phải SSL
            } else if (sender.port === 465) {
                secure = true; // Port 465 sử dụng SSL
            }

            const transporter = nodemailer.createTransport({
                host: sender.host,
                port: sender.port,
                secure: secure,
                auth: {
                    user: sender.email,         // Email tài khoản gửi
                    pass: sender.appPassword    // Mật khẩu ứng dụng (không phải mật khẩu email thông thường)
                },
            });

            // Gửi email
            await transporter.sendMail({
                from: `"${brandName}" <${sender.email}>`, // Tên thương hiệu và email người gửi
                to: recipient.email,                      // Email người nhận
                subject: randomTemplate.subject.replace('{{Ten}}', recipient.name || ''), // Tiêu đề email (thay thế {{Ten}} bằng tên người nhận)
                html: randomTemplate.htmlBody.replace('{{Ten}}', recipient.name || ''),   // Nội dung HTML của email (thay thế {{Ten}} bằng tên người nhận)
            });

            // Cập nhật trạng thái người nhận và số lượng email đã gửi của tài khoản gửi
            recipient.status = 'sent';
            await recipient.save();
            sender.sentCount++;
            await sender.save();
            successes++;
            logs.push(`[${sender.email}] Đã gửi thành công tới: ${recipient.email}`);

            // Ghi log gửi thành công
            await Log.create({
                senderEmail: sender.email,
                recipientEmail: recipient.email,
                status: 'sent'
            });

            // Tạo độ trễ ngẫu nhiên trước khi gửi email tiếp theo
            const delay = getRandomDelay(minDelay, maxDelay) * 1000; // Chuyển giây thành mili giây
            logs.push(`[${sender.email}] Chờ ${delay / 1000}s trước khi gửi tiếp...`);
            await new Promise(resolve => setTimeout(resolve, delay)); // Dừng lại trong khoảng thời gian delay

        } catch (error) {
            failures++;
            recipient.status = 'failed'; // Đặt trạng thái người nhận là thất bại
            await recipient.save();
            const errorMessage = error.response && error.response.data ? error.response.data : error.message;
            logs.push(`[${sender.email}] Lỗi gửi tới ${recipient.email}: ${errorMessage}`);
            await Log.create({
                senderEmail: sender.email,
                recipientEmail: recipient.email,
                errorMessage: errorMessage,
                status: 'failed'
            });
        }
    }
    return { successes, failures }; // Trả về số lượng thành công và thất bại của chunk
};

// Hàm chính để điều phối chiến dịch gửi email
const sendCampaign = async (req, res) => {
    try {
        const { selectedTemplateIds, brandName, minDelay, maxDelay, concurrencyLimit, jobId, totalLimit } = req.body; // Thêm totalLimit
        console.log(`Bắt đầu chiến dịch với các thông số:`.yellow);
        console.log(`  Brand Name: ${brandName}`.yellow);
        console.log(`  Min Delay: ${minDelay}s, Max Delay: ${maxDelay}s`.yellow);
        console.log(`  Concurrency Limit: ${concurrencyLimit}`.yellow);
        console.log(`  Selected Template IDs: ${selectedTemplateIds.join(', ')}`.yellow);
        if (totalLimit !== undefined) {
            console.log(`  Tổng số lượng gửi tối đa: ${totalLimit}`.yellow);
        }

        const senders = await Sender.find({ isActive: true });
        let recipients = await Recipient.find({ status: 'pending' });
        const selectedTemplates = await Template.find({ _id: { $in: selectedTemplateIds } });

        if (senders.length === 0) {
            return res.status(400).json({ message: 'Không tìm thấy tài khoản gửi nào đang hoạt động.' });
        }
        if (recipients.length === 0) {
            return res.status(400).json({ message: 'Không tìm thấy người nhận nào có trạng thái "pending". Vui lòng thêm người nhận hoặc đặt lại trạng thái một số người nhận về "pending".' });
        }
        if (selectedTemplates.length === 0) {
            return res.status(400).json({ message: 'Không tìm thấy mẫu email nào được chọn.' });
        }

        console.log(`Tìm thấy ${senders.length} tài khoản gửi đang hoạt động.`.blue);
        console.log(`Tìm thấy ${recipients.length} người nhận có trạng thái "pending".`.blue);
        console.log(`Tìm thấy ${selectedTemplates.length} mẫu email được chọn.`.blue);

        const finalBrandName = brandName || 'Your Brand';
        const finalMinDelay = minDelay !== undefined ? minDelay : 1;
        const finalMaxDelay = maxDelay !== undefined ? maxDelay : 5;
        // --- LOGIC GỬI THEO BATCH VÒNG TRÒN ---
        // Tạo trạng thái cho từng sender
        const senderStates = senders.map(sender => ({
            sender,
            sentCount: sender.sentCount,
            finished: false
        }));
        let totalSuccesses = 0;
        let totalFailures = 0;
        const logs = [];
        let recipientIndex = 0;
        // Trong sendCampaign, khi bắt đầu, set trạng thái job là running
        jobStatusMap[jobId] = 'running';
        // Lặp cho đến khi hết recipient hoặc tất cả sender đều finished
        while (recipientIndex < recipients.length) {
            // Kiểm tra trạng thái job
            while (jobStatusMap[jobId] === 'paused') {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Chờ 1s rồi kiểm tra lại
            }
            let allSenderFinished = senderStates.every(s => s.finished);
            if (allSenderFinished) break;
            for (let s = 0; s < senderStates.length; s++) {
                const senderState = senderStates[s];
                if (senderState.finished) continue;
                // Tính số lượng có thể gửi trong batch này
                const sender = senderState.sender;
                const batchSize = sender.batchSize;
                let canSend = Math.min(batchSize, sender.dailyLimit - senderState.sentCount, recipients.length - recipientIndex);
                if (totalLimit !== undefined) {
                    canSend = Math.min(canSend, totalLimit - totalSuccesses);
                }
                if (canSend <= 0) {
                    senderState.finished = true;
                    logs.push(`[${sender.email}] Đã đạt giới hạn gửi trong ngày hoặc hết recipient.`);
                    sendSseLog(jobId, `[${sender.email}] Đã đạt giới hạn gửi trong ngày hoặc hết recipient.`);
                    continue;
                }
                for (let b = 0; b < canSend; b++) {
                    if (recipientIndex >= recipients.length) break;
                    if (totalLimit !== undefined && totalSuccesses >= totalLimit) break;

                    // KIỂM TRA PAUSED NGAY TRƯỚC MỖI LẦN GỬI
                    while (jobStatusMap[jobId] === 'paused') {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    const recipient = recipients[recipientIndex];
                    try {
                        logs.push(`[${sender.email}] Đang gửi mail cho ${recipient.email}`);
                        sendSseLog(jobId, `[${sender.email}] Đang gửi mail cho ${recipient.email}`);
                        const randomTemplate = selectedTemplates[Math.floor(Math.random() * selectedTemplates.length)];
                        // Tự động điều chỉnh secure dựa trên port
                        let secure = sender.secure;
                        if (sender.port === 587) {
                            secure = false; // Port 587 sử dụng STARTTLS, không phải SSL
                        } else if (sender.port === 465) {
                            secure = true; // Port 465 sử dụng SSL
                        }

                        const transporter = nodemailer.createTransport({
                            host: sender.host,
                            port: sender.port,
                            secure: secure,
                            auth: {
                                user: sender.email,
                                pass: sender.appPassword
                            },
                        });
                        await transporter.sendMail({
                            from: `"${finalBrandName}" <${sender.email}>`,
                            to: recipient.email,
                            subject: randomTemplate.subject.replace('{{Ten}}', recipient.name || ''),
                            html: randomTemplate.htmlBody.replace('{{Ten}}', recipient.name || ''),
                        });
                        recipient.status = 'sent';
                        await recipient.save();
                        // Tăng sentCount cho sender cả khi gửi thành công
                        sender.sentCount++;
                        senderState.sentCount++;
                        await sender.save();
                        // Tăng sentCount cho template đã dùng
                        randomTemplate.sentCount = (randomTemplate.sentCount || 0) + 1;
                        await randomTemplate.save();
                        logs.push(`[${sender.email}] Đã gửi mail thành công cho ${recipient.email}`);
                        sendSseLog(jobId, `[${sender.email}] Đã gửi mail thành công cho ${recipient.email}`);
                        await Log.create({
                            senderEmail: sender.email,
                            recipientEmail: recipient.email,
                            status: 'sent'
                        });
                        totalSuccesses++;
                        // Nếu sender đạt limit thì đánh dấu finished
                        if (senderState.sentCount >= sender.dailyLimit) {
                            senderState.finished = true;
                            logs.push(`[${sender.email}] Đã đạt giới hạn gửi trong ngày.`);
                            sendSseLog(jobId, `[${sender.email}] Đã đạt giới hạn gửi trong ngày.`);
                        }
                        // Delay giữa các lần gửi
                        const delay = getRandomDelay(finalMinDelay, finalMaxDelay) * 1000;
                        logs.push(`[${sender.email}] Chờ ${delay / 1000}s trước khi gửi tiếp...`);
                        sendSseLog(jobId, `[${sender.email}] Chờ ${delay / 1000}s trước khi gửi tiếp...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } catch (error) {
                        recipient.status = 'failed';
                        await recipient.save();
                        // Tăng sentCount cho sender cả khi gửi lỗi
                        sender.sentCount++;
                        senderState.sentCount++;
                        await sender.save();
                        const errorMessage = error.response && error.response.data ? error.response.data : error.message;
                        logs.push(`[${sender.email}] Lỗi gửi tới ${recipient.email}: ${errorMessage}`);
                        sendSseLog(jobId, `[${sender.email}] Lỗi gửi tới ${recipient.email}: ${errorMessage}`);
                        await Log.create({
                            senderEmail: sender.email,
                            recipientEmail: recipient.email,
                            errorMessage: errorMessage,
                            status: 'failed'
                        });
                        totalFailures++;
                        // Nếu sender đạt limit thì đánh dấu finished
                        if (senderState.sentCount >= sender.dailyLimit) {
                            senderState.finished = true;
                            logs.push(`[${sender.email}] Đã đạt giới hạn gửi trong ngày.`);
                            sendSseLog(jobId, `[${sender.email}] Đã đạt giới hạn gửi trong ngày.`);
                        }
                        // Delay giữa các lần gửi (cả khi lỗi)
                        const delay = getRandomDelay(finalMinDelay, finalMaxDelay) * 1000;
                        logs.push(`[${sender.email}] Chờ ${delay / 1000}s trước khi gửi tiếp...`);
                        sendSseLog(jobId, `[${sender.email}] Chờ ${delay / 1000}s trước khi gửi tiếp...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    recipientIndex++;
                }
            }
        }
        logs.push(`Chiến dịch hoàn tất. Gửi thành công: ${totalSuccesses}. Thất bại: ${totalFailures}.`);
        sendSseLog(jobId, `Chiến dịch hoàn tất. Gửi thành công: ${totalSuccesses}. Thất bại: ${totalFailures}.`);
        const sseRes = sseClients.get(jobId);
        if (sseRes) sseRes.end();
        res.status(200).json({
            message: `Chiến dịch hoàn tất. Gửi thành công: ${totalSuccesses}. Thất bại: ${totalFailures}.`,
            logs
        });
    } catch (error) {
        console.error('Lỗi nghiêm trọng trong sendCampaign:'.red, error);
        res.status(500).json({ message: 'Lỗi khi bắt đầu hoặc thực hiện chiến dịch.', error: error.message });
    }
};

// Thêm biến toàn cục lưu trạng thái job
const jobStatusMap = {};

// API tạm dừng job
const pauseCampaign = async (req, res) => {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ message: 'Thiếu jobId' });
    jobStatusMap[jobId] = 'paused';
    console.log(`[${jobId}] ĐÃ TẠM DỪNG CHIẾN DỊCH!`);
    res.json({ message: 'Đã tạm dừng chiến dịch', jobId });
};

// API tiếp tục job
const resumeCampaign = async (req, res) => {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ message: 'Thiếu jobId' });
    jobStatusMap[jobId] = 'running';
    console.log(`[${jobId}] ĐÃ TIẾP TỤC CHIẾN DỊCH!`);
    res.json({ message: 'Đã tiếp tục chiến dịch', jobId });
};

// --- SSE log realtime ---
const sseClients = new Map(); // jobId -> res

// SSE endpoint
const campaignLogStream = (req, res) => {
    const jobId = req.query.jobId;
    if (!jobId) return res.status(400).end();
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    res.flushHeaders();
    sseClients.set(jobId, res);
    req.on('close', () => {
        sseClients.delete(jobId);
    });
};

function sendSseLog(jobId, log) {
    const res = sseClients.get(jobId);
    if (res) {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
    }
}

module.exports = {
    sendCampaign,
    campaignLogStream,
    pauseCampaign,
    resumeCampaign
};