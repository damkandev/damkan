import { useState, useRef, useEffect } from "react";

export const useTerminal = ({
    initialContent = [],
    commands = {},
    programs = {},
    onProgramChange,
    initialProgram = null,
    initialArgs = [],
    accentColor = "#CFFF33"
}) => {
    const [history, setHistory] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [currentTypingText, setCurrentTypingText] = useState("");
    const [currentTypingItem, setCurrentTypingItem] = useState(null);

    // Program mode state
    const [activeProgram, setActiveProgram] = useState(null);
    const [menuOptions, setMenuOptions] = useState([]);
    const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);

    // Refs
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
            const sound = audioRef.current.cloneNode();
            sound.volume = 0.4;
            sound.play().catch(() => { });
        }
    };

    // Global keystroke listener
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
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

    const allPrograms = { ...programs };

    const typeItem = (item) => {
        return new Promise((resolve) => {
            const isCodeBlock = item.style?.isCodeBlock === true;
            const isTableRow = item.style?.isTableRow === true;
            const isTableSep = item.style?.isTableSeparator === true;
            const isHr = item.style?.isHr === true;
            const isAsciiImg = item.style?.isAsciiImage === true;
            const isPre = item.type === "pre";
            const isArrayContent = Array.isArray(item.content);

            const skipTyping = isCodeBlock || isTableRow || isTableSep || isHr || isPre || isArrayContent || isAsciiImg;

            if (skipTyping) {
                setHistory((prev) => [...prev, item]);
                setTimeout(resolve, item.duration || 50);
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

    const addContent = (items) => {
        setHistory((prev) => [...prev, ...items]);
    };

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

    // Start initial program
    useEffect(() => {
        const startInitialProgram = async () => {
            if (!initialProgram || initialProgramProcessed.current) return;

            const program = programs[initialProgram];
            if (!program) return;

            initialProgramProcessed.current = true;
            setActiveProgram(initialProgram);

            if (program.onStart) {
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
    }, [initialProgram]);

    // Keyboard events for menu navigation
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
                handleMenuSelection({ action: () => ({ exit: true }) });
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeProgram, menuOptions, selectedMenuIndex, inputValue]);

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

            if (result?.clearBefore) {
                setHistory([]);
            }

            if (result?.content && result.content.length > 0) {
                await processQueue(result.content);
            }

            if (result?.menu) {
                setMenuOptions(result.menu);
                setSelectedMenuIndex(0);
            }
        }
    };

    const handleCommand = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isTyping) return;

        const cmd = inputValue.trim().toLowerCase();
        const args = cmd.split(" ");
        const commandName = args[0];
        const commandArgs = args.slice(1);

        addContent([{ type: "command", content: `> ${inputValue}`, color: accentColor }]);
        setInputValue("");

        if (allPrograms[commandName]) {
            setActiveProgram(commandName);
            const program = allPrograms[commandName];

            if (program.onStart) {
                const startResult = await program.onStart(commandArgs);

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
        } else if (allCommands[commandName]) {
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

        inputRef.current?.focus();
    };

    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    useEffect(() => {
        if (containerRef.current && !activeProgram) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [history, currentTypingText, menuOptions, activeProgram]);

    useEffect(() => {
        if (!isTyping) {
            inputRef.current?.focus();
        }
    }, [isTyping]);

    const handleActionKey = (key) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            // Raw haptic feedback
            navigator.vibrate(20);
        }
        playKeySound();

        // Simulate behavior
        if (key === 'Enter') {
            if (activeProgram && menuOptions.length > 0 && !inputValue.trim()) {
                const selectedOption = menuOptions[selectedMenuIndex];
                if (selectedOption?.action) {
                    handleMenuSelection(selectedOption);
                }
            } else if (inputRef.current?.form) {
                // If there's pending input, submit the form to run the command
                inputRef.current.form.dispatchEvent(
                    new Event('submit', { cancelable: true, bubbles: true })
                );
            }
        } else if (key === 'ArrowUp') {
            if (activeProgram && menuOptions.length > 0) {
                setSelectedMenuIndex((prev) => (prev - 1 + menuOptions.length) % menuOptions.length);
            }
        } else if (key === 'ArrowDown') {
            if (activeProgram && menuOptions.length > 0) {
                setSelectedMenuIndex((prev) => (prev + 1) % menuOptions.length);
            }
        } else if (key === 'Escape') {
            if (activeProgram && menuOptions.length > 0) {
                handleMenuSelection({ action: () => ({ exit: true }) });
            }
        }
    };

    return {
        history,
        inputValue,
        setInputValue,
        isTyping,
        currentTypingText,
        currentTypingItem,
        activeProgram,
        menuOptions,
        selectedMenuIndex,
        inputRef,
        containerRef,
        handleCommand,
        handleContainerClick,
        handleActionKey,
        handleMenuSelection
    };
};
