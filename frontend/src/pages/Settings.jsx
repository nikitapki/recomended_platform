import { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, Plus, Save, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  getSettings,
  updateSettings,
  SETTINGS_STORAGE_KEY,
  SETTINGS_UPDATED_EVENT,
  COMPANY_NAME
} from '../services/settingsService.js';

import './Settings.css';

function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function Settings() {
  const [settings, setSettings] = useState(getSettings);
  const [tenantQuery, setTenantQuery] = useState('');
  const [sourceQuery, setSourceQuery] = useState('');
  const [newTenantName, setNewTenantName] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [editingTenantId, setEditingTenantId] = useState(null);
  const [editingSourceId, setEditingSourceId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [companyDraft, setCompanyDraft] = useState(() => getSettings().company);

  useEffect(() => {
    const refresh = () => {
      const nextSettings = getSettings();
      setSettings(nextSettings);
      setCompanyDraft(nextSettings.company);
    };
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

  const visibleTenants = useMemo(() => settings.tenants.filter((tenant) =>
    tenant.name.toLowerCase().includes(tenantQuery.trim().toLowerCase())
  ), [settings.tenants, tenantQuery]);
  const visibleSources = useMemo(() => settings.sources.filter((source) =>
    source.name.toLowerCase().includes(sourceQuery.trim().toLowerCase())
  ), [settings.sources, sourceQuery]);

  const persist = (update) => {
    const savedSettings = updateSettings(update);
    setSettings(savedSettings);
    setCompanyDraft(savedSettings.company);
  };

  const addTenant = () => {
    const name = newTenantName.trim();
    if (!name) return;
    persist((currentSettings) => ({
      ...currentSettings,
      tenants: [...currentSettings.tenants, { id: createId('tenant'), name, active: true }]
    }));
    setNewTenantName('');
  };

  const addSource = () => {
    const name = newSourceName.trim();
    if (!name) return;
    persist((currentSettings) => ({
      ...currentSettings,
      sources: [...currentSettings.sources, { id: createId('source'), name, active: true }]
    }));
    setNewSourceName('');
  };

  const toggleItem = (collection, id) => {
    persist((currentSettings) => ({
      ...currentSettings,
      [collection]: currentSettings[collection].map((item) =>
        item.id === id ? { ...item, active: !item.active } : item
      )
    }));
  };

  const startEdit = (type, item) => {
    if (type === 'tenant') setEditingTenantId(item.id);
    else setEditingSourceId(item.id);
    setEditValue(item.name);
  };

  const saveEdit = (collection, id) => {
    const name = editValue.trim();
    if (!name) return;
    persist((currentSettings) => ({
      ...currentSettings,
      [collection]: currentSettings[collection].map((item) => item.id === id ? { ...item, name } : item)
    }));
    setEditingTenantId(null);
    setEditingSourceId(null);
    setEditValue('');
  };

  const saveCompany = () => {
    persist((currentSettings) => ({
      ...currentSettings,
      company: {
        name: companyDraft.name.trim() || COMPANY_NAME,
        role: companyDraft.role.trim() || 'Администратор',
        workspace: companyDraft.workspace.trim() || 'Mall Insight'
      }
    }));
  };

  const renderList = (items, type) => {
    const collection = type === 'tenant' ? 'tenants' : 'sources';
    const editingId = type === 'tenant' ? editingTenantId : editingSourceId;
    const noun = type === 'tenant' ? 'Арендаторов' : 'Источников';

    return items.length === 0 ? (
      <div className="settings-empty">{noun} по этому запросу нет.</div>
    ) : items.map((item) => (
      <div className="settings-list-item" key={item.id}>
        <div className="settings-item-main">
          {editingId === item.id ? (
            <input value={editValue} onChange={(event) => setEditValue(event.target.value)} autoFocus />
          ) : <strong>{item.name}</strong>}
          <span className={item.active ? 'settings-state active' : 'settings-state'}>
            {item.active ? 'Активен' : 'Отключён'}
          </span>
        </div>
        <div className="settings-item-actions">
          {editingId === item.id ? (
            <button className="icon-button" onClick={() => saveEdit(collection, item.id)} title="Сохранить"><Check size={17} /></button>
          ) : (
            <button className="icon-button" onClick={() => startEdit(type, item)} title="Изменить название"><Edit3 size={16} /></button>
          )}
          <button className="settings-toggle" onClick={() => toggleItem(collection, item.id)}>
            {item.active ? <ToggleRight size={25} /> : <ToggleLeft size={25} />}
            {item.active ? 'Отключить' : 'Включить'}
          </button>
        </div>
      </div>
    ));
  };

  return (
    <div className="settings-page">
      <div className="page-heading"><div><h1>Настройки</h1><p>Справочники импорта и информация о рабочем пространстве.</p></div></div>
      <section className="content-card settings-company-card">
        <div className="settings-card-heading"><div><h2>Информация о компании</h2><p>Эти данные отображаются в навигации и верхней панели.</p></div></div>
        <div className="settings-company-fields">
          <label>Управляющая компания<input value={companyDraft.name} onChange={(event) => setCompanyDraft({ ...companyDraft, name: event.target.value })} /></label>
          <label>Роль<input value={companyDraft.role} onChange={(event) => setCompanyDraft({ ...companyDraft, role: event.target.value })} /></label>
          <label>Рабочее пространство<input value={companyDraft.workspace} onChange={(event) => setCompanyDraft({ ...companyDraft, workspace: event.target.value })} /></label>
        </div>
        <button className="primary-button" onClick={saveCompany}><Save size={16} />Сохранить информацию</button>
      </section>
      <div className="settings-grid">
        <section className="content-card settings-card">
          <div className="settings-card-heading"><div><h2>Управление арендаторами</h2><p>Неактивные арендаторы остаются в истории, но недоступны для новых импортов.</p></div><strong>{settings.tenants.length}</strong></div>
          <div className="settings-search"><Search size={16} /><input value={tenantQuery} onChange={(event) => setTenantQuery(event.target.value)} placeholder="Поиск арендатора" /></div>
          <div className="settings-add"><input value={newTenantName} onChange={(event) => setNewTenantName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addTenant()} placeholder="Название нового арендатора" /><button className="text-button" onClick={addTenant}><Plus size={16} />Добавить</button></div>
          <div className="settings-list">{renderList(visibleTenants, 'tenant')}</div>
        </section>
        <section className="content-card settings-card">
          <div className="settings-card-heading"><div><h2>Источники данных</h2><p>Активные источники доступны при загрузке данных.</p></div><strong>{settings.sources.length}</strong></div>
          <div className="settings-search"><Search size={16} /><input value={sourceQuery} onChange={(event) => setSourceQuery(event.target.value)} placeholder="Поиск источника" /></div>
          <div className="settings-add"><input value={newSourceName} onChange={(event) => setNewSourceName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addSource()} placeholder="Название нового источника" /><button className="text-button" onClick={addSource}><Plus size={16} />Добавить</button></div>
          <div className="settings-list">{renderList(visibleSources, 'source')}</div>
        </section>
      </div>
    </div>
  );
}

export default Settings;
