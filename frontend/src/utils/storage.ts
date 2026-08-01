import { Preferences } from '@capacitor/preferences';

// Helper to determine if running inside a Capacitor native app context
const isCapacitor = (): boolean => {
  return typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
};

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isCapacitor()) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (isCapacitor()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (isCapacitor()) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  clear: async (): Promise<void> => {
    if (isCapacitor()) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  }
};
