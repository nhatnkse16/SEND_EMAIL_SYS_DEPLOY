import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CampaignSender from './components/CampaignSender';
import RecipientManager from './components/RecipientManager';
import SenderManager from './components/SenderManager';
import LogViewer from './components/LogViewer';
import TemplateManager from './components/TemplateManager';
import EmailManager from './components/EmailManager';

// Import shared.module.css để sử dụng các class cho layout chính
import styles from './components/shared.module.css';

function App() {
  const [activeView, setActiveView] = useState<string>('campaign');

  // useEffect để đặt data-theme attribute trên body sẽ nằm trong ThemeContext.tsx hoặc global.css
  // Nếu ThemeContext.tsx của bạn đã xử lý việc này, không cần làm lại ở đây.
  // Nếu ThemeContext.tsx chỉ cung cấp giá trị, bạn có thể thêm useEffect ở đây:
  /*
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);
  */

  const renderActiveView = () => {
    switch (activeView) {
      case 'recipients':
        return <RecipientManager />;
      case 'senders':
        return <SenderManager />;
      case 'logs':
        return <LogViewer />;
      case 'templates':
        return <TemplateManager />;
      case 'inbox':
        return <EmailManager onNavigateToSenders={() => setActiveView('senders')} />;
      case 'campaign':
      default:
        return <CampaignSender />;
    }
  };

  return (
    <div className={styles.appContainer}> {/* Sử dụng class từ shared.module.css */}
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <div className={styles.mainContent}> {/* Sử dụng class từ shared.module.css */}
        <Header />
        {renderActiveView()}
      </div>
    </div>
  );
}

export default App;