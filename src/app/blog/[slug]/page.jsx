import { getPostData, getAllPostIds } from '@/lib/posts';
import { MDXRemote } from 'next-mdx-remote/rsc';
import Link from 'next/link';
import DecryptedText from '@/components/DecryptedText';

export async function generateStaticParams() {
    const paths = getAllPostIds();
    return paths.map((path) => ({
        slug: path.params.slug,
    }));
}

const components = {
    img: (props) => (
        <figure className="flex flex-col items-center justify-center my-8">
            <img {...props} className="rounded-lg max-w-full h-auto" />
            {props.alt && (
                <figcaption className="text-center text-sm text-foreground/60 mt-2">
                    {props.alt}
                </figcaption>
            )}
        </figure>
    ),
    blockquote: (props) => (
        <blockquote
            {...props}
            className="text-left font-bold border-l-4 border-[#39211C] pl-4 ml-0 my-4"
            style={{ color: '#39211C' }}
        />
    ),
};

export default async function Post({ params }) {
    const { slug } = await params;
    const postData = await getPostData(slug);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="font-google-sans-code w-full max-w-2xl border border-foreground p-4 md:p-8">
                <div className="mb-8">
                    <Link href="/blog" className="text-sm hover:underline decoration-[#E6BE3C] decoration-2 underline-offset-4">← Volver al blog</Link>
                </div>
                <article className="prose prose-neutral dark:prose-invert max-w-none">
                    <div className="mb-8">
                        <div className="font-bold text-xl md:text-2xl mb-2">
                            <DecryptedText text={postData.title} animateOn="view" revealDirection="start" speed={50} />
                        </div>
                        <div className="text-sm text-foreground/60">{postData.date}</div>
                    </div>
                    <div className="markdown-content">
                        <MDXRemote source={postData.content} components={components} />
                    </div>
                </article>
            </div>
        </div>
    );
}
