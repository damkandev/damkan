import JSZip from "jszip";
import { jsPDF } from "jspdf";

const PRESENTATIONML = "http://schemas.openxmlformats.org/presentationml/2006/main";
const DRAWINGML = "http://schemas.openxmlformats.org/drawingml/2006/main";
const OFFICE_RELATIONSHIPS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_RELATIONSHIPS = "http://schemas.openxmlformats.org/package/2006/relationships";

const SLIDE_PATH_PATTERN = /^ppt\/slides\/slide\d+\.xml$/;

export const MAX_PPTX_BYTES = 50 * 1024 * 1024;

export type PptxErrorReason = "format" | "empty";

export class PptxParseError extends Error {
  readonly reason: PptxErrorReason;

  constructor(reason: PptxErrorReason) {
    super(`pptx parse error: ${reason}`);
    this.name = "PptxParseError";
    this.reason = reason;
  }
}

export interface ParsedBlock {
  level: number;
  text: string;
}

export interface ParsedSlide {
  title: string;
  subtitle: string;
  blocks: ParsedBlock[];
}

export interface ParsedPresentation {
  slides: ParsedSlide[];
}

interface Offset {
  x: number;
  y: number;
}

type ShapeKind = "title" | "subtitle" | "content";

interface ShapeFragment {
  kind: ShapeKind;
  y: number;
  x: number;
  blocks: ParsedBlock[];
}

const descendants = (scope: Element, ns: string, local: string): Element[] =>
  Array.from(scope.getElementsByTagNameNS(ns, local));

const firstDescendant = (scope: Element, ns: string, local: string): Element | undefined =>
  scope.getElementsByTagNameNS(ns, local)[0];

const childElement = (parent: Element, ns: string, local: string): Element | undefined => {
  let node = parent.firstChild;
  while (node) {
    if (node.nodeType === 1) {
      const el = node as Element;
      if (el.namespaceURI === ns && el.localName === local) return el;
    }
    node = node.nextSibling;
  }
  return undefined;
};

const directChildren = (parent: Element, ns: string, local: string): Element[] => {
  const found: Element[] = [];
  let node = parent.firstChild;
  while (node) {
    if (node.nodeType === 1) {
      const el = node as Element;
      if (el.namespaceURI === ns && el.localName === local) found.push(el);
    }
    node = node.nextSibling;
  }
  return found;
};

// jsPDF core fonts use WinAnsi encoding, so normalize common Unicode
// punctuation and drop anything outside Latin-1.
const sanitizeText = (text: string): string =>
  text
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F]/g, " ")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2012-\u2015\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u25AA\u25CF\u25E6\u00B7]/g, "-")
    .replace(/\t/g, "  ")
    .replace(/[^\n\x20-\x7E\u00A1-\u00FF]/g, "");

const paragraphLevel = (paragraph: Element): number => {
  const props = childElement(paragraph, DRAWINGML, "pPr");
  const level = Number.parseInt(props?.getAttribute("lvl") ?? "0", 10);
  return Number.isNaN(level) ? 0 : Math.min(8, Math.max(0, level));
};

const paragraphText = (paragraph: Element): string => {
  let text = "";
  let node = paragraph.firstChild;
  while (node) {
    if (node.nodeType === 1) {
      const el = node as Element;
      if (el.namespaceURI === DRAWINGML) {
        if (el.localName === "r") {
          for (const part of descendants(el, DRAWINGML, "t")) text += part.textContent ?? "";
        } else if (el.localName === "br") {
          text += "\n";
        } else if (el.localName === "tab") {
          text += " ";
        }
      }
    }
    node = node.nextSibling;
  }
  return sanitizeText(text);
};

const blocksFromTextBody = (body: Element): ParsedBlock[] =>
  directChildren(body, DRAWINGML, "p")
    .map((paragraph) => ({
      level: paragraphLevel(paragraph),
      text: paragraphText(paragraph).trim(),
    }))
    .filter((block) => block.text.length > 0);

