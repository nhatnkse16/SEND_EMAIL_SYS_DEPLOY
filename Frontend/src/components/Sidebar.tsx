import React from 'react';
import styles from './shared.module.css'; // Sử dụng shared.module.css cho style chuyên nghiệp

interface SidebarProps {
    activeView: string;
    setActiveView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
    const navItems = [
        { id: 'campaign', label: '🚀 Gửi chiến dịch' },
        { id: 'templates', label: '📝 Quản lý Template' },
        { id: 'recipients', label: '👥 Quản lý người nhận' },
        { id: 'senders', label: '✉️ Quản lý tài khoản gửi' },
        { id: 'logs', label: '📊 Xem Log lỗi' },
    ];

    return (
        <aside className={styles.sidebar}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                <img src="/vite.svg" alt="Logo" style={{ width: 48, height: 48, marginBottom: 8 }} />
                <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.5rem', margin: 0 }}>Email Sender</h2>
            </div>
            <nav className={styles.sidebarNav}>
                <ul>
                    {navItems.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => setActiveView(item.id)}
                                className={
                                    `${styles.sidebarNavItem} ${activeView === item.id ? styles.active : ''}`
                                }
                            >
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;