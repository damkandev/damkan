"use client";
import { useState, useRef, useLayoutEffect } from "react";
import Terminal from "@/components/Terminal";
import { BlogProgram } from "@/components/terminal/BlogProgram";
import { getPublicFiles } from "@/app/actions"; // Adjusted import since we are moving to components
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(Flip, useGSAP);

export default function TerminalPage({ initialProgram = null, initialArgs = [] }) {
    const router = useRouter();
    const [isBlogOpen, setIsBlogOpen] = useState(initialProgram === "blog");
    const [isCrtEnabled, setIsCrtEnabled] = useState(true);
    const terminalRef = useRef(null);
    const containerRef = useRef(null);
    const stateRef = useRef(null);

    const asciiArt = `     .---.
(\\./)     \\.......-        welcome to
>' '<  (__.'""""              dapan.es website
 " \` " "`;

    const initialContent = [
        {
            type: "pre",
            content: asciiArt,
            color: "#CFFF33",
            duration: 300,
            glow: true
        },
        {
            type: "text",
            content: "me gusta el helado de pasas al ron, tengo 5 veces repetidas el mismo par de zapatillas pero aparte de eso me gusta mucho programar y crear empresas, principalmente solucionar problemas.",
            duration: 1000,
            delay: 1000
        },
        {
            type: "text",
            content: "problemas que encuentro mientras viajo en micro (transporte publico) me gusta observar el mundo, por que asi pienso afuera de mi comodidad.",
            duration: 1000
        },
        {
            type: "text",
            content: "llevo emprendiendo desde que tengo 14 años, pero al inicio empece programando hacks para jueguitos, me divertía era genial romper algunas cosas y obtener ventaja injusta, pero luego descubrí que era mas entretenido solucionar problemas para muchas personas.",
            duration: 1000
        },
        {
            type: "text",
            content: "si te interesa mi historia, pon 1. Para ver comandos disponibles, escribe 'help'.",
            duration: 1000
        },
    ];

    // Custom commands for this terminal
    const customCommands = {
        "1": {
            description: "Ver mi historia completa",
            execute: () => {
                router.push("/blog/mi-historia");
                return [
                    { type: "text", content: "Navegando a mi historia...", duration: 500 },
                ];
            }
        },
        about: {
            description: "Sobre mí",
            execute: () => [
                { type: "text", content: "soy Damian, desarrollador y emprendedor.", duration: 500 },
                { type: "text", content: "hola, es un gusto!! entra a este link {{LINK:click aqui|https://www.youtube.com/watch?v=dQw4w9WgXcQ}} porfa.", duration: 500 },
            ]
        },
        empresas: {
            description: "Ver mis empresas",
            execute: () => [
                { type: "text", content: "📦 Empresas:", duration: 300 },
                { type: "text", content: "  • {{LINK:dapan.es|https://dapan.es}} - no es una empresa lol", duration: 500 },
                { type: "text", content: "  • {{LINK:rodar.cl|https://www.rodar.cl}} - el sistema operativo de tu automotora (raised 24k USD, 2K MMR)", duration: 500 },
                { type: "text", content: "  • {{LINK:kachipum.com|https://kachipum.com}} - gestion de restaurantes", duration: 500 },
                { type: "text", content: "  • {{LINK:keroke.ro|https://keroke.ro}} - mi software factory totalmente automatizada.", duration: 500 },
            ]
        },
        contact: {
            description: "Información de contacto",
            execute: () => [
                { type: "text", content: "puedes contactarme en:", duration: 300 },
                { type: "text", content: "  email: {{LINK:damkancontacto@gmail.com|mailto:damkancontacto@gmail.com}}", duration: 300 },
                { type: "text", content: "  ig: {{LINK:@damian.panes|https://www.instagram.com/damian.panes}}", duration: 300 },
                { type: "text", content: "  linkedin: {{LINK:damián|https://www.linkedin.com/in/damianpanes/}}", duration: 300 },
            ]
        },
        ls: {
            description: "Listar archivos públicos",
            execute: async () => {
                const files = await getPublicFiles();
                if (files.length === 0) {
                    return [{ type: "text", content: "No hay archivos visibles.", duration: 300 }];
                }
                return [
                    { type: "text", content: "Directory listing of /public:", duration: 200 },
                    { type: "pre", content: files.join("  "), color: "#CFFF33", duration: 500 }
                ];
            }
        },
        dir: {
            description: "Alias de ls",
            execute: async () => {
                const files = await getPublicFiles(); // Reuse logic or call the same function
                if (files.length === 0) {
                    return [{ type: "text", content: "No hay archivos visibles.", duration: 300 }];
                }
                return [
                    { type: "text", content: "Directory listing of /public:", duration: 200 },
                    { type: "pre", content: files.join("\n"), color: "#CFFF33", duration: 500 }
                ];
            }
        },
        crt: {
            description: "Activar/desactivar efecto CRT",
            execute: () => {
                const newState = !isCrtEnabled;
                setIsCrtEnabled(newState);
                // Toggle classes on document
                if (newState) {
                    document.querySelector('.crt-overlay')?.classList.remove('crt-hidden');
                    document.body.classList.remove('crt-disabled');
                } else {
                    document.querySelector('.crt-overlay')?.classList.add('crt-hidden');
                    document.body.classList.add('crt-disabled');
                }
                return [
                    { type: "text", content: `Efecto CRT: ${newState ? 'ACTIVADO' : 'DESACTIVADO'}`, duration: 300, color: newState ? '#00ff00' : '#ff6666' }
                ];
            }
        }
    };

    // Programs - imported as components
    const programs = {
        [BlogProgram.name]: BlogProgram,
    };

    const handleProgramChange = (program) => {
        // Capture state before change
        if (terminalRef.current) {
            stateRef.current = Flip.getState(terminalRef.current);
        }
        setIsBlogOpen(program === "blog");
    };

    useGSAP(() => {
        if (!stateRef.current || !terminalRef.current) return;

        // Animate from captured state to new state
        Flip.from(stateRef.current, {
            duration: 0.8,
            ease: "power3.inOut",
            absolute: true, // Needed for smooth position changes
            zIndex: 50,
            onComplete: () => {
                // Optional: Cleanup or additional logic after animation
            }
        });

    }, { dependencies: [isBlogOpen], scope: containerRef });

    return (
        <div ref={containerRef} className="flex min-h-screen items-center justify-center p-3 sm:p-4">
            <Terminal
                ref={terminalRef}
                title="~/dpanes.sh"
                initialContent={initialContent}
                commands={customCommands}
                programs={programs}
                accentColor="#CFFF33"
                onProgramChange={handleProgramChange}
                initialProgram={initialProgram}
                initialArgs={initialArgs}
                className={isBlogOpen
                    ? "fixed inset-0 m-auto w-[95vw] h-[90vh] sm:w-[90vw] sm:h-[90vh] z-50 bg-black/90 backdrop-blur-md shadow-2xl"
                    : "w-full max-w-2xl sm:max-w-3xl shadow-lg relative"
                }
                contentClassName={isBlogOpen ? "flex-1" : "h-[60vh] sm:h-120"}
            />
        </div>
    );

}
