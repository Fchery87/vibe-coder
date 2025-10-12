declare module 'unidiff' {
  export function diffLines(oldStr: string, newStr: string): string;
  export function formatLines(diff: any, options?: any): string;
}
