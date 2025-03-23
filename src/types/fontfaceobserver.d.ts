declare module 'https://cdn.jsdelivr.net/npm/fontfaceobserver@2.3.0/+esm' {
    export default class FontFaceObserver {
      constructor(family: string, descriptors?: {
        weight?: string | number;
        style?: string;
        stretch?: string;
      });
      load(text?: string, timeout?: number): Promise<void>;
    }
  }