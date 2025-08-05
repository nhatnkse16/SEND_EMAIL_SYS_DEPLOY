import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Bell, User, Settings } from 'lucide-react';
import styles from './shared.module.css';

const Header = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className={styles.header}>
            <div className={styles.headerLeft}>
                <h2 className={styles.title}>Email Marketing Dashboard</h2>
                <div className={styles.breadcrumb}>
                    <span className={styles.breadcrumbItem}>Dashboard</span>
                    <span className={styles.breadcrumbSeparator}>/</span>
                    <span className={styles.breadcrumbItem}>Quản lý hệ thống</span>
                </div>
            </div>
            
            <div className={styles.headerRight}>
                <div className={styles.headerActions}>
                    <button
                        className={styles.headerActionBtn}
                        aria-label="Thông báo"
                        title="Thông báo"
                    >
                        <Bell size={20} />
                        <span className={styles.notificationBadge}>3</span>
                    </button>
                    
                    <button
                        className={styles.headerActionBtn}
                        aria-label="Cài đặt"
                        title="Cài đặt"
                    >
                        <Settings size={20} />
                    </button>
                    
                    <button
                        className={styles.headerActionBtn}
                        aria-label="Hồ sơ người dùng"
                        title="Hồ sơ người dùng"
                    >
                        <User size={20} />
                    </button>
                    
                    <div className={styles.themeToggleWrapper}>
                        <button
                            onClick={toggleTheme}
                            className={styles.themeToggle}
                            aria-label={`Chuyển sang giao diện ${theme === 'light' ? 'tối' : 'sáng'}`}
                            title={`Chuyển sang giao diện ${theme === 'light' ? 'tối' : 'sáng'}`}
                        >
                            {theme === 'light' ? (
                                <Moon size={18} />
                            ) : (
                                <Sun size={18} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;