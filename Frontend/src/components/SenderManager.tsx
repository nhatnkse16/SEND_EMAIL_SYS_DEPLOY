// components/SenderManager.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import shared from './shared.module.css';

// Định nghĩa kiểu dữ liệu cho một đối tượng Sender
interface ISender {
    _id: string;
    email: string;
    appPassword: string;
    sentCount: number;
    dailyLimit: number;
    batchSize: number;
    host: string;
    port: number;
    secure: boolean;
    isActive: boolean;
}

const SenderManager = () => {
    const [senders, setSenders] = useState<ISender[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // State cho form thêm mới
    const [email, setEmail] = useState('');
    const [appPassword, setAppPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dailyLimit, setDailyLimit] = useState<number>(100);
    const [batchSize, setBatchSize] = useState<number>(10);
    const [showPassword, setShowPassword] = useState(false);
    const [host, setHost] = useState<string>('smtp.yandex.com');
    const [port, setPort] = useState<number>(465);
    const [secure, setSecure] = useState<boolean>(true);

    // State cho form upload Excel/CSV
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Thêm state cho tab, search, phân trang
    const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Thêm state cho popup chỉnh sửa
    const [editingSender, setEditingSender] = useState<ISender | null>(null);

    // Thêm state loading cho nút Lưu
    const [isSaving, setIsSaving] = useState(false);

    // Hàm để lấy danh sách tài khoản từ backend
    const fetchSenders = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get('http://localhost:5000/api/senders');
            setSenders(res.data);
        } catch (error) {
            console.error("Lỗi khi tải danh sách tài khoản gửi:", error);
            alert('Không thể tải danh sách tài khoản. Vui lòng kiểm tra lại backend.');
        } finally {
            setIsLoading(false);
        }
    };

    // Chạy hàm fetchSenders khi component được tải lần đầu
    useEffect(() => {
        fetchSenders();
    }, []);

    // Hàm xử lý thêm tài khoản gửi mới (từng cái một)
    const handleAddSender = async () => {
        if (!email.trim() || !appPassword.trim()) {
            alert('Email và App Password không được để trống.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await axios.post('http://localhost:5000/api/senders/add', [{
                email,
                appPassword,
                dailyLimit,
                batchSize,
                host,
                port,
                secure
            }]);
            alert(res.data.message);
            setEmail('');
            setAppPassword('');
            setDailyLimit(100);
            setBatchSize(10);
            setHost('smtp.yandex.com');
            setPort(465);
            setSecure(true);
            fetchSenders();
        } catch (error: any) {
            console.error('Lỗi khi thêm tài khoản gửi:', error);
            alert(`Lỗi: ${error.response?.data?.message || 'Không thể thêm tài khoản.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Hàm xử lý xóa tài khoản
    const handleDelete = async (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
            try {
                await axios.delete(`http://localhost:5000/api/senders/${id}`);
                alert('Đã xóa tài khoản thành công!');
                fetchSenders();
            } catch (error) {
                console.error('Lỗi khi xóa tài khoản:', error);
                alert('Không thể xóa tài khoản.');
            }
        }
    };

    // Hàm xử lý bật/tắt trạng thái hoạt động của tài khoản
    const toggleActive = async (sender: ISender) => {
        try {
            const res = await axios.put(`http://localhost:5000/api/senders/${sender._id}`, { isActive: !sender.isActive });
            // alert(`Trạng thái của ${res.data.email} đã được cập nhật thành ${res.data.isActive ? 'Hoạt động' : 'Tạm ngưng'}.`);
            fetchSenders();
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái:', error);
            alert('Không thể cập nhật trạng thái.');
        }
    };

    // Hàm xử lý reset sent counts
    const handleResetSentCounts = async () => {
        if (window.confirm('Bạn có chắc chắn muốn ĐẶT LẠI SỐ LƯỢNG ĐÃ GỬI của TẤT CẢ tài khoản về 0? Hành động này không thể hoàn tác!')) {
            try {
                const res = await axios.post('http://localhost:5000/api/senders/reset-sent-counts');
                alert(res.data.message);
                fetchSenders();
            } catch (error) {
                console.error('Lỗi khi đặt lại số lượng đã gửi:', error);
                alert('Không thể đặt lại số lượng đã gửi. Vui lòng thử lại.');
            }
        }
    };

    // Hàm xử lý upload Excel/CSV file
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setExcelFile(event.target.files[0]);
        } else {
            setExcelFile(null);
        }
    };

    const handleUploadExcel = async () => {
        if (!excelFile) {
            alert('Vui lòng chọn một file Excel/CSV để tải lên.');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('sendersFile', excelFile);

        try {
            const res = await axios.post('http://localhost:5000/api/senders/upload-excel', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            alert(res.data.message);
            setExcelFile(null);
            const fileInput = document.getElementById('excelFileInput') as HTMLInputElement;
            if (fileInput) {
                fileInput.value = '';
            }
            fetchSenders();
        } catch (error: any) {
            console.error('Lỗi khi tải lên file Excel/CSV:', error);
            alert(`Lỗi: ${error.response?.data?.message || 'Không thể tải lên file.'}`);
        } finally {
            setIsUploading(false);
        }
    };

    // Hàm kích hoạt tất cả tài khoản đang tạm ngưng
    const handleActivateAllSenders = async () => {
        if (window.confirm('Bạn có chắc chắn muốn kích hoạt TẤT CẢ tài khoản đang tạm ngưng?')) {
            try {
                const res = await axios.post('http://localhost:5000/api/senders/activate-all');
                alert(res.data.message);
                fetchSenders();
            } catch (error) {
                console.error('Lỗi khi kích hoạt tài khoản gửi:', error);
                alert('Không thể kích hoạt tài khoản gửi.');
            }
        }
    };

    // Hàm tạm ngưng tất cả tài khoản đang hoạt động
    const handleDeactivateAllSenders = async () => {
        if (window.confirm('Bạn có chắc chắn muốn tạm ngưng TẤT CẢ tài khoản đang hoạt động?')) {
            try {
                const res = await axios.post('http://localhost:5000/api/senders/deactivate-all');
                alert(res.data.message);
                fetchSenders();
            } catch (error) {
                console.error('Lỗi khi tạm ngưng tài khoản gửi:', error);
                alert('Không thể tạm ngưng tài khoản gửi.');
            }
        }
    };

    // Lọc và tìm kiếm tài khoản gửi
    const filteredSenders = senders.filter(s => {
        const keyword = search.toLowerCase();
        return (
            s.email.toLowerCase().includes(keyword)
        );
    });
    const totalPages = Math.ceil(filteredSenders.length / pageSize);

    // Tách danh sách sender theo trạng thái
    const activeSenders = filteredSenders.filter(s => s.isActive);
    const inactiveSenders = filteredSenders.filter(s => !s.isActive);

    // Thêm icon SVG cho nút xoá
    const TrashIcon = () => (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle' }}>
            <path d="M7.5 8.5V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M12.5 8.5V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="4.5" y="5.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2.5 5.5H17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8.5 2.5H11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );

    // Thêm icon cho trạng thái
    const ActiveIcon = () => (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ verticalAlign: 'middle' }}>
            <circle cx="10" cy="10" r="8" stroke="#28a745" strokeWidth="2" fill="#d4edda" />
            <path d="M7.5 10.5L9.5 12.5L13 8.5" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
    const PauseIcon = () => (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ verticalAlign: 'middle' }}>
            <circle cx="10" cy="10" r="8" stroke="#adb5bd" strokeWidth="2" fill="#e9ecef" />
            <rect x="7" y="7" width="2" height="6" rx="1" fill="#adb5bd" />
            <rect x="11" y="7" width="2" height="6" rx="1" fill="#adb5bd" />
        </svg>
    );

    return (
        <div style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <button
                    className={`${shared.btn} ${activeTab === 'list' ? shared.btnPrimary : shared.btnSecondary}`}
                    onClick={() => setActiveTab('list')}
                >
                    Danh sách tài khoản gửi
                </button>
                <button
                    className={`${shared.btn} ${activeTab === 'add' ? shared.btnPrimary : shared.btnSecondary}`}
                    onClick={() => setActiveTab('add')}
                >
                    Thêm/Import tài khoản gửi
                </button>
            </div>
            {/* Tab content */}
            {activeTab === 'add' && (
                <div className={shared.formContainer} style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
                    <h2 className={shared.title}>Thêm tài khoản gửi mới (thủ công)</h2>
                    <div className={shared.formGroup}>
                        <input
                            type="email"
                            placeholder="Email (ví dụ: your_email@gmail.com)"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={shared.formControl}
                            style={{ background: '#222', color: '#fff', border: '1px solid #555', marginBottom: 8 }}
                        />
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="App Password (tạo từ cài đặt Google/Outlook)"
                                value={appPassword}
                                onChange={(e) => setAppPassword(e.target.value)}
                                className={shared.formControl}
                                style={{ background: '#222', color: '#fff', border: '1px solid #555', marginTop: '0.5rem', paddingRight: 40 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                style={{
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 18,
                                    color: '#888'
                                }}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="SMTP Host (ví dụ: smtp.yandex.com)"
                            value={host}
                            onChange={e => setHost(e.target.value)}
                            className={shared.formControl}
                            style={{ background: '#222', color: '#fff', border: '1px solid #555', marginTop: '0.5rem' }}
                        />
                        <input
                            type="number"
                            placeholder="SMTP Port (ví dụ: 465)"
                            value={port}
                            onChange={e => setPort(Number(e.target.value))}
                            className={shared.formControl}
                            style={{ background: '#222', color: '#fff', border: '1px solid #555', marginTop: '0.5rem' }}
                            min="1"
                        />
                        <label style={{ color: '#fff', marginTop: 8 }}>
                            <input
                                type="checkbox"
                                checked={secure}
                                onChange={e => setSecure(e.target.checked)}
                                style={{ marginRight: 8 }}
                            />
                            Sử dụng SSL/TLS (secure)
                        </label>
                        <input
                            type="number"
                            placeholder="Giới hạn gửi hàng ngày (ví dụ: 100)"
                            value={dailyLimit}
                            onChange={(e) => setDailyLimit(Number(e.target.value))}
                            className={shared.formControl}
                            style={{ background: '#222', color: '#fff', border: '1px solid #555', marginTop: '0.5rem' }}
                            min="1"
                        />
                        <input
                            type="number"
                            placeholder="Số lượng gửi mỗi lượt (batchSize, ví dụ: 10)"
                            value={batchSize}
                            onChange={e => setBatchSize(Number(e.target.value))}
                            className={shared.formControl}
                            style={{ background: '#222', color: '#fff', border: '1px solid #555', marginTop: '0.5rem' }}
                            min="1"
                        />
                        <button
                            onClick={handleAddSender}
                            disabled={isSubmitting}
                            className={`${shared.btn} ${shared.btnPrimary}`}
                            style={{ marginTop: '1rem' }}
                        >
                            {isSubmitting ? 'Đang thêm...' : 'Thêm tài khoản'}
                        </button>
                    </div>
                    <hr />
                    <h2 className={shared.title} style={{ fontSize: '1.2rem' }}>Import tài khoản gửi từ file Excel/CSV</h2>
                    <div className={shared.formGroup}>
                        <input
                            type="file"
                            id="excelFileInput"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileChange}
                            className={shared.formControl}
                            style={{ padding: '0.5rem' }}
                        />
                        <button
                            onClick={handleUploadExcel}
                            disabled={!excelFile || isUploading}
                            className={`${shared.btn} ${shared.btnSecondary}`}
                            style={{ marginTop: '1rem' }}
                        >
                            {isUploading ? 'Đang tải lên...' : 'Import từ Excel/CSV'}
                        </button>
                    </div>
                </div>
            )}
            {activeTab === 'list' && (
                <div className={shared.formContainer} style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
                    <h2 className={shared.title}>Danh sách tài khoản gửi</h2>
                    {/* Search */}
                    <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo email..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            className={shared.formControl}
                            style={{ maxWidth: 300 }}
                        />
                    </div>
                    {/* Nút reset sent counts */}
                    <div style={{ marginBottom: '1.5rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={handleResetSentCounts} className={`${shared.btn} ${shared.btnInfo}`}>
                            Đặt lại số lượng đã gửi của tất cả tài khoản
                        </button>
                        <button onClick={handleActivateAllSenders} className={`${shared.btn} ${shared.btnSuccess}`}>
                            Kích hoạt tất cả tài khoản tạm ngưng
                        </button>
                        <button onClick={handleDeactivateAllSenders} className={`${shared.btn} ${shared.btnWarning}`}>
                            Tạm ngưng tất cả tài khoản hoạt động
                        </button>
                    </div>
                    {/* Bảng tài khoản ĐANG HOẠT ĐỘNG */}
                    <h3 style={{ color: '#28a745', margin: '18px 0 8px 0' }}>Tài khoản ĐANG HOẠT ĐỘNG</h3>
                    <div className={shared.tableResponsive} style={{ width: '100%', overflowX: 'auto', marginBottom: 32 }}>
                        <div className={shared.tableWrapper} style={{ minWidth: 500, width: '100%' }}>
                            <table className={shared.dataTable} style={{ minWidth: 500, width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Email</th>
                                        <th>Host</th>
                                        <th>Port</th>
                                        <th>Đã gửi / Giới hạn</th>
                                        <th>Batch/Lượt</th>
                                        <th>Trạng thái</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan={8} className={shared.textCenter}>Đang tải...</td></tr>
                                    ) : activeSenders.length === 0 ? (
                                        <tr><td colSpan={8} className={shared.textCenter}>Không có tài khoản hoạt động.</td></tr>
                                    ) : (
                                        activeSenders.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((sender, idx) => (
                                            <tr key={sender._id}>
                                                <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                                                <td>{sender.email}</td>
                                                <td>{sender.host}</td>
                                                <td>{sender.port}</td>
                                                <td>{sender.sentCount} / {sender.dailyLimit}</td>
                                                <td>{sender.batchSize}</td>
                                                <td>
                                                    <button
                                                        onClick={() => toggleActive(sender)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            padding: '6px 14px',
                                                            borderRadius: 6,
                                                            fontWeight: 500,
                                                            fontSize: 15,
                                                            background: sender.isActive ? '#d4edda' : '#e9ecef',
                                                            color: sender.isActive ? '#28a745' : '#6c757d',
                                                            border: 'none',
                                                            boxShadow: '0 1px 4px rgba(40,167,69,0.07)',
                                                            cursor: 'pointer',
                                                            transition: 'background 0.2s, color 0.2s'
                                                        }}
                                                        onMouseOver={e => {
                                                            e.currentTarget.style.background = sender.isActive ? '#218838' : '#adb5bd';
                                                            e.currentTarget.style.color = '#fff';
                                                        }}
                                                        onMouseOut={e => {
                                                            e.currentTarget.style.background = sender.isActive ? '#d4edda' : '#e9ecef';
                                                            e.currentTarget.style.color = sender.isActive ? '#28a745' : '#6c757d';
                                                        }}
                                                        title={sender.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                                                    >
                                                        {sender.isActive ? <ActiveIcon /> : <PauseIcon />}
                                                        {sender.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                                                    </button>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => setEditingSender(sender)}
                                                        className={shared.btnInfo}
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: 15,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            borderRadius: 6,
                                                            background: '#d1ecf1',
                                                            color: '#0c5460',
                                                            border: 'none',
                                                            boxShadow: '0 1px 4px rgba(23,162,184,0.07)',
                                                            transition: 'background 0.2s, color 0.2s',
                                                            cursor: 'pointer',
                                                            marginRight: 8
                                                        }}
                                                        title="Chỉnh sửa tài khoản này"
                                                    >
                                                        ✏️ <span style={{ fontWeight: 500 }}>Chỉnh sửa</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(sender._id)}
                                                        className={shared.btnDanger}
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: 15,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            borderRadius: 6,
                                                            background: '#f8d7da',
                                                            color: '#c82333',
                                                            border: 'none',
                                                            boxShadow: '0 1px 4px rgba(220,53,69,0.07)',
                                                            transition: 'background 0.2s, color 0.2s',
                                                            cursor: 'pointer'
                                                        }}
                                                        onMouseOver={e => { e.currentTarget.style.background = '#f1b0b7'; e.currentTarget.style.color = '#fff'; }}
                                                        onMouseOut={e => { e.currentTarget.style.background = '#f8d7da'; e.currentTarget.style.color = '#c82333'; }}
                                                        title="Xoá tài khoản này"
                                                    >
                                                        <TrashIcon />
                                                        <span style={{ fontWeight: 500 }}>Xoá</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Bảng tài khoản TẠM NGƯNG */}
                    <h3 style={{ color: '#dc3545', margin: '18px 0 8px 0' }}>Tài khoản TẠM NGƯNG</h3>
                    <div className={shared.tableResponsive} style={{ width: '100%', overflowX: 'auto' }}>
                        <div className={shared.tableWrapper} style={{ minWidth: 500, width: '100%' }}>
                            <table className={shared.dataTable} style={{ minWidth: 500, width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Email</th>
                                        <th>Host</th>
                                        <th>Port</th>
                                        <th>Đã gửi / Giới hạn</th>
                                        <th>Batch/Lượt</th>
                                        <th>Trạng thái</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan={8} className={shared.textCenter}>Đang tải...</td></tr>
                                    ) : inactiveSenders.length === 0 ? (
                                        <tr><td colSpan={8} className={shared.textCenter}>Không có tài khoản tạm ngưng.</td></tr>
                                    ) : (
                                        inactiveSenders.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((sender, idx) => (
                                            <tr key={sender._id}>
                                                <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                                                <td>{sender.email}</td>
                                                <td>{sender.host}</td>
                                                <td>{sender.port}</td>
                                                <td>{sender.sentCount} / {sender.dailyLimit}</td>
                                                <td>{sender.batchSize}</td>
                                                <td>
                                                    <button
                                                        onClick={() => toggleActive(sender)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            padding: '6px 14px',
                                                            borderRadius: 6,
                                                            fontWeight: 500,
                                                            fontSize: 15,
                                                            background: sender.isActive ? '#d4edda' : '#e9ecef',
                                                            color: sender.isActive ? '#28a745' : '#6c757d',
                                                            border: 'none',
                                                            boxShadow: '0 1px 4px rgba(40,167,69,0.07)',
                                                            cursor: 'pointer',
                                                            transition: 'background 0.2s, color 0.2s'
                                                        }}
                                                        onMouseOver={e => {
                                                            e.currentTarget.style.background = sender.isActive ? '#218838' : '#adb5bd';
                                                            e.currentTarget.style.color = '#fff';
                                                        }}
                                                        onMouseOut={e => {
                                                            e.currentTarget.style.background = sender.isActive ? '#d4edda' : '#e9ecef';
                                                            e.currentTarget.style.color = sender.isActive ? '#28a745' : '#6c757d';
                                                        }}
                                                        title={sender.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                                                    >
                                                        {sender.isActive ? <ActiveIcon /> : <PauseIcon />}
                                                        {sender.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                                                    </button>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => setEditingSender(sender)}
                                                        className={shared.btnInfo}
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: 15,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            borderRadius: 6,
                                                            background: '#d1ecf1',
                                                            color: '#0c5460',
                                                            border: 'none',
                                                            boxShadow: '0 1px 4px rgba(23,162,184,0.07)',
                                                            transition: 'background 0.2s, color 0.2s',
                                                            cursor: 'pointer',
                                                            marginRight: 8
                                                        }}
                                                        title="Chỉnh sửa tài khoản này"
                                                    >
                                                        ✏️ <span style={{ fontWeight: 500 }}>Chỉnh sửa</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(sender._id)}
                                                        className={shared.btnDanger}
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: 15,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            borderRadius: 6,
                                                            background: '#f8d7da',
                                                            color: '#c82333',
                                                            border: 'none',
                                                            boxShadow: '0 1px 4px rgba(220,53,69,0.07)',
                                                            transition: 'background 0.2s, color 0.2s',
                                                            cursor: 'pointer'
                                                        }}
                                                        onMouseOver={e => { e.currentTarget.style.background = '#f1b0b7'; e.currentTarget.style.color = '#fff'; }}
                                                        onMouseOut={e => { e.currentTarget.style.background = '#f8d7da'; e.currentTarget.style.color = '#c82333'; }}
                                                        title="Xoá tài khoản này"
                                                    >
                                                        <TrashIcon />
                                                        <span style={{ fontWeight: 500 }}>Xoá</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
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
            )}
            {editingSender && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 16
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 14, padding: '32px 24px 24px 24px', minWidth: 320, maxWidth: 380, width: '100%',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', position: 'relative',
                        animation: 'fadeInScale 0.25s cubic-bezier(.4,2,.6,1)'
                    }}>
                        {/* Nút đóng (X) */}
                        <button onClick={() => !isSaving && setEditingSender(null)}
                            style={{
                                position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 700
                            }}
                            aria-label="Đóng popup"
                            disabled={isSaving}
                        >×</button>
                        <h2 style={{ marginBottom: 18, textAlign: 'center', fontSize: 22, fontWeight: 700, color: '#007bff', letterSpacing: 0.5 }}>Chỉnh sửa tài khoản gửi</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <label style={{ fontWeight: 500, color: '#333' }}>Email
                                <input
                                    type="email"
                                    value={editingSender.email}
                                    onChange={e => setEditingSender({ ...editingSender, email: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #bdbdbd', marginTop: 6, fontSize: 16 }}
                                    autoFocus
                                    disabled={isSaving}
                                />
                            </label>
                            <label style={{ fontWeight: 500, color: '#333' }}>App Password
                                <input
                                    type="text"
                                    value={editingSender.appPassword || ''}
                                    onChange={e => setEditingSender({ ...editingSender, appPassword: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #bdbdbd', marginTop: 6, fontSize: 16 }}
                                    disabled={isSaving}
                                />
                            </label>
                            <label style={{ fontWeight: 500, color: '#333' }}>Giới hạn gửi hàng ngày
                                <input
                                    type="number"
                                    min={1}
                                    value={editingSender.dailyLimit}
                                    onChange={e => setEditingSender({ ...editingSender, dailyLimit: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #bdbdbd', marginTop: 6, fontSize: 16 }}
                                    disabled={isSaving}
                                />
                            </label>
                            <label style={{ fontWeight: 500, color: '#333' }}>Số lượng gửi mỗi lượt (batchSize)
                                <input
                                    type="number"
                                    min={1}
                                    value={editingSender.batchSize}
                                    onChange={e => setEditingSender({ ...editingSender, batchSize: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #bdbdbd', marginTop: 6, fontSize: 16 }}
                                    disabled={isSaving}
                                />
                            </label>
                            <label style={{ fontWeight: 500, color: '#333' }}>SMTP Host
                                <input
                                    type="text"
                                    value={editingSender.host}
                                    onChange={e => setEditingSender({ ...editingSender, host: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #bdbdbd', marginTop: 6, fontSize: 16 }}
                                    disabled={isSaving}
                                />
                            </label>
                            <label style={{ fontWeight: 500, color: '#333' }}>SMTP Port
                                <input
                                    type="number"
                                    min={1}
                                    value={editingSender.port}
                                    onChange={e => setEditingSender({ ...editingSender, port: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #bdbdbd', marginTop: 6, fontSize: 16 }}
                                    disabled={isSaving}
                                />
                            </label>
                            <label style={{ fontWeight: 500, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="checkbox"
                                    checked={editingSender.secure}
                                    onChange={e => setEditingSender({ ...editingSender, secure: e.target.checked })}
                                    disabled={isSaving}
                                />
                                Sử dụng SSL/TLS (secure)
                            </label>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                            <button onClick={() => !isSaving && setEditingSender(null)} style={{ padding: '10px 22px', borderRadius: 6, border: 'none', background: '#e0e0e0', color: '#333', fontWeight: 500, cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: 16 }} disabled={isSaving}>Đóng</button>
                            <button
                                onClick={async () => {
                                    setIsSaving(true);
                                    try {
                                        await axios.put(`http://localhost:5000/api/senders/${editingSender._id}`, {
                                            email: editingSender.email,
                                            appPassword: editingSender.appPassword,
                                            dailyLimit: editingSender.dailyLimit,
                                            batchSize: editingSender.batchSize,
                                            host: editingSender.host,
                                            port: editingSender.port,
                                            secure: editingSender.secure
                                        });
                                        setEditingSender(null);
                                        fetchSenders();
                                    } catch (error: any) {
                                        alert(error.response?.data?.message || 'Lỗi khi cập nhật tài khoản gửi.');
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                style={{ padding: '10px 22px', borderRadius: 6, border: 'none', background: '#007bff', color: '#fff', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: 16, boxShadow: '0 2px 8px rgba(0,123,255,0.08)' }}
                                disabled={isSaving}
                            >{isSaving ? 'Đang lưu...' : 'Lưu'}</button>
                        </div>
                    </div>
                    {/* Hiệu ứng scale cho popup */}
                    <style>{`                    @keyframes fadeInScale {
                        0% { opacity: 0; transform: scale(0.92); }
                        100% { opacity: 1; transform: scale(1); }
                    }
                    `}</style>
                </div>
            )}
        </div>
    );
};

export default SenderManager;
