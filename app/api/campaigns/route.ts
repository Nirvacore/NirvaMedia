import { guardLocalization, CanonicalLocalizationError } from "../../../lib/mahasunyata/localization-guard";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { campaignPosts, campaigns, publishJobs } from "../../../db/schema";
import { getLocalizedCampaignCopy } from "../../../lib/nle/campaign-copy";
import { getNirvaLanguage, isSupportedNirvaLanguage } from "../../../lib/nle/languages";
import { adaptActiveChannelText, CLAUDE_MEDIA_SOURCE } from "../../../lib/upstream-media-adapter";
import { internalErrorResponse } from "../../../lib/api-errors";

const channelTemplates: Record<string, { format: string; title: string; body: string }> = {
  Instagram: {
    format: "Carousel · 4:5",
    title: "หนึ่งไอเดีย ไปได้ทุกที่",
    body: "เปลี่ยนไอเดียเดียวให้เป็นคอนเทนต์ครบทุกช่องทาง พร้อมปรับภาษาและรูปแบบให้เหมาะกับผู้ชม",
  },
  Facebook: {
    format: "Feed post · 1:1",
    title: "ทีมของคุณไม่ควรเริ่มใหม่ทุกแพลตฟอร์ม",
    body: "สร้าง ปรับภาษา ตั้งเวลา และเรียนรู้จากผลลัพธ์ทั้งหมดในพื้นที่เดียวกับ Nirva Media",
  },
  "LINE OA": {
    format: "Broadcast · Card",
    title: "พบกับ Content OS สำหรับทีมไทย",
    body: "สร้างครั้งเดียว ปรับให้เข้ากับผู้ชมแต่ละกลุ่ม และส่งต่อได้ทั่วโลก",
  },
  TikTok: {
    format: "Short video · 9:16",
    title: "หนึ่ง Brief กลายเป็นทั้งแคมเปญได้อย่างไร",
    body: "เล่าไอเดียของคุณครั้งเดียว แล้วให้ AI เตรียมสคริปต์ ภาพ เสียง และคำบรรยายให้พร้อม",
  },
  LinkedIn: {
    format: "Thought leadership",
    title: "The content operating system for modern teams",
    body: "Nirva Media connects creation, localization, distribution, and performance intelligence in one workflow.",
  },
  YouTube: {
    format: "Video outline · 16:9",
    title: "From one idea to every channel",
    body: "บทนำ ปัญหาของการทำงานซ้ำ วิธีทำงานของ Nirva Media และผลลัพธ์ที่ทีมวัดได้",
  },
  "WhatsApp Business": {
    format: "Business message · Card",
    title: "หนึ่งข้อความ พาธุรกิจไปได้ไกลกว่าเดิม",
    body: "ส่งข้อเสนอที่กระชับ เป็นส่วนตัว และพร้อมให้ลูกค้าตอบกลับหรือสั่งซื้อได้ทันที",
  },
  Threads: {
    format: "Conversation post",
    title: "ถ้าทีมไม่ต้องเริ่มคอนเทนต์ใหม่ทุกช่องทางล่ะ",
    body: "เริ่มต้นบทสนทนาด้วยแนวคิดสั้น กระชับ และชวนให้ชุมชนแลกเปลี่ยนมุมมอง",
  },
  X: {
    format: "Post · Thread",
    title: "One idea. Every market. One workflow.",
    body: "สรุปประเด็นสำคัญให้เร็ว คม และต่อยอดเป็นเธรดสำหรับบทสนทนาแบบเรียลไทม์",
  },
  Telegram: {
    format: "Channel update",
    title: "Global campaign update",
    body: "ประกาศข่าวสารพร้อมลิงก์ ไฟล์ และคำกระตุ้นการมีส่วนร่วมสำหรับสมาชิกช่อง",
  },
  Pinterest: {
    format: "Idea Pin · 2:3",
    title: "Build your global content system",
    body: "เปลี่ยนแนวคิดเป็นภาพแนวตั้งที่ค้นพบซ้ำได้ พร้อมชื่อและคำอธิบายที่ชัดเจน",
  },
  Snapchat: {
    format: "Story · 9:16",
    title: "Create once. Snap everywhere.",
    body: "เรื่องราวแนวตั้งที่รวดเร็ว สนุก และเหมาะกับการสื่อสารแบบเต็มหน้าจอ",
  },
  WeChat: {
    format: "Official Account article",
    title: "面向全球的内容工作系统",
    body: "ปรับบทความและข้อความให้เหมาะกับ WeChat Official Account และพฤติกรรมผู้ชมในจีน",
  },
  Douyin: {
    format: "Short video · 9:16",
    title: "一个创意，连接每个市场",
    body: "สคริปต์วิดีโอสั้นสำหรับจีน พร้อมจังหวะเปิดเรื่อง คำบรรยาย และคำกระตุ้นการมีส่วนร่วม",
  },
  Weibo: {
    format: "Feed post",
    title: "让一个创意走向全球",
    body: "โพสต์ข่าวและบทสนทนาสำหรับการกระจายต่อในระบบสังคมออนไลน์ของจีน",
  },
  Xiaohongshu: {
    format: "Lifestyle note · 3:4",
    title: "全球内容团队的效率指南",
    body: "เล่าเรื่องแบบประสบการณ์จริง พร้อมหัวข้อค้นหาและภาพที่เหมาะกับชุมชน Xiaohongshu",
  },
  KakaoTalk: {
    format: "Channel message · Card",
    title: "글로벌 콘텐츠를 한 번에",
    body: "ข้อความสำหรับ KakaoTalk Channel ที่กระชับ เหมาะกับการแจ้งข่าวและสร้างการตอบกลับ",
  },
  "Naver Blog": {
    format: "Search article",
    title: "글로벌 콘텐츠 운영 시스템",
    body: "บทความเชิงค้นหาสำหรับเกาหลี พร้อมโครงสร้างหัวข้อ คีย์เวิร์ด และภาพประกอบ",
  },
};

