"use client";

import { useCursor } from "@/context/cursor-context";
import { MousePointer2, Ban } from "lucide-react";
import { cn } from "@/lib/utils"; // Asumiendo que existe, sino usaremos classnames standard

export function CursorToggle() {
    const { isEnabled, toggleCursor } = useCursor();

    return (
        <button
            onClick={toggleCursor}
            className={cn(
                "fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110",
                isEnabled
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground border border-border"
            )}
            title={isEnabled ? "Desactivar cursor suave" : "Activar cursor suave"}
            aria-label="Toggle smooth cursor"
        >
            {isEnabled ? (
                <MousePointer2 className="w-5 h-5" />
            ) : (
                <Ban className="w-5 h-5" />
            )}
        </button>
    );
}
