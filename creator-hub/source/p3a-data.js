/* ---------- rate card (Artslab Creatives, valid until 31 Dec 2026) ---------- */
const USD_PER_LKR = 1 / 332.23; // rate seen on 25 Oct 2026
const RATE_CARD = [
  ["Social media", [
    ["Static Post", 10000], ["Story Post", 5000], ["Template based Carousel – 5 Slides", 15000],
    ["Carousel – Individual 5 Slides", 25000], ["Template based Carousel Post (6–10 Slides)", 18500],
    ["Template based Carousel Post (More than 10 Slides)", 20000]]],
  ["Motion graphics", [
    ["Animated Video (Up to 15 Seconds)", 15000], ["Animated Video (Up to 30 Seconds)", 25000],
    ["Animated Video (Up to 1 Minute)", 35000], ["Animated Video (Above 1 Minute – Per Additional 30 Seconds)", 10000]]],
  ["AI video", [
    ["AI Video (Up to 15 Seconds) – With AI Voice", 30000], ["AI Video (Up to 15 Seconds) – Without AI Voice", 25000],
    ["AI Video (Up to 30 Seconds) – With AI Voice", 40000], ["AI Video (Up to 30 Seconds) – Without AI Voice", 35000],
    ["AI Video (Up to 1 Minute) – With AI Voice", 50000], ["AI Video (Up to 1 Minute) – Without AI Voice", 45000]]],
  ["Video production", [
    ["Footage based Video Editing (Up to 15 Seconds)", 15000], ["Footage based Video Editing (Up to 30 Seconds)", 20000],
    ["Footage based Video Editing (Up to 1 Minute)", 25000], ["Video Shoot (4 Hours) – 1 DOP", 150000],
    ["Video Shoot (4 Hours) – 2 DOP", 195000], ["Video Shoot (8 Hours) – 1 DOP", 195000],
    ["Video Shoot (8 Hours) – 2 DOP", 295000], ["4 Hour Mobile Shoot with 1 DOP", 40000],
    ["8 Hour Mobile Shoot with 1 DOP", 65000], ["4 Hour Photoshoot for 100 Stills with Retouching", 75000],
    ["8 Hour Photoshoot for 150–200 Stills with Retouching", 125000], ["Drone Videography (Optional) – 4 Hours", 45000],
    ["Voice-over Recording – Studio Charges for 2 Hours", 8000, "Voice artist charges vary depending on the artist."]]],
  ["Print & marketing", [
    ["Poster Design", 15000], ["Dangler Design", 10000], ["Wobbler Design", 10000], ["X-Pennant Design", 25000],
    ["Billboard Design", 30000], ["Backdrop Design", 30000], ["Shopping Bags", 15000], ["Counter Top", 15000],
    ["Invitation Card Design", 8000], ["Catalogue Design (Per Page)", 15000], ["Leaflet / Flyer Design (Single Side)", 15000],
    ["Brochure Design (Bi-fold / Tri-fold)", 15000], ["Company Profile Design", 15000], ["Standee Design", 25000]]],
  ["Branding & corporate", [
    ["Logo Design", 15000], ["Business Card Design", 5000], ["Letterhead Design", 5000], ["Email Signature Design", 5000],
    ["Presentation (Per Slide)", 5000], ["Certificate Design", 8000], ["Lorry / Vehicle Branding – Single Side", 35000],
    ["Table Calendar Design (Per Page)", 20000], ["Wall Calendar Design (Per Page)", 25000], ["Product Package Design", 45000],
    ["Carton Design", 20000], ["Carton Resizing", 12500], ["Product Label Design", 30000],
    ["Product Label Resizing (Per Label)", 20000]]],
];

/* International prices (USD). Items below were set from marketplace price checks (Fiverr canva-post packs,
   Fiverr logo and brand gigs, video-edit averages, AI and motion packages from a Sri Lankan studio selling abroad).
   Every other item is the LKR rate converted and rounded to the nearest $5. */
const USD_SET = {
  "Static Post": 25, "Story Post": 12, "Template based Carousel – 5 Slides": 35, "Carousel – Individual 5 Slides": 60,
  "Template based Carousel Post (6–10 Slides)": 45, "Template based Carousel Post (More than 10 Slides)": 55,
  "Animated Video (Up to 15 Seconds)": 60, "Animated Video (Up to 30 Seconds)": 100, "Animated Video (Up to 1 Minute)": 150,
  "Animated Video (Above 1 Minute – Per Additional 30 Seconds)": 50,
  "AI Video (Up to 15 Seconds) – With AI Voice": 75, "AI Video (Up to 15 Seconds) – Without AI Voice": 60,
  "AI Video (Up to 30 Seconds) – With AI Voice": 110, "AI Video (Up to 30 Seconds) – Without AI Voice": 90,
  "AI Video (Up to 1 Minute) – With AI Voice": 150, "AI Video (Up to 1 Minute) – Without AI Voice": 130,
  "Footage based Video Editing (Up to 15 Seconds)": 40, "Footage based Video Editing (Up to 30 Seconds)": 55,
  "Footage based Video Editing (Up to 1 Minute)": 75, "Logo Design": 75,
};
const toUsd = (lkr) => Math.max(5, Math.round(lkr * USD_PER_LKR / 5) * 5);

