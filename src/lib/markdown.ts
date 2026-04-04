import GithubSlugger from "github-slugger";
import rehypeHighlight from "rehype-highlight";
import rehypeMermaid from "rehype-mermaid";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

const WORDS_PER_MINUTE = 220;
const markdownSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "figure", "figcaption"],
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes.code || []),
      ["className", /^language-.*$/, "hljs"],
    ],
    figure: [
      ...(defaultSchema.attributes.figure || []),
      ["className", "article-image"],
    ],
    figcaption: [
      ...(defaultSchema.attributes.figcaption || []),
      ["className", "article-image-caption"],
    ],
  },
};

export type MarkdownHeading = {
  depth: 1 | 2 | 3;
  text: string;
  id: string;
};

const countWords = (source: string): number => {
  const tree = unified().use(remarkParse).parse(source ?? "");
  const text = extractTextFromTree(tree);

  return text
    .split(/\s+/)
    .filter(Boolean).length;
};

const extractTextFromTree = (tree: unknown): string => {
  const fragments: string[] = [];

  visit(tree, (node) => {
    if (node.type === "text" || node.type === "inlineCode") {
      fragments.push("value" in node && typeof node.value === "string" ? node.value : "");
    }
  });

  return fragments.join(" ").replace(/\s+/g, " ").trim();
};

const rehypeExternalLinks = () => (tree: unknown) => {
  visit(tree, "element", (node) => {
    if (
      !node ||
      typeof node !== "object" ||
      !("tagName" in node) ||
      node.tagName !== "a" ||
      !("properties" in node) ||
      !node.properties ||
      typeof node.properties !== "object"
    ) {
      return;
    }

    const href = "href" in node.properties ? node.properties.href : undefined;
    if (typeof href !== "string" || !/^https?:\/\//.test(href)) {
      return;
    }

    node.properties.target = "_blank";
    node.properties.rel = "noopener noreferrer";
  });
};

const getStandaloneImageNode = (node: unknown) => {
  if (
    !node ||
    typeof node !== "object" ||
    !("type" in node) ||
    node.type !== "element" ||
    !("tagName" in node)
  ) {
    return null;
  }

  if (node.tagName === "img") {
    return node;
  }

  if (
    node.tagName === "a" &&
    "children" in node &&
    Array.isArray(node.children) &&
    node.children.length === 1
  ) {
    const child = node.children[0];
    if (
      child &&
      typeof child === "object" &&
      "type" in child &&
      child.type === "element" &&
      "tagName" in child &&
      child.tagName === "img"
    ) {
      return child;
    }
  }

  return null;
};

const rehypeArticleImages = () => (tree: unknown) => {
  visit(tree, "element", (node) => {
    if (
      !node ||
      typeof node !== "object" ||
      !("tagName" in node) ||
      node.tagName !== "p" ||
      !("children" in node) ||
      !Array.isArray(node.children) ||
      node.children.length !== 1
    ) {
      return;
    }

    const imageNode = getStandaloneImageNode(node.children[0]);
    if (!imageNode || !("properties" in imageNode) || !imageNode.properties) {
      return;
    }

    const alt =
      typeof imageNode.properties.alt === "string" ? imageNode.properties.alt.trim() : "";

    Object.assign(node, {
      type: "element",
      tagName: "figure",
      properties: {
        className: ["article-image"],
      },
      children: [
        node.children[0],
        ...(alt
          ? [
              {
                type: "element",
                tagName: "figcaption",
                properties: {
                  className: ["article-image-caption"],
                },
                children: [{ type: "text", value: alt }],
              },
            ]
          : []),
      ],
    });
  });
};

const createCopyIcon = () => ({
  type: "element",
  tagName: "svg",
  properties: {
    "aria-hidden": "true",
    viewBox: "0 0 24 24",
    className: ["code-copy-icon"],
  },
  children: [
    {
      type: "element",
      tagName: "rect",
      properties: {
        x: "9",
        y: "9",
        width: "13",
        height: "13",
        rx: "2",
      },
      children: [],
    },
    {
      type: "element",
      tagName: "path",
      properties: {
        d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
      },
      children: [],
    },
  ],
});

const createCheckIcon = () => ({
  type: "element",
  tagName: "svg",
  properties: {
    "aria-hidden": "true",
    viewBox: "0 0 24 24",
    className: ["code-copy-icon"],
  },
  children: [
    {
      type: "element",
      tagName: "path",
      properties: {
        d: "M20 6 9 17l-5-5",
      },
      children: [],
    },
  ],
});

