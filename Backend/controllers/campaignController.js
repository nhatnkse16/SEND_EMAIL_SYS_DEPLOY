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

        // Khởi tạo danh sách sender và template có thể sử dụng
        let availableSenders = [...senders];
        let availableTemplates = [...selectedTemplates];

        // Hàm chọn random không lặp lại
        const getRandomWithoutReplacement = (array) => {
            if (array.length === 0) return null;
            const randomIndex = Math.floor(Math.random() * array.length);
            const selected = array[randomIndex];
            array.splice(randomIndex, 1); // Xóa phần tử đã chọn
            return selected;
        };

        // Hàm reset danh sách khi hết
        const resetIfEmpty = () => {
            if (availableSenders.length === 0) {
                availableSenders = [...senders];
                console.log('Đã reset danh sách sender');
            }
            if (availableTemplates.length === 0) {
                availableTemplates = [...selectedTemplates];
                console.log('Đã reset danh sách template');
            }
        };

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
        let roundNumber = 1; // Thêm biến đếm vòng lặp
        // Trong sendCampaign, khi bắt đầu, set trạng thái job là running
        jobStatusMap[jobId] = 'running';

        // Lặp cho đến khi không còn recipient pending hoặc failed
        while (true) {
            // Lấy danh sách recipients cần gửi (pending + failed)
            let recipients = await Recipient.find({ status: { $in: ['pending', 'failed'] } });

            if (recipients.length === 0) {
                logs.push(`Vòng ${roundNumber}: Không còn recipient nào cần gửi. Kết thúc chiến dịch.`);
                sendSseLog(jobId, `Vòng ${roundNumber}: Không còn recipient nào cần gửi. Kết thúc chiến dịch.`);
                break;
            }

            logs.push(`=== BẮT ĐẦU VÒNG ${roundNumber} ===`);
            sendSseLog(jobId, `=== BẮT ĐẦU VÒNG ${roundNumber} ===`);
            logs.push(`Vòng ${roundNumber}: Có ${recipients.length} recipients cần gửi (pending + failed)`);
            sendSseLog(jobId, `Vòng ${roundNumber}: Có ${recipients.length} recipients cần gửi (pending + failed)`);

            // Reset trạng thái sender cho vòng mới
            senderStates.forEach(state => {
                state.finished = false;
            });

            recipientIndex = 0;

            // Lặp cho đến khi hết recipient trong vòng này hoặc tất cả sender đều finished
            while (recipientIndex < recipients.length) {
                // Kiểm tra trạng thái job
                while (jobStatusMap[jobId] === 'paused') {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Chờ 1s rồi kiểm tra lại
                }
                let allSenderFinished = senderStates.every(s => s.finished);
                if (allSenderFinished) {
                    logs.push(`Vòng ${roundNumber}: Tất cả sender đã finished. Chuyển sang vòng tiếp theo.`);
                    sendSseLog(jobId, `Vòng ${roundNumber}: Tất cả sender đã finished. Chuyển sang vòng tiếp theo.`);
                    break;
                }
                // Tính số lượng có thể gửi trong batch này (dùng senderStates để kiểm soát limit)
                // Nhưng random sender/template cho từng recipient
                for (let b = 0; b < 1; b++) { // Luôn gửi từng recipient một
                    if (recipientIndex >= recipients.length) break;
                    if (totalLimit !== undefined && totalSuccesses >= totalLimit) break;

                    // Reset danh sách nếu hết
                    resetIfEmpty();

                    // Random sender và template cho từng recipient
                    const selectedSender = getRandomWithoutReplacement(availableSenders);
                    const selectedTemplate = getRandomWithoutReplacement(availableTemplates);

                    if (!selectedSender || !selectedTemplate) {
                        logs.push('Không có sender hoặc template khả dụng');
                        break;
                    }

                    // Tìm senderState tương ứng
                    const senderState = senderStates.find(s => s.sender._id === selectedSender._id);
                    if (!senderState || senderState.finished) {
                        continue;
                    }

                    // Kiểm tra limit sender
                    if (senderState.sentCount >= selectedSender.dailyLimit) {
                        senderState.finished = true;
                        logs.push(`[${selectedSender.email}] Đã đạt giới hạn gửi trong ngày hoặc hết recipient.`);
                        sendSseLog(jobId, `[${selectedSender.email}] Đã đạt giới hạn gửi trong ngày hoặc hết recipient.`);
                        continue;
                    }

                    const recipient = recipients[recipientIndex];
                    try {
                        logs.push(`Vòng ${roundNumber} - [${selectedSender.email}] Đang gửi mail cho ${recipient.email} với template: ${selectedTemplate.name}`);
                        sendSseLog(jobId, `Vòng ${roundNumber} - [${selectedSender.email}] Đang gửi mail cho ${recipient.email} với template: ${selectedTemplate.name}`);

                        // Tự động điều chỉnh secure dựa trên port
                        let secure = selectedSender.secure;
                        if (selectedSender.port === 587) {
                            secure = false;
                        } else if (selectedSender.port === 465) {
                            secure = true;
                        }
                        const transporter = nodemailer.createTransport({
                            host: selectedSender.host,
                            port: selectedSender.port,
                            secure: secure,
                            auth: {
                                user: selectedSender.email,
                                pass: selectedSender.appPassword
                            },
                        });
                        await transporter.sendMail({
                            from: `"${finalBrandName}" <${selectedSender.email}>`,
                            to: recipient.email,
                            subject: selectedTemplate.subject.replace('{{Ten}}', recipient.name || ''),
                            html: selectedTemplate.htmlBody.replace('{{Ten}}', recipient.name || ''),
                        });
                        recipient.status = 'sent';
                        await recipient.save();
                        selectedSender.sentCount++;
                        senderState.sentCount++;
                        await selectedSender.save();
                        selectedTemplate.sentCount = (selectedTemplate.sentCount || 0) + 1;
                        await selectedTemplate.save();
                        logs.push(`Vòng ${roundNumber} - [${selectedSender.email}] Đã gửi mail thành công cho ${recipient.email} với template: ${selectedTemplate.name}`);
                        sendSseLog(jobId, `Vòng ${roundNumber} - [${selectedSender.email}] Đã gửi mail thành công cho ${recipient.email} với template: ${selectedTemplate.name}`);
                        await Log.create({
                            senderEmail: selectedSender.email,
                            recipientEmail: recipient.email,
                            status: 'sent'
                        });
                        totalSuccesses++;
                        if (senderState.sentCount >= selectedSender.dailyLimit) {
                            senderState.finished = true;
                            logs.push(`[${selectedSender.email}] Đã đạt giới hạn gửi trong ngày.`);
                            sendSseLog(jobId, `[${selectedSender.email}] Đã đạt giới hạn gửi trong ngày.`);
                        }
                        const delay = getRandomDelay(finalMinDelay, finalMaxDelay) * 1000;
                        logs.push(`[${selectedSender.email}] Chờ ${delay / 1000}s trước khi gửi tiếp...`);
                        sendSseLog(jobId, `[${selectedSender.email}] Chờ ${delay / 1000}s trước khi gửi tiếp...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } catch (error) {
                        recipient.status = 'failed';
                        await recipient.save();
                        selectedSender.sentCount++;
                        senderState.sentCount++;
                        await selectedSender.save();
                        const errorMessage = error.response && error.response.data ? error.response.data : error.message;
                        logs.push(`Vòng ${roundNumber} - [${selectedSender.email}] Lỗi gửi tới ${recipient.email}: ${errorMessage}`);
                        sendSseLog(jobId, `Vòng ${roundNumber} - [${selectedSender.email}] Lỗi gửi tới ${recipient.email}: ${errorMessage}`);
                        await Log.create({
                            senderEmail: selectedSender.email,
                            recipientEmail: recipient.email,
                            errorMessage: errorMessage,
                            status: 'failed'
                        });
                        totalFailures++;
                        if (senderState.sentCount >= selectedSender.dailyLimit) {
                            senderState.finished = true;
                            logs.push(`[${selectedSender.email}] Đã đạt giới hạn gửi trong ngày.`);
                            sendSseLog(jobId, `[${selectedSender.email}] Đã đạt giới hạn gửi trong ngày.`);
                        }
                        const delay = getRandomDelay(finalMinDelay, finalMaxDelay) * 1000;
                        logs.push(`[${selectedSender.email}] Chờ ${delay / 1000}s trước khi gửi tiếp...`);
                        sendSseLog(jobId, `[${selectedSender.email}] Chờ ${delay / 1000}s trước khi gửi tiếp...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    recipientIndex++;
                }
            }

            // Kết thúc vòng hiện tại
            logs.push(`=== KẾT THÚC VÒNG ${roundNumber} ===`);
            sendSseLog(jobId, `=== KẾT THÚC VÒNG ${roundNumber} ===`);

            // Kiểm tra xem còn email failed không
            const remainingFailed = await Recipient.countDocuments({ status: 'failed' });
            if (remainingFailed === 0) {
                logs.push(`Không còn email failed nào. Kết thúc chiến dịch.`);
                sendSseLog(jobId, `Không còn email failed nào. Kết thúc chiến dịch.`);
                break;
            } else {
                logs.push(`Còn ${remainingFailed} email failed. Chuẩn bị vòng tiếp theo...`);
                sendSseLog(jobId, `Còn ${remainingFailed} email failed. Chuẩn bị vòng tiếp theo...`);
                roundNumber++;
            }
        }

        logs.push(`Chiến dịch hoàn tất sau ${roundNumber} vòng. Gửi thành công: ${totalSuccesses}. Thất bại: ${totalFailures}.`);
        sendSseLog(jobId, `Chiến dịch hoàn tất sau ${roundNumber} vòng. Gửi thành công: ${totalSuccesses}. Thất bại: ${totalFailures}.`);
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