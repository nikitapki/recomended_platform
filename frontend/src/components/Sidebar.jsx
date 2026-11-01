
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

import {
  LayoutDashboard,
  Upload,
  Users,
  Filter,
  Sparkles,
  Download,
  Building2,
  Settings
} from 'lucide-react';
import {
  getSettings,
  SETTINGS_STORAGE_KEY,
  SETTINGS_UPDATED_EVENT
} from '../services/settingsService.js';

const menuItems = [
  {
    title: 'Главная',
    path: '/',
    icon: LayoutDashboard
  },
  {
    title: 'Загрузка данных',
    path: '/imports',
    icon: Upload
  },
  {
    title: 'Гости',
    path: '/customers',
    icon: Users
  },
  {
    title: 'Сегменты',
    path: '/segments',
    icon: Filter
  },
  {
    title: 'Рекомендации',
    path: '/recommendations',
    icon: Sparkles
  },
  {
    title: 'Экспорт',
    path: '/exports',
    icon: Download
  }
];

function Sidebar() {
  const [company, setCompany] = useState(() => getSettings().company);

  useEffect(() => {
    const refresh = () => setCompany(getSettings().company);
    const handleStorage = (event) => {
      if (event.key === SETTINGS_STORAGE_KEY) refresh();
    };
    window.addEventListener(SETTINGS_UPDATED_EVENT, refresh);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const initials = company.name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]).join('').toUpperCase() || 'УК';

  return (
    <aside className="sidebar">

      <div className="sidebar-logo">
        <div className="logo-icon">
          <Building2 size={23} />
        </div>

        <div>
          <div className="logo-title">Mall Insight</div>
          <div className="logo-subtitle">Платформа аналитики ТЦ</div>
        </div>
      </div>

      <div className="sidebar-section-title">
        ОСНОВНОЕ МЕНЮ
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'nav-link active'
                  : 'nav-link'
              }
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-section-title">
          СИСТЕМА
        </div>

        <NavLink
          to="/settings"
          className={({ isActive }) => isActive ? 'sidebar-footer-item active' : 'sidebar-footer-item'}
        >
          <Settings size={19} />
          <span>Настройки</span>
        </NavLink>

        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>

          <div>
            <div className="user-name">{company.name}</div>
            <div className="user-role">{company.role}</div>
          </div>
        </div>
      </div>

    </aside>
  );
}

export default Sidebar;
