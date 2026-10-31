
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CUSTOMERS_UPDATED_EVENT,
  getImportedEvents,
  IMPORTED_EVENTS_STORAGE_KEY
} from '../services/customerStorage.js';
import {
  getSettings,
  SETTINGS_STORAGE_KEY,
  SETTINGS_UPDATED_EVENT
} from '../services/settingsService.js';
import {
  Users,
  Search,
  Store,
  Activity,
  Wallet,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  X
} from 'lucide-react';

import './Customers.css';

// Нормализация идентификаторов
function normalizeCustomerPhone(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeCustomerEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

// Преобразование даты в timestamp
function getDateTimestamp(value) {
  if (!value) return null;

  const russianDate = String(value).match(
    /^(\d{2})\.(\d{2})\.(\d{4})$/
  );

  if (russianDate) {
    const [, day, month, year] = russianDate;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    ).getTime();
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? null : timestamp;
}

// Форматирование даты для интерфейса
function formatCustomerEventDate(value) {
  if (!value) return 'Дата не указана';

  const timestamp = getDateTimestamp(value);

  return timestamp
    ? new Date(timestamp).toLocaleDateString('ru-RU')
    : String(value);
}

// Перевод типа события для интерфейса
function getEventLabel(type) {
  const labels = {
    purchase: 'Покупка',
    visit: 'Посещение',
    booking: 'Бронирование'
  };

  return labels[type] || type || 'Событие';
}

// Построение профилей только по фактически импортированным событиям
function mergeImportedEventsWithCustomers(
  baseCustomers,
  importedEvents
) {
  const customers = baseCustomers.map((customer) => ({
    ...customer,
    tenants: [...customer.tenants],
    events: customer.events.map((event) => ({ ...event }))
  }));

  importedEvents.forEach((importedEvent) => {
    const phone = importedEvent.phoneNormalized ||
      normalizeCustomerPhone(importedEvent.phone);

    const email = importedEvent.emailNormalized ||
      normalizeCustomerEmail(importedEvent.email);

    // Сначала ищем по телефону, затем по email
    let customer = customers.find(
      (item) =>
        phone &&
        normalizeCustomerPhone(item.phone) === phone
    );

    if (!customer && email) {
      customer = customers.find(
        (item) =>
          email &&
          normalizeCustomerEmail(item.email) === email
      );
    }

    // Если гостя нет, создаём новый профиль
    if (!customer) {
      customer = {
        id: `imported-${importedEvent.id}`,
        fullName: importedEvent.fullName || 'Гость без имени',
        phone: importedEvent.phone || '',
        email: importedEvent.email || '',
        eventsCount: 0,
        totalSpent: 0,
        lastActivity: '—',
        tenants: [],
        events: []
      };

      customers.push(customer);
    }

    // Защита от повторного добавления одного события
    const alreadyAdded = customer.events.some(
      (event) => event.importEventId === importedEvent.id
    );

    if (alreadyAdded) return;

    // Заполняем отсутствующие контактные данные
    if (!customer.fullName && importedEvent.fullName) {
      customer.fullName = importedEvent.fullName;
    }

    if (!customer.phone && importedEvent.phone) {
      customer.phone = importedEvent.phone;
    }

    if (!customer.email && importedEvent.email) {
      customer.email = importedEvent.email;
    }

    const eventDate = formatCustomerEventDate(
      importedEvent.eventDate
    );

    const amount = Number(importedEvent.amount) || 0;

    const event = {
      importEventId: importedEvent.id,
      tenant: importedEvent.tenantName,
      type: getEventLabel(importedEvent.eventType),
      date: eventDate,
      amount
    };

    // Добавляем событие в историю гостя
    customer.events.push(event);

    // Пересчитываем показатели профиля
    customer.eventsCount += 1;
    customer.totalSpent += amount;

    // Добавляем арендатора, если его ещё нет
    if (
      importedEvent.tenantName &&
      !customer.tenants.includes(importedEvent.tenantName)
    ) {
      customer.tenants.push(importedEvent.tenantName);
    }

    // Обновляем дату последней активности
    const importedTimestamp = getDateTimestamp(
      importedEvent.eventDate
    );

    const currentTimestamp = getDateTimestamp(
      customer.lastActivity
    );

    if (
      importedTimestamp &&
      (!currentTimestamp || importedTimestamp > currentTimestamp)
    ) {
      customer.lastActivity = eventDate;
    }

    // Сначала показываем более поздние события
    customer.events.sort((leftEvent, rightEvent) => {
  const leftDate = getDateTimestamp(leftEvent.date) || 0;
  const rightDate = getDateTimestamp(rightEvent.date) || 0;

  return rightDate - leftDate;
});
  });

  return customers;
}

function formatMoney(value) {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

export function getCustomerProfiles() {
  return mergeImportedEventsWithCustomers(
    [],
    getImportedEvents()
  );
}

function Customers() {
  const [searchParams] = useSearchParams();

  const [customers, setCustomers] = useState(getCustomerProfiles);

  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [tenantOptions, setTenantOptions] = useState(
    () => getSettings().tenants
  );

  useEffect(() => {
    const refreshCustomers = () => {
      const updatedCustomers = getCustomerProfiles();

      setCustomers(updatedCustomers);
      setSelectedCustomer((currentCustomer) => {
        if (!currentCustomer) return null;

        return updatedCustomers.find(
          (customer) => customer.id === currentCustomer.id
        ) || null;
      });
    };

    const handleStorage = (event) => {
      if (event.key === IMPORTED_EVENTS_STORAGE_KEY) {
        refreshCustomers();
      }
      if (event.key === SETTINGS_STORAGE_KEY) {
        setTenantOptions(getSettings().tenants);
      }
    };
    const refreshTenantOptions = () => setTenantOptions(getSettings().tenants);

    window.addEventListener(CUSTOMERS_UPDATED_EVENT, refreshCustomers);
    window.addEventListener(SETTINGS_UPDATED_EVENT, refreshTenantOptions);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(
        CUSTOMERS_UPDATED_EVENT,
        refreshCustomers
      );
      window.removeEventListener(SETTINGS_UPDATED_EVENT, refreshTenantOptions);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    const customerId = searchParams.get('customer');
    if (!customerId) return;

    const customer = customers.find(
      (item) => String(item.id) === customerId
    );

    if (!customer) return undefined;

    const frame = requestAnimationFrame(() => setSelectedCustomer(customer));
    return () => cancelAnimationFrame(frame);
  }, [customers, searchParams]);

  // Фильтрация гостей
  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !query ||
        customer.fullName.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.email.toLowerCase().includes(query);

      const matchesTenant =
        tenantFilter === 'all' ||
        customer.tenants.includes(tenantFilter);

      return matchesSearch && matchesTenant;
    });
  }, [search, tenantFilter, customers]);

  // Общая статистика
  const totalEvents = customers.reduce(
    (sum, customer) => sum + customer.eventsCount,
    0
  );

  const totalSpent = customers.reduce(
    (sum, customer) => sum + customer.totalSpent,
    0
  );

  return (
    <div className="customers-page">

      {/* Заголовок */}

      <div className="page-heading">
        <div>
          <h1>Гости торгового центра</h1>
          <p>
            Единые профили и история взаимодействия гостей
            с арендаторами.
          </p>
        </div>
      </div>

      {/* Статистика */}

      <div className="customer-stats">

        <div className="customer-stat-card">
          <div className="customer-stat-icon blue">
            <Users size={21} />
          </div>

          <span>Всего гостей</span>
          <strong>{customers.length}</strong>
          <small>Уникальные профили</small>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-icon purple">
            <Activity size={21} />
          </div>

          <span>Всего событий</span>
          <strong>{totalEvents}</strong>
          <small>Покупки и посещения</small>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-icon green">
            <Wallet size={21} />
          </div>

          <span>Сумма покупок</span>
          <strong>{formatMoney(totalSpent)}</strong>
          <small>По истории гостей</small>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-icon orange">
            <Store size={21} />
          </div>

          <span>Арендаторы</span>
            <strong>{tenantOptions.length}</strong>
          <small>Представлены в данных</small>
        </div>

      </div>

      {/* Список гостей */}

      <section className="content-card customers-list-card">

        <div className="customers-list-heading">
          <div>
            <h2>Единый реестр гостей</h2>
            <p>
              Поиск по имени, телефону или электронной почте.
            </p>
          </div>

          <span className="customers-count">
            {filteredCustomers.length} гостей
          </span>
        </div>

        {/* Фильтры */}

        <div className="customers-filters">

          <div className="customer-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Поиск гостя..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                title="Очистить поиск"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            value={tenantFilter}
            onChange={(event) => setTenantFilter(event.target.value)}
          >
            <option value="all">Все арендаторы</option>

            {tenantOptions.map((tenant) => (
              <option key={tenant.id} value={tenant.name}>
                {tenant.name}{tenant.active ? '' : ' (неактивен)'}
              </option>
            ))}
          </select>

          <button
            className="clear-customer-filters"
            onClick={() => {
              setSearch('');
              setTenantFilter('all');
              setSelectedCustomer(null);
            }}
          >
            Сбросить
          </button>

        </div>

        {/* Таблица */}

        <div className="table-wrapper">

          <table className="customers-table">

            <thead>
              <tr>
                <th>Гость</th>
                <th>Контакты</th>
                <th>Арендаторы</th>
                <th>События</th>
                <th>Последняя активность</th>
                <th>Сумма покупок</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className={
                    selectedCustomer?.id === customer.id
                      ? 'selected-customer-row'
                      : ''
                  }
                >

                  <td>
                    <div className="customer-name-cell">
                      <div className="customer-avatar">
                        {customer.fullName.charAt(0)}
                      </div>

                      <strong>{customer.fullName}</strong>
                    </div>
                  </td>

                  <td>
                    <div className="customer-contacts">
                      <span>
                        <Phone size={13} />
                        {customer.phone}
                      </span>

                      <span>
                        <Mail size={13} />
                        {customer.email}
                      </span>
                    </div>
                  </td>

                  <td>
                    <div className="customer-tenant-tags">
                      {customer.tenants.length} организации
                    </div>
                  </td>

                  <td>{customer.eventsCount}</td>

                  <td>{customer.lastActivity}</td>

                  <td className="customer-spent">
                    {formatMoney(customer.totalSpent)}
                  </td>

                  <td>
                    <button
                      className="customer-open-button"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      Профиль
                    </button>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

        {filteredCustomers.length === 0 && (
          <div className="customers-empty">
            <Search size={28} />

            <strong>Гости не найдены</strong>

            <span>
              Попробуйте изменить поисковый запрос или фильтр.
            </span>
          </div>
        )}

      </section>

      {/* Карточка выбранного гостя */}

      {selectedCustomer && (
        <section className="content-card customer-profile-card">

          <div className="customer-profile-heading">

            <div className="customer-profile-title">
              <div className="customer-profile-avatar">
                {selectedCustomer.fullName.charAt(0)}
              </div>

              <div>
                <span className="customer-profile-label">
                  ЕДИНЫЙ ПРОФИЛЬ ГОСТЯ
                </span>

                <h2>{selectedCustomer.fullName}</h2>

                <span className="customer-id">
                  ID гостя: {selectedCustomer.id}
                </span>
              </div>
            </div>

            <button
              className="close-customer-profile"
              onClick={() => setSelectedCustomer(null)}
            >
              <X size={19} />
            </button>

          </div>

          <div className="customer-profile-contacts">

            <div>
              <Phone size={17} />
              <span>{selectedCustomer.phone}</span>
            </div>

            <div>
              <Mail size={17} />
              <span>{selectedCustomer.email}</span>
            </div>

          </div>

          <div className="customer-profile-stats">

            <div>
              <span>Всего событий</span>
              <strong>{selectedCustomer.eventsCount}</strong>
            </div>

            <div>
              <span>Сумма покупок</span>
              <strong>
                {formatMoney(selectedCustomer.totalSpent)}
              </strong>
            </div>

            <div>
              <span>Последняя активность</span>
              <strong>{selectedCustomer.lastActivity}</strong>
            </div>

          </div>

          {/* История взаимодействий */}

          <div className="customer-history">

            <div className="customer-history-heading">
              <div>
                <h3>История взаимодействий</h3>
                <p>
                  События гостя у различных арендаторов.
                </p>
              </div>
            </div>

            {selectedCustomer.tenants.map((tenant) => (
              <div
                className="customer-tenant-item"
                key={tenant}
              >
                <Store size={17} />
                <span>{tenant}</span>
              </div>
            ))}

            <div className="customer-events-list">

              {selectedCustomer.events.map((event, index) => (
                <div className="customer-event" key={index}>

                  <div className="customer-event-icon">
                    <ShoppingBag size={17} />
                  </div>

                  <div className="customer-event-info">
                    <strong>{event.type}</strong>
                    <span>{event.tenant}</span>
                  </div>

                  <div className="customer-event-date">
                    <Calendar size={14} />
                    {event.date}
                  </div>

                  <div className="customer-event-amount">
                    {formatMoney(event.amount)}
                  </div>

                </div>
              ))}

            </div>

          </div>

        </section>
      )}

      <div className="customers-footer">
        Mall Insight · Единый профиль гостя
      </div>

    </div>
  );
}

export default Customers;
