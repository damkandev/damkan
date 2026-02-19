import React from "react";
import { RichText } from "./RichText";
import { AsciiImage } from "./AsciiImage";
import { highlightCode } from "./syntaxHighlighting";

// Terminal Output Line component with styling support
export const TerminalLine = ({ content, type = "text", color, style = {}, accentColor = "#CFFF33", glow = false }) => {
    // Build inline styles
    const inlineStyle = {
        color: style.accent ? accentColor : (color || "inherit"),
        fontWeight: style.bold ? "bold" : "normal",
        fontStyle: style.italic ? "italic" : "normal",
        opacity: style.dimmed ? 0.6 : 1,
    };

    // Code block styling with syntax highlighting
    if (style.isCodeBlock) {
        // Safety check for content
        const codeContent = typeof content === "string" ? content : "";

        return (
            <div
                className="my-3 overflow-x-auto"
                style={{ flexShrink: 0 }}
            >
                <pre
                    className="pl-3 sm:pl-4 py-2 sm:py-3 border-l-2 text-xs sm:text-sm font-mono m-0"
                    style={{
                        borderColor: accentColor,
                        backgroundColor: "rgba(255,255,255,0.05)",
                        whiteSpace: "pre",
                        margin: 0,
                    }}
                >
                    <code dangerouslySetInnerHTML={{ __html: highlightCode(codeContent, style.language || "text") }} />
                </pre>
            </div>
        );
    }

    // ASCII Image
    if (style.isAsciiImage) {
        return <AsciiImage url={style.url} alt={style.alt} accentColor={accentColor} />;
    }

    // Header styling with font sizes
    if (style.isHeader) {
        const sizes = { 1: "text-xl sm:text-2xl", 2: "text-lg sm:text-xl", 3: "text-base sm:text-lg" };
        return (
            <p
                className={`${sizes[style.level] || "text-base sm:text-lg"} my-2 font-bold`}
                style={{ color: accentColor }}
            >
                {style.level === 1 ? content.toUpperCase() : content}
            </p>
        );
    }

    // Quote styling (single line)
    if (style.isQuote) {
        return (
            <p
                className="pl-4 sm:pl-6 border-l-2 my-1 italic text-sm sm:text-base"
                style={{ borderColor: accentColor, opacity: 0.8 }}
            >
                <RichText text={content} accentColor={accentColor} />
            </p>
        );
    }

    // List styling with indentation
    if (style.isList) {
        const indent = style.nested ? "pl-6 sm:pl-8" : "pl-4 sm:pl-6";
        const bullet = style.ordered ? `${style.number}.` : "•";
        return (
            <p className={`${indent} my-0.5 text-sm sm:text-base`} style={inlineStyle}>
                <span style={{ color: accentColor }}>{bullet}</span> <RichText text={content} accentColor={accentColor} />
            </p>
        );
    }

    // Checkbox styling
    if (style.isCheckbox) {
        const symbol = style.checked ? "✓" : "○";
        return (
            <p className="pl-4 sm:pl-6 my-0.5 text-sm sm:text-base" style={inlineStyle}>
                <span style={{ color: accentColor }}>[{symbol}]</span> <RichText text={content} accentColor={accentColor} />
            </p>
        );
    }

    // Table row styling (using proper HTML table wrapped per row)
    if (style.isTableRow) {
        const cells = Array.isArray(content) ? content : [content];
        const CellTag = style.isHeader ? 'th' : 'td';
        return (
            <div className="overflow-x-auto">
                <table className="w-full border-collapse my-0.5 font-mono text-xs sm:text-sm min-w-[300px]" style={{ borderColor: accentColor }}>
                    <tbody>
                        <tr style={{ borderColor: accentColor }}>
                            {cells.map((cell, i) => (
                                <CellTag
                                    key={i}
                                    className="px-2 sm:px-3 py-1 sm:py-2 border text-left"
                                    style={{
                                        borderColor: accentColor,
                                        color: style.isHeader ? accentColor : "inherit",
                                        fontWeight: style.isHeader ? "bold" : "normal",
                                    }}
                                >
                                    <RichText text={cell} accentColor={accentColor} />
                                </CellTag>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    // Table separator (now just a visual divider, tables handle their own borders)
    if (style.isTableSeparator) {
        return null; // Borders are handled by table cells
    }

    // HR styling
    if (style.isHr) {
        return (
            <div className="my-3" style={{ color: accentColor }}>
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            </div>
        );
    }

    // Link styling (standalone)
    if (style.isLink) {
        return (
            <a
                href={style.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80"
                style={{ color: accentColor }}
            >
                {content}
            </a>
        );
    }

    // Pre formatting
    if (type === "pre") {
        const glowStyle = glow ? {
            ...inlineStyle,
            textShadow: `0 0 5px ${color || accentColor}, 0 0 10px ${color || accentColor}, 0 0 20px ${color || accentColor}`
        } : inlineStyle;
        return <pre style={glowStyle} data-glow={glow ? "true" : undefined}>{content}</pre>;
    }

    // Default text - ALWAYS use RichText to prevent flickering when format markers appear
    // This ensures consistent DOM structure (spans) throughout the typing animation
    return <p style={inlineStyle}><RichText text={content} accentColor={accentColor} /></p>;
};
