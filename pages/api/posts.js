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
    const requestedId = typeof req.query?.id === "string" ? req.query.id : undefined;
    const normalizedRequestedId = requestedId
      ? normalizePageId(requestedId)
      : undefined;

    const pages = await fetchAllPages({ databaseId, notionToken });

    const posts = [];
    const postsMissingContent = [];

    for (const page of pages) {
      const post = mapPageToPost(page);
      if (!post) {
        continue;
      }

      if (!post.content) {
        postsMissingContent.push(post);
      }

      posts.push(post);
    }

    if (postsMissingContent.length > 0) {
      const excerpts = await Promise.allSettled(
        postsMissingContent.map((post) =>
          fetchPagePlainText({ pageId: post.id, notionToken })
        )
      );

      excerpts.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          postsMissingContent[index].content = result.value;
        }
      });
    }

    const sortedPosts = posts.sort((a, b) => {
      const timeA = Date.parse(a?.lastEdited ?? a?.createdAt ?? 0) || 0;
      const timeB = Date.parse(b?.lastEdited ?? b?.createdAt ?? 0) || 0;
      return timeB - timeA;
    });

    if (normalizedRequestedId) {
      const matchedPost = sortedPosts.find(
        (post) => normalizePageId(post.id) === normalizedRequestedId
      );

      if (!matchedPost) {
        return res.status(404).json({ error: "Post not found" });
      }

      if (!matchedPost.content) {
        matchedPost.content = await fetchPagePlainText({
          pageId: matchedPost.id,
          notionToken,
        });
      }

      return res.status(200).json(matchedPost);
    }

    res.status(200).json(sortedPosts);
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
      method: "POST",
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

function notionRequest({ path, token, method = "GET", body }) {
  const payload = body ? JSON.stringify(body) : undefined;

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.notion.com",
        path,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_VERSION,
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

    if (payload) {
      request.setHeader("Content-Type", "application/json");
      request.setHeader("Content-Length", Buffer.byteLength(payload));
    }

    request.on("error", (error) => {
      reject(error);
    });

    if (payload) {
      request.write(payload);
    }
    request.end();
  });
}

async function fetchPagePlainText({ pageId, notionToken }) {
  if (!pageId) {
    return "";
  }

  const normalizedId = normalizePageId(pageId);
  if (!normalizedId) {
    return "";
  }

  const collectedText = [];
  let startCursor;
  let attempts = 0;

  while (attempts < 5) {
    const searchParams = new URLSearchParams({ page_size: "100" });
    if (startCursor) {
      searchParams.set("start_cursor", startCursor);
    }

    const response = await notionRequest({
      path: `/v1/blocks/${normalizedId}/children?${searchParams.toString()}`,
      token: notionToken,
      method: "GET",
    });

    const blocks = Array.isArray(response?.results) ? response.results : [];
    const textFragments = collectPlainTextFromBlocks(blocks);
    collectedText.push(...textFragments);

    if (!response?.has_more || !response?.next_cursor) {
      break;
    }

    startCursor = response.next_cursor;
    attempts += 1;
  }

  return collectedText.join("\n\n").trim();
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
  const coverUrl = extractCoverUrl(page.cover);

  return {
    id: page.id,
    title,
    content: content || "",
    tags,
    coverUrl,
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
    return extractPlainTextFromRichText(property[property.type]);
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

function extractPlainTextFromRichText(fragments) {
  if (!Array.isArray(fragments)) {
    return "";
  }

  return fragments
    .map((fragment) => fragment?.plain_text || "")
    .join("")
    .trim();
}

function collectPlainTextFromBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    return [];
  }

  const texts = [];

  for (const block of blocks) {
    const text = extractPlainTextFromBlock(block);
    if (text) {
      texts.push(text);
    }
  }

  return texts;
}

function extractPlainTextFromBlock(block) {
  if (!block || block.object !== "block") {
    return "";
  }

  const type = block.type;
  if (!type) {
    return "";
  }

  const richText = block?.[type]?.rich_text;
  return extractPlainTextFromRichText(richText);
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

function extractCoverUrl(cover) {
  if (!cover || typeof cover !== "object") {
    return undefined;
  }

  if (cover.type === "external") {
    return cover.external?.url ?? undefined;
  }

  if (cover.type === "file") {
    return cover.file?.url ?? undefined;
  }

  return undefined;
}

function normalizePageId(id) {
  if (typeof id !== "string") {
    return "";
  }

  return id.replace(/-/g, "").trim();
}

