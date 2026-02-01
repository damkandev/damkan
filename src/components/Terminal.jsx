"use client";
import React, { useEffect, useState, useRef, forwardRef } from "react";

// Parse and render inline formatting markers
// Parse and render inline formatting markers
const richTextPatterns = [
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
        regex: /\{\{LINK:(.+?)\|(.+?)\}\}/g, render: (p1, key, accentColor, p2) => (
            <a
                key={key}
                href={p2}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80"
                style={{ color: accentColor }}
            >
                {p1}
            </a>
        )
    },
    {
        regex: /\{\{IMG:(.+?)\|(.+?)\}\}/g, render: (p1, key, accentColor, p2) => (
            <a
                key={key}
                href={p2}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80 cursor-pointer"
                style={{ color: accentColor }}
            >
                [IMG: {p1}]
            </a>
        )
    },
];

const RichText = ({ text, accentColor }) => {
    if (!text || typeof text !== "string") return <span>{text}</span>;

    // Simple approach: process markers sequentially
    let result = text;
    let elements = [];

    // Replace all markers with placeholders and collect elements
    richTextPatterns.forEach(({ regex, render }) => {
        result = result.replace(regex, (match, ...args) => {
            // args contains captures, offset, string. We need captures.
            // For simple regexes above: match, p1, (p2?), offset, string
            // We need to pass p1, p2 (if exists) and key/colors

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
                    // Only render span if content is not empty to keep DOM cleaner, 
                    // though for typing stability keeping it properly keyed is safer.
                    return <span key={`text-${i}`}>{part}</span>;
                } else {
                    return elements[parseInt(part)];
                }
            })}
        </>
    );
};

// Syntax highlighting colors
const syntaxColors = {
    javascript: { keyword: "#ff79c6", string: "#f1fa8c", comment: "#6272a4", function: "#50fa7b" },
    python: { keyword: "#ff79c6", string: "#f1fa8c", comment: "#6272a4", function: "#50fa7b" },
    default: { keyword: "#ff79c6", string: "#f1fa8c", comment: "#6272a4", function: "#50fa7b" },
};

const highlightCode = (code, language = "text") => {
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

// Terminal Output Line component with styling support
const TerminalLine = ({ content, type = "text", color, style = {}, accentColor = "#CFFF33", glow = false }) => {
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

// Interactive Menu component for programs
const TerminalMenu = ({ options, selectedIndex, accentColor }) => {
    return (
        <div className="flex flex-col gap-1 my-2">
            {options.map((option, i) => (
                <div
                    key={i}
                    className="flex items-center gap-2 cursor-pointer"
                    style={{ color: i === selectedIndex ? accentColor : "inherit" }}
                    onClick={() => {/* Handle click if needed later, right now keyboard only */ }}
                >
                    <span className="w-5 text-center">{i === selectedIndex ? ">" : " "}</span>

                    {/* Render Icon if present */}
                    {option.icon && (
                        <span className="opacity-80">
                            {/* Assuming icon is a React component (Lucide icon) */}
                            <option.icon size={16} />
                        </span>
                    )}

                    <span>{option.label}</span>
                </div>
            ))}
            <p className="text-sm opacity-50 mt-4 border-t pt-2" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                [↑/↓] navegar • [Enter] seleccionar • [Esc] salir
            </p>
        </div>
    );
};

// Main Terminal Component
const Terminal = forwardRef(({
    title = "~/terminal",
    initialContent = [],
    commands = {},
    programs = {},
    accentColor = "#CFFF33",
    className = "",
    contentClassName = "h-120",
    onProgramChange,
    initialProgram = null,
    initialArgs = [], // New prop for initial arguments
}, ref) => {
    const [history, setHistory] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [currentTypingText, setCurrentTypingText] = useState("");
    const [currentTypingItem, setCurrentTypingItem] = useState(null);

    // Program mode state
    const [activeProgram, setActiveProgram] = useState(null);
    const [menuOptions, setMenuOptions] = useState([]);
    const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);

    // Refs to track initialization status (fixes Strict Mode double-execution)
    const initialContentProcessed = useRef(false);
    const initialProgramProcessed = useRef(false);

    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const audioRef = useRef(null);

    // Initialize audio
    useEffect(() => {
        if (typeof window !== "undefined") {
            audioRef.current = new Audio("/key.mp3");
            audioRef.current.volume = 0.4;
        }
    }, []);

    const playKeySound = () => {
        if (audioRef.current) {
            // Clone only if you want polyphony (multiple keys at once)
            // Or just reset currentTime for monophony. 
            // Cloning feels better for fast typing.
            const sound = audioRef.current.cloneNode();
            sound.volume = 0.4;
            sound.play().catch(() => { }); // Ignore autoplay errors
        }
    };

    // Global keystroke listener for sound
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Optional: Ignore modifier keys if standard behavior is desired
            // if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
            playKeySound();
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, []);

    // Notify parent about program change
    useEffect(() => {
        if (onProgramChange) {
            onProgramChange(activeProgram);
        }
    }, [activeProgram, onProgramChange]);

    // Default commands
    const allCommands = {
        help: {
            description: "Mostrar comandos disponibles",
            execute: () => {
                const allCmds = { ...allCommands, ...commands };
                const allProgs = { ...programs };
                let helpText = "Available commands:\n";
                helpText += Object.entries(allCmds)
                    .map(([name, cmd]) => `  ${name} - ${cmd.description}`)
                    .join("\n");

                if (Object.keys(allProgs).length > 0) {
                    helpText += "\n\nPrograms:\n";
                    helpText += Object.entries(allProgs)
                        .map(([name, prog]) => `  ${name} - ${prog.description}`)
                        .join("\n");
                }

                return [{ type: "pre", content: helpText, duration: 500 }];
            },
        },
        clear: {
            description: "Clear terminal",
            execute: () => {
                setHistory([]);
                return [];
            },
        },
        exit: {
            description: "Salir del programa actual",
            execute: () => {
                if (activeProgram) {
                    setActiveProgram(null);
                    setMenuOptions([]);
                    setSelectedMenuIndex(0);
                    return [{ type: "text", content: "Program closed.", duration: 200 }];
                }
                return [{ type: "text", content: "No program running.", duration: 200 }];
            },
        },
        ...commands,
    };

    // All programs
    const allPrograms = { ...programs };

    // Type a single item
    const typeItem = (item) => {
        return new Promise((resolve) => {
            // For code blocks, tables, and HR - show instantly without typing effect
            const isCodeBlock = item.style?.isCodeBlock === true;
            const isTableRow = item.style?.isTableRow === true;
            const isTableSep = item.style?.isTableSeparator === true;
            const isHr = item.style?.isHr === true;
            const isPre = item.type === "pre";
            const isArrayContent = Array.isArray(item.content);

            const skipTyping = isCodeBlock || isTableRow || isTableSep || isHr || isPre || isArrayContent;

            if (skipTyping) {
                setHistory((prev) => [...prev, item]);
                const delay = item.duration || 50;
                setTimeout(resolve, delay);
                return;
            }

            setIsTyping(true);
            setCurrentTypingItem(item);
            setCurrentTypingText("");

            const text = item.content || "";
            const duration = item.duration || 1000;
            const totalChars = text.length;

            if (totalChars === 0) {
                setHistory((prev) => [...prev, item]);
                setCurrentTypingItem(null);
                setCurrentTypingText("");
                setIsTyping(false);
                resolve();
                return;
            }

            const intervalTime = duration / totalChars;
            let charIndex = 0;

            const interval = setInterval(() => {
                charIndex++;
                setCurrentTypingText(text.slice(0, charIndex));

                if (charIndex >= totalChars) {
                    clearInterval(interval);
                    setHistory((prev) => [...prev, item]);
                    setCurrentTypingItem(null);
                    setCurrentTypingText("");
                    setIsTyping(false);
                    resolve();
                }
            }, intervalTime);
        });
    };

    // Add content instantly
    const addContent = (items) => {
        setHistory((prev) => [...prev, ...items]);
    };

    // Process queue sequentially
    const processQueue = async (items, initialDelay = 0) => {
        if (initialDelay > 0) {
            await new Promise((r) => setTimeout(r, initialDelay));
        }

        for (const item of items) {
            if (item.delay) {
                await new Promise((r) => setTimeout(r, item.delay));
            }
            await typeItem(item);
        }
    };

    // Initialize with initial content
    useEffect(() => {
        if (initialContent.length === 0 || initialContentProcessed.current) return;
        initialContentProcessed.current = true;
        processQueue(initialContent);
    }, []);

    // Start initial program if specified
    useEffect(() => {
        const startInitialProgram = async () => {
            if (!initialProgram || initialProgramProcessed.current) return;

            const program = programs[initialProgram];
            if (!program) return;

            initialProgramProcessed.current = true;
            setActiveProgram(initialProgram);

            if (program.onStart) {
                // Pass initialArgs to onStart (default to empty array/object depending on usage)
                const args = initialArgs || [];
                const startResult = await program.onStart(args);

                if (startResult?.clearBefore) {
                    setHistory([]);
                }

                if (startResult?.content) {
                    await processQueue(startResult.content);
                }
                if (startResult?.menu) {
                    setMenuOptions(startResult.menu);
                    setSelectedMenuIndex(0);
                }
            }
        };

        startInitialProgram();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialProgram]);

    // Handle keyboard events for menu navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!activeProgram || menuOptions.length === 0) return;

            if (e.key === "Tab" || e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedMenuIndex((prev) => (prev + 1) % menuOptions.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedMenuIndex((prev) => (prev - 1 + menuOptions.length) % menuOptions.length);
            } else if (e.key === "Enter" && !inputValue.trim()) {
                e.preventDefault();
                const selectedOption = menuOptions[selectedMenuIndex];
                if (selectedOption?.action) {
                    handleMenuSelection(selectedOption);
                }
            } else if (e.key === "Escape") {
                e.preventDefault();
                // Pass exit=true to trigger proper cleanup
                handleMenuSelection({ action: () => ({ exit: true }) });
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeProgram, menuOptions, selectedMenuIndex, inputValue]);

    // Handle menu selection
    const handleMenuSelection = async (option) => {
        if (option.action) {
            const result = await option.action();

            if (result?.exit) {
                setActiveProgram(null);
                setMenuOptions([]);
                setSelectedMenuIndex(0);
                setHistory([]);
                addContent([{ type: "text", content: "Program closed." }]);
                return;
            }

            // Clear terminal before new content if requested
            if (result?.clearBefore) {
                setHistory([]);
            }

            // Process content first if exists
            if (result?.content && result.content.length > 0) {
                await processQueue(result.content);
            }

            // Then set menu if exists
            if (result?.menu) {
                setMenuOptions(result.menu);
                setSelectedMenuIndex(0);
            }
        }
    };

    // Handle command execution
    const handleCommand = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isTyping) return;

        const cmd = inputValue.trim().toLowerCase();
        const args = cmd.split(" ");
        const commandName = args[0];
        const commandArgs = args.slice(1);

        // Add command to history
        addContent([{ type: "command", content: `> ${inputValue}`, color: accentColor }]);
        setInputValue("");

        // Check if it's a program
        if (allPrograms[commandName]) {
            setActiveProgram(commandName);
            const program = allPrograms[commandName];

            if (program.onStart) {
                const startResult = await program.onStart(commandArgs);

                // Clear terminal before showing new content if requested
                if (startResult?.clearBefore) {
                    setHistory([]);
                }

                if (startResult?.content) {
                    await processQueue(startResult.content);
                }
                if (startResult?.menu) {
                    setMenuOptions(startResult.menu);
                    setSelectedMenuIndex(0);
                }
            }
        }
        // Check if it's a command
        else if (allCommands[commandName]) {
            const result = await allCommands[commandName].execute(commandArgs);
            if (result && result.length > 0) {
                await processQueue(result);
            }
        } else {
            await processQueue([{
                type: "text",
                content: `Command not found: ${commandName}. Type 'help' for available commands.`,
                duration: 300
            }]);
        }

        // Re-focus input after command
        inputRef.current?.focus();
    };

    // Focus input on click
    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    // Auto-scroll behavior
    // - For programs (blog): NO auto-scroll - user controls scroll
    // - For regular terminal: always scroll to bottom
    useEffect(() => {
        if (containerRef.current && !activeProgram) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [history, currentTypingText, menuOptions, activeProgram]);

    // Restore focus when typing ends
    useEffect(() => {
        if (!isTyping) {
            inputRef.current?.focus();
        }
    }, [isTyping]);

    return (
        <div
            ref={ref}
            className={`border font-(family-name:--font-jetbrains-mono) flex flex-col ${className}`}
            style={{ borderColor: accentColor }}
            onClick={handleContainerClick}
        >
            <div className="flex flex-col h-full overflow-hidden">
                <p
                    className="w-full p-2 sm:p-3 border-b shrink-0 text-sm sm:text-base"
                    style={{ borderColor: accentColor }}
                >
                    {activeProgram ? `${title} > ${activeProgram}` : title}
                </p>
                <div
                    ref={containerRef}
                    className={`p-3 sm:p-4 flex flex-col gap-1 sm:gap-2 overflow-y-auto overflow-x-auto scrollbar-none ${contentClassName}`}
                >
                    {history.map((item, i) => (
                        <TerminalLine
                            key={i}
                            content={item.content}
                            type={item.type}
                            color={item.color}
                            style={item.style}
                            accentColor={accentColor}
                            glow={item.glow}
                        />
                    ))}
                    {currentTypingItem && (
                        <TerminalLine
                            content={currentTypingText}
                            type={currentTypingItem.type}
                            color={currentTypingItem.color}
                            style={currentTypingItem.style}
                            accentColor={accentColor}
                            glow={currentTypingItem.glow}
                        />
                    )}
                    {activeProgram && menuOptions.length > 0 && !isTyping && (
                        <TerminalMenu
                            options={menuOptions}
                            selectedIndex={selectedMenuIndex}
                            accentColor={accentColor}
                        />
                    )}
                </div>
                <form onSubmit={handleCommand} className="shrink-0">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full p-3 sm:p-2 border-t bg-transparent outline-none text-sm sm:text-base min-h-[44px] sm:min-h-auto"
                        style={{ borderColor: accentColor }}
                        placeholder={isTyping ? "..." : activeProgram ? `${activeProgram}> ` : "type a command"}
                        disabled={isTyping}
                    />
                </form>
            </div>
        </div>
    );
});

Terminal.displayName = "Terminal";

export default Terminal;
