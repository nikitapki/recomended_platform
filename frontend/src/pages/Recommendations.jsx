import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  ChevronDown,
  Lightbulb,
  Store,
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
  SEGMENTS_STORAGE_KEY,
  SEGMENTS_UPDATED_EVENT
} from '../services/segmentStorage.js';
import { getSegmentCustomers } from '../services/segmentMatcher.js';
import {
  buildRecommendations,
  getRecommendationStats,
  MIN_CO_VISITORS,
  MIN_SOURCE_CUSTOMERS
} from '../services/recommendationService.js';

import './Recommendations.css';

function formatMoney(value) {
  return `${Number(value).toLocaleString('ru-RU')} ₽`;
}

function Recommendations() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(getCustomerProfiles);
  const [segments, setSegments] = useState(getSavedSegments);
  const [audienceId, setAudienceId] = useState('all');
  const [openedRecommendationId, setOpenedRecommendationId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const selectedSegment = segments.find(
    (segment) => segment.id === audienceId
  );
  const audienceCustomers = useMemo(() => {
    if (!selectedSegment) return customers;

    return getSegmentCustomers(customers, selectedSegment.conditions || []);
  }, [customers, selectedSegment]);
  const recommendations = useMemo(
    () => buildRecommendations(audienceCustomers),
    [audienceCustomers]
  );
  const stats = useMemo(
    () => getRecommendationStats(audienceCustomers, recommendations),
    [audienceCustomers, recommendations]
  );
  const openedRecommendation = recommendations.find(
    (recommendation) => recommendation.id === openedRecommendationId
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
    const refreshSegments = () => {
      const updatedSegments = getSavedSegments();

      setSegments(updatedSegments);
      setAudienceId((currentAudienceId) => {
        const selectedSegmentExists = updatedSegments.some(
          (segment) => segment.id === currentAudienceId
        );

        return currentAudienceId === 'all' || selectedSegmentExists
          ? currentAudienceId
          : 'all';
      });
    };
    const handleStorage = (event) => {
      if (event.key === IMPORTED_EVENTS_STORAGE_KEY) refreshCustomers();
      if (event.key === SEGMENTS_STORAGE_KEY) refreshSegments();
    };

    window.addEventListener(CUSTOMERS_UPDATED_EVENT, refreshCustomers);
    window.addEventListener(SEGMENTS_UPDATED_EVENT, refreshSegments);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(CUSTOMERS_UPDATED_EVENT, refreshCustomers);
      window.removeEventListener(SEGMENTS_UPDATED_EVENT, refreshSegments);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <div className="recommendations-page">
      <div className="page-heading">
        <div>
          <h1>Рекомендации арендаторам</h1>
          <p>Возможности привлечения новой аудитории на основе совместных посещений.</p>
        </div>

        <label className="recommendations-audience-select">
          Аудитория
          <span>
            <Users size={17} />
            <select
              value={audienceId}
              onChange={(event) => {
                setAudienceId(event.target.value);
                setOpenedRecommendationId(null);
              }}
            >
              <option value="all">Вся клиентская база</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </span>
        </label>
      </div>

      <div className="recommendations-notice">
        <Lightbulb size={19} />
        Рекомендации строятся только по фактически импортированным событиям и пересчитываются при смене аудитории.
      </div>

      <section className="recommendation-stats-grid">
        <div className="content-card recommendation-stat">
          <span>Аудитория</span>
          <strong>{stats.audienceCustomersCount}</strong>
          <small>профилей выбрано</small>
        </div>
        <div className="content-card recommendation-stat">
          <span>Данные импорта</span>
          <strong>{stats.customersWithImportedEvents}</strong>
          <small>гостей с событиями</small>
        </div>
        <div className="content-card recommendation-stat">
          <span>Арендаторы</span>
          <strong>{stats.importedTenantsCount}</strong>
          <small>в истории импорта</small>
        </div>
        <div className="content-card recommendation-stat">
          <span>Рекомендации</span>
          <strong>{stats.recommendationsCount}</strong>
          <small>сформировано</small>
        </div>
      </section>

      {!stats.hasMinimumData ? (
        <section className="content-card recommendations-empty-state">
          <BarChart3 size={34} />
          <h2>Недостаточно данных для рекомендаций</h2>
          <p>
            Нужны импортированные события минимум от {MIN_SOURCE_CUSTOMERS} гостей
            у двух арендаторов. Для устойчивой связи требуется не менее {MIN_CO_VISITORS}
            {' '}общих посетителей.
          </p>
        </section>
      ) : recommendations.length === 0 ? (
        <section className="content-card recommendations-empty-state">
          <BarChart3 size={34} />
          <h2>Подходящих новых аудиторий пока нет</h2>
          <p>
            Связи между арендаторами есть, но все подходящие гости уже взаимодействовали
            с целевыми арендаторами либо не достигнут порог устойчивости.
          </p>
        </section>
      ) : (
        <section className="recommendation-cards">
          {recommendations.map((recommendation) => (
            <article className="content-card recommendation-card" key={recommendation.id}>
              <div className="recommendation-card-heading">
                <div>
                  <span className="recommendation-label">ПРОДВИГАТЬ</span>
                  <h2>{recommendation.targetTenant}</h2>
                </div>
                <div className="recommendation-strength">
                  <strong>{recommendation.strength}%</strong>
                  <span>посетили обоих</span>
                </div>
              </div>

              <div className="recommendation-relation">
                <Store size={17} />
                <strong>{recommendation.sourceTenant}</strong>
                <ArrowRight size={17} />
                <strong>{recommendation.targetTenant}</strong>
              </div>

              <p className="recommendation-explanation">
                Среди гостей {recommendation.sourceTenant} {recommendation.coVisitedCustomersCount}
                {' '}из {recommendation.sourceCustomersCount} уже посещали {recommendation.targetTenant}.
                {' '}Поэтому полезно продвигать {recommendation.targetTenant} оставшимся гостям этой аудитории.
              </p>

              <div className="recommendation-metrics">
                <div>
                  <span>Потенциальная аудитория</span>
                  <strong>{recommendation.potentialCustomersCount}</strong>
                </div>
                <div>
                  <span>Доля ещё не посетивших</span>
                  <strong>{recommendation.relevanceRate}%</strong>
                </div>
                <div>
                  <span>Уже посещали цель</span>
                  <strong>{recommendation.coVisitedCustomersCount}</strong>
                </div>
              </div>

              <button
                className="recommendation-audience-button"
                onClick={() => setOpenedRecommendationId((currentId) =>
                  currentId === recommendation.id ? null : recommendation.id
                )}
              >
                <Users size={17} />
                {openedRecommendationId === recommendation.id
                  ? 'Скрыть потенциальных гостей'
                  : 'Показать потенциальных гостей'}
              </button>
              <button
                className="text-button"
                onClick={() => navigate(`/exports?audience=recommendation&recommendation=${encodeURIComponent(recommendation.id)}`)}
              >
                Передать аудиторию на экспорт
              </button>
            </article>
          ))}
        </section>
      )}

      {openedRecommendation && (
        <section className="content-card recommendation-audience-list">
          <div className="recommendation-card-heading">
            <div>
              <span className="recommendation-label">ПОТЕНЦИАЛЬНАЯ АУДИТОРИЯ</span>
              <h2>{openedRecommendation.targetTenant}</h2>
              <p>Гости {openedRecommendation.sourceTenant}, ещё не посещавшие целевого арендатора.</p>
            </div>
            <button
              className="recommendation-close-button"
              onClick={() => setOpenedRecommendationId(null)}
              title="Закрыть список"
            >
              <X size={18} />
            </button>
          </div>

          <div className="table-wrapper">
            <table className="recommendation-customers-table">
              <thead>
                <tr>
                  <th>Гость</th>
                  <th>Контакты</th>
                  <th>События</th>
                  <th>Основание</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {openedRecommendation.potentialCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td><strong>{customer.fullName}</strong></td>
                    <td>{customer.email || customer.phone || 'Не указаны'}</td>
                    <td>{customer.eventsCount}</td>
                    <td>{openedRecommendation.sourceTenant}</td>
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
        </section>
      )}

      {selectedCustomer && (
        <section className="content-card recommendation-customer-card">
          <div className="recommendation-card-heading">
            <div>
              <span className="recommendation-label">ПРОФИЛЬ ГОСТЯ</span>
              <h2>{selectedCustomer.fullName}</h2>
              <p>{selectedCustomer.phone || 'Телефон не указан'} · {selectedCustomer.email || 'Email не указан'}</p>
            </div>
            <button
              className="recommendation-close-button"
              onClick={() => setSelectedCustomer(null)}
              title="Закрыть профиль"
            >
              <X size={18} />
            </button>
          </div>

          <div className="recommendation-profile-details">
            <span><Calendar size={16} /> Последняя активность: {selectedCustomer.lastActivity}</span>
            <span><Wallet size={16} /> {formatMoney(selectedCustomer.totalSpent)}</span>
            <span><Store size={16} /> {selectedCustomer.tenants.join(', ')}</span>
          </div>
        </section>
      )}
    </div>
  );
}

export default Recommendations;
