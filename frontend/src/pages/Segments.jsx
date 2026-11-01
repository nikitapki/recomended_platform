import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  Calendar,
  Edit3,
  Plus,
  Save,
  Store,
  Trash2,
  UserRound,
  Users,
  Wallet,
  X
} from 'lucide-react';
import { getCustomerProfiles } from './Customers.jsx';
import {
  CUSTOMERS_UPDATED_EVENT,
  IMPORTED_EVENTS_STORAGE_KEY
} from '../services/customerStorage.js';
import {
  getSavedSegments,
  removeSegment,
  saveSegment,
  SEGMENTS_STORAGE_KEY,
  SEGMENTS_UPDATED_EVENT
} from '../services/segmentStorage.js';
import { getSegmentCustomers } from '../services/segmentMatcher.js';

import './Segments.css';

const FIELD_OPTIONS = [
  { value: 'visits', label: 'Количество посещений' },
  { value: 'totalSpent', label: 'Общая сумма покупок' },
  { value: 'eventType', label: 'Тип события' },
  { value: 'activityPeriod', label: 'Активность за период' },
  { value: 'tenant', label: 'Арендатор' }
];

const NUMBER_OPERATORS = [
  { value: 'eq', label: 'Равно' },
  { value: 'gt', label: 'Больше' },
  { value: 'lt', label: 'Меньше' },
  { value: 'gte', label: 'Не меньше' },
  { value: 'lte', label: 'Не больше' }
];

const EVENT_TYPES = ['Посещение', 'Покупка', 'Бронирование'];
const ACTIVITY_PERIODS = [
  { value: '7', label: 'Последние 7 дней' },
  { value: '30', label: 'Последние 30 дней' },
  { value: '90', label: 'Последние 90 дней' },
  { value: '365', label: 'Последний год' }
];

function createCondition() {
  return {
    id: crypto.randomUUID(),
    field: 'visits',
    operator: 'gte',
    value: '1'
  };
}

function getValueOptions(condition, customers) {
  if (condition.field === 'eventType') return EVENT_TYPES;

  if (condition.field === 'tenant') {
    return [...new Set(customers.flatMap((customer) => customer.tenants))];
  }

  return [];
}

function getDefaultConditionValue(field, customers) {
  if (field === 'eventType') return EVENT_TYPES[0];
  if (field === 'activityPeriod') return ACTIVITY_PERIODS[1].value;
  if (field === 'tenant') {
    return customers.flatMap((customer) => customer.tenants)[0] || '';
  }

  return field === 'visits' ? '1' : '0';
}

function formatMoney(value) {
  return `${Number(value).toLocaleString('ru-RU')} ₽`;
}

