
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';

import Dashboard from './pages/Dashboard';
import Segments from './pages/Segments';
import Recommendations from './pages/Recommendations';
import Exports from './pages/Exports';

import './App.css';
import Imports from './pages/Imports';
import Customers from './pages/Customers';
import Settings from './pages/Settings';
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
  element={<Customers />}
    />

        <Route
          path="/segments"
          element={<Segments />}
        />

        <Route
          path="/recommendations"
          element={<Recommendations />}
        />

        <Route
          path="/exports"
          element={<Exports />}
        />

        <Route path="/settings" element={<Settings />} />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Route>
    </Routes>
  );
}

export default App;
