
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, Settings } from 'lucide-react';
import Sidebar from './Sidebar';
import GlobalSearch from './GlobalSearch';
import NotificationsPanel from './NotificationsPanel';
import { IMPORTS_UPDATED_EVENT, IMPORT_HISTORY_STORAGE_KEY } from '../services/importHistoryService.js';
import { EXPORTS_UPDATED_EVENT, EXPORT_HISTORY_STORAGE_KEY } from '../services/exportService.js';
import { getNotifications, markAllNotificationsRead, markNotificationRead, NOTIFICATIONS_UPDATED_EVENT, READ_NOTIFICATIONS_STORAGE_KEY } from '../services/notificationService.js';
import { getSettings, SETTINGS_STORAGE_KEY, SETTINGS_UPDATED_EVENT } from '../services/settingsService.js';

const pageTitles = {
  '/': 'Главная',
  '/imports': 'Загрузка данных',
  '/customers': 'Гости',
  '/segments': 'Сегменты',
  '/recommendations': 'Рекомендации',
  '/exports': 'Экспорт',
  '/settings': 'Настройки'
};

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState(getNotifications);
  const [company, setCompany] = useState(() => getSettings().company);

  useEffect(() => {
    const refreshNotifications = () => setNotifications(getNotifications());
    const refreshCompany = () => setCompany(getSettings().company);
    const handleStorage = (event) => {
      if ([IMPORT_HISTORY_STORAGE_KEY, EXPORT_HISTORY_STORAGE_KEY, READ_NOTIFICATIONS_STORAGE_KEY].includes(event.key)) refreshNotifications();
      if (event.key === SETTINGS_STORAGE_KEY) refreshCompany();
    };
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener(IMPORTS_UPDATED_EVENT, refreshNotifications);
    window.addEventListener(EXPORTS_UPDATED_EVENT, refreshNotifications);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications);
    window.addEventListener(SETTINGS_UPDATED_EVENT, refreshCompany);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('keydown', handleShortcut);
    return () => {
      window.removeEventListener(IMPORTS_UPDATED_EVENT, refreshNotifications);
      window.removeEventListener(EXPORTS_UPDATED_EVENT, refreshNotifications);
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications);
      window.removeEventListener(SETTINGS_UPDATED_EVENT, refreshCompany);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('keydown', handleShortcut);
    };
  }, []);

  const initials = company.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'УК';
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const openNotification = (notification) => {
    markNotificationRead(notification.id);
    navigate(notification.path);
    setNotificationsOpen(false);
  };

  const currentTitle =
    pageTitles[location.pathname] || 'Платформа';

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            <div className="breadcrumb">
              Рабочее пространство
              <span>/</span>
              <strong>{currentTitle}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="search-box" onClick={() => setSearchOpen(true)} type="button">
              <Search size={18} />
              <span>Поиск по платформе</span>
              <kbd>Ctrl K</kbd>
            </button>

            <button className="notification topbar-icon-button" onClick={() => { setNotificationsOpen((current) => !current); setProfileOpen(false); }} type="button" aria-label="Уведомления">
              <Bell size={19} />
              {unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            <button className="topbar-avatar topbar-avatar-button" onClick={() => { setProfileOpen((current) => !current); setNotificationsOpen(false); }} type="button" aria-label="Меню профиля">{initials}</button>
          </div>
          {notificationsOpen && <NotificationsPanel notifications={notifications} onClose={() => setNotificationsOpen(false)} onOpen={openNotification} onReadAll={() => markAllNotificationsRead()} />}
          {profileOpen && <div className="profile-menu"><strong>{company.name}</strong><span>{company.role}</span><button onClick={() => { navigate('/settings'); setProfileOpen(false); }}><Settings size={16} />Настройки</button></div>}
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

export default Layout;
