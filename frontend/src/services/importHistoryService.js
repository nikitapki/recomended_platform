export const IMPORT_HISTORY_STORAGE_KEY = 'mall-insight-import-history';
export const IMPORTS_UPDATED_EVENT = 'mall-insight:imports-updated';

export function getImportHistory() {
  try {
    const saved = localStorage.getItem(IMPORT_HISTORY_STORAGE_KEY);
    const history = saved ? JSON.parse(saved) : [];

    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('Ошибка чтения истории загрузок:', error);
    return [];
  }
}

export function saveImportHistoryItem(item) {
  const updatedHistory = [item, ...getImportHistory()];

  localStorage.setItem(
    IMPORT_HISTORY_STORAGE_KEY,
    JSON.stringify(updatedHistory)
  );
  window.dispatchEvent(new CustomEvent(IMPORTS_UPDATED_EVENT));

  return updatedHistory;
}

// История загрузок — самостоятельная сущность. События и профили гостей
// хранятся по другому ключу и этой операцией не затрагиваются.
export function clearImportHistory() {
  localStorage.removeItem(IMPORT_HISTORY_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(IMPORTS_UPDATED_EVENT));
}
