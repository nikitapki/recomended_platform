import { buildRecommendations } from './recommendationService.js';

const EVENT_TYPE_LABELS = {
  visit: 'Посещения',
  purchase: 'Покупки',
  booking: 'Бронирования'
};

function getDateTimestamp(value) {
  const russianDateTime = String(value ?? '').match(
    /^(\d{2})\.(\d{2})\.(\d{4}),?\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (russianDateTime) {
    const [, day, month, year, hours, minutes, seconds = '0'] = russianDateTime;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds)
    ).getTime();
  }

  const russianDate = String(value ?? '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

  if (russianDate) {
    const [, day, month, year] = russianDate;
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatDateLabel(timestamp) {
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short'
  });
}

function getImportedProfiles(customers) {
  return customers.filter((customer) => customer.events.some(
    (event) => event.importEventId
  ));
}

function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    groups.set(key, (groups.get(key) || 0) + 1);
    return groups;
  }, new Map());
}

function mapChartData(groups) {
  return [...groups.entries()].map(([label, count]) => ({ label, count }));
}

function buildRecentOperations(importHistory, exportHistory) {
  const imports = importHistory.map((item) => ({
    id: `import-${item.id}`,
    type: 'Импорт',
    title: item.tenantName || 'Арендатор не указан',
    details: item.fileName || 'Файл не указан',
    count: item.importedEventsCount ?? item.importableRows ?? 0,
    status: item.status || '',
    timestamp: getDateTimestamp(item.confirmedAtIso || item.confirmedAt),
    path: '/imports#import-history'
  }));
  const exports = exportHistory.map((item) => ({
    id: `export-${item.id}`,
    type: 'Экспорт',
    title: item.audienceName || 'Аудитория не указана',
    details: item.format || 'Формат не указан',
    count: item.customersCount ?? 0,
    status: '',
    timestamp: getDateTimestamp(item.exportedAt),
    path: '/exports'
  }));

  return [...imports, ...exports]
    .sort((left, right) => (right.timestamp || 0) - (left.timestamp || 0))
    .slice(0, 6);
}

export function getDashboardData({
  customers,
  importedEvents,
  segments,
  importHistory,
  exportHistory
}) {
  const importedProfiles = getImportedProfiles(customers);
  const recommendations = buildRecommendations(importedProfiles);
  const tenantActivity = mapChartData(groupBy(
    importedEvents,
    (event) => event.tenantName || 'Арендатор не указан'
  )).sort((left, right) => right.count - left.count);
  const eventTypeDistribution = mapChartData(groupBy(
    importedEvents,
    (event) => EVENT_TYPE_LABELS[event.eventType] || 'Не указан'
  )).sort((left, right) => right.count - left.count);
  const dailyActivity = mapChartData(groupBy(
    importedEvents.filter((event) => getDateTimestamp(event.eventDate)),
    (event) => getDateTimestamp(event.eventDate)
  ))
    .map((item) => ({ ...item, timestamp: Number(item.label), label: formatDateLabel(Number(item.label)) }))
    .sort((left, right) => left.timestamp - right.timestamp)
    .slice(-7);
  const tenantCount = new Set(
    importedEvents.map((event) => event.tenantId || event.tenantName).filter(Boolean)
  ).size;

  return {
    kpis: {
      guestsCount: importedProfiles.length,
      eventsCount: importedEvents.length,
      tenantsCount: tenantCount,
      segmentsCount: segments.length,
      recommendationsCount: recommendations.length,
      exportsCount: exportHistory.length
    },
    charts: { dailyActivity, tenantActivity, eventTypeDistribution },
    recentOperations: buildRecentOperations(importHistory, exportHistory)
  };
}
