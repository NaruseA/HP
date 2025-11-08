import Link from "next/link";
import Head from "next/head";
import { getAllPosts } from "../../lib/notion";

export default function BlogIndex({ posts }) {
  return (
    <main>
      <Head>
        <title>Blog</title>
      </Head>
      <section>
        <h1>Blog</h1>
        {posts.length === 0 ? (
          <p>No posts found.</p>
        ) : (
          <ul>
            {posts.map((post) => (
              <li key={post.id}>
                <article>
                  <h2>
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>
                  {post.subtitle && <p>{post.subtitle}</p>}
                  {post.tags?.length ? (
                    <ul>
                      {post.tags.map((tag) => (
                        <li key={`${post.id}-${tag}`}>{tag}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export async function getStaticProps() {
  const posts = await getAllPosts();

  return {
    props: {
      posts,
    },
    revalidate: 60,
  };
}
