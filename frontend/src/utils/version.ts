export const APP_VERSION = "1.2.1";
export const BUILD_NUMBER = 102;
export const RELEASE_CHANNEL = "Production";
export const RELEASE_DATE = "2026-08-01";
export const COPYRIGHT = "© 2026 GymLedger";

export const mapPlanToEnum = (durationMonths: number): '1_month' | '3_month' | '6_month' | '12_month' | undefined => {
  if (durationMonths === 1) return '1_month';
  if (durationMonths === 3) return '3_month';
  if (durationMonths === 6) return '6_month';
  if (durationMonths === 12) return '12_month';
  return undefined;
};
