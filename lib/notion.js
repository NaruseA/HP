const NOTION_BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function getNotionCredentials() {
  const notionToken = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!notionToken) {
    throw new Error("Missing NOTION_TOKEN environment variable");
  }

  if (!databaseId) {
    throw new Error("Missing NOTION_DATABASE_ID environment variable");
  }

  return { notionToken, databaseId };
}

async function notionRequest({ path, method = "GET", body, notionToken }) {
  const response = await fetch(`${NOTION_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await safeReadJson(response);
    const error = new Error(
      `Notion API responded with status ${response.status}: ${JSON.stringify(
        errorBody
      )}`
    );
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function safeReadJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch (error) {
    return text;
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200) || "post";
}

function richTextToMarkdown(richText = []) {
  return richText
    .map((item) => {
      const plain = item?.plain_text || "";
      if (!plain) {
        return "";
      }

      const annotations = item.annotations || {};
      let content = escapeMarkdown(plain);

      if (annotations.code) {
        content = `\`${content}\``;
      } else {
        if (annotations.bold) {
          content = `**${content}**`;
        }
        if (annotations.italic) {
          content = `_${content}_`;
        }
        if (annotations.strikethrough) {
          content = `~~${content}~~`;
        }
        if (annotations.underline) {
          content = `<u>${content}</u>`;
        }
      }

      if (item.href) {
        content = `[${content}](${item.href})`;
      }

      return content;
    })
    .join("");
}

