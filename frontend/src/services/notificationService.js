import { getExportHistory } from './exportService.js';
import { getImportHistory } from './importHistoryService.js';

export const READ_NOTIFICATIONS_STORAGE_KEY = 'mall-insight-read-notifications';
export const NOTIFICATIONS_UPDATED_EVENT = 'mall-insight:notifications-updated';

function getTimestamp(value) {
  const timestamp = Date.parse(value);

  if (!Number.isNaN(timestamp)) return timestamp;

  const match = String(value || '').match(
    /^(\d{2})\.(\d{2})\.(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1]),
      Number(match[4] || 0),
      Number(match[5] || 0),
      Number(match[6] || 0)
    ).getTime();
  }

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function getReadNotificationIds() {
  try {
    const saved = localStorage.getItem(READ_NOTIFICATIONS_STORAGE_KEY);
    const ids = saved ? JSON.parse(saved) : [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function getNotifications() {
  const readIds = new Set(getReadNotificationIds());
  const imports = getImportHistory().map((item) => ({
    id: `import-${item.id}`,
    type: 'Импорт',
    title: `Загрузка от ${item.tenantName || 'арендатора'}`,
    details: `${item.importedEventsCount ?? item.importableRows ?? 0} событий`,
    status: item.status || '',
    timestamp: getTimestamp(item.confirmedAtIso || item.confirmedAt),
    path: '/imports#import-history'
  }));
  const exports = getExportHistory().map((item) => ({
    id: `export-${item.id}`,
    type: 'Экспорт',
    title: `Выгрузка аудитории «${item.audienceName || 'Без названия'}»`,
    details: `${item.customersCount ?? 0} клиентов · ${item.format || ''}`,
    status: '',
    timestamp: getTimestamp(item.exportedAt),
    path: '/exports'
  }));

  return [...imports, ...exports]
    .map((notification) => ({ ...notification, read: readIds.has(notification.id) }))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 20);
}

function saveReadIds(ids) {
  localStorage.setItem(READ_NOTIFICATIONS_STORAGE_KEY, JSON.stringify([...ids]));
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
}

export function markNotificationRead(notificationId) {
  const ids = new Set(getReadNotificationIds());
  ids.add(notificationId);
  saveReadIds(ids);
}

export function markAllNotificationsRead() {
  saveReadIds(new Set(getNotifications().map((notification) => notification.id)));
}
