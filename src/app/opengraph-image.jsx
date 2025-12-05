import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Damián Panes'
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

// Using JetBrains Mono as a similar monospace font (Google Sans Code is not available on Google Fonts)
const fontUrl = 'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.ttf'
const fontBoldUrl = 'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8-aFjPVmUsaaDhw.ttf'

export default async function Image() {
    // Fetch fonts from Google Fonts
    const [fontData, fontBoldData] = await Promise.all([
        fetch(fontUrl).then(res => res.arrayBuffer()),
        fetch(fontBoldUrl).then(res => res.arrayBuffer()),
    ])

    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#EBE4E1',
                    padding: '40px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        border: '2px solid #39211C',
                        padding: '40px',
                        maxWidth: '900px',
                    }}
                >
                    <div
                        style={{
                            fontSize: 60,
                            fontWeight: 700,
                            marginBottom: '20px',
                            fontFamily: 'JetBrains Mono',
                            color: '#39211C',
                        }}
                    >
                        Damian Panes
                    </div>
                    <div
                        style={{
                            fontSize: 30,
                            fontFamily: 'JetBrains Mono',
                            fontWeight: 400,
                            lineHeight: 1.5,
                            color: '#39211C',
                        }}
                    >
                        Me gusta el helado de pasas al ron, tengo 5 veces repetidas el mismo par de zapatillas pero aparte de eso me gusta mucho programar y crear empresas, principalmente solucionar problemas.
                    </div>
                    <div
                        style={{
                            fontSize: 24,
                            fontFamily: 'JetBrains Mono',
                            fontWeight: 400,
                            marginTop: '40px',
                            color: '#39211C',
                            opacity: 0.6,
                        }}
                    >
                        dapan.es
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [
                {
                    name: 'JetBrains Mono',
                    data: fontBoldData,
                    weight: 700,
                    style: 'normal',
                },
                {
                    name: 'JetBrains Mono',
                    data: fontData,
                    weight: 400,
                    style: 'normal',
                },
            ],
        }
    )
}
