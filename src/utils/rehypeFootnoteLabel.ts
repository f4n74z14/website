import { DEFAULT_LOCALE, isLocale, type Locale } from "../i18n/locales";

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type VFileLike = {
  path?: string;
  history?: string[];
  data?: {
    astro?: {
      frontmatter?: {
        lang?: string;
      };
    };
  };
};

export function resolveContentFileLocale(file?: VFileLike): Locale {
  const fmLang = file?.data?.astro?.frontmatter?.lang;
  if (isLocale(fmLang)) return fmLang;

  const filePath = (file?.path ?? file?.history?.[0] ?? "").replace(/\\/g, "/");
  const match = /(?:^|\/)src\/content\/(?:posts|pages)\/([^/]+)\//.exec(
    filePath
  );
  const folder = match?.[1];
  if (isLocale(folder) && folder !== DEFAULT_LOCALE) return folder;

  return DEFAULT_LOCALE;
}

export function rehypeFootnoteLabel(labels: Record<Locale, string>) {
  return (tree: HastNode, file?: VFileLike) => {
    const label = labels[resolveContentFileLocale(file)];
    if (!label) return;

    const visit = (node: HastNode): boolean => {
      if (
        node.type === "element" &&
        node.tagName === "h2" &&
        node.properties?.id === "footnote-label"
      ) {
        node.children = [{ type: "text", value: label }];
        return true;
      }
      return node.children?.some(visit) ?? false;
    };

    visit(tree);
  };
}
