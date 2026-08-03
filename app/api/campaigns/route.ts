import { desc, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { campaignPosts, campaigns } from "../../../db/schema";

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

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("no such table")) {
    return "Campaign storage is being prepared. Please retry shortly.";
  }
  return message;
}

export async function GET() {
  try {
    const db = getDb();
    const recentCampaigns = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt)).limit(8);
    const ids = recentCampaigns.map((campaign) => campaign.id);
    const posts = ids.length
      ? await db.select().from(campaignPosts).where(inArray(campaignPosts.campaignId, ids))
      : [];

    return Response.json({
      campaigns: recentCampaigns.map((campaign) => ({
        ...campaign,
        posts: posts.filter((post) => post.campaignId === campaign.id),
      })),
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
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
    if (!channels.length) return Response.json({ error: "at least one supported channel is required" }, { status: 400 });

    const db = getDb();
    const campaignId = crypto.randomUUID();
    const now = new Date();
    const postRows = channels.map((channel) => {
      const template = channelTemplates[channel];
      return {
        id: crypto.randomUUID(),
        campaignId,
        channel,
        format: template.format,
        title: template.title,
        body: `${template.body} น้ำเสียง: ${tone}`,
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

    return Response.json({ campaign: { ...campaignRow, posts: postRows } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
