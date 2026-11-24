import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { setStorageNamespace } from './lib/api/authToken';
import { PlatformApp } from './features/platform/PlatformApp';

// Before anything reads the session: the console never shares one with the hotel app.
setStorageNamespace('pms-platform');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlatformApp />
  </StrictMode>,
);
