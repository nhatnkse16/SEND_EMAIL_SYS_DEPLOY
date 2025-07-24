import { useState, useEffect } from 'react';
import axios from 'axios';
import shared from './shared.module.css';

// Định nghĩa kiểu dữ liệu cho một đối tượng log
interface ILog {
    _id: string;
    senderEmail?: string;
    recipientEmail?: string;
    errorMessage?: string;
    createdAt: string;
}

const LogViewer = () => {
    const [logs, setLogs] = useState<ILog[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/logs');
            setLogs(res.data);
            setError('');
        } catch (err) {
            setError('Không thể tải log. Vui lòng đảm bảo server backend đang chạy.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    if (isLoading) {
        return <div className={shared.formContainer} style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box', textAlign: 'center' }}>Đang tải log...</div>;
    }

    if (error) {
        return <div className={shared.formContainer} style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box', color: 'var(--danger-color)', textAlign: 'center' }}>{error}</div>;
    }

    return (
        <div className={shared.formContainer} style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 className={shared.title} style={{ margin: 0 }}>Nhật ký lỗi hệ thống</h2>
                <button onClick={fetchLogs} className={`${shared.btn} ${shared.btnSecondary}`}>Tải lại</button>
            </div>
            <div className={shared.tableResponsive} style={{ width: '100%', overflowX: 'auto' }}>
                <div className={shared.tableWrapper} style={{ minWidth: 700, width: '100%' }}>
                    <table className={shared.dataTable} style={{ minWidth: 700, width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Email Gửi</th>
                                <th>Email Nhận</th>
                                <th>Thông báo lỗi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className={shared.textCenter} style={{ padding: 20 }}>Không có log nào.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log._id}>
                                        <td>{new Date(log.createdAt).toLocaleString()}</td>
                                        <td>{log.senderEmail || <span style={{ color: '#aaa' }}>N/A</span>}</td>
                                        <td>{log.recipientEmail || <span style={{ color: '#aaa' }}>N/A</span>}</td>
                                        <td style={{ color: 'var(--danger-color)', fontWeight: 500 }}>{log.errorMessage}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LogViewer;