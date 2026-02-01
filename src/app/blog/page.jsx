"use client";
import { useState, useRef } from "react";
import Terminal from "@/components/Terminal";
import { BlogProgram } from "@/components/terminal/BlogProgram";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(Flip, useGSAP);

export default function BlogPage() {
    const [isBlogOpen, setIsBlogOpen] = useState(true);
    const terminalRef = useRef(null);
    const containerRef = useRef(null);
    const stateRef = useRef(null);

    const programs = {
        [BlogProgram.name]: BlogProgram,
    };

    const handleProgramChange = (program) => {
        if (terminalRef.current) {
            stateRef.current = Flip.getState(terminalRef.current);
        }
        setIsBlogOpen(program === "blog");
    };

    useGSAP(() => {
        if (!stateRef.current || !terminalRef.current) return;

        Flip.from(stateRef.current, {
            duration: 0.8,
            ease: "power3.inOut",
            absolute: true,
            zIndex: 50,
        });
    }, { dependencies: [isBlogOpen], scope: containerRef });

    return (
        <div ref={containerRef} className="flex min-h-screen items-center justify-center p-3 sm:p-4">
            <Terminal
                ref={terminalRef}
                title="~/blog"
                initialContent={[]}
                commands={{}}
                programs={programs}
                accentColor="#CFFF33"
                onProgramChange={handleProgramChange}
                initialProgram="blog"
                className="fixed inset-0 m-auto w-[95vw] h-[90vh] sm:w-[90vw] sm:h-[90vh] z-50 bg-black/90 backdrop-blur-md shadow-2xl"
                contentClassName="flex-1"
            />
        </div>
    );
}
