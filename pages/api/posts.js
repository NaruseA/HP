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
      const properties = page?.properties || {};

      const titleProperty = findPropertyByType(properties, "title", [
        "Title",
        "名前",
        "Name",
        "タイトル",
      ]);
      const contentProperty = findPropertyByType(properties, "rich_text", [
        "Content",
        "本文",
        "Description",
        "内容",
      ]);
      const tagProperty =
        findPropertyByType(properties, "multi_select", [
          "Tag",
          "タグ",
          "Tags",
          "カテゴリー",
          "Categories",
        ]) || findPropertyByType(properties, "select");

      return {
        id: page.id,
        title: extractPlainText(titleProperty?.title).trim() || "Untitled",
        tags: extractTags(tagProperty),
        content: extractPlainText(contentProperty?.rich_text).trim(),
      };
    });

    res.status(200).json(posts);
  } catch (error) {
    console.error("Notion API error:", error);
    res.status(500).json({ error: "Failed to fetch from Notion" });
  }
}

function findPropertyByType(properties, type, preferredNames = []) {
  for (const name of preferredNames) {
    const property = properties?.[name];
    if (property?.type === type) {
      return property;
    }
  }

  return Object.values(properties || {}).find((property) => property?.type === type);
}

function extractPlainText(richTextArray) {
  if (!Array.isArray(richTextArray)) {
    return "";
  }

  return richTextArray.map((text) => text?.plain_text || "").join("");
}

function extractTags(property) {
  if (!property) {
    return [];
  }

  if (property.type === "multi_select" && Array.isArray(property.multi_select)) {
    return property.multi_select.map((tag) => tag?.name).filter(Boolean);
  }

  if (property.type === "select" && property.select?.name) {
    return [property.select.name];
  }

  return [];
}

