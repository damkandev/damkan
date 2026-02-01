import TerminalPage from "@/components/TerminalPage";

export default async function BlogPage({ params }) {
    // Await params to ensure compatibility with Next.js 15+
    const { slug } = await params;

    return <TerminalPage initialProgram="blog" initialArgs={[slug]} />;
}
