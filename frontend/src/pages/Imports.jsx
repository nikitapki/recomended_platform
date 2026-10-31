
import { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw
} from 'lucide-react';

import './Imports.css';

const TENANTS = [
  { id: 1, name: 'Coffee House' },
  { id: 2, name: 'Fashion Store' },
  { id: 3, name: 'Food Corner' },
  { id: 4, name: 'Sport Shop' },
  { id: 5, name: 'Beauty Studio' }
];

// Поля единой структуры платформы
const TARGET_FIELDS = [
  {
    key: 'full_name',
    label: 'ФИО гостя',
    hint: 'Имя и фамилия'
  },
  {
    key: 'phone',
    label: 'Телефон',
    hint: 'Контактный номер гостя'
  },
  {
    key: 'email',
    label: 'Email',
    hint: 'Электронная почта гостя'
  },
  {
    key: 'event_type',
    label: 'Тип события',
    hint: 'Покупка, посещение или бронирование'
  },
  {
    key: 'event_date',
    label: 'Дата события',
    hint: 'Дата посещения или покупки'
  },
  {
    key: 'amount',
    label: 'Сумма',
    hint: 'Стоимость покупки или бронирования'
  }
];

// Возможные названия столбцов в файлах арендаторов
const HEADER_ALIASES = {
  full_name: [
    'full_name', 'fullname', 'name',
    'fio', 'фио', 'имя', 'фамилияиимя'
  ],
  phone: [
    'phone', 'mobile', 'phonenumber',
    'телефон', 'номер телефона'
  ],
  email: [
    'email', 'mail', 'почта',
    'электронная почта'
  ],
  event_type: [
    'event_type', 'eventtype', 'type',
    'тип события', 'событие'
  ],
  event_date: [
    'event_date', 'date', 'occurred_at',
    'datetime', 'дата', 'дата события'
  ],
  amount: [
    'amount', 'sum', 'price',
    'сумма', 'стоимость'
  ]
};

// Приводим название столбца к единому виду
function normalizeHeader(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]/gi, '');
}

// Автоматическое сопоставление
function buildDefaultMapping(headers) {
  return Object.fromEntries(
    TARGET_FIELDS.map((field) => {
      const aliases = HEADER_ALIASES[field.key].map(
        normalizeHeader
      );

      const matchedColumn = headers.find((header) =>
        aliases.includes(normalizeHeader(header))
      );

      return [field.key, matchedColumn || ''];
    })
  );
}

// Допустимые значения типа события
const EVENT_TYPE_ALIASES = {
  visit: ['visit', 'visits', 'посещение', 'визит'],
  purchase: ['purchase', 'покупка', 'покупки'],
  booking: ['booking', 'reservation', 'бронирование', 'бронь']
};

// Получение значения из строки по сопоставленному столбцу
function getMappedValue(row, mapping, field) {
  const column = mapping[field];

  if (!column) return '';

  return String(row[column] ?? '').trim();
}

// Проверка телефона
function isValidPhone(value) {
  const digits = String(value).replace(/\D/g, '');

  return digits.length >= 10 && digits.length <= 15;
}