const blocksFromTable = (table: Element): ParsedBlock[] => {
  const blocks: ParsedBlock[] = [];
  for (const row of directChildren(table, DRAWINGML, "tr")) {
    const cells = directChildren(row, DRAWINGML, "tc")
      .map((cell) => {
        const body = firstDescendant(cell, DRAWINGML, "txBody");
        if (!body) return "";
        return directChildren(body, DRAWINGML, "p")
          .map((paragraph) => paragraphText(paragraph))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
      })
      .filter((cell) => cell.length > 0);
    if (cells.length > 0) blocks.push({ level: 0, text: cells.join(" | ") });
  }
  return blocks;
};

const shapeOffset = (element: Element): Offset | undefined => {
  const spPr = childElement(element, PRESENTATIONML, "spPr");
  const transform = spPr
    ? childElement(spPr, DRAWINGML, "xfrm")
    : childElement(element, PRESENTATIONML, "xfrm");
  const offset = transform ? childElement(transform, DRAWINGML, "off") : undefined;
  if (!offset) return undefined;
  const x = Number.parseInt(offset.getAttribute("x") ?? "", 10);
  const y = Number.parseInt(offset.getAttribute("y") ?? "", 10);
  if (Number.isNaN(x) || Number.isNaN(y)) return undefined;
  return { x, y };
};

const fragmentsFromSlide = (
  root: Element,
): { title: string; subtitle: string; blocks: ParsedBlock[] } => {
  const fragments: ShapeFragment[] = [];

  for (const shape of descendants(root, PRESENTATIONML, "sp")) {
    const body = firstDescendant(shape, PRESENTATIONML, "txBody");
    if (!body) continue;
    const blocks = blocksFromTextBody(body);
    if (blocks.length === 0) continue;
    const placeholder = firstDescendant(shape, PRESENTATIONML, "ph");
    const type = placeholder?.getAttribute("type") ?? "";
    const kind: ShapeKind =
      type === "title" || type === "ctrTitle"
        ? "title"
        : type === "subTitle"
          ? "subtitle"
          : "content";
    const offset = shapeOffset(shape);
    fragments.push({
      kind,
      y: offset?.y ?? Number.POSITIVE_INFINITY,
      x: offset?.x ?? 0,
      blocks,
    });
  }

  for (const frame of descendants(root, PRESENTATIONML, "graphicFrame")) {
    const table = firstDescendant(frame, DRAWINGML, "tbl");
    if (!table) continue;
    const blocks = blocksFromTable(table);
    if (blocks.length === 0) continue;
    const offset = shapeOffset(frame);
    fragments.push({
      kind: "content",
      y: offset?.y ?? Number.POSITIVE_INFINITY,
      x: offset?.x ?? 0,
      blocks,
    });
  }

  const joinBlocks = (fragment?: ShapeFragment) =>
    fragment?.blocks.map((block) => block.text).join("\n") ?? "";

  return {
    title: joinBlocks(fragments.find((fragment) => fragment.kind === "title")),
    subtitle: joinBlocks(fragments.find((fragment) => fragment.kind === "subtitle")),
    blocks: fragments
      .filter((fragment) => fragment.kind === "content")
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .flatMap((fragment) => fragment.blocks),
  };
};

const slideNumber = (path: string): number => Number(path.match(/(\d+)\.xml$/)?.[1] ?? 0);

const resolveWithinSlides = (target: string): string | undefined => {
  const segments: string[] = [];
  for (const segment of `ppt/${target}`.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }
  const resolved = segments.join("/");
  return SLIDE_PATH_PATTERN.test(resolved) ? resolved : undefined;
};

const orderedSlidePaths = async (zip: JSZip): Promise<string[]> => {
  const presentationEntry = zip.file("ppt/presentation.xml");
  if (!presentationEntry) throw new PptxParseError("format");

  const targetsByRelationId = new Map<string, string>();
  const relationshipsEntry = zip.file("ppt/_rels/presentation.xml.rels");
  if (relationshipsEntry) {
    const relationshipsXml = await relationshipsEntry.async("string");
    const relationships = new DOMParser().parseFromString(relationshipsXml, "application/xml");
    for (const relation of descendants(
      relationships.documentElement,
      PACKAGE_RELATIONSHIPS,
      "Relationship",
    )) {
      const id = relation.getAttribute("Id");
      const target = relation.getAttribute("Target");
      if (id && target) targetsByRelationId.set(id, target);
    }
  }

  const parser = new DOMParser();
  const presentation = parser.parseFromString(await presentationEntry.async("string"), "application/xml");
  const paths: string[] = [];
  for (const slideId of descendants(presentation.documentElement, PRESENTATIONML, "sldId")) {
    const relationId =
      slideId.getAttributeNS(OFFICE_RELATIONSHIPS, "id") ?? slideId.getAttribute("r:id");
    const target = relationId ? targetsByRelationId.get(relationId) : undefined;
    if (!target) continue;
    const resolved = resolveWithinSlides(target);
    if (resolved) paths.push(resolved);
  }

  if (paths.length > 0) return paths;

  return Object.keys(zip.files)
    .filter((path) => SLIDE_PATH_PATTERN.test(path))
    .sort((a, b) => slideNumber(a) - slideNumber(b));
};

