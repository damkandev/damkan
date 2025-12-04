export default function manifest() {
    return {
        name: 'Damián Panes',
        short_name: 'Damián',
        description: 'Me gusta la parte de producto de las empresas, no me gusta usar traje solo crocs.',
        start_url: '/',
        display: 'standalone',
        background_color: '#fff',
        theme_color: '#fff',
        icons: [
            {
                src: '/favicon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
            },
        ],
    }
}
