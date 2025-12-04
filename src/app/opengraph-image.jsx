import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Damián Panes'
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
    // Font loading (optional, using system fonts for simplicity and speed in this example, 
    // but could load Google Sans Code if available as a buffer)

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
                    backgroundColor: 'white',
                    padding: '40px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        border: '2px solid black',
                        padding: '40px',
                        maxWidth: '900px',
                    }}
                >
                    <div
                        style={{
                            fontSize: 60,
                            fontWeight: 'bold',
                            marginBottom: '20px',
                            fontFamily: 'monospace',
                        }}
                    >
                        Damian Panes
                    </div>
                    <div
                        style={{
                            fontSize: 30,
                            fontFamily: 'monospace',
                            lineHeight: 1.5,
                        }}
                    >
                        Me gusta el helado de pasas al ron, tengo 5 veces repetidas el mismo par de zapatillas pero aparte de eso me gusta mucho programar y crear empresas, principalmente solucionar problemas.
                    </div>
                    <div
                        style={{
                            fontSize: 24,
                            fontFamily: 'monospace',
                            marginTop: '40px',
                            color: '#666',
                        }}
                    >
                        damianpanes.com
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
