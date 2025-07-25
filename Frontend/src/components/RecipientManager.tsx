import React, { useState, useEffect } from 'react';
import axios from 'axios';
import shared from './shared.module.css';

// Định nghĩa kiểu dữ liệu cho Người nhận
interface IRecipient {
    _id: string;
    email: string;
    name?: string;
    status: 'pending' | 'sent' | 'failed';
}

const RecipientManager = () => {
    const [recipients, setRecipients] = useState<IRecipient[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // State cho form thêm mới người nhận thủ công
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');

    // State cho form upload file CSV
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false); // Thêm trạng thái upload

    // Thêm state cho tab trạng thái và phân trang từng tab
    const [activeTab, setActiveTab] = useState<'pending' | 'sent' | 'failed'>('pending');
    const [pendingPage, setPendingPage] = useState(1);
    const [sentPage, setSentPage] = useState(1);
    const [failedPage, setFailedPage] = useState(1);
    const pageSize = 10;

    // Thêm lại state search
    const [search, setSearch] = useState('');

    // Tách danh sách recipient theo trạng thái
    const pendingRecipients = recipients.filter(r => r.status === 'pending');
    const sentRecipients = recipients.filter(r => r.status === 'sent');
    const failedRecipients = recipients.filter(r => r.status === 'failed');

    // Hàm lấy danh sách người nhận từ API (theo status, page, pageSize)
    const fetchRecipients = async (status: string, page: number, pageSize: number, search: string) => {
        try {
            setIsLoading(true);
            const res = await axios.get('http://localhost:5000/api/recipients', {
                params: { status, page, pageSize, search }
            });
            return res.data;
        } catch (error) {
            console.error('Lỗi khi tải danh sách người nhận:', error);
            alert('Không thể tải danh sách người nhận. Vui lòng kiểm tra lại backend.');
            return { recipients: [], total: 0 };
        } finally {
            setIsLoading(false);
        }
    };

    // State cho từng tab
    const [pendingData, setPendingData] = useState({ recipients: [], total: 0 });
    const [sentData, setSentData] = useState({ recipients: [], total: 0 });
    const [failedData, setFailedData] = useState({ recipients: [], total: 0 });

    // Thêm state tổng số cho từng tab
    const [pendingTotal, setPendingTotal] = useState(0);
    const [sentTotal, setSentTotal] = useState(0);
    const [failedTotal, setFailedTotal] = useState(0);

    // Fetch tổng số cho từng trạng thái khi load hoặc thao tác
    const fetchTotalCounts = async () => {
        fetchRecipients('pending', 1, 1, search).then(data => setPendingTotal(data.total));
        fetchRecipients('sent', 1, 1, search).then(data => setSentTotal(data.total));
        fetchRecipients('failed', 1, 1, search).then(data => setFailedTotal(data.total));
    };

    // Fetch data mỗi khi đổi tab hoặc phân trang
    useEffect(() => {
        if (activeTab === 'pending') fetchRecipients('pending', pendingPage, pageSize, search).then(setPendingData);
        if (activeTab === 'sent') fetchRecipients('sent', sentPage, pageSize, search).then(setSentData);
        if (activeTab === 'failed') fetchRecipients('failed', failedPage, pageSize, search).then(setFailedData);
    }, [activeTab, pendingPage, sentPage, failedPage, pageSize, search]);

    // Fetch tổng số cho từng trạng thái khi load hoặc thao tác
    useEffect(() => {
        fetchTotalCounts();
    }, []);

    // Hàm xử lý thêm người nhận thủ công
    const handleAddRecipient = async () => {
        if (!newEmail.trim()) {
            alert('Email không được để trống.');
            return;
        }

        try {
            const res = await axios.post('http://localhost:5000/api/recipients', { email: newEmail, name: newName });
            alert('Đã thêm người nhận thành công!');
            setNewEmail('');
            setNewName('');
            fetchTotalCounts(); // Gọi hàm để cập nhật tổng số
            if (activeTab === 'pending') fetchRecipients('pending', pendingPage, pageSize, search).then(setPendingData);
            if (activeTab === 'sent') fetchRecipients('sent', sentPage, pageSize, search).then(setSentData);
            if (activeTab === 'failed') fetchRecipients('failed', failedPage, pageSize, search).then(setFailedData);
        } catch (error: any) {
            console.error('Lỗi khi thêm người nhận:', error);
            alert(`Lỗi: ${error.response?.data?.message || 'Không thể thêm người nhận.'}`);
        }
    };

    // Hàm xử lý xóa người nhận
    const handleDelete = async (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa người nhận này?')) {
            try {
                await axios.delete(`http://localhost:5000/api/recipients/${id}`);
                alert('Đã xóa người nhận thành công!');
                fetchTotalCounts(); // Gọi hàm để cập nhật tổng số
                if (activeTab === 'pending') fetchRecipients('pending', pendingPage, pageSize, search).then(setPendingData);
                if (activeTab === 'sent') fetchRecipients('sent', sentPage, pageSize, search).then(setSentData);
                if (activeTab === 'failed') fetchRecipients('failed', failedPage, pageSize, search).then(setFailedData);
            } catch (error) {
                console.error('Lỗi khi xóa người nhận:', error);
                alert('Không thể xóa người nhận.');
            }
        }
    };

    // Hàm xử lý xóa tất cả người nhận
    const handleClearAll = async () => {
        if (window.confirm('Bạn có chắc chắn muốn XÓA TẤT CẢ người nhận? Hành động này không thể hoàn tác!')) {
            try {
                await axios.delete('http://localhost:5000/api/recipients/clear');
                alert('Đã xóa tất cả người nhận thành công!');
                fetchTotalCounts(); // Gọi hàm để cập nhật tổng số
                if (activeTab === 'pending') fetchRecipients('pending', pendingPage, pageSize, search).then(setPendingData);
                if (activeTab === 'sent') fetchRecipients('sent', sentPage, pageSize, search).then(setSentData);
                if (activeTab === 'failed') fetchRecipients('failed', failedPage, pageSize, search).then(setFailedData);
            } catch (error) {
                console.error('Lỗi khi xóa tất cả người nhận:', error);
                alert('Không thể xóa tất cả người nhận.');
            }
        }
    };

    // Hàm xử lý đặt lại trạng thái của tất cả người nhận về 'pending'
    const handleResetStatus = async () => {
        if (window.confirm('Bạn có chắc chắn muốn ĐẶT LẠI TRẠNG THÁI của tất cả người nhận về "pending"?')) {
            try {
                await axios.post('http://localhost:5000/api/recipients/reset-status');
                alert('Đã đặt lại trạng thái tất cả người nhận thành công!');
                fetchTotalCounts(); // Gọi hàm để cập nhật tổng số
                if (activeTab === 'pending') fetchRecipients('pending', pendingPage, pageSize, search).then(setPendingData);
                if (activeTab === 'sent') fetchRecipients('sent', sentPage, pageSize, search).then(setSentData);
                if (activeTab === 'failed') fetchRecipients('failed', failedPage, pageSize, search).then(setFailedData);
            } catch (error) {
                console.error('Lỗi khi đặt lại trạng thái người nhận:', error);
                alert('Không thể đặt lại trạng thái người nhận.');
            }
        }
    };

    // Hàm xử lý khi chọn file (dùng chung cho CSV)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    // Hàm xử lý tải lên file CSV
    const handleFileUpload = async () => {
        if (!file) {
            alert('Vui lòng chọn một file CSV để tải lên.');
            return;
        }

        const formData = new FormData();
        // 'recipientsFile' phải khớp với tên trường trong Multer single() trên backend (recipientRoutes.js)
        formData.append('recipientsFile', file);

        try {
            setIsUploading(true); // Bắt đầu trạng thái upload
            const res = await axios.post('http://localhost:5000/api/recipients/upload-csv', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data', // Quan trọng cho việc upload file
                },
            });
            alert(res.data.message);
            fetchTotalCounts(); // Gọi hàm để cập nhật tổng số
            if (activeTab === 'pending') fetchRecipients('pending', pendingPage, pageSize, search).then(setPendingData);
            if (activeTab === 'sent') fetchRecipients('sent', sentPage, pageSize, search).then(setSentData);
            if (activeTab === 'failed') fetchRecipients('failed', failedPage, pageSize, search).then(setFailedData);
            setFile(null); // Xóa file đã chọn trong input
        } catch (error: any) {
            console.error('Lỗi khi tải lên file CSV:', error);
            if (error.response && error.response.data) {
                alert(`Lỗi: ${error.response.data.message || 'Không thể tải lên file.'}`);
            } else {
                alert('Không thể tải lên file. Vui lòng kiểm tra kết nối.');
            }
        } finally {
            setIsUploading(false); // Kết thúc trạng thái upload
        }
    };

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

    // Khi search, reset lại trang và fetch lại dữ liệu
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPendingPage(1); setSentPage(1); setFailedPage(1);
    };

    // Hàm lấy dữ liệu cho từng tab
    const getTabData = () => {
        let data: any = {};
        let total: number = 0;
        let color: string = '';
        let label: string = '';
        let setPage: (p: number) => void = () => { };

        if (activeTab === 'pending') {
            data = pendingData.recipients;
            total = pendingData.total;
            color = '#007bff'; // Màu cho tab 'Chờ gửi'
            label = 'Chờ gửi';
            setPage = setPendingPage;
        } else if (activeTab === 'sent') {
            data = sentData.recipients;
            total = sentData.total;
            color = '#28a745'; // Màu cho tab 'Đã gửi'
            label = 'Đã gửi';
            setPage = setSentPage;
        } else if (activeTab === 'failed') {
            data = failedData.recipients;
            total = failedData.total;
            color = '#dc3545'; // Màu cho tab 'Lỗi'
            label = 'Lỗi';
            setPage = setFailedPage;
        }

        return {
            data,
            total,
            color,
            label,
            setPage,
            page: activeTab === 'pending' ? pendingPage : activeTab === 'sent' ? sentPage : failedPage,
            totalPages: activeTab === 'pending' ? Math.ceil(pendingData.total / pageSize) || 1 : activeTab === 'sent' ? Math.ceil(sentData.total / pageSize) || 1 : Math.ceil(failedData.total / pageSize) || 1,
        };
    };

    const tabData = getTabData();

    return (
        <div style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
            {/* Tabs trạng thái */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <button
                    className={`${shared.btn} ${activeTab === 'pending' ? shared.btnPrimary : shared.btnSecondary}`}
                    style={{ minWidth: 120, fontWeight: 600, borderBottom: activeTab === 'pending' ? `3px solid #007bff` : 'none' }}
                    onClick={() => setActiveTab('pending')}
                >
                    Chờ gửi <span style={{ marginLeft: 8, color: '#007bff', fontWeight: 700 }}>({pendingTotal})</span>
                </button>
                <button
                    className={`${shared.btn} ${activeTab === 'sent' ? shared.btnPrimary : shared.btnSecondary}`}
                    style={{ minWidth: 120, fontWeight: 600, borderBottom: activeTab === 'sent' ? `3px solid #28a745` : 'none' }}
                    onClick={() => setActiveTab('sent')}
                >
                    Đã gửi <span style={{ marginLeft: 8, color: '#28a745', fontWeight: 700 }}>({sentTotal})</span>
                </button>
                <button
                    className={`${shared.btn} ${activeTab === 'failed' ? shared.btnPrimary : shared.btnSecondary}`}
                    style={{ minWidth: 120, fontWeight: 600, borderBottom: activeTab === 'failed' ? `3px solid #dc3545` : 'none' }}
                    onClick={() => setActiveTab('failed')}
                >
                    Lỗi <span style={{ marginLeft: 8, color: '#dc3545', fontWeight: 700 }}>({failedTotal})</span>
                </button>
            </div>
            {/* Search input */}
            <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="Tìm kiếm theo email hoặc tên..."
                    value={search}
                    onChange={handleSearch}
                    className={shared.formControl}
                    style={{ maxWidth: 300 }}
                />
            </div>
            {/* Bảng theo tab */}
            <div className={shared.formContainer} style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
                <h2 className={shared.title}>Danh sách người nhận - {tabData.label}</h2>
                {/* Thống kê tổng số */}
                <div style={{ marginBottom: 12, fontWeight: 600, color: tabData.color }}>
                    Tổng: {tabData.total} người nhận
                </div>
                {/* Bảng */}
                <div className={shared.tableResponsive} style={{ width: '100%', overflowX: 'auto', marginBottom: 32 }}>
                    <div className={shared.tableWrapper} style={{ minWidth: 500, width: '100%' }}>
                        <table className={shared.dataTable} style={{ minWidth: 500, width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Email</th>
                                    <th>Tên</th>
                                    <th>Trạng thái</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={5} className={shared.textCenter}>Đang tải...</td></tr>
                                ) : tabData.data.length === 0 ? (
                                    <tr><td colSpan={5} className={shared.textCenter}>Không có người nhận.</td></tr>
                                ) : (
                                    tabData.data.map((recipient: IRecipient, idx: number) => (
                                        <tr key={recipient._id}>
                                            <td>{(tabData.page - 1) * pageSize + idx + 1}</td>
                                            <td>{recipient.email}</td>
                                            <td>{recipient.name}</td>
                                            <td>
                                                <span className={
                                                    `${shared.statusBadge} ${recipient.status === 'pending' ? shared.statusPending : recipient.status === 'sent' ? shared.statusSent : shared.statusFailed}`
                                                }>
                                                    {recipient.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => handleDelete(recipient._id)}
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
                                                    title="Xoá người nhận này"
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
                {tabData.totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                        <button
                            type="button"
                            className={shared.btn}
                            disabled={tabData.page === 1}
                            onClick={() => tabData.setPage(tabData.page - 1)}
                        >
                            Trang trước
                        </button>
                        <span style={{ alignSelf: 'center' }}>Trang {tabData.page} / {tabData.totalPages}</span>
                        <button
                            type="button"
                            className={shared.btn}
                            disabled={tabData.page === tabData.totalPages}
                            onClick={() => tabData.setPage(tabData.page + 1)}
                        >
                            Trang sau
                        </button>
                    </div>
                )}
            </div>
            {/* Các nút hành động chung */}
            <div style={{ margin: '1.5rem 0', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button onClick={handleResetStatus} className={`${shared.btn} ${shared.btnInfo}`}>Đặt lại trạng thái tất cả</button>
                <button onClick={handleClearAll} className={`${shared.btn} ${shared.btnDanger}`}>Xóa tất cả người nhận</button>
            </div>
            {/* Thêm/Import người nhận */}
            <div className={shared.formContainer} style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box', marginTop: 32 }}>
                <h2 className={shared.title}>Thêm người nhận mới (thủ công)</h2>
                <div className={shared.formGroup}>
                    <input
                        type="email"
                        placeholder="Email người nhận"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className={shared.formControl}
                    />
                    <input
                        type="text"
                        placeholder="Tên (tùy chọn)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className={shared.formControl}
                        style={{ marginTop: '0.5rem' }}
                    />
                    <button onClick={handleAddRecipient} className={`${shared.btn} ${shared.btnPrimary}`} style={{ marginTop: '1rem' }}>
                        Thêm người nhận
                    </button>
                </div>
                <hr />
                <h2 className={shared.title} style={{ fontSize: '1.2rem' }}>Import người nhận từ file CSV</h2>
                <div className={shared.formGroup}>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className={shared.formControl}
                        style={{ marginBottom: '1rem' }}
                    />
                    <button
                        onClick={handleFileUpload}
                        disabled={!file || isUploading}
                        className={`${shared.btn} ${shared.btnSecondary}`}
                    >
                        {isUploading ? 'Đang tải lên...' : 'Tải lên từ CSV'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecipientManager;