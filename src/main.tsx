import './lib/validation-config';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { App } from './app/App';
import { queryClient } from './lib/query-client';
import { AppToaster } from './components/ui/AppToaster';
import './styles/global.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('No se encontró el contenedor principal de ARMA');
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>

      <AppToaster />
    </QueryClientProvider>
  </StrictMode>,
);