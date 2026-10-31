
import { Outlet, useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import Sidebar from './Sidebar';

const pageTitles = {
  '/': 'Главная',
  '/imports': 'Загрузка данных',
  '/customers': 'Гости',
  '/segments': 'Сегменты',
  '/recommendations': 'Рекомендации',
  '/exports': 'Экспорт'
};

function Layout() {
  const location = useLocation();

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
            <div className="search-box">
              <Search size={18} />
              <span>Поиск по платформе</span>
              <kbd>Ctrl K</kbd>
            </div>

            <div className="notification">
              <Bell size={19} />
              <span className="notification-dot"></span>
            </div>

            <div className="topbar-avatar">УК</div>
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default Layout;
