type LocalizedCampaignCopy = { title: string; body: string };

/**
 * Reviewed starter copy for the 21-language Studio preview. This is deliberately
 * deterministic: provider-backed translation and translation memory remain a
 * separate integration step and are not presented as active on the Sites build.
 */
const localizedCopy: Record<string, LocalizedCampaignCopy> = {
  th: { title: "หนึ่งไอเดีย ไปได้ทุกตลาด", body: "สร้างคอนเทนต์ครั้งเดียว แล้วปรับให้เหมาะกับภาษา ช่องทาง และผู้ชมในแต่ละประเทศ" },
  en: { title: "One idea for every market", body: "Create content once, then adapt it for each language, channel, and local audience." },
  ja: { title: "ひとつのアイデアを、すべての市場へ", body: "コンテンツを一度作成し、各地域の言語、チャネル、オーディエンスに合わせて最適化します。" },
  zh: { title: "一个创意，走向每个市场", body: "一次创作，再根据各地的语言、渠道和受众进行调整。" },
  ko: { title: "하나의 아이디어로 모든 시장에", body: "콘텐츠를 한 번 만들고 각 지역의 언어, 채널, 고객에 맞게 조정하세요." },
  vi: { title: "Một ý tưởng cho mọi thị trường", body: "Tạo nội dung một lần rồi điều chỉnh cho từng ngôn ngữ, kênh và khán giả địa phương." },
  id: { title: "Satu ide untuk setiap pasar", body: "Buat konten sekali, lalu sesuaikan untuk setiap bahasa, kanal, dan audiens lokal." },
  ms: { title: "Satu idea untuk setiap pasaran", body: "Cipta kandungan sekali, kemudian sesuaikan untuk setiap bahasa, saluran dan khalayak tempatan." },
  my: { title: "စိတ်ကူးတစ်ခုဖြင့် ဈေးကွက်တိုင်းသို့", body: "အကြောင်းအရာကို တစ်ကြိမ်ဖန်တီးပြီး ဒေသတစ်ခုစီ၏ ဘာသာစကား၊ ချန်နယ်နှင့် ပရိသတ်အတွက် ပြင်ဆင်ပါ။" },
  km: { title: "គំនិតមួយ សម្រាប់គ្រប់ទីផ្សារ", body: "បង្កើតមាតិកាម្តង រួចសម្របតាមភាសា បណ្តាញ និងទស្សនិកជនក្នុងតំបន់នីមួយៗ។" },
  lo: { title: "ໜຶ່ງແນວຄິດ ໄປໄດ້ທຸກຕະຫຼາດ", body: "ສ້າງເນື້ອຫາຄັ້ງດຽວ ແລ້ວປັບໃຫ້ເໝາະກັບພາສາ ຊ່ອງທາງ ແລະຜູ້ຊົມໃນແຕ່ລະພື້ນທີ່." },
  tl: { title: "Isang ideya para sa bawat merkado", body: "Gumawa ng content nang isang beses at iangkop ito sa bawat wika, channel, at lokal na audience." },
  es: { title: "Una idea para cada mercado", body: "Crea el contenido una vez y adáptalo a cada idioma, canal y audiencia local." },
  fr: { title: "Une idée pour chaque marché", body: "Créez votre contenu une fois, puis adaptez-le à chaque langue, canal et public local." },
  de: { title: "Eine Idee für jeden Markt", body: "Erstellen Sie Inhalte einmal und passen Sie sie an Sprache, Kanal und lokales Publikum an." },
  pt: { title: "Uma ideia para cada mercado", body: "Crie o conteúdo uma vez e adapte-o para cada idioma, canal e público local." },
  it: { title: "Un’idea per ogni mercato", body: "Crea i contenuti una volta e adattali a ogni lingua, canale e pubblico locale." },
  ru: { title: "Одна идея для каждого рынка", body: "Создайте контент один раз, а затем адаптируйте его для каждого языка, канала и местной аудитории." },
  ar: { title: "فكرة واحدة لكل سوق", body: "أنشئ المحتوى مرة واحدة، ثم كيّفه لكل لغة وقناة وجمهور محلي." },
  he: { title: "רעיון אחד לכל שוק", body: "צרו תוכן פעם אחת והתאימו אותו לכל שפה, ערוץ וקהל מקומי." },
  hi: { title: "एक विचार, हर बाज़ार के लिए", body: "कंटेंट एक बार बनाएँ, फिर उसे हर भाषा, चैनल और स्थानीय दर्शक के अनुसार ढालें।" },
};

export function getLocalizedCampaignCopy(language: string): LocalizedCampaignCopy {
  return localizedCopy[language] ?? localizedCopy.en;
}
