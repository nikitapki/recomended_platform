
import { useRef, useState } from 'react';
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
  const [sourceType, setSourceType] = useState('crm');

  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [preview, setPreview] = useState([]);
  const [totalRows, setTotalRows] = useState(0);

  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);

  // Обработка выбранного файла
  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    setError('');
    setWarning('');
    setPreview([]);
    setColumns([]);
    setTotalRows(0);
    setFile(null);

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
      setTotalRows(rows.length);
      setPreview(rows.slice(0, 5));

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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

          <div className="import-fields">

            <div className="import-field">
              <label htmlFor="tenant">
                Арендатор
              </label>

              <select
                id="tenant"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
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
              <label htmlFor="sourceType">
                Тип источника
              </label>

              <select
                id="sourceType"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
              >
                <option value="crm">
                  CRM / Программа лояльности
                </option>

                <option value="pos">
                  POS / Кассовая система
                </option>

                <option value="other">
                  Другая система
                </option>
              </select>
            </div>

          </div>

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

    </div>
  );
}

export default Imports;
