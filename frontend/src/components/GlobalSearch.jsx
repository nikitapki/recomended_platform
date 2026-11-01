import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Users, Filter, ArrowRight, LayoutDashboard, Upload, Sparkles, Download, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCustomerProfiles } from '../pages/Customers.jsx';
import { CUSTOMERS_UPDATED_EVENT, IMPORTED_EVENTS_STORAGE_KEY } from '../services/customerStorage.js';
import { getSavedSegments, SEGMENTS_STORAGE_KEY, SEGMENTS_UPDATED_EVENT } from '../services/segmentStorage.js';

const sections = [
  { title: 'Главная', description: 'Ключевые показатели и активность', path: '/', icon: LayoutDashboard },
  { title: 'Загрузка данных', description: 'Импорт событий арендаторов', path: '/imports', icon: Upload },
  { title: 'Гости', description: 'Единый реестр гостей', path: '/customers', icon: Users },
  { title: 'Сегменты', description: 'Динамические аудитории', path: '/segments', icon: Filter },
  { title: 'Рекомендации', description: 'Возможности продвижения', path: '/recommendations', icon: Sparkles },
  { title: 'Экспорт', description: 'Выгрузка аудиторий', path: '/exports', icon: Download },
  { title: 'Настройки', description: 'Арендаторы, источники и рабочее пространство', path: '/settings', icon: Settings }
];

function GlobalSearch({ onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState(getCustomerProfiles);
  const [segments, setSegments] = useState(getSavedSegments);

  useEffect(() => {
    inputRef.current?.focus();
    const refreshCustomers = () => setCustomers(getCustomerProfiles());
    const refreshSegments = () => setSegments(getSavedSegments());
    const handleStorage = (event) => {
      if (event.key === IMPORTED_EVENTS_STORAGE_KEY) refreshCustomers();
      if (event.key === SEGMENTS_STORAGE_KEY) refreshSegments();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener(CUSTOMERS_UPDATED_EVENT, refreshCustomers);
    window.addEventListener(SEGMENTS_UPDATED_EVENT, refreshSegments);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener(CUSTOMERS_UPDATED_EVENT, refreshCustomers);
      window.removeEventListener(SEGMENTS_UPDATED_EVENT, refreshSegments);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return { customers: [], segments: [], sections };
    return {
      customers: customers.filter((customer) => [customer.fullName, customer.phone, customer.email]
        .some((value) => String(value || '').toLowerCase().includes(normalized))).slice(0, 6),
      segments: segments.filter((segment) => [segment.name, segment.description]
        .some((value) => String(value || '').toLowerCase().includes(normalized))).slice(0, 6),
      sections: sections.filter((section) => [section.title, section.description]
        .some((value) => value.toLowerCase().includes(normalized)))
    };
  }, [customers, query, segments]);

  const choose = (path) => {
    navigate(path);
    onClose();
  };
  const hasResults = results.customers.length || results.segments.length || results.sections.length;

  return (
    <div className="global-search-overlay" role="presentation" onMouseDown={onClose}>
      <section className="global-search-dialog" role="dialog" aria-modal="true" aria-label="Поиск по платформе" onMouseDown={(event) => event.stopPropagation()}>
        <div className="global-search-input"><Search size={19} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск гостей, сегментов и разделов" /><kbd>Esc</kbd></div>
        <div className="global-search-results">
          {!hasResults ? <div className="global-search-empty">Ничего не найдено. Попробуйте изменить запрос.</div> : <>
            {results.customers.length > 0 && <div className="search-result-group"><span>ГОСТИ</span>{results.customers.map((customer) => <button key={customer.id} onClick={() => choose(`/customers?customer=${encodeURIComponent(customer.id)}`)}><Users size={17} /><div><strong>{customer.fullName}</strong><small>{customer.phone || customer.email || 'Контакты не указаны'}</small></div><ArrowRight size={16} /></button>)}</div>}
            {results.segments.length > 0 && <div className="search-result-group"><span>СЕГМЕНТЫ</span>{results.segments.map((segment) => <button key={segment.id} onClick={() => choose(`/segments?segment=${encodeURIComponent(segment.id)}`)}><Filter size={17} /><div><strong>{segment.name}</strong><small>{segment.description || `${segment.conditions.length} условий`}</small></div><ArrowRight size={16} /></button>)}</div>}
            {results.sections.length > 0 && <div className="search-result-group"><span>РАЗДЕЛЫ</span>{results.sections.map((section) => { const Icon = section.icon; return <button key={section.path} onClick={() => choose(section.path)}><Icon size={17} /><div><strong>{section.title}</strong><small>{section.description}</small></div><ArrowRight size={16} /></button>; })}</div>}
          </>}
        </div>
      </section>
    </div>
  );
}

export default GlobalSearch;
