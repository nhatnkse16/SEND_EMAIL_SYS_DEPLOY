import { useTheme } from '../context/ThemeContext';
import styles from './shared.module.css'; // Sử dụng shared.module.css cho style chuyên nghiệp

const Header = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className={styles.header}>
            <h2 className={styles.title}>Dashboard</h2>
            <button
                onClick={toggleTheme}
                className={styles.themeToggle}
                aria-label="Chuyển đổi giao diện sáng/tối"
            >
                {theme === 'light' ? '🌙' : '☀️'}
            </button>
        </header>
    );
};

export default Header;