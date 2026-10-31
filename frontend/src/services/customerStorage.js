
const STORAGE_KEY = 'mall-insight-imported-events';

// Нормализация телефона
function normalizePhone(value) {
  return String(value ?? '').replace(/\D/g, '');
}

// Нормализация email
function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

// Получение импортированных событий
export function getImportedEvents() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const events = JSON.parse(saved);

    return Array.isArray(events) ? events : [];
  } catch (error) {
    console.error('Ошибка чтения событий:', error);
    return [];
  }
}

// Сохранение событий после подтверждения импорта
export function saveImportedEvents({
  rows,
  mapping,
  validationRows,
  tenant,
  importId
}) {
  if (!tenant) {
    throw new Error('Не выбран арендатор.');
  }

  if (!Array.isArray(rows) || !Array.isArray(validationRows)) {
    throw new Error('Некорректные данные для импорта.');
  }

  const previousEvents = getImportedEvents();

  const newEvents = rows.flatMap((row, index) => {
    const validation = validationRows[index];

    // Не сохраняем некорректные записи
    if (!validation || validation.status === 'error') {
      return [];
    }

    const getValue = (field) => {
      const column = mapping[field];

      if (!column) return '';

      return String(row[column] ?? '').trim();
    };

    const fullName = getValue('full_name');
    const phone = getValue('phone');
    const email = getValue('email');

    const phoneNormalized = normalizePhone(phone);
    const emailNormalized = normalizeEmail(email);

    if (!phoneNormalized && !emailNormalized) {
      return [];
    }

    const amountValue = getValue('amount')
      .replace(/\s/g, '')
      .replace(',', '.');

    const amount = amountValue === ''
      ? 0
      : Number(amountValue);

    return [{
      id: `${importId}-${index}`,

      fullName,
      phone,
      email,

      phoneNormalized,
      emailNormalized,

      tenantId: tenant.id,
      tenantName: tenant.name,

      eventType: getValue('event_type')
        .trim()
        .toLowerCase(),

      eventDate: getValue('event_date') || null,

      amount: Number.isFinite(amount) ? amount : 0,

      importedAt: new Date().toISOString()
    }];
  });

  const existingIds = new Set(
    previousEvents.map((event) => event.id)
  );

  const updatedEvents = [
    ...previousEvents,
    ...newEvents.filter(
      (event) => !existingIds.has(event.id)
    )
  ];

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedEvents)
  );

  return newEvents.length;
}
