import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Store,
  Upload,
  Users
} from 'lucide-react';
import {
  CUSTOMERS_UPDATED_EVENT,
  getImportedEvents,
  IMPORTED_EVENTS_STORAGE_KEY
} from '../services/customerStorage.js';
import {
  getImportHistory,
  IMPORT_HISTORY_STORAGE_KEY,
  IMPORTS_UPDATED_EVENT
} from '../services/importHistoryService.js';
import {
  getSavedSegments,
  SEGMENTS_STORAGE_KEY,
  SEGMENTS_UPDATED_EVENT
} from '../services/segmentStorage.js';
import {
  EXPORT_HISTORY_STORAGE_KEY,
  EXPORTS_UPDATED_EVENT,
  getExportHistory
} from '../services/exportService.js';
import { getCustomerProfiles } from './Customers.jsx';
import { getDashboardData } from '../services/dashboardService.js';

function loadDashboardData() {
  return getDashboardData({
    customers: getCustomerProfiles(),
    importedEvents: getImportedEvents(),
    segments: getSavedSegments(),
    importHistory: getImportHistory(),
    exportHistory: getExportHistory()
  });
}

function formatOperationDate(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleString('ru-RU') : 'Дата не указана';
}

function EmptyChart({ message }) {
  return <div className="dashboard-chart-empty"><BarChart3 size={25} /><span>{message}</span></div>;
}

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(loadDashboardData);
  const { kpis, charts, recentOperations } = dashboardData;

  useEffect(() => {
    const refreshDashboard = () => setDashboardData(loadDashboardData());
    const handleStorage = (event) => {
      if ([IMPORTED_EVENTS_STORAGE_KEY, IMPORT_HISTORY_STORAGE_KEY, SEGMENTS_STORAGE_KEY, EXPORT_HISTORY_STORAGE_KEY].includes(event.key)) {
        refreshDashboard();
      }
    };

    window.addEventListener(CUSTOMERS_UPDATED_EVENT, refreshDashboard);
    window.addEventListener(IMPORTS_UPDATED_EVENT, refreshDashboard);
    window.addEventListener(SEGMENTS_UPDATED_EVENT, refreshDashboard);
    window.addEventListener(EXPORTS_UPDATED_EVENT, refreshDashboard);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(CUSTOMERS_UPDATED_EVENT, refreshDashboard);
      window.removeEventListener(IMPORTS_UPDATED_EVENT, refreshDashboard);
      window.removeEventListener(SEGMENTS_UPDATED_EVENT, refreshDashboard);
      window.removeEventListener(EXPORTS_UPDATED_EVENT, refreshDashboard);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const stats = [
    { title: 'Гости', value: kpis.guestsCount, description: 'с импортированными событиями', icon: Users, color: 'blue' },
    { title: 'События', value: kpis.eventsCount, description: 'сохранено после импорта', icon: Activity, color: 'orange' },
    { title: 'Арендаторы', value: kpis.tenantsCount, description: 'в импортированных данных', icon: Store, color: 'purple' },
    { title: 'Сегменты', value: kpis.segmentsCount, description: 'сохранено условий', icon: Users, color: 'blue' },
    { title: 'Рекомендации', value: kpis.recommendationsCount, description: 'с достаточной связью', icon: Sparkles, color: 'green' },
    { title: 'Экспорты', value: kpis.exportsCount, description: 'выполнено выгрузок', icon: Download, color: 'orange' }
  ];
  const maxDailyActivity = useMemo(() => Math.max(...charts.dailyActivity.map((item) => item.count), 1), [charts.dailyActivity]);
  const maxTenantActivity = useMemo(() => Math.max(...charts.tenantActivity.map((item) => item.count), 1), [charts.tenantActivity]);
  const totalTypeEvents = charts.eventTypeDistribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="dashboard">
      <div className="page-heading">
        <div><h1>Обзор платформы</h1><p>Актуальные показатели импортированных данных торгового центра.</p></div>
        <button className="primary-button" onClick={() => navigate('/imports')}><Upload size={17} />Загрузить данные</button>
      </div>

      <div className="dashboard-data-notice">Показатели и графики пересчитываются после импорта, изменения сегментов и выгрузок.</div>

      <div className="dashboard-kpi-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return <div className="stat-card" key={stat.title}><div className="stat-top"><span>{stat.title}</span><div className={`stat-icon ${stat.color}`}><Icon size={21} /></div></div><div className="stat-value">{stat.value.toLocaleString('ru-RU')}</div><div className="stat-description">{stat.description}</div></div>;
        })}
      </div>

      <div className="dashboard-grid">
        <section className="content-card">
          <div className="card-heading"><div><h2>Последние операции</h2><p>Подтверждённые импорты и выполненные выгрузки.</p></div><div className="dashboard-card-actions"><button className="text-button" onClick={() => navigate('/imports#import-history')}>Все загрузки <ArrowUpRight size={16} /></button><button className="text-button" onClick={() => navigate('/exports')}>Экспорты <ArrowUpRight size={16} /></button></div></div>
          {recentOperations.length === 0 ? <div className="dashboard-chart-empty"><FileSpreadsheet size={25} /><span>Операций пока нет. Подтвердите импорт или выполните экспорт.</span></div> : <div className="table-wrapper"><table><thead><tr><th>Операция</th><th>Источник</th><th>Дата</th><th>Записей</th><th>Статус</th></tr></thead><tbody>{recentOperations.map((operation) => <tr className="dashboard-operation-row" key={operation.id} onClick={() => navigate(operation.path)}><td className="file-name">{operation.type === 'Импорт' ? <FileSpreadsheet size={17} /> : <FileText size={17} />}{operation.type}</td><td><strong>{operation.title}</strong><span className="dashboard-operation-details">{operation.details}</span></td><td>{formatOperationDate(operation.timestamp)}</td><td>{operation.count}</td><td>{operation.status ? <span className="status success">{operation.status}</span> : '—'}</td></tr>)}</tbody></table></div>}
        </section>

        <section className="content-card activity-card">
          <div className="card-heading"><div><h2>Состояние данных</h2><p>Текущий объём доступной аналитики.</p></div></div>
          <div className="activity-item"><div className="activity-icon blue"><Users size={19} /></div><div><strong>Импортированные профили</strong><p>{kpis.guestsCount} гостей доступны для аналитики</p></div></div>
          <div className="activity-item"><div className="activity-icon purple"><Store size={19} /></div><div><strong>Активные арендаторы</strong><p>{kpis.tenantsCount} арендаторов в событиях</p></div></div>
          <div className="activity-item"><div className="activity-icon green"><Sparkles size={19} /></div><div><strong>Сегменты и рекомендации</strong><p>{kpis.segmentsCount} / {kpis.recommendationsCount}</p></div></div>
        </section>
      </div>

      <div className="dashboard-charts-grid">
        <section className="content-card dashboard-chart-card"><div className="card-heading"><div><h2>Активность гостей по дням</h2><p>Количество импортированных событий по датам.</p></div></div>{charts.dailyActivity.length === 0 ? <EmptyChart message="Нет событий с указанной датой." /> : <div className="daily-chart">{charts.dailyActivity.map((item) => <div className="daily-chart-item" key={item.timestamp}><strong>{item.count}</strong><div className="daily-chart-track"><span style={{ height: `${(item.count / maxDailyActivity) * 100}%` }} /></div><span>{item.label}</span></div>)}</div>}</section>
        <section className="content-card dashboard-chart-card"><div className="card-heading"><div><h2>Активность арендаторов</h2><p>События по организациям.</p></div></div>{charts.tenantActivity.length === 0 ? <EmptyChart message="Нет импортированных событий арендаторов." /> : <div className="tenant-chart">{charts.tenantActivity.slice(0, 6).map((item) => <div className="tenant-chart-item" key={item.label}><div><span>{item.label}</span><strong>{item.count}</strong></div><div className="tenant-chart-track"><span style={{ width: `${(item.count / maxTenantActivity) * 100}%` }} /></div></div>)}</div>}</section>
        <section className="content-card dashboard-chart-card"><div className="card-heading"><div><h2>Типы событий</h2><p>Распределение импортированной активности.</p></div></div>{charts.eventTypeDistribution.length === 0 ? <EmptyChart message="Нет импортированных событий для распределения." /> : <div className="event-type-chart"><div className="event-type-bar">{charts.eventTypeDistribution.map((item, index) => <span key={item.label} className={`event-type-color-${index % 4}`} style={{ width: `${(item.count / totalTypeEvents) * 100}%` }} />)}</div><div className="event-type-legend">{charts.eventTypeDistribution.map((item, index) => <div key={item.label}><span className={`event-type-dot event-type-color-${index % 4}`} />{item.label}<strong>{item.count}</strong></div>)}</div></div>}</section>
      </div>

      <div className="dashboard-footer">Mall Insight · Платформа аналитики торгового центра</div>
    </div>
  );
}

export default Dashboard;
