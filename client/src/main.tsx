import { StrictMode, Component } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: 24, background: '#0D1B2A', color: '#F0EDD8', fontFamily: 'sans-serif' }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Ошибка загрузки</div>
          <div style={{ fontSize: 14, color: '#8aadcc', textAlign: 'center' }}>Попробуйте обновить страницу или очистить кеш браузера</div>
          <button onClick={() => { caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(() => location.reload()); }}
            style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: '#CC2B2B', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Обновить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
