import React, { useState, useEffect } from "react";

// ASCII Art Image component - fetches and displays ASCII art
export const AsciiImage = ({ url, alt, accentColor }) => {
    const [ascii, setAscii] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const fetchAscii = async () => {
            try {
                setLoading(true);
                const res = await fetch(
                    `/api/ascii-art?url=${encodeURIComponent(url)}&width=100`
                );
                const data = await res.json();

                if (cancelled) return;

                if (data.error) {
                    setError(data.error);
                } else {
                    setAscii(data.ascii);
                }
            } catch (err) {
                if (!cancelled) setError("Failed to load image");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchAscii();
        return () => { cancelled = true; };
    }, [url]);

    if (loading) {
        return (
            <div className="my-2 pl-2 text-sm animate-pulse" style={{ color: accentColor, opacity: 0.6 }}>
                [Cargando imagen: {alt}...]
            </div>
        );
    }

    if (error) {
        return (
            <div className="my-2 pl-2 text-sm" style={{ opacity: 0.5 }}>
                [Error cargando imagen: {alt}]
            </div>
        );
    }

    return (
        <div className="my-3 overflow-x-auto" style={{ flexShrink: 0 }}>
            <pre
                className="text-[5px] sm:text-[6px] leading-[5px] sm:leading-[6px] font-mono m-0 select-none"
                style={{ color: accentColor, opacity: 0.85 }}
            >
                {ascii}
            </pre>
            <p className="text-xs mt-1" style={{ opacity: 0.4 }}>
                {alt}
            </p>
        </div>
    );
};
