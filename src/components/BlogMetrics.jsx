'use client';

import { useEffect, useRef } from 'react';

export default function BlogMetrics({ page }) {
    const maxScrollRef = useRef(0);
    const startTimeRef = useRef(null);

    useEffect(() => {
        startTimeRef.current = Date.now();

        // Collect base metrics
        const baseData = {
            page: page,
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screen: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            referrer: document.referrer || 'Direct',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: new Date().toISOString()
        };

        // Send initial visit event
        fetch('/api/metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...baseData, event: 'visit' })
        }).catch(() => { });

        // Track scroll progress
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 100;

            if (scrollPercent > maxScrollRef.current) {
                maxScrollRef.current = scrollPercent;
            }
        };

        // Send exit event when leaving
        const handleExit = () => {
            const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
            const completed = maxScrollRef.current >= 90;

            navigator.sendBeacon('/api/metrics', JSON.stringify({
                page: page,
                event: 'exit',
                maxScroll: maxScrollRef.current,
                timeSpent: timeSpent,
                completed: completed,
                timestamp: new Date().toISOString()
            }));
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('beforeunload', handleExit);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') handleExit();
        });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('beforeunload', handleExit);
        };
    }, [page]);

    return null;
}
