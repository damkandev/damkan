export type GraphItem = Record<string, any>;

export const numbers = (input: number[] | string | undefined): number[] =>
  Array.isArray(input) ? input.map(Number).filter(Number.isFinite) :
  String(input ?? '').trim().split(/[\s,]+/).filter(Boolean).map(Number).filter(Number.isFinite);

export const fraction = (input: number | string | undefined): number => {
  const raw = String(input ?? '0').trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, raw.endsWith('%') || value > 1 ? value / 100 : value));
};

export const words = (input: string[] | string | undefined): string[] =>
  Array.isArray(input) ? input : String(input ?? '').trim().split(/[\s|,]+/).filter(Boolean);

export const glyph = (glyphs: any, key: string, fallback: string): string => {
  if (glyphs && typeof glyphs === 'object' && !Array.isArray(glyphs)) return glyphs[key] ?? fallback;
  if (glyphs) {
    const set = resolveGlyphs(glyphs);
    return key === 'empty' ? set[0] : key === 'rest' ? set[Math.min(1, set.length - 1)] : set[set.length - 1];
  }
  return fallback;
};

const sets: Record<string, string[]> = {
  shade: ['·', '░', '▒', '▓', '█'],
  ascii: ['.', '-', '=', '#', '@'],
  hash: ['.', ':', '+', '#', '█'],
  bar: ['▁', '▂', '▃', '▅', '█'],
};
export const resolveGlyphs = (input?: string | string[], fallback = 'shade') =>
  Array.isArray(input) && input.length ? input : sets[String(input)] ?? sets[fallback];

export const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));

export const cells = (length: number) => Array.from({ length: Math.max(0, Math.min(500, Math.floor(length))) }, (_, i) => i);

export const percent = (value: number, max: number) => max > 0 ? clamp(value / max) * 100 : 0;

export const text = (value: unknown) => value == null ? '' : String(value);

export function flattenTree(nodes: GraphItem[], prefix = ''): { label: string; meta?: string; accent?: boolean; branch: string }[] {
  return nodes.flatMap((node, index) => {
    const last = index === nodes.length - 1;
    const branch = prefix ? `${prefix}${last ? '└─' : '├─'} ` : '';
    const row = { label: text(node.label), meta: node.meta, accent: node.accent, branch };
    const children = Array.isArray(node.children) ? flattenTree(node.children, `${prefix}${last ? '  ' : '│ '}`) : [];
    return [row, ...children];
  });
}
