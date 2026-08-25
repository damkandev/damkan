// Node-side verification of the pptx-to-pdf pipeline.
// Uses @xmldom/xmldom as a DOMParser stand-in; not shipped to the site.
import { DOMParser } from "@xmldom/xmldom";
import { readFile, writeFile } from "node:fs/promises";
import { hasExtractableText, parsePptx, renderPdf } from "../src/lib/pptx-to-pdf.ts";

(globalThis as Record<string, unknown>).DOMParser = DOMParser;

const fixturePath = process.argv[2] ?? "/tmp/pptx-fixture.pptx";
const buffer = await readFile(fixturePath);
const arrayBuffer = buffer.buffer.slice(
  buffer.byteOffset,
  buffer.byteOffset + buffer.byteLength,
);

const parsed = await parsePptx(arrayBuffer as ArrayBuffer);
console.log(JSON.stringify(parsed, null, 2));

if (!hasExtractableText(parsed)) throw new Error("expected extractable text");
if (parsed.slides.length !== 3) throw new Error(`expected 3 slides, got ${parsed.slides.length}`);

const [first, second, third] = parsed.slides;
if (first.title !== "Primera presentación") throw new Error("bad title");
if (!first.subtitle.includes("áéíóú")) throw new Error("bad subtitle accents");
if (JSON.stringify(first.blocks.map((b) => b.level)) !== "[0,1,2,1,0]") throw new Error("bad levels");
if (!first.blocks[4].text.includes('"comillas"')) throw new Error("sanitize failed");
if (second.blocks[0].text !== "Caja superior") throw new Error("textbox order failed");
if (second.blocks[1].text !== "A1 | B1") throw new Error("table extraction failed");
if (second.blocks[2].text !== "A2 | B2") throw new Error("table row 2 failed");
if (third.title !== "" || third.subtitle !== "" || third.blocks.length !== 0) throw new Error("empty slide not empty");

const blob = renderPdf(parsed, "fixture.pdf");
const bytes = Buffer.from(await blob.arrayBuffer());
const pdfPath = "/tmp/pptx-fixture.pdf";
await writeFile(pdfPath, bytes);
const pageCount = (bytes.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
console.log(`pdf written to ${pdfPath} (${bytes.length} bytes, ${pageCount} pages)`);
if (pageCount < 1) throw new Error("pdf has no pages");

console.log("OK");
