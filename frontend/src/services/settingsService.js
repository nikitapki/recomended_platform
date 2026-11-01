export const SETTINGS_STORAGE_KEY = 'mall-insight-settings';
export const SETTINGS_UPDATED_EVENT = 'mall-insight:settings-updated';
export const COMPANY_NAME = 'NextSpot';

const DEMO_TENANTS = new Map([
  ['1', 'Coffee House'],
  ['2', 'Fashion Store'],
  ['3', 'Food Corner'],
  ['4', 'Sport Shop'],
  ['5', 'Beauty Studio']
]);

const DEFAULT_SETTINGS = {
  company: {
    name: COMPANY_NAME,
    role: 'Администратор',
    workspace: 'Mall Insight'
  },
  tenants: [],
  sources: [
    { id: 'crm', name: 'CRM-система', active: true },
    { id: 'loyalty', name: 'Программа лояльности', active: true },
    { id: 'pos', name: 'POS / Кассовая система', active: true },
    { id: 'pms', name: 'PMS / Система бронирования', active: true },
    { id: 'other', name: 'Другая система', active: true }
  ]
};

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function isLegacyDemoTenant(tenant) {
  return DEMO_TENANTS.get(String(tenant?.id)) === tenant?.name;
}

function normalizeSettings(settings = {}) {
  const savedCompany = settings.company || {};
  const companyName = savedCompany.name === 'Управляющая компания'
    ? COMPANY_NAME
    : (savedCompany.name || COMPANY_NAME);

  return {
    company: { ...DEFAULT_SETTINGS.company, ...savedCompany, name: companyName },
    // Мигрируются только точные пары ID и названия прежнего seed-набора.
    // Пользовательские записи с другими ID или названиями остаются нетронутыми.
    tenants: Array.isArray(settings.tenants)
      ? settings.tenants.filter((tenant) => !isLegacyDemoTenant(tenant))
      : cloneDefaults().tenants,
    sources: Array.isArray(settings.sources) ? settings.sources : cloneDefaults().sources
  };
}

export function getSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!saved) return cloneDefaults();

    return normalizeSettings(JSON.parse(saved));
  } catch (error) {
    console.error('Ошибка чтения настроек:', error);
    return cloneDefaults();
  }
}

export function saveSettings(settings) {
  const normalizedSettings = normalizeSettings(settings);

  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings));
  window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));

  return normalizedSettings;
}

// Всегда строит следующее состояние от последней сохранённой версии, поэтому
// добавление из открытых вкладок и быстрые последовательные клики не затирают
// уже сохранённые справочники.
export function updateSettings(update) {
  return saveSettings(update(getSettings()));
}

export function getActiveTenants() {
  return getSettings().tenants.filter((tenant) => tenant.active);
}

export function getActiveSources() {
  return getSettings().sources.filter((source) => source.active);
}

export function getSourceName(sourceId) {
  return getSettings().sources.find((source) => source.id === sourceId)?.name || sourceId;
}
