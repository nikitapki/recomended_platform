import * as XLSX from 'xlsx';

export const EXPORT_HISTORY_STORAGE_KEY = 'mall-insight-export-history';
export const EXPORTS_UPDATED_EVENT = 'mall-insight:exports-updated';

export const EXPORT_FIELDS = [
  { key: 'fullName', label: 'Имя клиента' },
  { key: 'phone', label: 'Телефон' },
  { key: 'email', label: 'Электронная почта' },
  { key: 'eventsCount', label: 'Количество событий' },
  { key: 'visitsCount', label: 'Количество посещений' },
  { key: 'totalSpent', label: 'Общая сумма покупок' },
  { key: 'tenants', label: 'Посещённые арендаторы' },
  { key: 'lastActivity', label: 'Дата последней активности' }
];

function getFieldValue(customer, fieldKey) {
  if (fieldKey === 'fullName') return customer.fullName || '';
  if (fieldKey === 'phone') return customer.phone || '';
  if (fieldKey === 'email') return customer.email || '';
  if (fieldKey === 'eventsCount') return customer.eventsCount ?? 0;
  if (fieldKey === 'visitsCount') {
    return customer.events.filter((event) => event.type === 'Посещение').length;
  }
  if (fieldKey === 'totalSpent') return customer.totalSpent ?? 0;
  if (fieldKey === 'tenants') return customer.tenants.join(', ');
  if (fieldKey === 'lastActivity') return customer.lastActivity || '';

  return '';
}

export function prepareExportTable(customers, selectedFieldKeys) {
  const fields = EXPORT_FIELDS.filter((field) =>
    selectedFieldKeys.includes(field.key)
  );

  return {
    fields,
    rows: customers.map((customer) => Object.fromEntries(
      fields.map((field) => [field.key, getFieldValue(customer, field.key)])
    ))
  };
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? '');

  if (/[;"\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function buildCsvContent(fields, rows) {
  const header = fields.map((field) => escapeCsvValue(field.label));
  const values = rows.map((row) => fields.map((field) =>
    escapeCsvValue(row[field.key])
  ));

  return `\uFEFF${[header, ...values].map((row) => row.join(';')).join('\r\n')}`;
}

export function createXlsxWorkbook(fields, rows) {
  const table = [
    fields.map((field) => field.label),
    ...rows.map((row) => fields.map((field) => row[field.key]))
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(table);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Клиенты');

  return workbook;
}

export function downloadCsv(fileName, fields, rows) {
  const blob = new Blob([buildCsvContent(fields, rows)], {
    type: 'text/csv;charset=utf-8'
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadXlsx(fileName, fields, rows) {
  XLSX.writeFile(createXlsxWorkbook(fields, rows), fileName, {
    bookType: 'xlsx',
    compression: true
  });
}

export function getExportHistory() {
  try {
    const saved = localStorage.getItem(EXPORT_HISTORY_STORAGE_KEY);
    const history = saved ? JSON.parse(saved) : [];

    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('Ошибка чтения истории экспорта:', error);
    return [];
  }
}

export function saveExportHistoryItem(item) {
  const history = getExportHistory();
  const updatedHistory = [{
    id: crypto.randomUUID(),
    exportedAt: new Date().toISOString(),
    ...item
  }, ...history];

  localStorage.setItem(
    EXPORT_HISTORY_STORAGE_KEY,
    JSON.stringify(updatedHistory)
  );
  window.dispatchEvent(new CustomEvent(EXPORTS_UPDATED_EVENT));

  return updatedHistory;
}
