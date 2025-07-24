import React, { useState, useEffect } from 'react';
import axios from 'axios';
import shared from './shared.module.css'; // Đảm bảo import đúng

// Định nghĩa kiểu dữ liệu cho một đối tượng Template
interface ITemplate {
    _id: string;
    name: string;
    subject: string;
    sentCount?: number; // Thêm trường này
    htmlBody: string; // Thêm trường này để dùng cho preview
    // Thêm các trường khác của template nếu có
}

// Toast component
function Toast({ message, type, onClose }: { message: string, type?: 'success' | 'error', onClose: () => void }) {
    React.useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);
    return (
        <div style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            background: type === 'error' ? '#dc3545' : '#28a745',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontWeight: 500,
            minWidth: 200,
            maxWidth: 320,
            textAlign: 'center',
            fontSize: 16
        }}>{message}</div>
    );
}

// Thêm hàm sinh uuid đơn giản
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const CampaignSender = () => {
    // State để lưu danh sách các mẫu email lấy từ DB
    const [templates, setTemplates] = useState<ITemplate[]>([]);
    // State để lưu ID của các mẫu email được chọn
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    // Thêm state cho search, filter, phân trang
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    // State cho các ô cấu hình
    const [brandName, setBrandName] = useState<string>('Your Brand');
    const [minDelay, setMinDelay] = useState<number>(1);
    const [maxDelay, setMaxDelay] = useState<number>(5);
    const [concurrencyLimit, setConcurrencyLimit] = useState<number>(10);

    // State cho trạng thái loading (khi đang gửi mail)
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // State cho thông báo phản hồi từ server
    const [message, setMessage] = useState<string>('');
    const [isError, setIsError] = useState<boolean>(false);
    const [toast, setToast] = useState<{ message: string, type?: 'success' | 'error' } | null>(null);

    // Thêm state cho log
    // Thay vì 1 logs, dùng mảng các log viewer
    const [logViewers, setLogViewers] = useState<Array<{ jobId: string, logs: string[], status: 'running' | 'done', failedEmails: string[] }>>([]);

    // Thêm state cho preview HTML
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);

    // Lấy danh sách template từ backend khi component được tải lần đầu
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/templates');
                setTemplates(res.data);
                console.log("Templates đã tải từ backend:", res.data); // Log templates đã tải
            } catch (error) {
                console.error("Lỗi khi tải danh sách mẫu email:", error);
                setMessage("Không thể tải danh sách mẫu email. Vui lòng kiểm tra backend.");
                setIsError(true);
            }
        };
        fetchTemplates();
    }, []); // [] đảm bảo useEffect chỉ chạy một lần sau render đầu tiên

    // Khi mount, đọc giá trị từ localStorage nếu có
    useEffect(() => {
        const savedBrand = localStorage.getItem('campaign_brandName');
        const savedMinDelay = localStorage.getItem('campaign_minDelay');
        const savedMaxDelay = localStorage.getItem('campaign_maxDelay');
        const savedConcurrency = localStorage.getItem('campaign_concurrencyLimit');
        if (savedBrand !== null) setBrandName(savedBrand);
        if (savedMinDelay !== null) setMinDelay(parseInt(savedMinDelay, 10));
        if (savedMaxDelay !== null) setMaxDelay(parseInt(savedMaxDelay, 10));
        if (savedConcurrency !== null) setConcurrencyLimit(parseInt(savedConcurrency, 10));
    }, []);

    // Xử lý khi checkbox của một mẫu email được thay đổi
    const handleCheckboxChange = (templateId: string) => {
        setSelectedTemplateIds(prevSelected => {
            if (prevSelected.includes(templateId)) {
                // Nếu đã chọn, bỏ chọn
                return prevSelected.filter(id => id !== templateId);
            } else {
                // Nếu chưa chọn, thêm vào danh sách
                return [...prevSelected, templateId];
            }
        });
    };

    // Xử lý khi nhấn nút "Bắt đầu gửi"
    const handleSend = async () => {
        setIsLoading(true); // Bắt đầu trạng thái loading
        setMessage(''); // Xóa thông báo cũ
        setIsError(false); // Đặt lại trạng thái lỗi
        // Sinh jobId cho chiến dịch
        const jobId = uuidv4();
        // Thêm log viewer mới
        setLogViewers(viewers => [...viewers, { jobId, logs: [], status: 'running', failedEmails: [] }]);
        // Mở SSE
        const sse = new EventSource(`http://localhost:5000/api/campaign/log-stream?jobId=${jobId}`);
        sse.onmessage = (e) => {
            try {
                const log = JSON.parse(e.data);
                setLogViewers(viewers => viewers.map(v => {
                    if (v.jobId !== jobId) return v;
                    let failedEmails = v.failedEmails;
                    if (typeof log === 'string' && log.startsWith('[') && log.includes('Lỗi gửi tới')) {
                        // Trích xuất email nhận lỗi
                        const match = log.match(/Lỗi gửi tới ([^:]+):/);
                        if (match && match[1] && !failedEmails.includes(match[1])) {
                            failedEmails = [...failedEmails, match[1]];
                        }
                    }
                    return {
                        ...v,
                        logs: [...v.logs, log],
                        status: (typeof log === 'string' && log.startsWith('Chiến dịch hoàn tất.')) ? 'done' : v.status,
                        failedEmails
                    };
                }));
                if (typeof log === 'string' && log.startsWith('Chiến dịch hoàn tất.')) {
                    sse.close();
                }
            } catch { }
        };
        sse.onerror = () => { sse.close(); };

        // Kiểm tra xem đã chọn template nào chưa
        if (selectedTemplateIds.length === 0) {
            setMessage("Vui lòng chọn ít nhất một mẫu email để gửi.");
            setIsError(true);
            setIsLoading(false);
            return;
        }
        // Kiểm tra độ trễ tối thiểu không lớn hơn độ trễ tối đa
        if (minDelay > maxDelay) {
            setMessage("Độ trễ tối thiểu không được lớn hơn độ trễ tối đa.");
            setIsError(true);
            setIsLoading(false);
            return;
        }
        // Kiểm tra các giá trị cấu hình hợp lệ
        if (minDelay < 0 || maxDelay < 0 || concurrencyLimit < 1) {
            setMessage("Các giá trị độ trễ và giới hạn gửi đồng thời phải hợp lệ (không âm, giới hạn đồng thời >= 1).");
            setIsError(true);
            setIsLoading(false);
            return;
        }


        try {
            // Thêm console.log ngay trước khi gửi request để kiểm tra dữ liệu
            console.log("Dữ liệu gửi đi từ CampaignSender:");
            console.log("    selectedTemplateIds:", selectedTemplateIds);
            console.log("    brandName:", brandName);
            console.log("    minDelay:", minDelay);
            console.log("    maxDelay:", maxDelay);
            console.log("    concurrencyLimit:", concurrencyLimit);
            console.log("    jobId:", jobId);

            // Bắt đầu gửi: thêm log
            // setLogs(logs => [...logs, 'Bắt đầu gửi chiến dịch...']); // This line is removed as logs state is replaced by logViewers

            // Gửi yêu cầu POST đến API gửi chiến dịch
            const res = await axios.post('http://localhost:5000/api/campaign/send', {
                selectedTemplateIds, // Mảng các ID của mẫu đã chọn
                brandName,
                minDelay,
                maxDelay,
                concurrencyLimit,
                jobId
            });

            // Xử lý phản hồi thành công
            setMessage(res.data.message);
            setIsError(false);
            setToast({ message: res.data.message, type: 'success' });
            console.log("Phản hồi từ server:", res.data);
            // Khi gửi thành công từng email (giả lập log demo, thực tế cần backend trả về log chi tiết):
            // Ví dụ: setLogs(logs => [...logs, `Đã gửi email tới: ...`]); // This line is removed
            if (res.data.logs) {
                const failedEmails = res.data.logs
                    .filter((log: string) => typeof log === 'string' && log.startsWith('[') && log.includes('Lỗi gửi tới'))
                    .map((log: string) => {
                        const match = log.match(/Lỗi gửi tới ([^:]+):/);
                        return match && match[1] ? match[1] : null;
                    })
                    .filter((email: string | null) => !!email);
                setLogViewers(viewers => viewers.map(v => v.jobId === jobId ? { ...v, logs: res.data.logs, failedEmails } : v));
            }

        } catch (error: any) { // Sử dụng 'any' để truy cập thuộc tính 'response' của lỗi Axios
            console.error("Lỗi khi gửi chiến dịch:", error);
            // Hiển thị thông báo lỗi từ server nếu có, hoặc thông báo chung
            setMessage(error.response?.data?.message || "Lỗi khi gửi chiến dịch.");
            setIsError(true);
            setToast({ message: error.response?.data?.message || "Lỗi khi gửi chiến dịch.", type: 'error' });
            // setLogs(logs => [...logs, error.response?.data?.message || 'Lỗi khi gửi chiến dịch.']); // This line is removed
            setLogViewers(viewers => viewers.map(v => v.jobId === jobId ? { ...v, logs: [...v.logs, error.response?.data?.message || 'Lỗi khi gửi chiến dịch.'] } : v));
        } finally {
            setIsLoading(false); // Kết thúc trạng thái loading
        }
    };

    // Lọc và tìm kiếm template
    const filteredTemplates = templates.filter(t => {
        const keyword = search.toLowerCase();
        return (
            t.name.toLowerCase().includes(keyword) ||
            t.subject.toLowerCase().includes(keyword)
        ) && (true); // Xoá setFilter
    });
    // Phân trang
    const totalPages = Math.ceil(filteredTemplates.length / pageSize);
    const pagedTemplates = filteredTemplates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Sắp xếp: mẫu được chọn lên đầu
    const sortedTemplates = [
        ...pagedTemplates.filter(t => selectedTemplateIds.includes(t._id)),
        ...pagedTemplates.filter(t => !selectedTemplateIds.includes(t._id))
    ];

    // Thêm hàm kiểm tra tất cả template trên trang đã được chọn chưa
    const allChecked = pagedTemplates.length > 0 && pagedTemplates.every(t => selectedTemplateIds.includes(t._id));
    const handleCheckAll = () => {
        if (allChecked) {
            setSelectedTemplateIds(prev => prev.filter(id => !pagedTemplates.some(t => t._id === id)));
        } else {
            setSelectedTemplateIds(prev => [
                ...prev,
                ...pagedTemplates.filter(t => !prev.includes(t._id)).map(t => t._id)
            ]);
        }
    };

    // Auto scroll log xuống cuối khi có log mới
    // React.useEffect(() => {
    //     if (logRef.current) {
    //         logRef.current.scrollTop = logRef.current.scrollHeight;
    //     }
    // }, [logs]); // This line is removed as logRef is removed

    // Hàm đóng log viewer
    const closeLogViewer = (jobId: string) => {
        setLogViewers(viewers => viewers.filter(v => v.jobId !== jobId));
    };

    return (
        <div className={shared.formContainer} style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
            <h2 className={shared.title}>Cấu hình Chiến dịch Email</h2>
            {/* Hiển thị thông báo */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {message && isError && (
                <div className={
                    `${shared.messageBox} error`
                }>
                    {message}
                </div>
            )}
            {/* --- Phần cấu hình chung --- */}
            <div className={shared.formGroup}>
                <label htmlFor="brandName">Tên Thương hiệu / Người gửi</label>
                <input
                    type="text"
                    id="brandName"
                    value={brandName}
                    onChange={e => { setBrandName(e.target.value); localStorage.setItem('campaign_brandName', e.target.value); }}
                    className={shared.formControl}
                    placeholder="Ví dụ: Công ty XYZ"
                />
            </div>
            <div className={shared.formGroup}>
                <label htmlFor="concurrencyLimit">Giới hạn gửi đồng thời (Concurrency Limit)</label>
                <input
                    type="number"
                    id="concurrencyLimit"
                    value={concurrencyLimit}
                    onChange={e => { setConcurrencyLimit(Number(e.target.value)); localStorage.setItem('campaign_concurrencyLimit', e.target.value); }}
                    className={shared.formControl}
                    min={1}
                />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <div className={shared.formGroup} style={{ flex: 1 }}>
                    <label htmlFor="minDelay">Độ trễ tối thiểu (giây)</label>
                    <input
                        type="number"
                        id="minDelay"
                        value={minDelay}
                        onChange={e => { setMinDelay(Number(e.target.value)); localStorage.setItem('campaign_minDelay', e.target.value); }}
                        className={shared.formControl}
                        min={0}
                    />
                </div>
                <div className={shared.formGroup} style={{ flex: 1 }}>
                    <label htmlFor="maxDelay">Độ trễ tối đa (giây)</label>
                    <input
                        type="number"
                        id="maxDelay"
                        value={maxDelay}
                        onChange={e => { setMaxDelay(Number(e.target.value)); localStorage.setItem('campaign_maxDelay', e.target.value); }}
                        className={shared.formControl}
                        min={minDelay}
                    />
                </div>
            </div>
            {/* --- Phần chọn Template dạng table --- */}
            <div className={shared.formGroup}>
                <label>Chọn Mẫu Email gửi ngẫu nhiên</label>
                <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc tiêu đề..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                        className={shared.formControl}
                        style={{ maxWidth: 300 }}
                    />
                </div>
                <div className={shared.tableResponsive} style={{ width: '100%', overflowX: 'auto' }}>
                    <div className={shared.tableWrapper} style={{ minWidth: 500, width: '100%' }}>
                        <table className={shared.dataTable} style={{ minWidth: 500, width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            checked={allChecked}
                                            onChange={handleCheckAll}
                                            style={{ width: 22, height: 22, accentColor: '#007bff', cursor: 'pointer' }}
                                            title="Chọn tất cả mẫu trên trang này"
                                        />
                                    </th>
                                    <th>Tên mẫu</th>
                                    <th>Tiêu đề</th>
                                    <th>Số lần đã gửi</th>
                                    <th></th> {/* Cột cho nút xem trước */}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedTemplates.length > 0 ? (
                                    sortedTemplates.map(template => {
                                        const checked = selectedTemplateIds.includes(template._id);
                                        return (
                                            <tr
                                                key={template._id}
                                                style={{
                                                    background: checked ? 'rgba(0,123,255,0.08)' : undefined,
                                                    transition: 'background 0.2s'
                                                }}
                                            >
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        id={template._id}
                                                        value={template._id}
                                                        onChange={() => handleCheckboxChange(template._id)}
                                                        checked={checked}
                                                        style={{ width: 22, height: 22, accentColor: '#007bff', cursor: 'pointer' }}
                                                    />
                                                </td>
                                                <td>
                                                    <label htmlFor={template._id} style={{ cursor: 'pointer' }}>{template.name}</label>
                                                </td>
                                                <td>{template.subject}</td>
                                                <td>{template.sentCount ?? 0}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className={shared.btnInfo}
                                                        style={{ padding: 0, background: 'none', border: 'none', boxShadow: 'none', color: '#6f42c1', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
                                                        onClick={() => setPreviewHtml(template.htmlBody)}
                                                        title="Xem trước nội dung HTML"
                                                    >
                                                        👁️
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={3} className={shared.textDanger} style={{ textAlign: 'center' }}>
                                            Không có mẫu email nào phù hợp.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Phân trang */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                        <button
                            type="button"
                            className={shared.btn}
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        >
                            Trang trước
                        </button>
                        <span style={{ alignSelf: 'center' }}>Trang {currentPage} / {totalPages}</span>
                        <button
                            type="button"
                            className={shared.btn}
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        >
                            Trang sau
                        </button>
                    </div>
                )}
            </div>
            {/* Nút gửi chiến dịch */}
            <button
                onClick={handleSend}
                disabled={isLoading || selectedTemplateIds.length === 0 || minDelay > maxDelay}
                className={`${shared.btn} ${shared.btnPrimary}`}
            >
                {isLoading ? 'Đang gửi...' : '🚀 Bắt đầu gửi Chiến dịch'}
            </button>
            {/* Log quá trình gửi mail */}
            <div style={{ marginTop: 32 }}>
                <h3 style={{ fontSize: 18, marginBottom: 8 }}>Log quá trình gửi mail</h3>
                {logViewers.length === 0 ? (
                    <div style={{ color: '#aaa', background: '#222', borderRadius: 8, padding: 16 }}>Chưa có log nào...</div>
                ) : (
                    logViewers.map((viewer, idx) => (
                        <div key={viewer.jobId} style={{ background: '#222', color: '#fff', borderRadius: 8, padding: 16, minHeight: 120, maxHeight: 240, overflowY: 'auto', fontFamily: 'monospace', fontSize: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 18, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 8, right: 12 }}>
                                <button onClick={() => closeLogViewer(viewer.jobId)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }} title="Đóng log">×</button>
                            </div>
                            <div style={{ fontWeight: 600, marginBottom: 8, color: '#0ff' }}>Chiến dịch #{idx + 1} (jobId: {viewer.jobId.slice(0, 8)}...)</div>
                            {viewer.logs.length === 0 ? <div style={{ color: '#aaa' }}>Đang chờ log...</div> : viewer.logs.map((line, i) => <div key={i}>{line}</div>)}
                            {viewer.status === 'done' && <div style={{ color: '#28a745', marginTop: 8, fontWeight: 600 }}>Đã hoàn thành</div>}
                            {viewer.failedEmails.length > 0 && (
                                <div style={{ marginTop: 12, background: '#330', color: '#ffbaba', borderRadius: 6, padding: 8 }}>
                                    <div style={{ fontWeight: 600, color: '#ffbaba', marginBottom: 4 }}>Danh sách email gửi lỗi:</div>
                                    {viewer.failedEmails.map((email, i) => <div key={i} style={{ fontFamily: 'monospace', color: '#ffbaba' }}>{email}</div>)}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
            {/* Popup xem trước HTML */}
            {previewHtml !== null && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.35)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 16
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 14, padding: 24, minWidth: 340, maxWidth: 700, width: '100%',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', position: 'relative',
                        animation: 'fadeInScale 0.25s cubic-bezier(.4,2,.6,1)',
                        maxHeight: '90vh', overflowY: 'auto'
                    }}>
                        <button onClick={() => setPreviewHtml(null)}
                            style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer', fontWeight: 700 }}
                            aria-label="Đóng preview"
                        >×</button>
                        <h2 style={{ marginBottom: 18, textAlign: 'center', fontSize: 22, fontWeight: 700, color: '#007bff', letterSpacing: 0.5 }}>Xem trước nội dung HTML</h2>
                        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, background: '#fafbfc', minHeight: 120 }}>
                            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignSender;