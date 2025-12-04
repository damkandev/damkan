import Link from 'next/link';
import { getSortedPostsData } from '@/lib/posts';
import DecryptedText from '@/components/DecryptedText';

export const metadata = {
    title: "Blog | Damián Panes",
    description: "Artículos sobre mi historia, pensamientos y libros que recomiendo.",
    openGraph: {
        title: "Blog | Damián Panes",
        description: "Artículos sobre mi historia, pensamientos y libros que recomiendo.",
        url: 'https://damianpanes.com/blog',
        type: 'website',
    },
};

export default function Blog() {
    const allPostsData = getSortedPostsData();

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="font-google-sans-code w-full max-w-2xl border border-foreground p-4 md:p-8">
                <div className="my-4 font-bold text-xl md:text-2xl">
                    <DecryptedText text="Blog" animateOn="both" revealDirection="start" speed={50} />
                </div>
                <div className="space-y-6">
                    {allPostsData.map(({ id, date, title, description, readingTime }) => (
                        <div key={id} className="border-b border-foreground/20 pb-4 last:border-0">
                            <Link href={`/blog/${id}`} className="block group">
                                <h2 className="text-lg font-bold group-hover:underline decoration-[#E6BE3C] decoration-2 underline-offset-4">{title}</h2>
                                <small className="text-foreground/60 block my-1">{date} · {readingTime} min de lectura</small>
                                <p className="text-sm">{description}</p>
                            </Link>
                        </div>
                    ))}
                </div>
                <div className="mt-8">
                    <Link href="/" className="text-sm hover:underline decoration-[#E6BE3C] decoration-2 underline-offset-4">← Volver al inicio</Link>
                </div>
            </div>
        </div>
    );
}
