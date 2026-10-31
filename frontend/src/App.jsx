
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';

import Dashboard from './pages/Dashboard';
import PlaceholderPage from './pages/PlaceholderPage';

import './App.css';
import Imports from './pages/Imports';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />

        <Route
          path="/imports"
          element={<Imports />}
        />

        <Route
          path="/customers"
          element={
            <PlaceholderPage
              title="Гости"
              description="Единые профили и история посещений гостей."
            />
          }
        />

        <Route
          path="/segments"
          element={
            <PlaceholderPage
              title="Сегменты"
              description="Создание и управление сегментами гостей."
            />
          }
        />

        <Route
          path="/recommendations"
          element={
            <PlaceholderPage
              title="Рекомендации"
              description="Персональные рекомендации для гостей торгового центра."
            />
          }
        />

        <Route
          path="/exports"
          element={
            <PlaceholderPage
              title="Экспорт"
              description="Подготовка аудиторий для маркетинговых рассылок."
            />
          }
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Route>
    </Routes>
  );
}

export default App;