export const parsePptx = async (data: ArrayBuffer): Promise<ParsedPresentation> => {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new PptxParseError("format");
  }

  const slidePaths = await orderedSlidePaths(zip);
  if (slidePaths.length === 0) throw new PptxParseError("format");

  const parser = new DOMParser();
  const slides: ParsedSlide[] = [];
  for (const path of slidePaths) {
    const entry = zip.file(path);
    if (!entry) continue;
    const document = parser.parseFromString(await entry.async("string"), "application/xml");
    const root = document.documentElement;
    if (!root) continue;
    slides.push(fragmentsFromSlide(root));
  }

  return { slides };
};

export const hasExtractableText = (presentation: ParsedPresentation): boolean =>
  presentation.slides.some(
    (slide) => slide.title !== "" || slide.subtitle !== "" || slide.blocks.length > 0,
  );

const MM_PER_PT = 25.4 / 72;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 20;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const LINE_HEIGHT_RATIO = 1.42;
const LEVEL_INDENT_MM = 6;
const PARAGRAPH_GAP_MM = 2.2;

interface TextStyle {
  style: "normal" | "bold" | "italic";
  size: number;
}

const TITLE_STYLE: TextStyle = { style: "bold", size: 17 };
const SUBTITLE_STYLE: TextStyle = { style: "italic", size: 13 };
const BODY_LEVEL_ZERO_STYLE: TextStyle = { style: "normal", size: 11 };
const BODY_DEEPER_STYLE: TextStyle = { style: "normal", size: 10 };

export const renderPdf = (presentation: ParsedPresentation, documentTitle: string): Blob => {
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  pdf.setProperties({ title: documentTitle, creator: "dapan.es" });

  const bottomLimit = PAGE_HEIGHT_MM - MARGIN_MM;
  let cursorY = MARGIN_MM;

  const ensureRoom = (lineHeightMm: number) => {
    if (cursorY + lineHeightMm > bottomLimit) {
      pdf.addPage();
      cursorY = MARGIN_MM;
    }
  };

  const writeText = (text: string, textStyle: TextStyle, indentMm = 0) => {
    pdf.setFont("helvetica", textStyle.style);
    pdf.setFontSize(textStyle.size);
    const lineHeightMm = textStyle.size * MM_PER_PT * LINE_HEIGHT_RATIO;
    const maxWidth = Math.max(CONTENT_WIDTH_MM - indentMm, 40);
    for (const segment of text.split("\n")) {
      for (const line of pdf.splitTextToSize(segment, maxWidth)) {
        ensureRoom(lineHeightMm);
        pdf.text(line, MARGIN_MM + indentMm, cursorY + lineHeightMm * 0.78);
        cursorY += lineHeightMm;
      }
    }
  };

  const gap = (heightMm: number) => {
    cursorY += heightMm;
  };

  presentation.slides.forEach((slide) => {
    if (slide.title !== "") {
      writeText(slide.title, TITLE_STYLE);
      gap(1.5);
    }
    if (slide.subtitle !== "") {
      writeText(slide.subtitle, SUBTITLE_STYLE);
      gap(2.5);
    }
    for (const block of slide.blocks) {
      const level = Math.min(block.level, 6);
      const style = level === 0 ? BODY_LEVEL_ZERO_STYLE : BODY_DEEPER_STYLE;
      writeText(level === 0 ? block.text : `- ${block.text}`, style, level * LEVEL_INDENT_MM);
      gap(PARAGRAPH_GAP_MM);
    }
  });

  return new Blob([pdf.output("arraybuffer")], { type: "application/pdf" });
};
