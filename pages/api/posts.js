import https from "node:https";

const NOTION_VERSION = "2022-06-28";
const TITLE_CANDIDATES = ["Title", "名前", "Name", "タイトル"]; 
const CONTENT_CANDIDATES = [
  "Content",
  "本文",
  "Description",
  "内容",
  "Summary",
  "概要",
  "Body",
];
const TAG_CANDIDATES = [
  "Tag",
  "Tags",
  "タグ",
  "カテゴリー",
  "Categories",
  "Category",
];
const PUBLISHED_CANDIDATES = [
  "Published",
  "isPublished",
  "Publish",
  "公開",
  "公開済み",
  "Status",
  "ステータス",
];
const PUBLISHED_STATUS_KEYWORDS = [
  "published",
  "publish",
  "public",
  "released",
  "release",
  "live",
  "公開",
  "公開中",
  "公開済",
  "公開済み",
  "完了",
  "完了済",
  "done",
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const notionToken = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!notionToken || !databaseId) {
    return res.status(500).json({ error: "Missing environment variables" });
  }

  try {
    const pages = await fetchAllPages({ databaseId, notionToken });
    const posts = pages
      .map((page) => mapPageToPost(page))
      .filter(Boolean)
      .sort((a, b) => {
        const timeA = Date.parse(a?.lastEdited ?? a?.createdAt ?? 0) || 0;
        const timeB = Date.parse(b?.lastEdited ?? b?.createdAt ?? 0) || 0;
        return timeB - timeA;
      });

    res.status(200).json(posts);
  } catch (error) {
    console.error("Notion API error:", error);
    const statusCode = getStatusCode(error);
    res.status(statusCode).json({ error: "Failed to fetch from Notion" });
  }
}

async function fetchAllPages({ databaseId, notionToken }) {
  const pages = [];
  let hasMore = true;
  let startCursor;

  while (hasMore) {
    const body = {
      page_size: 100,
    };

    if (startCursor) {
      body.start_cursor = startCursor;
    }

    const response = await notionRequest({
      path: `/v1/databases/${databaseId}/query`,
      token: notionToken,
      body,
    });

    if (Array.isArray(response?.results)) {
      pages.push(...response.results);
    }

    hasMore = Boolean(response?.has_more);
    startCursor = response?.next_cursor ?? undefined;
  }

  return pages;
}

function notionRequest({ path, token, body }) {
  const payload = JSON.stringify(body ?? {});

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.notion.com",
        path,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": NOTION_VERSION,
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            try {
              resolve(data ? JSON.parse(data) : {});
            } catch (parseError) {
              reject(parseError);
            }
          } else {
            const error = new Error(
              `Notion API responded with ${response.statusCode ?? "unknown"}`
            );
            error.statusCode = response.statusCode ?? 500;
            error.body = data;
            reject(error);
          }
        });
      }
    );

    request.on("error", (error) => {
      reject(error);
    });

    request.write(payload);
    request.end();
  });
}

function mapPageToPost(page) {
  if (!page || page.object !== "page" || page.archived) {
    return null;
  }

  const properties = page.properties || {};

  const publishProperty = findPropertyByTypes(properties, ["checkbox", "status"], PUBLISHED_CANDIDATES);
  if (!isPublished(publishProperty)) {
    return null;
  }

  const titleProperty = findPropertyByTypes(properties, ["title"], TITLE_CANDIDATES);
  const contentProperty = findPropertyByTypes(
    properties,
    ["rich_text", "title"],
    CONTENT_CANDIDATES
  );
  const tagProperty = findPropertyByTypes(
    properties,
    ["multi_select", "select"],
    TAG_CANDIDATES
  );

  const title = extractPlainTextFromProperty(titleProperty) || "Untitled";
  const content = extractPlainTextFromProperty(contentProperty);
  const tags = extractTagsFromProperty(tagProperty);

  return {
    id: page.id,
    title,
    content,
    tags,
    url: page.url ?? undefined,
    createdAt: page.created_time ?? undefined,
    lastEdited: page.last_edited_time ?? undefined,
  };
}

function findPropertyByTypes(properties, types, preferredNames = []) {
  for (const name of preferredNames) {
    const property = properties?.[name];
    if (property && types.includes(property.type)) {
      return property;
    }
  }

  return Object.values(properties || {}).find((property) =>
    property?.type && types.includes(property.type)
  );
}

function extractPlainTextFromProperty(property) {
  if (!property) {
    return "";
  }

  if (property.type === "title" || property.type === "rich_text") {
    const fragments = property[property.type];
    if (!Array.isArray(fragments)) {
      return "";
    }

    return fragments.map((fragment) => fragment?.plain_text || "").join("").trim();
  }

  if (property.type === "select") {
    return property.select?.name ?? "";
  }

  if (property.type === "url") {
    return property.url ?? "";
  }

  if (property.type === "number") {
    return property.number != null ? String(property.number) : "";
  }

  return "";
}

function extractTagsFromProperty(property) {
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

function isPublished(property) {
  if (!property) {
    return true;
  }

  if (property.type === "checkbox") {
    return Boolean(property.checkbox);
  }

  if (property.type === "status") {
    const statusName = property.status?.name?.toLowerCase?.() ?? "";
    if (!statusName) {
      return false;
    }

    return PUBLISHED_STATUS_KEYWORDS.some((keyword) => statusName.includes(keyword));
  }

  return true;
}

function getStatusCode(error) {
  const status = error?.statusCode ?? error?.status;
  if (typeof status === "number" && status >= 400 && status < 600) {
    return status;
  }
  return 500;
}

