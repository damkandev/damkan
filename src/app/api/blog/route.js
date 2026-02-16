import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Parse frontmatter from markdown content
function parseFrontmatter(content) {
    const lines = content.split("\n");
    let frontmatterStart = -1;
    let frontmatterEnd = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.match(/^-{3,4}$/)) {
            if (frontmatterStart === -1) {
                frontmatterStart = i;
            } else {
                frontmatterEnd = i;
                break;
            }
        }
    }

    if (frontmatterStart === -1 || frontmatterEnd === -1) {
        return { metadata: {}, content: content };
    }

    const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
    const markdownContent = lines.slice(frontmatterEnd + 1).join("\n");

    const metadata = {};
    for (const line of frontmatterLines) {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            if (key && value) {
                metadata[key] = value;
            }
        }
    }

    return { metadata, content: markdownContent };
}

// Parse inline formatting into segments
function parseInlineFormatting(text) {
    const segments = [];
    let remaining = text;

    // Regex patterns for inline elements
    const patterns = [
        { regex: /\*\*(.+?)\*\*/g, type: "bold" },
        { regex: /\*(.+?)\*/g, type: "italic" },
        { regex: /~~(.+?)~~/g, type: "strikethrough" },
        { regex: /`(.+?)`/g, type: "inlineCode" },
        { regex: /\[(.+?)\]\((.+?)\)/g, type: "link" },
        { regex: /!\[(.+?)\]\((.+?)\)/g, type: "image" },
    ];

    // Simple approach - return text with markers
    let result = text;

    // Images first (before links since they have similar syntax)
    result = result.replace(/!\[(.+?)\]\((.+?)\)/g, '{{IMG:$1|$2}}');

    // Links
    result = result.replace(/\[(.+?)\]\((.+?)\)/g, '{{LINK:$1|$2}}');

    // Bold
    result = result.replace(/\*\*(.+?)\*\*/g, '{{BOLD:$1}}');

    // Italic  
    result = result.replace(/\*(.+?)\*/g, '{{ITALIC:$1}}');

    // Strikethrough
    result = result.replace(/~~(.+?)~~/g, '{{STRIKE:$1}}');

    // Inline code
    result = result.replace(/`(.+?)`/g, '{{CODE:$1}}');

    return result;
}

// Convert markdown to terminal-friendly format with rich data
function markdownToTerminal(content) {
    let lines = content.split("\n");
    let result = [];
    let inCodeBlock = false;
    let codeLanguage = "";
    let codeBuffer = [];
    let indentLevel = 0;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Code block start/end
        if (line.startsWith("```")) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeLanguage = line.slice(3).trim() || "text";
                codeBuffer = [];
            } else {
                result.push({
                    type: "codeBlock",
                    language: codeLanguage,
                    code: codeBuffer.join("\n"),
                });
                inCodeBlock = false;
                codeLanguage = "";
            }
            continue;
        }

        if (inCodeBlock) {
            codeBuffer.push(line);
            continue;
        }

        // Headers
        if (line.startsWith("### ")) {
            result.push({ type: "header", level: 3, text: line.slice(4) });
        } else if (line.startsWith("## ")) {
            result.push({ type: "header", level: 2, text: line.slice(3) });
        } else if (line.startsWith("# ")) {
            result.push({ type: "header", level: 1, text: line.slice(2) });
        }
        // Blockquotes
        else if (line.startsWith("> ")) {
            result.push({ type: "quote", text: line.slice(2) });
        }
        // Nested lists (with indentation)
        else if (line.match(/^\s{4,}[-*]\s/)) {
            const text = line.replace(/^\s+[-*]\s/, "");
            result.push({ type: "list", text: parseInlineFormatting(text), nested: true, indent: 2 });
        }
        // Unordered lists
        else if (line.match(/^[-*]\s/)) {
            result.push({ type: "list", text: parseInlineFormatting(line.slice(2)), nested: false, indent: 0 });
        }
        // Ordered lists
        else if (line.match(/^\d+\.\s/)) {
            const num = line.match(/^(\d+)\./)[1];
            const text = line.replace(/^\d+\.\s/, "");
            result.push({ type: "orderedList", number: parseInt(num), text: parseInlineFormatting(text) });
        }
        // Checkboxes
        else if (line.match(/^-\s\[x\]/i)) {
            result.push({ type: "checkbox", checked: true, text: parseInlineFormatting(line.slice(6)) });
        }
        else if (line.match(/^-\s\[\s\]/)) {
            result.push({ type: "checkbox", checked: false, text: parseInlineFormatting(line.slice(6)) });
        }
        // Horizontal rules
        else if (line.match(/^---+$/) || line.match(/^\*\*\*+$/) || line.match(/^___+$/)) {
            result.push({ type: "hr" });
        }
        // Tables
        else if (line.includes("|")) {
            // Parse table row
            const cells = line.split("|").map(c => c.trim()).filter(c => c);
            const isSeparator = cells.every(c => c.match(/^[-:]+$/));
            if (isSeparator) {
                result.push({ type: "tableSeparator" });
            } else {
                result.push({ type: "tableRow", cells: cells.map(c => parseInlineFormatting(c)) });
            }
        }
        // Standalone images (on their own line)
        else if (line.match(/^!\[(.+?)\]\((.+?)\)$/)) {
            const match = line.match(/^!\[(.+?)\]\((.+?)\)$/);
            result.push({ type: "asciiImage", alt: match[1], url: match[2] });
        }
        // Empty line
        else if (line.trim() === "") {
            result.push({ type: "empty" });
        }
        // Regular text with inline formatting
        else {
            result.push({ type: "text", text: parseInlineFormatting(line) });
        }
    }

    return result;
}

export async function GET() {
    try {
        const blogDir = path.join(process.cwd(), "src/app/blog");

        if (!fs.existsSync(blogDir)) {
            return NextResponse.json({ articles: [], categories: [] });
        }

        const files = fs.readdirSync(blogDir).filter(f => f.endsWith(".md"));

        const articles = files.map((filename) => {
            const filePath = path.join(blogDir, filename);
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const { metadata, content } = parseFrontmatter(fileContent);
            const terminalContent = markdownToTerminal(content);

            return {
                id: filename.replace(".md", ""),
                slug: filename.replace(".md", ""),
                title: metadata.title || filename.replace(".md", ""),
                description: metadata.description || "",
                category: metadata.category || "general",
                content: terminalContent,
                rawContent: content,
            };
        });

        const categories = [...new Set(articles.map(a => a.category))];

        return NextResponse.json({ articles, categories });
    } catch (error) {
        console.error("Error reading blog posts:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
