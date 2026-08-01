import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adsrahu.crm',
  appName: 'ZOVAIX',
  webDir: 'public',
  server: {
    url: 'https://wpcrm-wine.vercel.app',
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