const storageNotReady = "Campaign storage is being prepared. Please retry shortly.";

type OrderablePost = { id: string; channel: string; createdAt: Date };

/** SQL returns rows in no guaranteed order, so a campaign's posts follow its
 * saved channel list. Legacy posts whose channel is not listed come after the
 * listed ones; extra posts for the same position are ordered by creation time,
 * then id, so the order never depends on how SQLite scanned the rows. */
function orderBySavedChannels<T extends OrderablePost>(posts: T[], channels: unknown) {
  const position = new Map<string, number>();
  for (const channel of Array.isArray(channels) ? channels : []) {
    if (typeof channel === "string" && !position.has(channel)) position.set(channel, position.size);
  }
  const rank = (post: T) => position.get(post.channel) ?? position.size;
  const time = (post: T) => {
    const value = post.createdAt instanceof Date ? post.createdAt.getTime() : Number.NaN;
    return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
  };
  return [...posts].sort((a, b) =>
    rank(a) - rank(b) || time(a) - time(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export async function GET() {
  try {
    const db = getDb();
    // Newest first; the unique id breaks creation-time ties so the same 8
    // campaigns are chosen whichever plan SQLite uses.
    const recentCampaigns = await db
      .select()
      .from(campaigns)
      .orderBy(desc(campaigns.createdAt), asc(campaigns.id))
      .limit(8);
    const ids = recentCampaigns.map((campaign) => campaign.id);
    // Internal queue state lets Studio offer a truthful repair for legacy posts
    // scheduled without a publish job. Each post and its linked job come from
    // one statement, so a schedule or cancel committing meanwhile cannot pair
    // one moment's post with another moment's job (the unique post index
    // allows at most one). Filtering by campaign keeps D1 bound parameters at
    // the campaign count rather than the post count.
    const rows = ids.length
      ? await db
          .select({ post: campaignPosts, linkedJobId: publishJobs.id, linkedJobStatus: publishJobs.status })
          .from(campaignPosts)
          .leftJoin(publishJobs, eq(publishJobs.postId, campaignPosts.id))
          .where(inArray(campaignPosts.campaignId, ids))
      : [];
    const posts = rows.map(({ post, linkedJobId, linkedJobStatus }) => ({
      ...post,
      publishJob: linkedJobId !== null && linkedJobStatus !== null ? { id: linkedJobId, status: linkedJobStatus } : null,
    }));

    return Response.json({
      campaigns: recentCampaigns.map((campaign) => ({
        ...campaign,
        posts: orderBySavedChannels(posts.filter((post) => post.campaignId === campaign.id), campaign.channels),
      })),
    });
  } catch (error) {
    if (error instanceof CanonicalLocalizationError) return Response.json({ error: error.message }, { status: 400 });
    return internalErrorResponse("GET /api/campaigns", error, storageNotReady);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      canonical?: unknown;
      brief?: string;
      language?: string;
      tone?: string;
      channels?: string[];
    };
    const brief = payload.brief?.trim() ?? "";
    const language = payload.language?.trim() ?? "th";
    const tone = payload.tone?.trim() ?? "อบอุ่นและมั่นใจ";
    const channels = Array.from(new Set(payload.channels ?? [])).filter((channel) => channel in channelTemplates);

    if (!brief) return Response.json({ error: "brief is required" }, { status: 400 });
    if (!isSupportedNirvaLanguage(language)) {
      return Response.json({ error: "language is not supported by the 21-language NLE registry" }, { status: 400 });
    }
    if (!channels.length) return Response.json({ error: "at least one supported channel is required" }, { status: 400 });

    const canonical = guardLocalization(payload.canonical, language);
    const db = getDb();
    const campaignId = crypto.randomUUID();
    const now = new Date();
    const localizedCopy = getLocalizedCampaignCopy(language);
    const languageInfo = getNirvaLanguage(language)!;
    const postRows = channels.map((channel) => {
      const template = channelTemplates[channel];
      const adapted = adaptActiveChannelText(localizedCopy.body, channel);
      return {
        id: crypto.randomUUID(),
        campaignId,
        canonical,
        channel,
        format: template.format,
        title: localizedCopy.title,
        body: adapted.body,
        status: "draft",
        createdAt: now,
      };
    });

    const campaignRow = {
      id: campaignId,
      brief,
      language,
      tone,
      channels,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };

    await db.batch([
      db.insert(campaigns).values(campaignRow),
      db.insert(campaignPosts).values(postRows),
    ]);

    return Response.json({
      campaign: { ...campaignRow, posts: postRows },
      localization: {
        language: languageInfo,
        mode: "curated-nle-preview",
        providerTranslation: false,
      },
      continuity: {
        source: CLAUDE_MEDIA_SOURCE,
        adaptedChannels: channels.map((channel) => ({
          channel,
          ...adaptActiveChannelText(localizedCopy.body, channel),
        })),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof CanonicalLocalizationError) return Response.json({ error: error.message }, { status: 400 });
    return internalErrorResponse("POST /api/campaigns", error, storageNotReady);
  }
}
