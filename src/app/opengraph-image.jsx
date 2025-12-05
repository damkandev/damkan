import { ImageResponse } from 'next/og'

export const alt = 'Damián Panes'
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
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
                            color: '#39211C',
                        }}
                    >
                        Damian Panes
                    </div>
                    <div
                        style={{
                            fontSize: 30,
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
        }
    )
}

