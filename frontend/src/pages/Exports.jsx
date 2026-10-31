import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  SlidersHorizontal,
  Users
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
import { buildRecommendations } from '../services/recommendationService.js';
import {
  downloadCsv,
  downloadXlsx,
  EXPORT_FIELDS,
  getExportHistory,
  prepareExportTable,
  saveExportHistoryItem
} from '../services/exportService.js';

import './Exports.css';

const DEFAULT_FIELDS = EXPORT_FIELDS.map((field) => field.key);

function isImportedCustomer(customer) {
  return customer.events.some((event) => event.importEventId);
}

function Exports() {
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState(getCustomerProfiles);
  const [segments, setSegments] = useState(getSavedSegments);
  const [audienceType, setAudienceType] = useState(
    () => searchParams.get('audience') === 'recommendation' ? 'recommendation' : 'all'
  );
  const [audienceReference, setAudienceReference] = useState(
    () => searchParams.get('recommendation') || ''
  );
  const [selectedFields, setSelectedFields] = useState(DEFAULT_FIELDS);
  const [format, setFormat] = useState('csv');
  const [history, setHistory] = useState(getExportHistory);
  const [message, setMessage] = useState('');

  const exportableCustomers = useMemo(
    () => customers.filter(isImportedCustomer),
    [customers]
  );
  const recommendations = useMemo(
    () => buildRecommendations(exportableCustomers),
    [exportableCustomers]
  );
  const selectedSegment = segments.find(
    (segment) => segment.id === audienceReference
  );
  const selectedRecommendation = recommendations.find(
    (recommendation) => recommendation.id === audienceReference
  );
  const audience = useMemo(() => {
    if (audienceType === 'segment' && selectedSegment) {
      return getSegmentCustomers(
        exportableCustomers,
        selectedSegment.conditions || []
      );
    }

    if (audienceType === 'recommendation' && selectedRecommendation) {
      return selectedRecommendation.potentialCustomers;
    }

    return audienceType === 'all' ? exportableCustomers : [];
  }, [
    audienceType,
    exportableCustomers,
    selectedRecommendation,
    selectedSegment
  ]);
  const audienceName = audienceType === 'segment'
    ? selectedSegment?.name || 'Сегмент не выбран'
    : audienceType === 'recommendation'
      ? selectedRecommendation
        ? `Потенциальная аудитория: ${selectedRecommendation.targetTenant}`
        : 'Рекомендация не выбрана'
      : 'Вся клиентская база';
  const { fields, rows } = useMemo(
    () => prepareExportTable(audience, selectedFields),
    [audience, selectedFields]
  );

  useEffect(() => {
    const refreshCustomers = () => setCustomers(getCustomerProfiles());
    const refreshSegments = () => {
      const updatedSegments = getSavedSegments();
      setSegments(updatedSegments);
      setAudienceReference((currentReference) =>
        updatedSegments.some((segment) => segment.id === currentReference)
          ? currentReference
          : audienceType === 'segment' ? '' : currentReference
      );
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
  }, [audienceType]);

  const changeAudienceType = (nextType) => {
    setAudienceType(nextType);
    setAudienceReference('');
    setMessage('');
  };

  const toggleField = (fieldKey) => {
    setSelectedFields((currentFields) => currentFields.includes(fieldKey)
      ? currentFields.filter((key) => key !== fieldKey)
      : [...currentFields, fieldKey]
    );
  };

  const handleExport = () => {
    if (audience.length === 0 || fields.length === 0) return;

    const fileName = `mall-insight-${format}-${new Date().toISOString().slice(0, 10)}.${format}`;

    if (format === 'csv') {
      downloadCsv(fileName, fields, rows);
    } else {
      downloadXlsx(fileName, fields, rows);
    }

    setHistory(saveExportHistoryItem({
      audienceName,
      format: format.toUpperCase(),
      customersCount: audience.length,
      fieldsCount: fields.length
    }));
    setMessage(`Файл ${fileName} подготовлен для скачивания.`);
  };

  return (
    <div className="exports-page">
      <div className="page-heading">
        <div>
          <h1>Экспорт аудитории</h1>
          <p>Подготовьте актуальные профили для внешних маркетинговых систем.</p>
        </div>
      </div>

      <div className="exports-notice">
        <Info size={19} />
        В экспорт попадают только профили с импортированными событиями. Демонстрационные записи исключены.
      </div>

      <div className="exports-layout">
        <section className="content-card export-settings-card">
          <div className="exports-section-heading">
            <div>
              <h2>1. Выберите аудиторию</h2>
              <p>Состав всегда пересчитывается по актуальным данным.</p>
            </div>
          </div>

          <div className="export-audience-types">
            {[
              ['all', 'Вся клиентская база'],
              ['segment', 'Сохранённый сегмент'],
              ['recommendation', 'Аудитория рекомендации']
            ].map(([type, label]) => (
              <button
                className={audienceType === type ? 'export-audience-type active' : 'export-audience-type'}
                key={type}
                onClick={() => changeAudienceType(type)}
              >
                <Users size={17} />
                {label}
              </button>
            ))}
          </div>

          {audienceType === 'segment' && (
            <label className="export-select-field">
              Сегмент
              <select
                value={audienceReference}
                onChange={(event) => setAudienceReference(event.target.value)}
              >
                <option value="">Выберите сегмент</option>
                {segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>{segment.name}</option>
                ))}
              </select>
            </label>
          )}

          {audienceType === 'recommendation' && (
            <label className="export-select-field">
              Рекомендация
              <select
                value={audienceReference}
                onChange={(event) => setAudienceReference(event.target.value)}
              >
                <option value="">Выберите рекомендацию</option>
                {recommendations.map((recommendation) => (
                  <option key={recommendation.id} value={recommendation.id}>
                    {recommendation.sourceTenant} → {recommendation.targetTenant} ({recommendation.potentialCustomersCount})
                  </option>
                ))}
              </select>
              {recommendations.length === 0 && (
                <span className="export-field-hint">Нет рекомендаций с достаточным объёмом импортированных данных.</span>
              )}
            </label>
          )}

          <div className="export-audience-summary">
            <strong>{audienceName}</strong>
            <span><Users size={17} /> {audience.length} клиентов</span>
          </div>
        </section>

        <section className="content-card export-settings-card">
          <div className="exports-section-heading">
            <div>
              <h2>2. Настройте поля</h2>
              <p>Выберите только необходимые данные.</p>
            </div>
            <SlidersHorizontal size={20} />
          </div>

          <div className="export-field-actions">
            <button onClick={() => setSelectedFields(DEFAULT_FIELDS)}>Выбрать все</button>
            <button onClick={() => setSelectedFields([])}>Очистить</button>
          </div>

          <div className="export-fields-list">
            {EXPORT_FIELDS.map((field) => (
              <label key={field.key}>
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field.key)}
                  onChange={() => toggleField(field.key)}
                />
                <span className="export-checkbox"><Check size={14} /></span>
                {field.label}
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="content-card export-preview-card">
        <div className="exports-section-heading">
          <div>
            <h2>3. Предварительный просмотр</h2>
            <p>{audienceName} · {audience.length} записей · {fields.length} столбцов</p>
          </div>
          <div className="export-format-switch">
            <button
              className={format === 'csv' ? 'active' : ''}
              onClick={() => setFormat('csv')}
            ><FileText size={16} /> CSV</button>
            <button
              className={format === 'xlsx' ? 'active' : ''}
              onClick={() => setFormat('xlsx')}
            ><FileSpreadsheet size={16} /> XLSX</button>
          </div>
        </div>

        {audience.length === 0 ? (
          <div className="exports-empty-state">
            <Users size={30} />
            <strong>В выбранной аудитории нет клиентов</strong>
            <span>Выберите другую аудиторию или дождитесь импортированных данных.</span>
          </div>
        ) : fields.length === 0 ? (
          <div className="exports-empty-state">
            <SlidersHorizontal size={30} />
            <strong>Выберите хотя бы одно поле</strong>
            <span>Без столбцов сформировать файл невозможно.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="export-preview-table">
              <thead>
                <tr>{fields.map((field) => <th key={field.key}>{field.label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, index) => (
                  <tr key={index}>
                    {fields.map((field) => <td key={field.key}>{row[field.key]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="export-preview-footer">
          <span>CSV использует разделитель «;» и UTF-8 BOM для Microsoft Excel.</span>
          <button
            className="primary-button"
            disabled={audience.length === 0 || fields.length === 0}
            onClick={handleExport}
          >
            <Download size={17} /> Скачать {format.toUpperCase()}
          </button>
        </div>

        {message && <div className="export-success-message">{message}</div>}
      </section>

      <section className="content-card export-history-card">
        <div className="exports-section-heading">
          <div>
            <h2>История выгрузок</h2>
            <p>Хранятся только метаданные, без клиентских данных.</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="exports-empty-state compact">
            <FileText size={26} />
            <strong>Выгрузок пока не было</strong>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="export-history-table">
              <thead>
                <tr><th>Дата</th><th>Аудитория</th><th>Формат</th><th>Клиенты</th></tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.exportedAt).toLocaleString('ru-RU')}</td>
                    <td>{item.audienceName}</td>
                    <td><span className="export-format-badge">{item.format}</span></td>
                    <td>{item.customersCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Exports;