const rehypeCodeCopyButton = () => (tree: unknown) => {
  visit(tree, "element", (node) => {
    if (
      !node ||
      typeof node !== "object" ||
      !("tagName" in node) ||
      node.tagName !== "pre" ||
      !("children" in node) ||
      !Array.isArray(node.children)
    ) {
      return;
    }

    const properties =
      "properties" in node &&
      node.properties &&
      typeof node.properties === "object" &&
      !Array.isArray(node.properties)
        ? node.properties
        : {};

    if ("dataCopyWrapped" in properties) {
      return;
    }

    const codeChild = node.children.find((child) => {
      return (
        child &&
        typeof child === "object" &&
        "type" in child &&
        child.type === "element" &&
        "tagName" in child &&
        child.tagName === "code"
      );
    });

    if (!codeChild || typeof codeChild !== "object" || !("properties" in codeChild)) {
      return;
    }

    const className = Array.isArray(codeChild.properties?.className)
      ? codeChild.properties.className.find(
          (value) => typeof value === "string" && value.startsWith("language-"),
        )
      : undefined;

    const languageLabel =
      typeof className === "string" ? className.replace("language-", "") : undefined;

    const preElement = {
      type: "element",
      tagName: "pre",
      properties: {
        ...properties,
        dataCopyWrapped: "true",
      },
      children: [...node.children],
    };

    Object.assign(node, {
      type: "element",
      tagName: "div",
      properties: {
        className: ["code-block"],
      },
      children: [
        {
          type: "element",
          tagName: "button",
          properties: {
            type: "button",
            className: ["code-copy-button"],
            "data-copy-code": "",
            "aria-label": "Copiar código",
            title: "Copiar código",
          },
          children: [
            {
              ...createCopyIcon(),
              properties: {
                ...createCopyIcon().properties,
                className: ["code-copy-icon", "code-copy-icon-copy"],
              },
            },
            {
              ...createCheckIcon(),
              properties: {
                ...createCheckIcon().properties,
                className: ["code-copy-icon", "code-copy-icon-success"],
              },
            },
            ...(languageLabel
              ? [
                  {
                    type: "element",
                    tagName: "span",
                    properties: {
                      className: ["sr-only"],
                    },
                    children: [{ type: "text", value: `Copiar código ${languageLabel}` }],
                  },
                ]
              : []),
          ],
        },
        preElement,
      ],
    });
  });
};

export const estimateReadingTimeMinutes = (source: string): number => {
  const wordCount = countWords(source);
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
};

export const markdownToPlainText = (source: string): string => {
  const tree = unified().use(remarkParse).parse(source ?? "");
  return extractTextFromTree(tree);
};

export const summarizeMarkdown = (source: string, maxLength = 160): string => {
  const plainText = markdownToPlainText(source);

  if (plainText.length <= maxLength) {
    return plainText;
  }

  const shortened = plainText.slice(0, Math.max(0, maxLength - 1));
  return `${shortened.replace(/\s+\S*$/, "").trimEnd()}…`;
};

export const extractMarkdownHeadings = (source: string): MarkdownHeading[] => {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(source ?? "");
  const slugger = new GithubSlugger();
  const headings: MarkdownHeading[] = [];

  visit(tree, "heading", (node) => {
    if (!node || typeof node !== "object" || !("depth" in node)) {
      return;
    }

    const depth = node.depth;
    if (depth !== 1 && depth !== 2 && depth !== 3) {
      return;
    }

    const text = extractTextFromTree(node);
    if (!text) {
      return;
    }

    headings.push({
      depth,
      text,
      id: slugger.slug(text),
    });
  });

  return headings;
};

export const renderMarkdownToHtml = async (source: string): Promise<string> => {
  const file = await unified()
    .use(remarkParse)
    .use(remarkBreaks)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, markdownSchema)
    .use(rehypeMermaid, {
      strategy: "pre-mermaid",
    })
    .use(rehypeHighlight, { detect: true, ignoreMissing: true })
    .use(rehypeCodeCopyButton)
    .use(rehypeSlug)
    .use(rehypeExternalLinks)
    .use(rehypeArticleImages)
    .use(rehypeStringify)
    .process(source ?? "");

  return String(file);
};
