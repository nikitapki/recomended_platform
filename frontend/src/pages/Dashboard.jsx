import { useNavigate } from 'react-router-dom';
import {
  Users,
  Store,
  Activity,
  Sparkles,
  ArrowUpRight,
  Upload,
  ShoppingBag
} from 'lucide-react';

const stats = [
  {
    title: 'Всего гостей',
    value: '12 480',
    description: 'Единые профили',
    icon: Users,
    color: 'blue'
  },
  {
    title: 'Арендаторы',
    value: '48',
    description: 'Подключённые организации',
    icon: Store,
    color: 'purple'
  },
  {
    title: 'События',
    value: '86 240',
    description: 'Посещения и покупки',
    icon: Activity,
    color: 'orange'
  },
  {
    title: 'Рекомендации',
    value: '1 284',
    description: 'Сформировано системой',
    icon: Sparkles,
    color: 'green'
  }
];

const recentImports = [
  {
    name: 'cafe_customers.csv',
    tenant: 'Coffee House',
    date: 'Сегодня, 10:42',
    status: 'Успешно',
    count: '1 240'
  },
  {
    name: 'store_clients.xlsx',
    tenant: 'Fashion Store',
    date: 'Сегодня, 09:15',
    status: 'Успешно',
    count: '856'
  },
  {
    name: 'pos_transactions.csv',
    tenant: 'Food Corner',
    date: 'Вчера, 16:30',
    status: 'Ошибка',
    count: '0'
  }
];

function Dashboard() {

  const navigate = useNavigate();


  return (
    <div className="dashboard">

      <div className="page-heading">
        <div>
          <h1>Обзор платформы</h1>
          <p>
            Общая статистика и состояние данных торгового центра.
          </p>
        </div>

        <button
            className="primary-button"
            onClick={() => navigate('/imports')}
            >
          <Upload size={17} />
          Загрузить данные
        </button>
      </div>

      <div className="demo-notice">
        Демонстрационный интерфейс — показатели пока тестовые.
      </div>

      <div className="stats-grid">

        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div className="stat-card" key={stat.title}>

              <div className="stat-top">
                <span>{stat.title}</span>

                <div className={`stat-icon ${stat.color}`}>
                  <Icon size={21} />
                </div>
              </div>

              <div className="stat-value">
                {stat.value}
              </div>

              <div className="stat-description">
                {stat.description}
              </div>

            </div>
          );
        })}

      </div>

      <div className="dashboard-grid">

        <div className="content-card">

          <div className="card-heading">
            <div>
              <h2>Последние загрузки</h2>
              <p>История поступления данных от арендаторов</p>
            </div>

            <button className="text-button">
              Все загрузки
              <ArrowUpRight size={16} />
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Файл</th>
                  <th>Арендатор</th>
                  <th>Дата</th>
                  <th>Записи</th>
                  <th>Статус</th>
                </tr>
              </thead>

              <tbody>
                {recentImports.map((item) => (
                  <tr key={item.name}>
                    <td className="file-name">
                      <ShoppingBag size={17} />
                      {item.name}
                    </td>

                    <td>{item.tenant}</td>
                    <td>{item.date}</td>
                    <td>{item.count}</td>

                    <td>
                      <span
                        className={
                          item.status === 'Успешно'
                            ? 'status success'
                            : 'status error'
                        }
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>

        </div>

        <div className="content-card activity-card">

          <div className="card-heading">
            <div>
              <h2>Основные показатели</h2>
              <p>Состояние платформы</p>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-icon blue">
              <Users size={19} />
            </div>

            <div>
              <strong>Гостевые профили</strong>
              <p>12 480 профилей</p>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-icon purple">
              <Store size={19} />
            </div>

            <div>
              <strong>Источники данных</strong>
              <p>8 подключений</p>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-icon green">
              <Sparkles size={19} />
            </div>

            <div>
              <strong>Сегменты</strong>
              <p>24 активных сегмента</p>
            </div>
          </div>

        </div>

      </div>

      <div className="dashboard-footer">
        Mall Insight · Платформа аналитики торгового центра
      </div>

    </div>
  );
}

export default Dashboard;