function escapeMarkdown(text) {
  return text.replace(/([*_`~])/g, "\\$1");
}

function richTextToPlainText(richText = []) {
  return richText.map((item) => item?.plain_text || "").join("").trim();
}

function extractTags(property) {
  if (!property) {
    return [];
  }

  if (property.type === "multi_select") {
    return property.multi_select.map((tag) => tag?.name).filter(Boolean);
  }

  if (property.type === "select" && property.select) {
    return [property.select.name].filter(Boolean);
  }

  return [];
}

async function fetchDatabasePages({ notionToken, databaseId }) {
  const pages = [];
  let hasMore = true;
  let startCursor;

  while (hasMore) {
    const body = {
      page_size: 100,
      sorts: [
        {
          timestamp: "last_edited_time",
          direction: "descending",
        },
      ],
    };

    if (startCursor) {
      body.start_cursor = startCursor;
    }

    const response = await notionRequest({
      path: `/databases/${databaseId}/query`,
      method: "POST",
      body,
      notionToken,
    });

    if (Array.isArray(response?.results)) {
      pages.push(...response.results);
    }

    hasMore = Boolean(response?.has_more);
    startCursor = response?.next_cursor || undefined;
  }

  return pages;
}

async function fetchBlockChildren({ blockId, notionToken }) {
  const blocks = [];
  let hasMore = true;
  let startCursor;

  while (hasMore) {
    const searchParams = new URLSearchParams({ page_size: "100" });
    if (startCursor) {
      searchParams.set("start_cursor", startCursor);
    }

    const response = await notionRequest({
      path: `/blocks/${blockId}/children?${searchParams.toString()}`,
      notionToken,
    });

    if (Array.isArray(response?.results)) {
      blocks.push(...response.results);
    }

    hasMore = Boolean(response?.has_more);
    startCursor = response?.next_cursor || undefined;
  }

  return blocks;
}

async function blocksToMarkdown(blocks, depth = 0, isList = false, notionToken) {
  const lines = [];

  for (const block of blocks) {
    const line = await blockToMarkdown(block, depth, notionToken);
    if (line) {
      lines.push(line);
    }
  }

  return isList ? lines.join("\n") : lines.join("\n\n");
}

async function blockToMarkdown(block, depth, notionToken) {
  if (!block) {
    return "";
  }

  const indent = "  ".repeat(depth);
  const { type } = block;
  const value = block[type];

  if (!value) {
    return "";
  }

  let markdown = "";

  switch (type) {
    case "paragraph": {
      const text = richTextToMarkdown(value.rich_text);
      markdown = text;
      break;
    }
    case "heading_1": {
      const text = richTextToMarkdown(value.rich_text);
      markdown = `# ${text}`;
      break;
    }
    case "heading_2": {
      const text = richTextToMarkdown(value.rich_text);
      markdown = `## ${text}`;
      break;
    }
    case "heading_3": {
      const text = richTextToMarkdown(value.rich_text);
      markdown = `### ${text}`;
      break;
    }
    case "bulleted_list_item": {
      const text = richTextToMarkdown(value.rich_text);
      markdown = `${indent}- ${text}`;
      break;
    }
    case "numbered_list_item": {
      const text = richTextToMarkdown(value.rich_text);
      markdown = `${indent}1. ${text}`;
      break;
    }
    case "quote": {
      const text = richTextToMarkdown(value.rich_text);
      markdown = `${indent}> ${text}`;
      break;
    }
    case "code": {
      const language = value.language || "";
      const text = value.rich_text.map((item) => item?.plain_text || "").join("");
      markdown = `\`\`\`${language}\n${text}\n\`\`\``;
      break;
    }
    case "callout": {
      const text = richTextToMarkdown(value.rich_text);
      const icon = value.icon?.emoji ? `${value.icon.emoji} ` : "";
      markdown = `${indent}> ${icon}${text}`;
      break;
    }
    case "toggle": {
      const text = richTextToMarkdown(value.rich_text);
      markdown = `${indent}**${text}**`;
      break;
    }
    case "image": {
      const url = value.type === "external" ? value.external?.url : value.file?.url;
      if (!url) {
        return "";
      }
      const caption = richTextToPlainText(value.caption);
      const altText = caption || "Image";
      markdown = `![${escapeMarkdown(altText)}](${url})`;
      break;
    }
    case "divider": {
      markdown = "---";
      break;
    }
    default: {
      const text = richTextToMarkdown(value.rich_text || []);
      markdown = text;
      break;
    }
  }

  if (block.has_children) {
    const children = await fetchBlockChildren({ blockId: block.id, notionToken });
    const isListItem = type.endsWith("_list_item");
    const childDepth = isListItem ? depth + 1 : type === "toggle" ? depth + 1 : depth;
    const childMarkdown = await blocksToMarkdown(
      children,
      childDepth,
      isListItem,
      notionToken
    );

    if (childMarkdown) {
      if (isListItem) {
        markdown += `\n${childMarkdown}`;
      } else if (type === "toggle") {
        markdown += `\n\n${childMarkdown}`;
      } else {
        markdown += `\n\n${childMarkdown}`;
      }
    }
  }

  return markdown.trimEnd();
}

function mapPageToPost(page, slugSet) {
  if (!page || page.object !== "page") {
    return null;
  }

  const properties = page.properties || {};
  const title = richTextToPlainText(properties?.Title?.title || []);
  if (!title) {
    return null;
  }

  const subtitleProperty = properties?.Subtitle || properties?.Content;
  const subtitle = richTextToPlainText(subtitleProperty?.rich_text || []);
  const tags = extractTags(properties?.Tag);

  let slug = slugify(title);
  if (slugSet.has(slug)) {
    const suffix = page.id.replace(/-/g, "").slice(0, 6).toLowerCase();
    slug = `${slug}-${suffix}`;
  }
  slugSet.add(slug);

  return {
    id: page.id,
    title,
    subtitle,
    tags,
    slug,
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };
}

async function getPageMarkdown({ pageId, notionToken }) {
  const blocks = await fetchBlockChildren({ blockId: pageId, notionToken });
  return blocksToMarkdown(blocks, 0, false, notionToken);
}

export async function getAllPosts() {
  const { notionToken, databaseId } = getNotionCredentials();
  const rawPages = await fetchDatabasePages({ notionToken, databaseId });
  const slugSet = new Set();

  const posts = rawPages
    .map((page) => mapPageToPost(page, slugSet))
    .filter(Boolean)
    .sort((a, b) => {
      const timeA = Date.parse(a.updatedAt || a.createdAt || 0) || 0;
      const timeB = Date.parse(b.updatedAt || b.createdAt || 0) || 0;
      return timeB - timeA;
    });

  return posts;
}

export async function getPostBySlug(slug) {
  if (!slug) {
    return null;
  }

  const { notionToken } = getNotionCredentials();
  const posts = await getAllPosts();
  const post = posts.find((entry) => entry.slug === slug);

  if (!post) {
    return null;
  }

  const markdown = await getPageMarkdown({ pageId: post.id, notionToken });

  return {
    ...post,
    markdown,
  };
}

export async function getPostSlugs() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}
