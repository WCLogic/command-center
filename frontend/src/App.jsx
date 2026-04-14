import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Shell from './components/Shell.jsx';
import Leads from './pages/Leads.jsx';
import FamilyBiz from './pages/FamilyBiz.jsx';
import Tasks from './pages/Tasks.jsx';
import AgentRoster from './pages/AgentRoster.jsx';
import Finances from './pages/Finances.jsx';
import { DataProvider } from './lib/data.jsx';

// Handle GH Pages SPA 404 redirect (querystring with ?/...)
function useGithubPagesRedirect() {
  const loc = useLocation();
  const nav = useNavigate();
  React.useEffect(() => {
    if (loc.search && loc.search.startsWith('?/')) {
      const decoded = loc.search.slice(2).split('&')[0].replace(/~and~/g, '&');
      nav('/' + decoded, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function AppRoutes() {
  useGithubPagesRedirect();
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/leads" replace />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/family" element={<FamilyBiz />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/agents" element={<AgentRoster />} />
        <Route path="/finances" element={<Finances />} />
        <Route path="*" element={<Navigate to="/leads" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppRoutes />
    </DataProvider>
  );
}
