import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './TemplateManager.module.css';
import shared from './shared.module.css';

// Toast component
function Toast({ message, type, onClose }: { message: string, type?: 'success' | 'error', onClose: () => void }) {
    useEffect(() => {
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

// Định nghĩa kiểu dữ liệu cho Template
interface ITemplate {
    _id: string;
    name: string;
    subject: string;
    htmlBody: string; // Thêm cả nội dung để có thể edit sau này (nếu cần)
    sentCount?: number; // Thêm trường này
}

const TemplateManager = () => {
    const [templates, setTemplates] = useState<ITemplate[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // State cho form thêm mới
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [htmlBody, setHtmlBody] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State cho tab và tìm kiếm/lọc
    const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    // State cho toast
    const [toast, setToast] = useState<{ message: string, type?: 'success' | 'error' } | null>(null);

    // Thêm state cho popup chỉnh sửa template
    const [editingTemplate, setEditingTemplate] = useState<ITemplate | null>(null);

    // Thêm state loading cho nút Lưu
    const [isSaving, setIsSaving] = useState(false);

    // Thêm state cho preview HTML
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);

    // <<< PHẦN LOGIC FETCH ĐÃ ĐƯỢC THÊM VÀO >>>
    const fetchTemplates = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get('http://localhost:5000/api/templates');
            setTemplates(res.data);
        } catch (error) {
            console.error("Lỗi khi tải mẫu email:", error);
            setToast({ message: 'Không thể tải danh sách mẫu email.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    // Tự động lấy danh sách khi component được tải
    useEffect(() => {
        fetchTemplates();
    }, []);

    // Xử lý thêm mẫu mới
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post('http://localhost:5000/api/templates', { name, subject, htmlBody });
            setToast({ message: 'Thêm mẫu thành công!', type: 'success' });
            // Xóa trống các ô input
            setName('');
            setSubject('');
            setHtmlBody('');
            fetchTemplates(); // Tải lại danh sách
        } catch (error: any) {
            setToast({ message: 'Lỗi: ' + (error.response?.data?.message || error.message), type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Xử lý xóa mẫu
    const handleDelete = async (id: string) => {
        if (window.confirm('Bạn có chắc muốn xóa mẫu này?')) {
            try {
                await axios.delete(`http://localhost:5000/api/templates/${id}`);
                fetchTemplates();
            } catch (error: any) {
                setToast({ message: 'Lỗi: ' + (error.response?.data?.message || error.message), type: 'error' });
            }
        }
    };

    // Lọc và tìm kiếm template
    const filteredTemplates = templates.filter(t => {
        const keyword = search.toLowerCase();
        return (
            t.name.toLowerCase().includes(keyword) ||
            t.subject.toLowerCase().includes(keyword)
        ) && (filter ? t.name.toLowerCase().includes(filter.toLowerCase()) : true);
    });
    // Phân trang
    const totalPages = Math.ceil(filteredTemplates.length / pageSize);
    const pagedTemplates = filteredTemplates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
            {editingTemplate && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 16
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 14, padding: '32px 24px 24px 24px', minWidth: 340, maxWidth: 480, width: '100%',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', position: 'relative',
                        animation: 'fadeInScale 0.25s cubic-bezier(.4,2,.6,1)'
                    }}>
                        {/* Nút đóng (X) */}
                        <button onClick={() => !isSaving && setEditingTemplate(null)}
                            style={{
                                position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 700
                            }}
                            aria-label="Đóng popup"
                            disabled={isSaving}
                        >×</button>
                        <h2 style={{ marginBottom: 18, textAlign: 'center', fontSize: 22, fontWeight: 700, color: '#007bff', letterSpacing: 0.5 }}>Chỉnh sửa mẫu Email</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <label style={{ fontWeight: 500, color: '#333' }}>Tên mẫu
                                <input
                                    type="text"
                                    value={editingTemplate.name}
                                    onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #bdbdbd', marginTop: 6, fontSize: 16 }}
                                    autoFocus
                                    disabled={isSaving}
                                />
                            </label>
                            <label style={{ fontWeight: 500, color: '#333' }}>Tiêu đề
                                <input
                                    type="text"
                                    value={editingTemplate.subject}
                                    onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #bdbdbd', marginTop: 6, fontSize: 16 }}
                                    disabled={isSaving}
                                />
                            </label>
                            <label style={{ fontWeight: 500, color: '#333' }}>Nội dung HTML
                                <textarea
                                    value={editingTemplate.htmlBody}
                                    onChange={e => setEditingTemplate({ ...editingTemplate, htmlBody: e.target.value })}
                                    rows={8}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #bdbdbd', marginTop: 6, fontSize: 15, fontFamily: 'monospace' }}
                                    disabled={isSaving}
                                />
                            </label>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                            <button onClick={() => !isSaving && setEditingTemplate(null)} style={{ padding: '10px 22px', borderRadius: 6, border: 'none', background: '#e0e0e0', color: '#333', fontWeight: 500, cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: 16 }} disabled={isSaving}>Đóng</button>
                            <button
                                onClick={async () => {
                                    setIsSaving(true);
                                    try {
                                        await axios.put(`http://localhost:5000/api/templates/${editingTemplate._id}`, {
                                            name: editingTemplate.name,
                                            subject: editingTemplate.subject,
                                            htmlBody: editingTemplate.htmlBody
                                        });
                                        setEditingTemplate(null);
                                        fetchTemplates();
                                        setToast({ message: 'Cập nhật mẫu thành công!', type: 'success' });
                                    } catch (error: any) {
                                        setToast({ message: 'Lỗi: ' + (error.response?.data?.message || error.message), type: 'error' });
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
                    <style>{`
                    @keyframes fadeInScale {
                        0% { opacity: 0; transform: scale(0.92); }
                        100% { opacity: 1; transform: scale(1); }
                    }
                    `}</style>
                </div>
            )}
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <button
                    className={`${shared.btn} ${activeTab === 'list' ? shared.btnPrimary : shared.btnSecondary}`}
                    onClick={() => setActiveTab('list')}
                >
                    Danh sách mẫu Email
                </button>
                <button
                    className={`${shared.btn} ${activeTab === 'add' ? shared.btnPrimary : shared.btnSecondary}`}
                    onClick={() => setActiveTab('add')}
                >
                    Thêm mẫu Email mới
                </button>
            </div>
            {/* Tab content */}
            {activeTab === 'add' && (
                <form onSubmit={handleSubmit} className={shared.formContainer} style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
                    <h2 className={shared.title}>Thêm mẫu Email mới</h2>
                    <div className={shared.formGroup}>
                        <label htmlFor="template-name">Tên gợi nhớ</label>
                        <input id="template-name" value={name} onChange={e => setName(e.target.value)} required className={shared.formControl} />
                    </div>
                    <div className={shared.formGroup}>
                        <label htmlFor="template-subject">Tiêu đề</label>
                        <input id="template-subject" value={subject} onChange={e => setSubject(e.target.value)} required className={shared.formControl} />
                    </div>
                    <div className={shared.formGroup} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label htmlFor="template-body" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                            Nội dung HTML
                            <button
                                type="button"
                                className={shared.btnInfo}
                                style={{ padding: 0, background: 'none', border: 'none', boxShadow: 'none', color: '#6f42c1', fontSize: 22, cursor: htmlBody.trim() ? 'pointer' : 'not-allowed', marginLeft: 2, lineHeight: 1 }}
                                onClick={() => htmlBody.trim() && setPreviewHtml(htmlBody)}
                                disabled={!htmlBody.trim()}
                                title="Xem trước nội dung HTML"
                            >
                                👁️
                            </button>
                        </label>
                        <textarea id="template-body" value={htmlBody} onChange={e => setHtmlBody(e.target.value)} rows={8} required className={shared.formControl} style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                        <button type="submit" className={`${shared.btn} ${shared.btnPrimary}`} disabled={isSubmitting}>
                            {isSubmitting ? 'Đang lưu...' : 'Lưu mẫu'}
                        </button>
                    </div>
                </form>
            )}
            {activeTab === 'list' && (
                <div className={shared.formContainer} style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
                    <h2 className={shared.title}>Danh sách mẫu Email ({templates.length})</h2>
                    {/* Search, filter */}
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
                                        <th>STT</th>
                                        <th>Tên mẫu</th>
                                        <th>Tiêu đề</th>
                                        <th>Nội dung</th>
                                        <th>Số lần đã gửi</th> {/* Thêm cột này */}
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedTemplates.length > 0 ? (
                                        pagedTemplates.map((template, idx) => (
                                            <tr key={template._id}>
                                                <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                                                <td>{template.name}</td>
                                                <td>{template.subject}</td>
                                                <td>
                                                    <div style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{template.htmlBody}</div>
                                                </td>
                                                <td>{template.sentCount ?? 0}</td> {/* Hiển thị số lần đã gửi */}
                                                <td>
                                                    <button
                                                        onClick={() => setEditingTemplate(template)}
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
                                                        title="Chỉnh sửa mẫu này"
                                                    >
                                                        ✏️ <span style={{ fontWeight: 500 }}>Chỉnh sửa</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setPreviewHtml(template.htmlBody)}
                                                        className={shared.btnInfo}
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: 15,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            borderRadius: 6,
                                                            background: '#f3e9ff',
                                                            color: '#6f42c1',
                                                            border: 'none',
                                                            boxShadow: '0 1px 4px rgba(111,66,193,0.07)',
                                                            transition: 'background 0.2s, color 0.2s',
                                                            cursor: 'pointer',
                                                            marginRight: 8
                                                        }}
                                                        title="Xem trước nội dung HTML"
                                                    >
                                                        👁️ <span style={{ fontWeight: 500 }}>Xem trước</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(template._id)}
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
                                                        title="Xoá mẫu này"
                                                    >
                                                        <TrashIcon />
                                                        <span style={{ fontWeight: 500 }}>Xoá</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={5} className={shared.textCenter}>Chưa có mẫu nào.</td></tr>
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

export default TemplateManager;