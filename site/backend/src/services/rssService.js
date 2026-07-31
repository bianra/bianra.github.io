// RSS 2.0 生成 (手写 XML 拼接, 字段转义防注入)
import { prisma } from '../db.js'
import { config } from '../config.js'

const FEED_ITEMS = 20

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// GET /api/feed.xml —— 最近 20 篇, 无文章时返回空 channel
export async function buildRssXml() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: 'desc' },
    take: FEED_ITEMS,
    select: { id: true, title: true, summary: true, createdAt: true },
  })

  const items = articles
    .map((a) => {
      const link = `${config.siteUrl}/post/${a.id}`
      return [
        '    <item>',
        `      <title>${escapeXml(a.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <description>${escapeXml(a.summary)}</description>`,
        `      <pubDate>${new Date(a.createdAt).toUTCString()}</pubDate>`,
        `      <guid>${escapeXml(link)}</guid>`,
        '    </item>',
      ].join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>bianra 小屋</title>
    <link>${escapeXml(config.siteUrl)}</link>
    <description>bianra 的个人文章</description>
    <language>zh-cn</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`
}
