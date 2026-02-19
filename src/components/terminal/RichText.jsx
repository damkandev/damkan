import React from "react";

// Parse and render inline formatting markers
export const richTextPatterns = [
    { regex: /\{\{BOLD:(.+?)\}\}/g, render: (p1, key) => <strong key={key}>{p1}</strong> },
    { regex: /\{\{ITALIC:(.+?)\}\}/g, render: (p1, key) => <em key={key}>{p1}</em> },
    { regex: /\{\{STRIKE:(.+?)\}\}/g, render: (p1, key) => <s key={key} className="opacity-60">{p1}</s> },
    {
        regex: /\{\{CODE:(.+?)\}\}/g, render: (p1, key, accentColor) => (
            <code
                key={key}
                className="px-1.5 py-0.5 rounded text-sm"
                style={{ backgroundColor: "rgba(255,255,255,0.1)", color: accentColor }}
            >
                {p1}
            </code>
        )
    },
    {
        regex: /\{\{LINK:(.+?)\|(.+?)\}\}/g, render: (text, url, key, accentColor) => (
            <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80"
                style={{ color: accentColor }}
            >
                {text}
            </a>
        )
    },
    {
        regex: /\{\{IMG:(.+?)\|(.+?)\}\}/g, render: (text, url, key, accentColor) => (
            <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80 cursor-pointer"
                style={{ color: accentColor }}
            >
                [IMG: {text}]
            </a>
        )
    },
];

export const RichText = ({ text, accentColor }) => {
    if (!text || typeof text !== "string") return <span>{text}</span>;

    // Simple approach: process markers sequentially
    let result = text;
    let elements = [];

    // Replace all markers with placeholders and collect elements
    richTextPatterns.forEach(({ regex, render }) => {
        result = result.replace(regex, (match, ...args) => {
            // Extract capture groups (exclude match, offset, string)
            const captures = args.slice(0, args.length - 2);

            // Create element
            const el = render(...captures, elements.length, accentColor);
            elements.push(el);
            return `{{PLACEHOLDER_${elements.length - 1}}}`;
        });
    });

    // Split by placeholders and reconstruct
    const finalParts = result.split(/\{\{PLACEHOLDER_(\d+)\}\}/);

    return (
        <>
            {finalParts.map((part, i) => {
                if (i % 2 === 0) {
                    return <span key={`text-${i}`}>{part}</span>;
                } else {
                    return elements[parseInt(part)];
                }
            })}
        </>
    );
};