// Проверка email
function isValidEmail(value) {
  const email = String(value).trim();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Приведение типа события к единому значению
function normalizeEventType(value) {
  const normalized = normalizeHeader(value);

  for (const [canonicalType, aliases] of Object.entries(EVENT_TYPE_ALIASES)) {
    const normalizedAliases = aliases.map(normalizeHeader);

    if (normalizedAliases.includes(normalized)) {
      return canonicalType;
    }
  }

  return null;
}

// Проверка даты
function isValidEventDate(value) {
  const date = String(value).trim();

  if (!date) return true;

  // Формат ДД.ММ.ГГГГ
  const russianDate = date.match(
    /^(\d{2})\.(\d{2})\.(\d{4})$/
  );

  if (russianDate) {
    const day = Number(russianDate[1]);
    const month = Number(russianDate[2]);
    const year = Number(russianDate[3]);

    const parsed = new Date(year, month - 1, day);

    return (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    );
  }

  return !Number.isNaN(Date.parse(date));
}

// Основная проверка загруженных данных
function validateImportRows(rows, mapping, tenantId) {
  const mappingIssues = [];

  // Проверяем наличие идентификатора гостя
  if (!mapping.phone && !mapping.email) {
    mappingIssues.push(
      'Необходимо сопоставить телефон или email.'
    );
  }

  // Тип события необходим для формирования истории гостя
  if (!mapping.event_type) {
    mappingIssues.push(
      'Необходимо сопоставить тип события.'
    );
  }

  if (!tenantId) {
    mappingIssues.push(
      'Необходимо выбрать арендатора.'
    );
  }

  // Проверяем, что один столбец не назначен нескольким полям
  const usedColumns = Object.entries(mapping)
    .filter(([, column]) => column)
    .reduce((acc, [field, column]) => {
      acc[column] = [...(acc[column] || []), field];
      return acc;
    }, {});

  Object.entries(usedColumns).forEach(([column, fields]) => {
    if (fields.length > 1) {
      mappingIssues.push(
        `Столбец "${column}" назначен нескольким полям.`
      );
    }
  });

  // Проверяем каждую запись
  const results = rows.map((row, index) => {
    const errors = [];
    const warnings = [];

    const fullName = getMappedValue(row, mapping, 'full_name');
    const phone = getMappedValue(row, mapping, 'phone');
    const email = getMappedValue(row, mapping, 'email');

    const eventType = getMappedValue(
      row,
      mapping,
      'event_type'
    );

    const eventDate = getMappedValue(
      row,
      mapping,
      'event_date'
    );

    const amount = getMappedValue(
      row,
      mapping,
      'amount'
    );

    const validPhone = phone && isValidPhone(phone);
    const validEmail = email && isValidEmail(email);

    // Хотя бы один корректный идентификатор
    if (!validPhone && !validEmail) {
      errors.push(
        'Не указан корректный телефон или email.'
      );
    } else {
      if (phone && !validPhone) {
        warnings.push('Некорректный телефон.');
      }

      if (email && !validEmail) {
        warnings.push('Некорректный email.');
      }
    }

    // Проверка типа события
    if (mapping.event_type) {
      if (!eventType) {
        errors.push('Не указан тип события.');
      } else if (!normalizeEventType(eventType)) {
        errors.push(
          `Неизвестный тип события: "${eventType}".`
        );
      }
    }

    // Проверка суммы
    if (amount !== '') {
      const normalizedAmount = Number(
        amount.replace(',', '.')
      );

      if (
        !Number.isFinite(normalizedAmount) ||
        normalizedAmount < 0
      ) {
        errors.push('Некорректная сумма.');
      }
    }

    // Проверка даты, если столбец сопоставлен
    if (
      mapping.event_date &&
      eventDate &&
      !isValidEventDate(eventDate)
    ) {
      errors.push('Некорректная дата события.');
    }

    // Имя необязательное, но отсутствие полезно отметить
    if (mapping.full_name && !fullName) {
      warnings.push('Не указано имя гостя.');
    }

    const status = errors.length > 0
      ? 'error'
      : warnings.length > 0
        ? 'warning'
        : 'valid';

    return {
      rowNumber: index + 2,
      fullName,
      phone,
      email,
      eventType,
      status,
      errors,
      warnings
    };
  });

  return {
    mappingIssues,
    rows: results,

    totalCount: results.length,

    validCount: results.filter(
  (row) => row.status === 'valid'
  ).length,

  importableCount: results.filter(
    (row) => row.status !== 'error'
  ).length,

    warningCount: results.filter(
      (row) => row.status === 'warning'
    ).length,

    errorCount: results.filter(
      (row) => row.status === 'error'
    ).length
  };
}

const IMPORT_HISTORY_STORAGE_KEY = 'mall-insight-import-history';

const SOURCE_SYSTEM_LABELS = {
  crm: 'CRM',
  loyalty: 'Программа лояльности',
  pos: 'POS',
  pms: 'PMS',
  other: 'Другая система'
};
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} КБ`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}

function Imports() {
  const fileInputRef = useRef(null);

  const [tenantId, setTenantId] = useState('');

  // Система, из которой поступают данные
  const [sourceSystem, setSourceSystem] = useState('crm');

  // Способ передачи данных
  const [transferMethod, setTransferMethod] = useState('file');

  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [preview, setPreview] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [totalRows, setTotalRows] = useState(0);

  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  // Результат подтверждения импорта
const [importResult, setImportResult] = useState(null); 
  const [importHistory, setImportHistory] = useState(() => {
  try {
    const saved = localStorage.getItem(
      IMPORT_HISTORY_STORAGE_KEY
    );

    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
});
  // Обработка выбранного файла
  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    setError('');
    setWarning('');
    setPreview([]);
    setColumns([]);
    setParsedRows([]);
    setFieldMapping({});
    setTotalRows(0);
    setFile(null);
    setImportResult(null);


    const extension = selectedFile.name
      .split('.')
      .pop()
      .toLowerCase();

    if (!['csv', 'xlsx', 'xls'].includes(extension)) {
      setError('Поддерживаются только CSV и Excel-файлы.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('Размер файла не должен превышать 10 МБ.');
      return;
    }

    if (selectedFile.size === 0) {
      setError('Выбран пустой файл.');
      return;
    }

    setFile(selectedFile);
    setIsReading(true);

    try {
      let rows = [];
      let headers = [];
      let parseErrors = 0;

      // Читаем CSV
      if (extension === 'csv') {
        const result = await new Promise((resolve, reject) => {
          Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: 'greedy',

            complete: resolve,
            error: reject
          });
        });

        rows = result.data || [];
        headers = result.meta?.fields || [];
        parseErrors = result.errors?.length || 0;
      }

      // Читаем Excel
      if (extension === 'xlsx' || extension === 'xls') {
        const buffer = await selectedFile.arrayBuffer();

        const workbook = XLSX.read(buffer, {
          type: 'array'
        });

        const firstSheet = workbook.SheetNames[0];

        if (!firstSheet) {
          throw new Error('В Excel-файле отсутствуют листы.');
        }

        const worksheet = workbook.Sheets[firstSheet];

        rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false
        });

        headers = Object.keys(rows[0] || {});
      }

      // Убираем полностью пустые строки
      rows = rows.filter((row) =>
        Object.values(row).some(
          (value) => String(value ?? '').trim() !== ''
        )
      );

      if (headers.length === 0) {
        throw new Error(
          'Не удалось определить заголовки столбцов.'
        );
      }

      if (rows.length === 0) {
        throw new Error(
          'Файл содержит заголовки, но не содержит записей.'
        );
      }

      setColumns(headers);
      setParsedRows(rows);
      setTotalRows(rows.length);
      setPreview(rows.slice(0, 5));

      setFieldMapping(buildDefaultMapping(headers));

      if (parseErrors > 0) {
        setWarning(
          `При чтении обнаружено ошибок: ${parseErrors}. Проверьте исходный файл.`
        );
      }

    } catch (err) {
      setFile(null);
      setError(
        err.message || 'Не удалось прочитать файл.'
      );
    } finally {
      setIsReading(false);
    }
  };

  // Очистка формы
  const clearFile = () => {
    setFile(null);
    setColumns([]);
    setPreview([]);
    setTotalRows(0);
    setError('');
    setWarning('');
    setImportResult(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFieldMapping({});
    setParsedRows([]);
  };

  // Обработка перетаскивания
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files[0];

    handleFile(droppedFile);
  };

  const selectedTenant = TENANTS.find(
    (tenant) => tenant.id === Number(tenantId)
  );
  const hasContactField = Boolean(
  fieldMapping.phone || fieldMapping.email
  );

  const mappedFieldsCount = Object.values(fieldMapping)
    .filter(Boolean).length;
  // Результаты проверки всех записей
const validationReport = useMemo(() => {
  return validateImportRows(
    parsedRows,
    fieldMapping,
    tenantId
  );
}, [parsedRows, fieldMapping, tenantId]);

// Показываем только записи с проблемами
const displayedValidationRows = validationReport.rows
  .filter(
    (row) =>
      row.status === 'error' ||
      row.status === 'warning'
  )
  .slice(0, 10);
  // Проверяем возможность подтверждения импорта
const canConfirmImport =
  transferMethod === 'file' &&
  Boolean(file) &&
  Boolean(tenantId) &&
  parsedRows.length > 0 &&
  validationReport.mappingIssues.length === 0 &&
  validationReport.importableCount > 0;


const handleConfirmImport = () => {
  if (!canConfirmImport) return;

  const result = {
    id: crypto.randomUUID(),

    fileName: file.name,
    tenantName: selectedTenant?.name || 'Неизвестный арендатор',

    sourceSystem,
    transferMethod,

    totalRows: validationReport.totalCount,
    cleanRows: validationReport.validCount,
    importableRows: validationReport.importableCount,
    warningRows: validationReport.warningCount,
    rejectedRows: validationReport.errorCount,

    confirmedAt: new Date().toLocaleString('ru-RU'),

    status: 'Подготовлено локально'
  };

  setImportResult(result);

  setImportHistory((previous) => {
    const updated = [result, ...previous];

    try {
      localStorage.setItem(
        IMPORT_HISTORY_STORAGE_KEY,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error('Не удалось сохранить историю:', error);
    }

    return updated;
  });
};


  return (
    <div className="imports-page">

      <div className="page-heading">
        <div>
          <h1>Загрузка данных</h1>
          <p>
            Импорт клиентских данных от арендаторов
            торгового центра.
          </p>
        </div>
      </div>

      <div className="imports-notice">
        <Database size={18} />

        <span>
          Данные пока обрабатываются локально.
          Сохранение в PostgreSQL подключим после
          реализации Backend API.
        </span>
      </div>

      <div className="imports-layout">

        {/* Основная форма */}

        <section className="content-card import-form">

          <div className="import-section-heading">
            <div>
              <h2>Новая загрузка</h2>
              <p>
                Выберите арендатора и файл с данными.
              </p>
            </div>
          </div>

          
              <div className="import-fields"></div>
              <div className="import-field">
                <label htmlFor="tenant">
                  Арендатор
                </label>

                <select
                  id="tenant"
                  value={tenantId}
                  onChange={(e) => {
                  setTenantId(e.target.value);
                  setImportResult(null);
                }}
                >
                  <option value="">
                    Выберите арендатора
                  </option>

                  {TENANTS.map((tenant) => (
                    <option
                      key={tenant.id}
                      value={tenant.id}
                    >
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>

              
  <div className="import-field">
    <label htmlFor="sourceSystem">
      Система-источник
    </label>

    <select
      id="sourceSystem"
      value={sourceSystem}
      onChange={(e) => setSourceSystem(e.target.value)}
    >
      <option value="crm">CRM-система</option>
      <option value="loyalty">Программа лояльности</option>
      <option value="pos">POS / Кассовая система</option>
      <option value="pms">PMS / Система бронирования</option>
      <option value="other">Другая система</option>
    </select>
  </div>
  


{/* СПОСОБ ПЕРЕДАЧИ ДАННЫХ */}

<div className="transfer-method-section">

  <label className="transfer-method-label">
    Способ передачи данных
  </label>

  <div className="transfer-method-options">

    <button
      type="button"
      className={`transfer-method-option ${
        transferMethod === 'file' ? 'active' : ''
      }`}
      onClick={() => {
        clearFile();
        setTransferMethod('file');
      }}
    >
      <div className="transfer-method-icon">
        <FileSpreadsheet size={23} />
      </div>

      <div>
        <strong>Загрузка файла</strong>
        <span>CSV, Excel</span>
      </div>

      <span className="method-badge">MVP</span>
    </button>

    <button
      type="button"
      className={`transfer-method-option ${
        transferMethod === 'api' ? 'active' : ''
      }`}
      onClick={() => {
        clearFile();
        setTransferMethod('api');
      }}
    >
      <div className="transfer-method-icon">
        <Database size={23} />
      </div>

      <div>
        <strong>Интеграция API</strong>
        <span>Автоматическая передача</span>
      </div>

      <span className="method-badge planned">
        API
      </span>
    </button>

  </div>
</div>


      {transferMethod === 'file' ? (
  <>    
          {/* Область загрузки */}

          <div
            className={`upload-dropzone ${
              isDragging ? 'dragging' : ''
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              hidden
              onChange={(event) => {
                handleFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />

            <div className="upload-icon">
              <UploadCloud size={30} />
            </div>

            <h3>
              Перетащите файл сюда
            </h3>

            <p>
              или нажмите для выбора файла
            </p>

            <div className="upload-formats">
              CSV · XLSX · XLS
            </div>

            <span className="upload-limit">
              Максимальный размер — 10 МБ
            </span>

          </div>

          {/* Ошибка */}

          {error && (
            <div className="import-message error-message">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Предупреждение */}

          {warning && (
            <div className="import-message warning-message">
              <AlertCircle size={18} />
              {warning}
            </div>
          )}

          {/* Состояние чтения */}

          {isReading && (
            <div className="import-reading">
              <RefreshCw size={18} className="spin-icon" />
              Чтение файла...
            </div>
          )}

          {/* Выбранный файл */}

          {file && !isReading && (
            <div className="selected-file">

              <div className="selected-file-icon">
                <FileSpreadsheet size={23} />
              </div>

              <div className="selected-file-info">
                <strong>{file.name}</strong>

                <span>
                  {formatFileSize(file.size)}
                  {' · '}
                  {totalRows.toLocaleString('ru-RU')} записей
                </span>
              </div>

              <div className="file-success">
                <CheckCircle2 size={20} />
                <span>Прочитан</span>
              </div>

              <button
                className="remove-file"
                onClick={clearFile}
                title="Удалить файл"
              >
                <X size={18} />
              </button>

            </div>
          )}
            </>
) : (
  <div className="api-connection-panel">

    <div className="api-panel-heading">
      <div className="api-panel-icon">
        <Database size={23} />
      </div>

      <div>
        <h3>Приём данных через API</h3>
        <p>
          Автоматическая передача событий из системы арендатора.
        </p>
      </div>
    </div>

    <div className="api-info-message">
      <AlertCircle size={18} />
      <span>
        Параметры подключения будут выдаваться
        Backend после настройки интеграции.
        Сейчас доступен просмотр контракта API.
      </span>
    </div>

    <div className="api-detail">
      <label>Адрес приёма данных</label>

      <div className="api-endpoint">
        <span className="http-method">POST</span>
        <code>/api/integrations/events</code>
      </div>
    </div>

    <div className="api-detail">
      <label>Авторизация</label>
      <div className="api-endpoint">
        <code>Authorization: Bearer API_KEY</code>
      </div>
    </div>

    <div className="api-detail">
      <label>Формат данных (JSON)</label>

      <pre className="api-code">{`{
  "externalEventId": "POS-100245",
  "customer": {
    "fullName": "Иван Петров",
    "phone": "+79001112233",
    "email": "ivan@mail.ru"
  },
  "event": {
    "type": "purchase",
    "occurredAt": "2026-10-31T12:30:00+03:00",
    "amount": 2500,
    "currency": "RUB"
  }
}`}</pre>
    </div>

    <div className="api-bottom-note">
      <CheckCircle2 size={17} />
      <span>
        Поддерживается передача информации о гостях,
        покупках, посещениях и бронированиях.
      </span>
    </div>

  </div>
)}
          {/* Выбранный арендатор */}

{selectedTenant && (
  <div className="selected-tenant">
    Выбран арендатор:
    <strong>{selectedTenant.name}</strong>
  </div>
)}

</section>

{/* Информация справа */}

<aside className="content-card import-info">

          <h2>Как работает загрузка?</h2>

          <div className="import-step">
            <div className="step-number">1</div>

            <div>
              <strong>Выбор арендатора</strong>
              <p>
                Укажите организацию,
                передавшую данные.
              </p>
            </div>
          </div>

          <div className="import-step">
            <div className="step-number">2</div>

            <div>
              <strong>Выбор файла</strong>
              <p>
                Загрузите CSV или Excel
                с клиентскими данными.
              </p>
            </div>
          </div>

          <div className="import-step">
            <div className="step-number">3</div>

            <div>
              <strong>Проверка данных</strong>
              <p>
                Система читает заголовки,
                записи и показывает предпросмотр.
              </p>
            </div>
          </div>

          <div className="import-info-note">
            <Database size={17} />

            <span>
              После подключения Backend данные
              будут сохраняться в едином профиле гостя.
            </span>
          </div>

        </aside>

      </div>

      {/* Предпросмотр */}

      {preview.length > 0 && (
        <section className="content-card import-preview">

          <div className="import-section-heading">

            <div>
              <h2>Предпросмотр данных</h2>
              <p>
                Первые 5 записей из выбранного файла.
              </p>
            </div>

            <span className="preview-badge">
              <CheckCircle2 size={15} />
              Предпросмотр готов
            </span>

          </div>

          <div className="preview-meta">
            <FileText size={16} />

            <span>{file?.name}</span>

            <span className="preview-divider">|</span>

            <strong>
              Всего записей: {totalRows.toLocaleString('ru-RU')}
            </strong>

            <span className="preview-divider">|</span>

            <strong>
              Столбцов: {columns.length}
            </strong>
          </div>

          <div className="table-wrapper">

            <table className="preview-table">

              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {preview.map((row, index) => (
                  <tr key={index}>
                    {columns.map((column) => (
                      <td key={column} title={String(row[column] ?? '')}>
                        {String(row[column] ?? '—') || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>

            </table>

          </div>

          <div className="preview-footer">
            <AlertCircle size={16} />
            <span>
              Это локальный предпросмотр. Файл ещё
              не отправлен на сервер и не сохранён в базе.
            </span>
          </div>

        </section>
      )}
    
{/* СОПОСТАВЛЕНИЕ ПОЛЕЙ */}

{columns.length > 0 && (
  <section className="content-card mapping-card">

    <div className="import-section-heading">

      <div>
        <h2>Сопоставление полей</h2>
        <p>
          Укажите соответствие столбцов файла
          единой структуре платформы.
        </p>
      </div>

      <span className="mapping-counter">
        {mappedFieldsCount} из {TARGET_FIELDS.length} сопоставлено
      </span>

    </div>

    <div className="mapping-header">
      <span>Поле платформы</span>
      <span>Столбец исходного файла</span>
      <span>Статус</span>
    </div>

    <div className="mapping-list">

      {TARGET_FIELDS.map((field) => {
        const selectedColumn = fieldMapping[field.key];

        return (
          <div className="mapping-row" key={field.key}>

            <div className="mapping-field-info">
              <strong>{field.label}</strong>
              <span>{field.hint}</span>
            </div>

            <select
              value={selectedColumn || ''}
              onChange={(event) => {
              setFieldMapping((previous) => ({
                ...previous,
                [field.key]: event.target.value
              }));

              setImportResult(null);
            }}
            >

              <option value="">
                Не сопоставлено
              </option>

              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}

            </select>

            <span
              className={
                selectedColumn
                  ? 'mapping-status mapped'
                  : 'mapping-status unmapped'
              }
            >
              {selectedColumn
                ? 'Сопоставлено'
                : 'Не выбрано'}
            </span>

          </div>
        );
      })}

    </div>

    {!hasContactField && (
      <div className="import-message warning-message">
        <AlertCircle size={18} />
        Необходимо сопоставить хотя бы один
        идентификатор гостя: телефон или email.
      </div>
    )}

    {hasContactField && (
      <div className="import-message success-message">
        <CheckCircle2 size={18} />
        Основное поле идентификации гостя сопоставлено.
      </div>
    )}

    <div className="mapping-footer">
      Сопоставление будет передано Backend
      вместе с исходным файлом.
    </div>

  </section>
  )}
  
{/* ПРОВЕРКА КАЧЕСТВА ДАННЫХ */}

{parsedRows.length > 0 && (
  <section className="content-card validation-card">

    <div className="import-section-heading">
      <div>
        <h2>Проверка качества данных</h2>
        <p>
          Результаты проверки всех записей загруженного файла.
        </p>
      </div>

      <span className={
        validationReport.errorCount === 0 &&
        validationReport.mappingIssues.length === 0
          ? 'validation-badge success'
          : 'validation-badge error'
      }>
        {validationReport.errorCount === 0 &&
        validationReport.mappingIssues.length === 0
          ? 'Проверка пройдена'
          : 'Найдены проблемы'}
      </span>
    </div>

    {/* Общие показатели */}

    <div className="validation-stats">

      <div className="validation-stat">
        <span>Всего записей</span>
        <strong>
          {validationReport.totalCount}
        </strong>
      </div>

      <div className="validation-stat accepted">
        <span>Принято</span>
        <strong>
          {validationReport.validCount}
        </strong>
      </div>

      <div className="validation-stat warning">
        <span>С предупреждениями</span>
        <strong>
          {validationReport.warningCount}
        </strong>
      </div>

      <div className="validation-stat rejected">
        <span>Отклонено</span>
        <strong>
          {validationReport.errorCount}
        </strong>
      </div>

    </div>

    {/* Ошибки сопоставления */}

    {validationReport.mappingIssues.length > 0 && (
      <div className="validation-alert error">
        <AlertCircle size={18} />

        <div>
          <strong>Проблемы с настройкой полей</strong>

          {validationReport.mappingIssues.map(
            (issue, index) => (
              <p key={index}>{issue}</p>
            )
          )}
        </div>
      </div>
    )}

    {/* Если есть ошибки в записях */}

    {displayedValidationRows.length > 0 && (
      <div className="validation-results">

        <h3>Записи, требующие внимания</h3>

        <div className="table-wrapper">
          <table className="validation-table">

            <thead>
              <tr>
                <th>Строка</th>
                <th>Гость</th>
                <th>Телефон</th>
                <th>Email</th>
                <th>Статус</th>
                <th>Причина</th>
              </tr>
            </thead>

            <tbody>
              {displayedValidationRows.map((row) => (
                <tr key={row.rowNumber}>
                  <td>{row.rowNumber}</td>

                  <td>
                    {row.fullName || '—'}
                  </td>

                  <td>
                    {row.phone || '—'}
                  </td>

                  <td>
                    {row.email || '—'}
                  </td>

                  <td>
                    <span className={
                      `validation-row-status ${row.status}`
                    }>
                      {row.status === 'error'
                        ? 'Ошибка'
                        : 'Предупреждение'}
                    </span>
                  </td>

                  <td>
                    {[
                      ...row.errors,
                      ...row.warnings
                    ].join(' ')}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

        {validationReport.errorCount +
          validationReport.warningCount > 10 && (
          <p className="validation-more">
            Показаны первые 10 записей с проблемами.
            Всего таких записей: {
              validationReport.errorCount +
              validationReport.warningCount
            }.
          </p>
        )}

      </div>
    )}

    {/* Успешная проверка */}

    {validationReport.errorCount === 0 &&
      validationReport.mappingIssues.length === 0 && (
        <div className="validation-alert success">
          <CheckCircle2 size={19} />

          <div>
            <strong>Критических ошибок не обнаружено</strong>
            <p>
              Все {validationReport.validCount} записей
              прошли предварительную проверку.
            </p>
          </div>
        </div>
      )}

    <div className="validation-footer">
      <AlertCircle size={16} />
      <span>
        Предварительная проверка выполняется в браузере.
        Окончательная валидация будет выполняться Backend.
      </span>
    </div>
      
{/* ПОДТВЕРЖДЕНИЕ ИМПОРТА */}

<div className="import-confirm-section">

  <div className="import-confirm-info">
    <strong>Готовы завершить проверку?</strong>

    <p>
      Корректные записи будут подготовлены к импорту.
      Записи с критическими ошибками останутся отклонёнными.
    </p>
  </div>

  <button
  type="button"
  className="confirm-import-button"
  disabled={!canConfirmImport}
  onClick={handleConfirmImport}
>
  <CheckCircle2 size={18} />
  Подтвердить импорт
</button>

</div>

{!canConfirmImport && (
  <div className="confirm-hint">
    Для подтверждения выберите арендатора, загрузите файл,
    сопоставьте обязательные поля и проверьте данные.
    Необходимо иметь хотя бы одну корректную запись.
  </div>
)}

{/* РЕЗУЛЬТАТ ПОДТВЕРЖДЕНИЯ */}

{importResult && (
  <div className="import-result">

    <div className="import-result-heading">
      <CheckCircle2 size={24} />

      <div>
        <h3>Проверка и подтверждение завершены</h3>
        <p>
          Результат подготовлен локально, без сохранения в БД.
        </p>
      </div>
    </div>

    <div className="import-result-details">
      <div>
        <span>Файл</span>
        <strong>{importResult.fileName}</strong>
      </div>

      <div>
        <span>Арендатор</span>
        <strong>{importResult.tenantName}</strong>
      </div>

      <div>
        <span>Дата подтверждения</span>
        <strong>{importResult.confirmedAt}</strong>
      </div>
    </div>

    
<div className="import-result-stats">

  <div className="result-stat">
    <span>Всего записей</span>
    <strong>{importResult.totalRows}</strong>
  </div>

  <div className="result-stat accepted">
    <span>Без замечаний</span>
    <strong>{importResult.cleanRows}</strong>
  </div>

  <div className="result-stat warning">
    <span>С предупреждениями</span>
    <strong>{importResult.warningRows}</strong>
  </div>

  <div className="result-stat rejected">
    <span>Отклонено</span>
    <strong>{importResult.rejectedRows}</strong>
  </div>

</div>

<div className="importable-summary">
  К импорту допущено: <strong>{importResult.importableRows}</strong>
  {' '}записей, включая записи с предупреждениями.
</div>


    <div className="import-result-note">
      <AlertCircle size={17} />

      <span>
        Это демонстрационный результат. Данные ещё не отправлены
        на Backend и не сохранены в PostgreSQL.
        Реальный импорт подключим после настройки API.
      </span>
    </div>

  </div>
)}

  </section>
)}
  
{/* ИСТОРИЯ ЗАГРУЗОК */}

<section className="content-card import-history">

  <div className="import-section-heading">

    <div>
      <h2>История загрузок</h2>
      <p>
        Все подтверждённые загрузки в текущем браузере.
      </p>
    </div>

    <span className="history-counter">
      {importHistory.length} загрузок
    </span>

  </div>

  {importHistory.length === 0 ? (

    <div className="history-empty">
      <FileSpreadsheet size={30} />

      <strong>История пока пуста</strong>

      <span>
        После подтверждения загрузки она появится здесь.
      </span>
    </div>

  ) : (

    <div className="table-wrapper">

      <table className="history-table">

        <thead>
          <tr>
            <th>Файл</th>
            <th>Арендатор</th>
            <th>Источник</th>
            <th>Дата</th>
            <th>Записей</th>
            <th>Отклонено</th>
            <th>Статус</th>
          </tr>
        </thead>

        <tbody>
          {importHistory.map((item) => (
            <tr key={item.id}>

              <td className="file-name">
                <FileText size={16} />
                {item.fileName}
              </td>

              <td>{item.tenantName}</td>

              <td>
                {SOURCE_SYSTEM_LABELS[item.sourceSystem] || item.sourceSystem}
              </td>

              <td>{item.confirmedAt}</td>

              <td>{item.totalRows}</td>

              <td>
                <span className={
                  item.rejectedRows > 0
                    ? 'history-error-count'
                    : 'history-success-count'
                }>
                  {item.rejectedRows}
                </span>
              </td>

              <td>
                <span className="status success">
                  Демо
                </span>
              </td>

            </tr>
          ))}
        </tbody>

      </table>

    </div>

  )}

  <div className="history-note">
    <Database size={16} />
    История хранится локально в браузере.
    После подключения Backend будет использоваться PostgreSQL.
  </div>

</section>


    </div>
  );
}

export default Imports;