/* Common bundles seen in the Sri Lankan market, priced from your own rates. */
const PACKAGES = [
  { name: "Social Media Starter (monthly)", rate: 75000,
    lines: [["Static Post", 8], ["Story Post", 4], ["Template based Carousel – 5 Slides", 1]], extra: ["Monthly content calendar"],
    refLocal: "Local agencies charge about LKR 65,000–80,000 a month for 6–8 posts plus stories. A basic tier elsewhere is LKR 30,000–75,000.",
    refIntl: "Fiverr Canva sellers: $55–75 for 5–7 designs, with carousels." },
  { name: "Social Media Growth (monthly)", rate: 150000,
    lines: [["Static Post", 12], ["Story Post", 8], ["Template based Carousel – 5 Slides", 2], ["Animated Video (Up to 15 Seconds)", 2]], extra: ["Monthly content calendar"],
    refLocal: "Local agencies: from LKR 150,000 for 15+ posts and 15+ stories or reels, and LKR 180,000 for two platforms with ad strategy.",
    refIntl: "No international package at this size found. Priced from your own rates." },
  { name: "Brand Identity Starter", rate: 40000,
    lines: [["Logo Design", 1], ["Business Card Design", 1], ["Letterhead Design", 1], ["Email Signature Design", 1]], extra: ["Colour palette and font guide"],
    refLocal: "One local agency sells a starter brand pack for LKR 49,999 (3 logo concepts, colour and font guide, business card). A logo alone is LKR 20,000–40,000.",
    refIntl: "Fiverr brand identity gigs start from about $75. 99designs logo contests run $249–$1,050." },
  { name: "Brand Identity Pro", rate: 90000,
    lines: [["Logo Design", 1], ["Business Card Design", 1], ["Letterhead Design", 1], ["Email Signature Design", 1], ["Presentation (Per Slide)", 10], ["Static Post", 5]],
    extra: ["Brand guidelines PDF", "Social profile covers"],
    refLocal: "One local agency sells a pro brand pack for LKR 99,999 (brand guidelines, letterhead, presentation template, social pack).",
    refIntl: "Fiverr brand guideline gigs run from $25 up to about $795 for vetted pros." },
  { name: "Brand + Launch Suite", rate: 180000,
    lines: [["Logo Design", 1], ["Business Card Design", 1], ["Letterhead Design", 1], ["Email Signature Design", 1], ["Presentation (Per Slide)", 10], ["Static Post", 5],
      ["Animated Video (Up to 30 Seconds)", 1], ["Footage based Video Editing (Up to 30 Seconds)", 3]],
    extra: ["Brand guidelines PDF", "1-month content calendar"],
    refLocal: "One local agency sells a full creative suite for LKR 199,999 (brand pack, content calendar, 3 reels, a 30–60 second brand video).",
    refIntl: "No international package at this size found. Priced from your own rates." },
  { name: "Promo Video Package", rate: 165000,
    lines: [["Video Shoot (4 Hours) – 1 DOP", 1], ["Footage based Video Editing (Up to 1 Minute)", 1]], extra: [],
    refLocal: "Local studios start brand films from about LKR 149,999 per project.",
    refIntl: "No international package for a shoot found. Priced from your own rates." },
  { name: "Mobile Reels Package", rate: 85000,
    lines: [["4 Hour Mobile Shoot with 1 DOP", 1], ["Footage based Video Editing (Up to 30 Seconds)", 3]], extra: [],
    refLocal: "No local price list found for this one. Priced from your own rates.",
    refIntl: "No international price list found for this one. Priced from your own rates." },
  { name: "Product Launch Package", rate: 135000,
    lines: [["4 Hour Photoshoot for 100 Stills with Retouching", 1], ["4 Hour Mobile Shoot with 1 DOP", 1], ["Footage based Video Editing (Up to 30 Seconds)", 2]], extra: [],
    refLocal: "No local price list found for this one. Priced from your own rates.",
    refIntl: "No international price list found for this one. Priced from your own rates." },
];

