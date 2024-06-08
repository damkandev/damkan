"use client";
import { useEffect, useState } from "react";

export default function PostsPage() {
  const [allPostsData, setAllPostsData] = useState([]);

  useEffect(() => {
    const fetchPostsData = async () => {
      const res = await fetch("/api/posts");
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const postsData = await res.json();
      setAllPostsData(postsData);
    };

    fetchPostsData().catch((error) => {
      console.error("Failed to fetch posts data:", error);
    });
  }, []);

  return (
    <div className="text-white">
      <h2 className="">Blog</h2>
      <ul>
        {allPostsData.map(({ id, date, title, image }) => (
          <li key={id}>
            <a href={`/posts/${id}`}>
              <img
                width={200}
                height={200}
                className="rounded-md"
                src={image}
              ></img>
              {title}

              <br />
              <small>{date}</small>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
