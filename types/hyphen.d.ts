declare module "hyphen/it" {
  type HyphenateOptions = {
    hyphenChar?: string;
    minWordLength?: number;
    exceptions?: string[];
  };

  export function hyphenateSync(text: string, options?: HyphenateOptions): string;
}
