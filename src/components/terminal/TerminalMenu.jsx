import React from "react";

// Interactive Menu component for programs
export const TerminalMenu = ({ options, selectedIndex, accentColor, onSelect }) => {
    return (
        <div className="flex flex-col gap-1 my-2">
            {options.map((option, i) => (
                <div
                    key={i}
                    className="flex items-center gap-2 cursor-pointer transition-colors duration-100 ease-in-out p-1 -ml-1 sm:ml-0 active:bg-white/10"
                    style={{
                        color: i === selectedIndex ? accentColor : "inherit",
                        backgroundColor: i === selectedIndex ? "rgba(255,255,255,0.05)" : "transparent",
                    }}
                    onClick={() => {
                        if (onSelect) {
                            onSelect(i);
                        }
                    }}
                >
                    <span className="w-5 text-center">{i === selectedIndex ? ">" : " "}</span>

                    {/* Render Icon if present */}
                    {option.icon && (
                        <span className="opacity-80">
                            <option.icon size={16} />
                        </span>
                    )}

                    <span className="font-bold">{option.label}</span>
                </div>
            ))}
            <p className="text-xs sm:text-sm opacity-50 mt-4 border-t pt-2" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                [↑/↓] navegar • [Enter] / [Tap] seleccionar • [Esc] salir
            </p>
        </div>
    );
};
