import { lazy, Suspense, useEffect, useMemo, useState, Component } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  ChartNoAxesCombined,
  Target,
  ShieldCheck,
  HeartHandshake,
  Calculator,
  FileChartColumn,
  Settings2,
  Bell,
  Plus,
  TrendingUp,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  MoreHorizontal,
  Upload,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { Login } from '../features/auth/Login';
import { WorkspaceProvider, useWorkspace } from './WorkspaceContext';
import { useFinance } from '../store/useFinance';
import { overview, alerts } from '../features/financial-health/engine';
import { periodRange, shiftMonth, today } from '../utils/dates';
import { safeError } from '../services/errors';
const Dashboard = lazy(() => import('../features/dashboard/Dashboard'));
const Transactions = lazy(() => import('../features/transactions/Transactions'));
const Accounts = lazy(() => import('../features/accounts/Accounts'));
const Cards = lazy(() => import('../features/credit-cards/Cards'));
const Plans = lazy(() => import('../features/goals/Plans'));
const Budgets = lazy(() => import('../features/budgets/Budgets'));
const Health = lazy(() => import('../features/financial-health/Health'));
const Simulators = lazy(() => import('../features/simulators/Simulators'));
const Alerts = lazy(() => import('../features/insights/Alerts'));
const Settings = lazy(() => import('../features/settings/Settings'));
const Reports = lazy(() => import('../features/reports/Reports'));
const Imports = lazy(() => import('../features/imports/Imports'));
const Couple = lazy(() => import('../features/couple/Couple'));
const nav = [
  ['/', 'Visão geral', LayoutDashboard],
  ['/lancamentos', 'Lançamentos', ArrowLeftRight],
  ['/contas', 'Contas', Wallet],
  ['/cartoes', 'Cartões', CreditCard],
  ['/orcamento', 'Orçamento', ChartNoAxesCombined],
  ['/reserva', 'Reserva de emergência', ShieldCheck],
  ['/investimentos', 'Investimentos', TrendingUp],
  ['/objetivos', 'Objetivos', Target],
  ['/casal', 'Espaço do casal', HeartHandshake],
  ['/saude', 'Saúde financeira', ShieldCheck],
  ['/simuladores', 'Simuladores', Calculator],
  ['/relatorios', 'Relatórios e backup', FileChartColumn],
  ['/importar', 'Importar extrato', Upload],
];
export class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <main className="fatal">
          <h1>Vamos tentar novamente.</h1>
          <p>Não foi possível abrir esta tela. Recarregue o aplicativo para recuperar a sessão.</p>
          <button className="primary" onClick={() => location.reload()}>
            Recarregar
          </button>
        </main>
      );
    return this.props.children;
  }
}
function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      <p>Organizando seu espaço…</p>
    </div>
  );
}
function Shell() {
  const { data, demo, loading, error, refresh } = useFinance(),
    { logout } = useAuth(),
    { openForm, perform } = useWorkspace();
  const [month, setMonth] = useState(today().slice(0, 7)),
    [mode, setMode] = useState('month'),
    [custom, setCustom] = useState({ start: today().slice(0, 7) + '-01', end: today() }),
    [menu, setMenu] = useState(false),
    [offline, setOffline] = useState(!navigator.onLine),
    [installEvent, setInstallEvent] = useState(null);
  const location = useLocation(),
    navigate = useNavigate();
  const config = data.settings.find((s) => s.id === 'preferences') || {};
  const range = useMemo(
    () => periodRange(month, mode, config.salaryDay || 25, custom),
    [month, mode, config.salaryDay, custom],
  );
  const summary = useMemo(() => overview(data, range, today()), [data, range]);
  const count = alerts(data, summary, today()).filter(
    (a) => !data.alertStates.some((s) => s.id === a.id && (s.read || s.snoozeUntil >= today())),
  ).length;
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine),
      install = (e) => {
        e.preventDefault();
        setInstallEvent(e);
      };
    addEventListener('online', update);
    addEventListener('offline', update);
    addEventListener('beforeinstallprompt', install);
    return () => {
      removeEventListener('online', update);
      removeEventListener('offline', update);
      removeEventListener('beforeinstallprompt', install);
    };
  }, []);
  useEffect(() => {
    const theme = config.theme || 'system';
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [config.theme]);
  const common = { summary, range, month };
  return (
    <div className="app-shell">
      {menu && <div className="menu-backdrop" onClick={() => setMenu(false)} />}
      <aside className={'sidebar ' + (menu ? 'open' : '')}>
        <NavLink to="/" className="brand">
          <span className="brand-icon">
            <TrendingUp size={22} />
          </span>
          finance<span className="brand-light">hub</span>
          <span className="brand-dot" />
        </NavLink>
        <span className="nav-label">SEU DIA A DIA</span>
        <nav>
          {nav.map(([to, label, Icon], i) => (
            <div key={to}>
              {i === 5 && <span className="nav-label">SEU FUTURO</span>}
              {i === 9 && <span className="nav-label">MAIS CLAREZA</span>}
              <NavLink to={to} end={to === '/'}>
                <Icon size={18} />
                {label}
                {to === '/casal' && <span className="tiny-label">JUNTOS</span>}
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span>
              <ShieldCheck size={17} />
              Passo a passo, você vai longe.
            </span>
            <p>
              Pequenas escolhas hoje.
              <br />
              Mais liberdade amanhã.
            </p>
          </div>
          <NavLink to="/configuracoes">
            <Settings2 size={18} />
            Configurações
          </NavLink>
          <button onClick={() => perform(logout)}>
            <LogOut size={18} />
            {demo ? 'Sair da demonstração' : 'Sair da conta'}
          </button>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={21} />
            </button>
            <span>Meu espaço</span>
            <span>/</span>
            <strong>{nav.find((n) => n[0] === location.pathname)?.[1] || 'Configurações'}</strong>
          </div>
          <div className="topbar-right">
            <span className="private-label">
              <ShieldCheck size={14} />
              Espaço privado
            </span>
            <button
              className="icon-button notification-button"
              aria-label={`Alertas: ${count} pendentes`}
              onClick={() => navigate('/alertas')}
            >
              <Bell size={19} />
              {count > 0 && <i />}
            </button>
            <button
              className="avatar"
              aria-label="Abrir configurações"
              onClick={() => navigate('/configuracoes')}
            >
              {(config.name || 'Eu').slice(0, 2).toUpperCase()}
            </button>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              <span className="small-dot" />
              Demonstração · dados fictícios · alterações somente em memória
            </span>
            <button onClick={() => perform(logout)}>
              Sair <ArrowUpRight size={14} />
            </button>
          </div>
        )}
        {offline && (
          <div className="status-banner" role="status">
            <WifiOff size={17} />
            Você está sem conexão. Os dados desta sessão podem estar desatualizados. Gravações estão
            indisponíveis.
          </div>
        )}
        <main className="main-content">
          <div className="period-bar">
            <span>
              <span className="small-dot" /> SUA VISÃO FINANCEIRA
            </span>
            <div className="period-controls">
              <select
                aria-label="Tipo de período"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="month">Mês calendário</option>
                <option value="cycle">Ciclo do salário</option>
                <option value="year">Ano completo</option>
                <option value="custom">Personalizado</option>
              </select>
              {mode === 'custom' ? (
                <>
                  <input
                    aria-label="Início do período"
                    type="date"
                    value={custom.start}
                    onChange={(e) => setCustom({ ...custom, start: e.target.value })}
                  />
                  <input
                    aria-label="Fim do período"
                    type="date"
                    value={custom.end}
                    min={custom.start}
                    onChange={(e) => setCustom({ ...custom, end: e.target.value })}
                  />
                </>
              ) : (
                <div className="month-picker">
                  <button aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}>
                    <ChevronLeft size={16} />
                  </button>
                  <input
                    aria-label="Mês de referência"
                    type="month"
                    value={month}
                    onChange={(e) => e.target.value && setMonth(e.target.value)}
                  />
                  <button aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
          {loading ? (
            <Loading />
          ) : error ? (
            <div className="notice error" role="alert">
              {safeError(error)}
              <button className="secondary" onClick={() => perform(refresh)}>
                Tentar novamente
              </button>
            </div>
          ) : (
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Dashboard {...common} />} />
                <Route path="/lancamentos" element={<Transactions {...common} />} />
                <Route path="/contas" element={<Accounts {...common} />} />
                <Route path="/cartoes" element={<Cards {...common} />} />
                <Route path="/orcamento" element={<Budgets {...common} />} />
                <Route path="/reserva" element={<Plans {...common} reserve />} />
                <Route path="/investimentos" element={<Accounts {...common} investments />} />
                <Route path="/objetivos" element={<Plans {...common} />} />
                <Route path="/saude" element={<Health {...common} />} />
                <Route path="/simuladores" element={<Simulators />} />
                <Route path="/alertas" element={<Alerts {...common} />} />
                <Route path="/relatorios" element={<Reports {...common} />} />
                <Route path="/importar" element={<Imports />} />
                <Route path="/casal" element={<Couple {...common} />} />
                <Route path="/configuracoes" element={<Settings {...common} />} />
                <Route path="*" element={<Dashboard {...common} />} />
              </Routes>
            </Suspense>
          )}
          <footer className="app-footer">
            <span>
              financehub <span>·</span> Sua vida, em equilíbrio.
            </span>
            <div>
              {installEvent ? (
                <button
                  className="text-button"
                  onClick={async () => {
                    await installEvent.prompt();
                    setInstallEvent(null);
                  }}
                >
                  Instalar aplicativo
                </button>
              ) : (
                <span>Para instalar no iPhone: Compartilhar → Tela de Início</span>
              )}
            </div>
          </footer>
        </main>
      </div>
      <nav className="mobile-bottom">
        <NavLink to="/" end>
          <LayoutDashboard size={20} />
          <span>Início</span>
        </NavLink>
        <NavLink to="/lancamentos">
          <ArrowLeftRight size={20} />
          <span>Lançamentos</span>
        </NavLink>
        <button
          className="mobile-add"
          aria-label="Adicionar movimentação"
          onClick={() => openForm('transactions')}
        >
          <Plus size={25} />
        </button>
        <NavLink to="/objetivos">
          <Target size={20} />
          <span>Planos</span>
        </NavLink>
        <button onClick={() => setMenu(!menu)}>
          <MoreHorizontal size={22} />
          <span>Mais</span>
        </button>
      </nav>
    </div>
  );
}
function PwaStatus() {
  const {
    needRefresh: [needsUpdate],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needsUpdate) return null;
  return (
    <div className="status-banner" role="status">
      Uma nova versão está pronta. Salve suas alterações antes de atualizar.
      <button className="secondary" onClick={() => updateServiceWorker(true)}>
        Atualizar aplicativo
      </button>
    </div>
  );
}
function Gate() {
  const { user, checking } = useAuth();
  const demo = useFinance((s) => s.demo);
  if (checking) return <Loading />;
  if (!user && !demo) return <Login />;
  return (
    <WorkspaceProvider>
      <Shell />
    </WorkspaceProvider>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <PwaStatus />
      <HashRouter>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
