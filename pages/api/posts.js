// pages/api/posts.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  // 環境変数から取得
  const notionToken = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!notionToken || !databaseId) {
    return res.status(500).json({ error: "Missing environment variables" });
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
    });

    const data = await response.json();

    // 必要な情報だけを整形
    const posts = data.results.map(page => ({
      id: page.id,
      title: page.properties.Title?.title?.[0]?.plain_text || "（無題）",
      tag: page.properties.Tag?.multi_select?.map(tag => tag.name) || [],
      content: page.properties.Content?.rich_text?.[0]?.plain_text || "",
    }));

    res.status(200).json({ posts });
  } catch (error) {
    console.error("Notion API error:", error);
    res.status(500).json({ error: "Failed to fetch from Notion" });
  }
}
