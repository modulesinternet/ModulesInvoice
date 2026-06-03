import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apex.erp',
  appName: 'Apex ERP',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
