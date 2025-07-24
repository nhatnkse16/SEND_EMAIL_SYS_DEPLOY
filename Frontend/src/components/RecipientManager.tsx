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

    // Thêm state cho tab, search, phân trang
    const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 1000;

    // Lọc và tìm kiếm người nhận
    const filteredRecipients = recipients.filter(r => {
        const keyword = search.toLowerCase();
        return (
            r.email.toLowerCase().includes(keyword) ||
            (r.name || '').toLowerCase().includes(keyword)
        );
    });
    const totalPages = Math.ceil(filteredRecipients.length / pageSize);

    // Tách danh sách recipient theo trạng thái
    const pendingRecipients = filteredRecipients.filter(r => r.status === 'pending');
    const otherRecipients = filteredRecipients.filter(r => r.status !== 'pending');

    // Hàm lấy danh sách người nhận từ API
    const fetchRecipients = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get('http://localhost:5000/api/recipients');
            setRecipients(res.data);
        } catch (error) {
            console.error("Lỗi khi tải danh sách người nhận:", error);
            alert('Không thể tải danh sách người nhận. Vui lòng kiểm tra lại backend.');
        } finally {
            setIsLoading(false);
        }
    };

    // Tự động gọi hàm fetchRecipients khi component được render lần đầu
    useEffect(() => {
        fetchRecipients();
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
            fetchRecipients(); // Tải lại danh sách
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
                fetchRecipients(); // Tải lại danh sách
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
                fetchRecipients(); // Tải lại danh sách
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
                fetchRecipients(); // Tải lại danh sách
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
            fetchRecipients(); // Tải lại danh sách sau khi upload
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

    return (
        <div style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <button
                    className={`${shared.btn} ${activeTab === 'list' ? shared.btnPrimary : shared.btnSecondary}`}
                    onClick={() => setActiveTab('list')}
                >
                    Danh sách người nhận
                </button>
                <button
                    className={`${shared.btn} ${activeTab === 'add' ? shared.btnPrimary : shared.btnSecondary}`}
                    onClick={() => setActiveTab('add')}
                >
                    Thêm/Import người nhận
                </button>
            </div>
            {/* Tab content */}
            {activeTab === 'add' && (
                <div className={shared.formContainer} style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
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
            )}
            {activeTab === 'list' && (
                <div className={shared.formContainer} style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
                    <h2 className={shared.title}>Danh sách người nhận</h2>
                    {/* Search */}
                    <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo email hoặc tên..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            className={shared.formControl}
                            style={{ maxWidth: 300 }}
                        />
                    </div>
                    {/* Các nút hành động */}
                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button onClick={handleResetStatus} className={`${shared.btn} ${shared.btnInfo}`}>Đặt lại trạng thái tất cả</button>
                        <button onClick={handleClearAll} className={`${shared.btn} ${shared.btnDanger}`}>Xóa tất cả người nhận</button>
                    </div>
                    {/* Bảng người nhận CHỜ GỬI */}
                    <h3 style={{ color: '#007bff', margin: '18px 0 8px 0' }}>Người nhận CHỜ GỬI</h3>
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
                                    ) : pendingRecipients.length === 0 ? (
                                        <tr><td colSpan={5} className={shared.textCenter}>Không có người nhận chờ gửi.</td></tr>
                                    ) : (
                                        pendingRecipients.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((recipient, idx) => (
                                            <tr key={recipient._id}>
                                                <td>{(currentPage - 1) * pageSize + idx + 1}</td>
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
                    {/* Bảng người nhận ĐÃ XỬ LÝ */}
                    <h3 style={{ color: '#6c757d', margin: '18px 0 8px 0' }}>Người nhận ĐÃ XỬ LÝ</h3>
                    <div className={shared.tableResponsive} style={{ width: '100%', overflowX: 'auto' }}>
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
                                    ) : otherRecipients.length === 0 ? (
                                        <tr><td colSpan={5} className={shared.textCenter}>Không có người nhận đã xử lý.</td></tr>
                                    ) : (
                                        otherRecipients.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((recipient, idx) => (
                                            <tr key={recipient._id}>
                                                <td>{(currentPage - 1) * pageSize + idx + 1}</td>
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
        </div>
    );
};

export default RecipientManager;