function Segments() {
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState(getCustomerProfiles);
  const [segments, setSegments] = useState(getSavedSegments);
  const [segmentName, setSegmentName] = useState('');
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState([createCondition]);
  const [editingSegmentId, setEditingSegmentId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [error, setError] = useState('');

  const matchingCustomers = useMemo(
    () => getSegmentCustomers(customers, conditions),
    [customers, conditions]
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
      if (event.key === IMPORTED_EVENTS_STORAGE_KEY) refreshCustomers();
      if (event.key === SEGMENTS_STORAGE_KEY) setSegments(getSavedSegments());
    };

    const refreshSegments = () => setSegments(getSavedSegments());

    window.addEventListener(CUSTOMERS_UPDATED_EVENT, refreshCustomers);
    window.addEventListener(SEGMENTS_UPDATED_EVENT, refreshSegments);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(CUSTOMERS_UPDATED_EVENT, refreshCustomers);
      window.removeEventListener(SEGMENTS_UPDATED_EVENT, refreshSegments);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const addCondition = () => {
    setConditions((currentConditions) => [
      ...currentConditions,
      createCondition()
    ]);
  };

  const updateCondition = (conditionId, changes) => {
    setConditions((currentConditions) => currentConditions.map((condition) => {
      if (condition.id !== conditionId) return condition;

      const updatedCondition = { ...condition, ...changes };

      if (changes.field) {
        updatedCondition.operator = ['visits', 'totalSpent'].includes(changes.field)
          ? 'gte'
          : 'eq';
        updatedCondition.value = getDefaultConditionValue(
          changes.field,
          customers
        );
      }

      return updatedCondition;
    }));
  };

  const removeCondition = (conditionId) => {
    setConditions((currentConditions) => currentConditions.filter(
      (condition) => condition.id !== conditionId
    ));
  };

  const startNewSegment = () => {
    setSegmentName('');
    setDescription('');
    setConditions([createCondition()]);
    setEditingSegmentId(null);
    setSelectedCustomer(null);
    setError('');
  };

  const openSegment = (segment) => {
    setSegmentName(segment.name);
    setDescription(segment.description || '');
    setConditions(segment.conditions || [createCondition()]);
    setEditingSegmentId(segment.id);
    setSelectedCustomer(null);
    setError('');
  };

  useEffect(() => {
    const segmentId = searchParams.get('segment');
    if (!segmentId) return;
    const segment = segments.find((item) => String(item.id) === segmentId);
    if (!segment) return undefined;

    const frame = requestAnimationFrame(() => openSegment(segment));
    return () => cancelAnimationFrame(frame);
  }, [searchParams, segments]);

  const handleSaveSegment = () => {
    if (!segmentName.trim()) {
      setError('Укажите название сегмента.');
      return;
    }

    if (conditions.length === 0) {
      setError('Добавьте хотя бы одно условие сегментации.');
      return;
    }

    const savedSegment = saveSegment({
      id: editingSegmentId,
      name: segmentName.trim(),
      description: description.trim(),
      conditions
    });

    setSegments(getSavedSegments());
    setEditingSegmentId(savedSegment.id);
    setError('');
  };

  const handleDeleteSegment = (segmentId) => {
    removeSegment(segmentId);
    setSegments(getSavedSegments());

    if (editingSegmentId === segmentId) startNewSegment();
  };

  return (
    <div className="segments-page">
      <div className="page-heading">
        <div>
          <h1>Сегменты гостей</h1>
          <p>Создавайте динамические аудитории по истории взаимодействий.</p>
        </div>

        <button className="primary-button" onClick={startNewSegment}>
          <Plus size={17} />
          Новый сегмент
        </button>
      </div>

      <div className="segments-layout">
        <aside className="content-card segments-saved-list">
          <div className="segments-card-heading">
            <div>
              <h2>Сохранённые сегменты</h2>
              <p>{segments.length} сохранено</p>
            </div>
          </div>

          {segments.length === 0 ? (
            <div className="segments-empty-state">
              <Users size={28} />
              <strong>Сегментов пока нет</strong>
              <span>Настройте условия и сохраните первую аудиторию.</span>
            </div>
          ) : (
            <div className="saved-segments-items">
              {segments.map((segment) => (
                <div
                  className={
                    editingSegmentId === segment.id
                      ? 'saved-segment active'
                      : 'saved-segment'
                  }
                  key={segment.id}
                >
                  <button
                    className="saved-segment-main"
                    onClick={() => openSegment(segment)}
                  >
                    <strong>{segment.name}</strong>
                    <span>{segment.conditions.length} условий</span>
                  </button>

                  <button
                    className="saved-segment-delete"
                    onClick={() => handleDeleteSegment(segment.id)}
                    title="Удалить сегмент"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        <section className="content-card segment-builder">
          <div className="segments-card-heading">
            <div>
              <h2>{editingSegmentId ? 'Редактирование сегмента' : 'Новый сегмент'}</h2>
              <p>Все условия объединяются через «И».</p>
            </div>
            {editingSegmentId && <Edit3 size={20} />}
          </div>

          <div className="segment-form-fields">
            <label>
              Название сегмента
              <input
                value={segmentName}
                onChange={(event) => setSegmentName(event.target.value)}
                placeholder="Например, постоянные посетители"
              />
            </label>

            <label>
              Описание
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Для чего используется эта аудитория"
                rows="3"
              />
            </label>
          </div>

          <div className="segment-conditions-heading">
            <div>
              <h3>Условия отбора</h3>
              <span>Гость должен соответствовать каждому условию.</span>
            </div>
            <button className="text-button" onClick={addCondition}>
              <Plus size={16} /> Добавить условие
            </button>
          </div>

          <div className="segment-conditions-list">
            {conditions.map((condition, index) => {
              const isNumberCondition = ['visits', 'totalSpent'].includes(
                condition.field
              );
              const valueOptions = getValueOptions(condition, customers);

              return (
                <div className="segment-condition" key={condition.id}>
                  <span className="condition-number">{index + 1}</span>

                  <select
                    value={condition.field}
                    onChange={(event) => updateCondition(condition.id, {
                      field: event.target.value
                    })}
                  >
                    {FIELD_OPTIONS.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  {isNumberCondition ? (
                    <select
                      value={condition.operator}
                      onChange={(event) => updateCondition(condition.id, {
                        operator: event.target.value
                      })}
                    >
                      {NUMBER_OPERATORS.map((operator) => (
                        <option key={operator.value} value={operator.value}>
                          {operator.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="condition-operator">Равно</span>
                  )}

                  {condition.field === 'activityPeriod' ? (
                    <select
                      value={condition.value}
                      onChange={(event) => updateCondition(condition.id, {
                        value: event.target.value
                      })}
                    >
                      {ACTIVITY_PERIODS.map((period) => (
                        <option key={period.value} value={period.value}>
                          {period.label}
                        </option>
                      ))}
                    </select>
                  ) : valueOptions.length > 0 ? (
                    <select
                      value={condition.value}
                      onChange={(event) => updateCondition(condition.id, {
                        value: event.target.value
                      })}
                    >
                      {valueOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={condition.value}
                      onChange={(event) => updateCondition(condition.id, {
                        value: event.target.value
                      })}
                    />
                  )}

                  <button
                    className="remove-condition"
                    disabled={conditions.length === 1}
                    onClick={() => removeCondition(condition.id)}
                    title="Удалить условие"
                  >
                    <X size={17} />
                  </button>
                </div>
              );
            })}
          </div>

          {error && <div className="segment-error">{error}</div>}

          <div className="segment-builder-footer">
            <span>Состав сегмента рассчитывается из актуальных профилей.</span>
            <button className="primary-button" onClick={handleSaveSegment}>
              <Save size={17} />
              {editingSegmentId ? 'Сохранить изменения' : 'Сохранить сегмент'}
            </button>
          </div>
        </section>
      </div>

      <section className="content-card segment-results">
        <div className="segments-card-heading">
          <div>
            <h2>Подходящие гости</h2>
            <p>Результат пересчитывается при изменении условий и данных.</p>
          </div>
          <div className="segment-result-count">
            <Users size={19} />
            {matchingCustomers.length}
          </div>
        </div>

        {matchingCustomers.length === 0 ? (
          <div className="segments-empty-state results-empty">
            <UserRound size={28} />
            <strong>Нет подходящих гостей</strong>
            <span>Измените условия, чтобы расширить аудиторию.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="segments-customers-table">
              <thead>
                <tr>
                  <th>Гость</th>
                  <th>Арендаторы</th>
                  <th>Посещения</th>
                  <th>Сумма покупок</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {matchingCustomers.map((customer) => {
                  const visitsCount = customer.events.filter(
                    (event) => event.type === 'Посещение'
                  ).length;

                  return (
                    <tr key={customer.id}>
                      <td>
                        <strong>{customer.fullName}</strong>
                        <span>{customer.email || customer.phone || 'Контакты не указаны'}</span>
                      </td>
                      <td>{customer.tenants.join(', ') || '—'}</td>
                      <td>{visitsCount}</td>
                      <td>{formatMoney(customer.totalSpent)}</td>
                      <td>
                        <button
                          className="customer-open-button"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          Профиль
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedCustomer && (
        <section className="content-card segment-customer-card">
          <div className="segments-card-heading">
            <div>
              <span className="customer-profile-label">ПРОФИЛЬ ГОСТЯ</span>
              <h2>{selectedCustomer.fullName}</h2>
              <p>{selectedCustomer.phone || 'Телефон не указан'} · {selectedCustomer.email || 'Email не указан'}</p>
            </div>
            <button
              className="remove-condition"
              onClick={() => setSelectedCustomer(null)}
              title="Закрыть профиль"
            >
              <X size={18} />
            </button>
          </div>

          <div className="segment-profile-stats">
            <span><Activity size={16} /> {selectedCustomer.eventsCount} событий</span>
            <span><Wallet size={16} /> {formatMoney(selectedCustomer.totalSpent)}</span>
            <span><Calendar size={16} /> {selectedCustomer.lastActivity}</span>
            <span><Store size={16} /> {selectedCustomer.tenants.join(', ')}</span>
          </div>
        </section>
      )}
    </div>
  );
}

export default Segments;
