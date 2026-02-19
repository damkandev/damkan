// Syntax highlighting colors
const syntaxColors = {
    javascript: { keyword: "#ff79c6", string: "#f1fa8c", comment: "#6272a4", function: "#50fa7b" },
    python: { keyword: "#ff79c6", string: "#f1fa8c", comment: "#6272a4", function: "#50fa7b" },
    default: { keyword: "#ff79c6", string: "#f1fa8c", comment: "#6272a4", function: "#50fa7b" },
};

export const highlightCode = (code, language = "text") => {
    if (!code) return "";

    const colors = syntaxColors[language] || syntaxColors.default;
    let result = code;

    // Placeholder storage
    const tokens = [];
    const saveToken = (content, type) => {
        const placeholder = `___TOKEN_${tokens.length}___`;
        tokens.push({ content, type });
        return placeholder;
    };

    // 1. Strings
    result = result.replace(/(["'])(?:\\.|[^\\])*?\1/g, match => saveToken(match, 'string'));

    // 2. Comments
    result = result.replace(/(\/\/.*)/g, match => saveToken(match, 'comment'));

    // 3. Keywords
    const keywords = /\b(const|let|var|function|return|if|else|for|while|import|from|export|default|class|extends|new|this|super|try|catch|finally|throw|async|await|switch|case|break|continue)\b/g;
    result = result.replace(keywords, match => saveToken(match, 'keyword'));

    // 4. Functions
    result = result.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\()/g, match => saveToken(match, 'function'));

    // Escape the remaining text
    result = result
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Restore tokens
    tokens.forEach((token, index) => {
        const safeContent = token.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        const color = colors[token.type] || "inherit";
        const replacement = `<span style="color: ${color}">${safeContent}</span>`;

        result = result.replace(`___TOKEN_${index}___`, replacement);
    });

    return result;
};
