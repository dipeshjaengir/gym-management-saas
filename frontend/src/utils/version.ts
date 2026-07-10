export const APP_VERSION = {
  version: 'v1.0.0',
  build: 100,
  releaseDate: 'July 10, 2026',
  status: 'Stable Release',
  websiteVersion: 'v1.0.0',
  apiVersion: 'v1',
  copyright: '© 2026 GymLedger'
};

export const mapPlanToEnum = (durationMonths: number): '1_month' | '3_month' | '6_month' | '12_month' | undefined => {
  if (durationMonths === 1) return '1_month';
  if (durationMonths === 3) return '3_month';
  if (durationMonths === 6) return '6_month';
  if (durationMonths === 12) return '12_month';
  return undefined;
};
