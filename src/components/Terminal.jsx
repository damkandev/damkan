"use client";
import React, { forwardRef } from "react";
import { TerminalLine } from "./terminal/TerminalLine";
import { TerminalMenu } from "./terminal/TerminalMenu";
import { useTerminal } from "./terminal/useTerminal";

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
    initialArgs = [],
}, ref) => {
    const {
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
    } = useTerminal({
        initialContent,
        commands,
        programs,
        onProgramChange,
        initialProgram,
        initialArgs,
        accentColor
    });

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
                            onSelect={(index) => handleMenuSelection({ action: menuOptions[index].action })}
                        />
                    )}
                </div>

                {/* Mobile D-Pad (Cyberdeck aesthetic) */}
                <div className="sm:hidden flex flex-row items-center justify-between p-2 shrink-0 border-t bg-black/90" style={{ borderColor: accentColor }}>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleActionKey('Escape'); }}
                            className="w-10 h-10 flex items-center justify-center font-bold text-xs bg-black active:translate-y-0.5 active:shadow-none transition-all"
                            style={{ color: accentColor, border: `1px solid ${accentColor}`, boxShadow: `2px 2px 0px ${accentColor}` }}
                        >
                            ESC
                        </button>
                    </div>

                    <div className="flex gap-2 items-center">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleActionKey('ArrowUp'); }}
                            className="w-10 h-10 flex items-center justify-center font-bold text-lg bg-black active:translate-y-0.5 active:shadow-none transition-all"
                            style={{ color: accentColor, border: `1px solid ${accentColor}`, boxShadow: `2px 2px 0px ${accentColor}` }}
                        >
                            ▲
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleActionKey('ArrowDown'); }}
                            className="w-10 h-10 flex items-center justify-center font-bold text-lg bg-black active:translate-y-0.5 active:shadow-none transition-all"
                            style={{ color: accentColor, border: `1px solid ${accentColor}`, boxShadow: `2px 2px 0px ${accentColor}` }}
                        >
                            ▼
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleActionKey('Enter'); }}
                            className="h-10 px-4 ml-1 flex items-center justify-center font-bold text-black active:translate-y-0.5 active:shadow-none transition-all"
                            style={{ backgroundColor: accentColor, border: `1px solid ${accentColor}`, boxShadow: `2px 2px 0px rgba(255,255,255,0.3)` }}
                        >
                            ↵
                        </button>
                    </div>
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
