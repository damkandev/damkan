import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const data = await request.json();
        const webhookUrl = process.env.WEBHOOK_URL;

        if (!webhookUrl) {
            console.error('WEBHOOK_URL not configured');
            return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
        }

        let embed;

        if (data.event === 'exit') {
            // Exit event - reading completion
            const statusEmoji = data.completed ? '✅' : '❌';
            const statusText = data.completed ? 'Completó lectura' : 'Salió antes';

            embed = {
                title: `${statusEmoji} ${statusText}`,
                color: data.completed ? 0x22C55E : 0xEF4444,
                fields: [
                    {
                        name: '📄 Page',
                        value: data.page || 'Unknown',
                        inline: true
                    },
                    {
                        name: '📊 Max Scroll',
                        value: `${data.maxScroll}%`,
                        inline: true
                    },
                    {
                        name: '⏱️ Time Spent',
                        value: `${data.timeSpent}s`,
                        inline: true
                    }
                ],
                timestamp: data.timestamp
            };
        } else {
            // Visit event
            embed = {
                title: '👋 Nueva visita',
                color: 0x39211C,
                fields: [
                    {
                        name: '📄 Page',
                        value: data.page || 'Unknown',
                        inline: true
                    },
                    {
                        name: '🔗 Referrer',
                        value: data.referrer || 'Direct',
                        inline: true
                    },
                    {
                        name: '🌐 Language',
                        value: data.language || 'Unknown',
                        inline: true
                    },
                    {
                        name: '💻 Platform',
                        value: data.platform || 'Unknown',
                        inline: true
                    },
                    {
                        name: '📱 Screen',
                        value: data.screen || 'Unknown',
                        inline: true
                    },
                    {
                        name: '🕐 Timezone',
                        value: data.timezone || 'Unknown',
                        inline: true
                    }
                ],
                footer: {
                    text: data.userAgent ? data.userAgent.substring(0, 100) : 'No User-Agent'
                },
                timestamp: data.timestamp
            };
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [embed]
            })
        });

        if (!response.ok) {
            console.error('Discord webhook error:', response.status);
            return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Metrics error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
