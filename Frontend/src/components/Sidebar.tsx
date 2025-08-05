import React from 'react';
import { 
    Send, 
    Inbox, 
    FileText, 
    Users, 
    Mail, 
    BarChart3, 
    Zap,
    TrendingUp,
    Shield,
    Settings
} from 'lucide-react';
import styles from './shared.module.css';

interface SidebarProps {
    activeView: string;
    setActiveView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
    const navItems = [
        { 
            id: 'campaign', 
            label: 'Gửi chiến dịch', 
            icon: Send,
            description: 'Tạo và gửi email marketing',
            badge: 'New'
        },
        { 
            id: 'inbox', 
            label: 'Quản lý Inbox', 
            icon: Inbox,
            description: 'Xem và quản lý email nhận',
            badge: null
        },
        { 
            id: 'templates', 
            label: 'Quản lý Template', 
            icon: FileText,
            description: 'Tạo và chỉnh sửa mẫu email',
            badge: null
        },
        { 
            id: 'recipients', 
            label: 'Quản lý người nhận', 
            icon: Users,
            description: 'Quản lý danh sách email',
            badge: null
        },
        { 
            id: 'senders', 
            label: 'Tài khoản gửi', 
            icon: Mail,
            description: 'Cấu hình SMTP và IMAP',
            badge: null
        },
        { 
            id: 'logs', 
            label: 'Xem Log lỗi', 
            icon: BarChart3,
            description: 'Theo dõi hoạt động hệ thống',
            badge: null
        },
    ];

    const quickActions = [
        { 
            id: 'quick-send', 
            label: 'Gửi nhanh', 
            icon: Zap,
            description: 'Gửi email đơn lẻ'
        },
        { 
            id: 'analytics', 
            label: 'Phân tích', 
            icon: TrendingUp,
            description: 'Xem báo cáo chi tiết'
        },
    ];

    return (
        <aside className={styles.sidebar}>
            {/* Logo Section */}
            <div className={styles.sidebarHeader}>
                <div className={styles.logoContainer}>
                    <div className={styles.logoIcon}>
                        <Mail size={32} />
                    </div>
                    <div className={styles.logoText}>
                        <h2>Email Sender</h2>
                        <span className={styles.logoSubtitle}>Professional</span>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className={styles.sidebarNav}>
                <div className={styles.navSection}>
                    <h3 className={styles.navSectionTitle}>Chức năng chính</h3>
                    <ul>
                        {navItems.map((item) => {
                            const IconComponent = item.icon;
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => setActiveView(item.id)}
                                        className={
                                            `${styles.sidebarNavItem} ${activeView === item.id ? styles.active : ''}`
                                        }
                                        title={item.description}
                                    >
                                        <IconComponent size={20} />
                                        <div className={styles.navItemContent}>
                                            <span className={styles.navItemLabel}>{item.label}</span>
                                            {item.badge && (
                                                <span className={styles.navItemBadge}>{item.badge}</span>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Quick Actions */}
                <div className={styles.navSection}>
                    <h3 className={styles.navSectionTitle}>Thao tác nhanh</h3>
                    <ul>
                        {quickActions.map((item) => {
                            const IconComponent = item.icon;
                            return (
                                <li key={item.id}>
                                    <button
                                        className={styles.sidebarNavItem}
                                        title={item.description}
                                    >
                                        <IconComponent size={18} />
                                        <div className={styles.navItemContent}>
                                            <span className={styles.navItemLabel}>{item.label}</span>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </nav>

            {/* Footer */}
            <div className={styles.sidebarFooter}>
                <div className={styles.systemStatus}>
                    <div className={styles.statusIndicator}>
                        <div className={styles.statusDot}></div>
                        <span>Copyright 2025 © NgKN</span>
                    </div>
                </div>
                
                <div className={styles.sidebarActions}>
                    <button className={styles.sidebarActionBtn} title="Cài đặt hệ thống">
                        <Settings size={16} />
                    </button>
                    <button className={styles.sidebarActionBtn} title="Bảo mật">
                        <Shield size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;