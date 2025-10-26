import fetch from "node-fetch";

export default async function handler(req, res) {
  const notionToken = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!notionToken || !databaseId) {
    return res.status(500).json({ error: "Missing environment variables" });
  }

  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${notionToken}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Notion API responded with ${response.status}: ${text}`);
    }

    const data = await response.json();
    const results = Array.isArray(data?.results) ? data.results : [];

    const posts = results.map((page) => {
      const titleFragments = Array.isArray(page?.properties?.Title?.title)
        ? page.properties.Title.title
        : [];
      const richText = Array.isArray(page?.properties?.Content?.rich_text)
        ? page.properties.Content.rich_text
        : [];
      const tags = Array.isArray(page?.properties?.Tag?.multi_select)
        ? page.properties.Tag.multi_select
        : [];

      return {
        id: page.id,
        title:
          titleFragments.map((text) => text?.plain_text || "").join("").trim() || "Untitled",
        tags: tags.map((tag) => tag?.name).filter(Boolean),
        content: richText.map((text) => text?.plain_text || "").join("").trim(),
      };
    });

    res.status(200).json(posts);
  } catch (error) {
    console.error("Notion API error:", error);
    res.status(500).json({ error: "Failed to fetch from Notion" });
  }
}

