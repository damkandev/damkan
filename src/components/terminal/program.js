// Base class/interface for terminal programs
// Programs export a configuration object that Terminal.jsx understands

export function createProgram({ name, description, onStart }) {
    return {
        name,
        description,
        onStart,
    };
}

// Helper to create menu items
export function menuItem(label, action, icon = null) {
    return { label, action, icon };
}

// Helper to create content items with optional styling
export function textContent(content, duration = 300, style = {}) {
    return { type: "text", content, duration, style };
}

export function preContent(content, duration = 300, style = {}) {
    return { type: "pre", content, duration, style };
}

// Styled content helpers
export function styledContent(content, duration = 300, style = {}) {
    return { type: "styled", content, duration, style };
}

// Header content (styled with accent color)
export function headerContent(content, level = 1, duration = 100) {
    const prefixes = { 1: "█ ", 2: "▓ ", 3: "░ " };
    return {
        type: "styled",
        content: prefixes[level] + (level === 1 ? content.toUpperCase() : content),
        duration,
        style: {
            isHeader: true,
            level,
            accent: true,
            bold: level === 1,
        },
    };
}

// Quote content
export function quoteContent(content, duration = 80) {
    return {
        type: "styled",
        content: "│ " + content,
        duration,
        style: { isQuote: true, italic: true, dimmed: true },
    };
}

// List item content
export function listContent(content, ordered = false, number = 0, duration = 60) {
    const prefix = ordered ? `  ${number}. ` : "  • ";
    return {
        type: "styled",
        content: prefix + content,
        duration,
        style: { isList: true },
    };
}

// Checkbox content
export function checkboxContent(content, checked = false, duration = 60) {
    const prefix = checked ? "  ✓ " : "  ○ ";
    return {
        type: "styled",
        content: prefix + content,
        duration,
        style: { isCheckbox: true, checked, accent: checked },
    };
}

// Code block content
export function codeContent(content, language = "", duration = 40) {
    return {
        type: "styled",
        content,
        duration,
        style: { isCode: true, language },
    };
}

// Horizontal rule
export function hrContent(duration = 30) {
    return {
        type: "styled",
        content: "────────────────────────────────────",
        duration,
        style: { isHr: true, dimmed: true },
    };
}

// Link content
export function linkContent(text, url, duration = 60) {
    return {
        type: "styled",
        content: `${text} → ${url}`,
        duration,
        style: { isLink: true, accent: true, url },
    };
}

// Helper to create a response with content and menu
// clearBefore: if true, terminal will be cleared before showing new content
export function response({ content = [], menu = [], exit = false, clearBefore = false }) {
    return { content, menu, exit, clearBefore };
}
