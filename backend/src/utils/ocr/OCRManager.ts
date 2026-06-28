import { OCRProvider } from './OCRProvider';
import { MockOCRProvider } from './MockOCRProvider';

class OCRManager {
  private activeProvider: OCRProvider;

  constructor() {
    // Pluggable architecture: defaults to MockOCRProvider, but pluggable for other providers
    this.activeProvider = new MockOCRProvider();
  }

  setProvider(provider: OCRProvider) {
    this.activeProvider = provider;
  }

  getProvider(): OCRProvider {
    return this.activeProvider;
  }
}

export const ocrManager = new OCRManager();
