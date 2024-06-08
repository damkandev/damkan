// src/app/posts/[id]/page.jsx
import { getPostData, getAllPostIds } from "@/lib/posts";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const paths = getAllPostIds();
  return paths.map((path) => ({
    id: path.id,
  }));
}

export default async function PostPage({ params }) {
  const postData = await getPostData(params.id);

  if (!postData) {
    return notFound();
  }

  return (
    <div className="text-white font-Nohemi p-7 md:px-[20em] md:pt-10">
      <h1 className="text-6xl">{postData.title}</h1>
      <div
        className="font-Kumbh"
        dangerouslySetInnerHTML={{ __html: postData.contentHtml }}
      />
    </div>
  );
}
