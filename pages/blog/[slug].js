import Head from "next/head";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { getAllPosts, getPostBySlug } from "../../lib/notion";

export default function BlogPost({ post }) {
  if (!post) {
    return null;
  }

  return (
    <main>
      <Head>
        <title>{post.title}</title>
        <meta name="description" content={post.subtitle || post.title} />
      </Head>
      <article>
        <header>
          <p>
            <Link href="/blog">← Back to blog</Link>
          </p>
          <h1>{post.title}</h1>
          {post.subtitle && <p>{post.subtitle}</p>}
          {post.tags?.length ? (
            <ul>
              {post.tags.map((tag) => (
                <li key={`${post.id}-${tag}`}>{tag}</li>
              ))}
            </ul>
          ) : null}
        </header>
        <ReactMarkdown>{post.markdown}</ReactMarkdown>
      </article>
    </main>
  );
}

export async function getStaticPaths() {
  const posts = await getAllPosts();

  const paths = posts.map((post) => ({
    params: { slug: post.slug },
  }));

  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      post,
    },
    revalidate: 60,
  };
}
