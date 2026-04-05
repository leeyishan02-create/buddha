declare module "opencc-js" {
  export interface ConverterOptions {
    from: string;
    to: string;
  }

  export function Converter(options: ConverterOptions): (text: string) => string;
  export function CustomConverter(dict: [string, string][]): (text: string) => string;
  export function ConverterFactory(...args: unknown[]): (text: string) => string;
}