function rateCardServices() {
  const out = [];
  RATE_CARD.forEach(([cat, items]) => items.forEach(([name, rate, note]) =>
    out.push({ id: "rc" + out.length, cat, name, rate, usd: USD_SET[name] || toUsd(rate), note: note || "" })));
  PACKAGES.forEach((p, i) => out.push({
    id: "pk" + i, cat: "Packages", pkg: true, name: p.name, rate: p.rate, usd: toUsd(p.rate), note: "",
    lines: p.lines, inc: p.lines.map(([n, q]) => q + " × " + n).concat(p.extra), refLocal: p.refLocal, refIntl: p.refIntl,
  }));
  return out;
}
const svcRate = (name) => (rateCardServices().find((s) => s.name === name) || { rate: 0 }).rate;

/* Keep anything the user edited; add new fields and new items. */
function mergeRateCard(existing) {
  const fresh = rateCardServices();
  const merged = fresh.map((f) => {
    const e = existing.find((x) => x.name === f.name);
    return e ? { ...f, id: e.id, rate: e.rate, usd: e.usd != null ? e.usd : f.usd, cat: f.pkg ? "Packages" : (e.cat || f.cat) } : f;
  });
  return merged.concat(existing.filter((e) => !fresh.some((f) => f.name === e.name)));
}

const newEstimate = () => ({ client: "", qty: {}, discount: 0, discountUsd: 0, market: "local" });

function exampleState() {
  const p = (client, title, type, status, due, notes) => ({ id: uid(), client, title, type, status, due, value: svcRate(type), notes });
  const projects = [
    p("Example · Hill Country Café", "Menu photography", "4 Hour Photoshoot for 100 Stills with Retouching", "inquiry", addDays(14), "Wants 12 dishes, natural light."),
    p("Example · Ceylon Trails Co.", "Tea estate brand film", "Animated Video (Up to 1 Minute)", "quoted", addDays(21), "Quote sent, waiting for approval."),
    p("Example · Surf Camp Weligama", "Logo and sticker set", "Logo Design", "editing", addDays(6), "Round 2 of revisions."),
    p("Example · Sigiriya Stay", "Sunrise travel reel with drone", "4 Hour Mobile Shoot with 1 DOP", "shooting", addDays(2), "Bring ND filters."),
    p("Example · Kandy Perahera Tours", "Festival highlight video", "Footage based Video Editing (Up to 1 Minute)", "delivered", addDays(-5), "Files delivered, invoice due."),
    p("Example · Galle Fort Boutique", "Product package", "Product Package Design", "paid", addDays(-20), ""),
  ];
  const doc = (kind, no, status, client, date, due, items, discount, notes) =>
    ({ id: uid(), kind, no, status, client, email: "", date, due, taxPct: 0, discount, notes, items, currency: "LKR" });
  const invoices = [
    doc("invoice", 1, "sent", "Example · Kandy Perahera Tours", addDays(-5), addDays(-1), [{ desc: "Footage based Video Editing (Up to 1 Minute)", qty: 1, rate: 25000 }], 0, ""),
    doc("invoice", 2, "paid", "Example · Galle Fort Boutique", addDays(-20), addDays(-6), [{ desc: "Product Package Design", qty: 1, rate: 45000 }], 0, ""),
    doc("quote", 1, "sent", "Example · Ceylon Trails Co.", addDays(-2), addDays(12), [{ desc: "Animated Video (Up to 1 Minute)", qty: 1, rate: 35000 }, { desc: "Drone Videography (Optional) – 4 Hours", qty: 1, rate: 45000 }], 5000, "Valid for 14 days."),
  ];
  return {
    examples: true,
    clients: [
      { id: uid(), name: "Example · Hill Country Café", phone: "", email: "", notes: "Menu photography. Prefers WhatsApp." },
      { id: uid(), name: "Example · Kandy Perahera Tours", phone: "", email: "", notes: "Usually pays within a week." },
    ],
    posts: [
      { id: uid(), date: addDays(1), title: "Sunrise reel teaser", platform: "Instagram", format: "Reel", status: "planned", client: "", caption: "", hashtags: "", notes: "Example post. Edit or delete it." },
      { id: uid(), date: addDays(4), title: "Behind the scenes carousel", platform: "Instagram", format: "Carousel", status: "idea", client: "", caption: "", hashtags: "", notes: "" },
      { id: uid(), date: "", title: "Gear tour video", platform: "YouTube", format: "Video", status: "idea", client: "", caption: "", hashtags: "", notes: "Example idea without a date." },
    ],
    estimate: newEstimate(),
    settings: {
      brand: "Artslab Creatives", email: "", phone: "", address: "", currency: "LKR", rateCardV: 2,
      terms: "Rates valid until 31 Dec 2026. Payment due within 14 days.", nextInv: 3, nextQuo: 2, services: rateCardServices(), paymentInfo: "", depositPct: 50, validUntil: "31 Dec 2026",
    },
    projects, invoices,
  };
}

function blankState() {
  const s = exampleState();
  return { examples: false, clients: [], estimate: newEstimate(), settings: { ...s.settings, nextInv: 1, nextQuo: 1 }, projects: [], invoices: [], posts: [] };
}
