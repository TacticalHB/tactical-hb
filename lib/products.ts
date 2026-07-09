export type Product = {
  id: string;
  slug: string;
  nameUk: string;
  nameEn: string;
  taglineUk: string;
  taglineEn: string;
  descriptionUk: string;
  descriptionEn: string;
  price: number;
  currency: string;
  category: "hmd" | "bowl" | "accessory";
  featured: boolean;
  image: string;
  photos?: string[];
  /* Apple-style flagship tile: hero cut-out + flat background fill */
  tileImage?: string;
  tileBg?: string;
  tileTitle?: string;
  tileScale?: number;
  tags: string[];
};

export const products: Product[] = [
  {
    id: "hmd-tct-classic",
    slug: "hmd-tct-classic",
    nameUk: "HMD TCT Classic",
    nameEn: "HMD TCT Classic",
    taglineUk: "Класичний алюміній. Відмінна продуктивність.",
    taglineEn: "Classic aluminium. Excellent performance.",
    descriptionUk: "Класична версія з алюмінію для відмінної продуктивності. Рівномірний розподіл тепла без екстремальних температур. Включає кришку.",
    descriptionEn: "Classic aluminium version for excellent performance. Uniform heat distribution without temperature extremes. Includes lid.",
    price: 14.5,
    currency: "EUR",
    category: "hmd",
    featured: true,
    image: "/images/hmd-classic.jpg",
    tags: ["aluminium", "lid", "classic"],
  },
  {
    id: "hmd-a-craft",
    slug: "hmd-a-craft",
    nameUk: "HMD A.Craft",
    nameEn: "HMD A.Craft",
    taglineUk: "Крафтове видання з обробкою поверхні.",
    taglineEn: "Surface-treated craft edition.",
    descriptionUk: "Видання A.Craft з обробкою поверхні алюмінію. Без кришки. Унікальна тактична естетика.",
    descriptionEn: "A.Craft edition with aluminium surface treatment. Without lid. Unique tactical aesthetic.",
    price: 12,
    currency: "EUR",
    category: "hmd",
    featured: true,
    image: "/images/hmd-acraft.jpg",
    tags: ["aluminium", "surface treatment"],
  },
  {
    id: "hmd-tct-op",
    slug: "hmd-tct-op",
    nameUk: "HMD TCT OP",
    nameEn: "HMD TCT OP",
    taglineUk: "100% антипригарна поверхня.",
    taglineEn: "100% non-stick surface.",
    descriptionUk: "Повністю антипригарне покриття (100% без PFOA). Запобігає прилипанню тютюну, легке очищення. Доступний у фіолетовому та чорному кольорах.",
    descriptionEn: "Fully non-stick surface treatment (100% PFOA FREE). Prevents tobacco adhesion, easy cleaning. Available in purple and black.",
    price: 21,
    currency: "EUR",
    category: "hmd",
    featured: true,
    image: "/images/hmd-op-1-cut.png",
    tileImage: "/images/hmd-op-2-cut.png",
    tileBg: "#d5d8d9",
    tileScale: 1.38,
    tags: ["non-stick", "PFOA free", "premium"],
  },
  {
    id: "bowl-killer",
    slug: "bowl-killer",
    nameUk: "Tactical Killer",
    nameEn: "Tactical Killer",
    taglineUk: "Ручна натуральна глина.",
    taglineEn: "Handmade natural clay.",
    descriptionUk: "Класична форма ручної роботи з натуральної глини. Сильний та насичений дим. Оптимальна товщина стінок для стабільного утримання тепла.",
    descriptionEn: "Classic handmade bowl from natural clay. Strong and rich smoke. Optimal wall thickness for steady heat retention.",
    price: 6.2,
    currency: "EUR",
    category: "bowl",
    featured: true,
    image: "/images/killer-bowl-cut.png",
    tileImage: "/images/killer-bowl-cut.png",
    tileBg: "#d5d8d9",
    tileTitle: "KILLER BOWL",
    tileScale: 1.28,
    tags: ["clay", "handmade", "classic"],
  },
  {
    id: "bowl-livanka",
    slug: "bowl-livanka",
    nameUk: "Tactical Livanka",
    nameEn: "Tactical Livanka",
    taglineUk: "Яскраві, м'які соло-сесії.",
    taglineEn: "Bright, soft solo sessions.",
    descriptionUk: "Ручна робота з натуральної глини. Яскравий та м'який дим 35–40 хвилин. Для індивідуального використання. Ємність 10–12 г.",
    descriptionEn: "Handmade from natural clay. Bright and soft smoke for 35–40 minutes. For solo use. Capacity 10–12g.",
    price: 5.5,
    currency: "EUR",
    category: "bowl",
    featured: false,
    image: "/images/bowl-livanka-1-cut.png",
    tags: ["clay", "handmade", "solo"],
  },
  {
    id: "bowl-phunnel",
    slug: "bowl-phunnel",
    nameUk: "Tactical 0.66 F.CK THE PHUNNEL",
    nameEn: "Tactical 0.66 F.CK THE PHUNNEL",
    taglineUk: "Ручна натуральна глина.",
    taglineEn: "Handmade natural clay.",
    descriptionUk: "Класичний фанель з унікальною вставкою. Неймовірна насиченість та м'якість диму. Для тих, хто цінує процес.",
    descriptionEn: "Classic phunnel with unique insert. Incredible richness and mildness of smoke. For those who value the process.",
    price: 7.3,
    currency: "EUR",
    category: "bowl",
    featured: true,
    image: "/images/ftp-bowl-cut.png",
    tileImage: "/images/ftp-bowl-cut.png",
    tileBg: "#DAF5FF",
    tileTitle: "FTP BOWL",
    tileScale: 1.28,
    tags: ["phunnel", "handmade"],
  },
  {
    id: "windcover-bomb-cap",
    slug: "windcover-bomb-cap",
    nameUk: "TCT Windcover «Bomb Cap»",
    nameEn: "TCT Windcover «Bomb Cap»",
    taglineUk: "Вітрозахист із перезаряджуваним таймером.",
    taglineEn: "Rechargeable timer windcover.",
    descriptionUk: "Type-C зарядка. Вбудований таймер з налаштуванням хвилин та секунд. Час нагріву 6 хвилин під вітрозахистом.",
    descriptionEn: "Type-C rechargeable. Built-in timer with minute and second settings. Heating time 6 min under wind cover.",
    price: 22,
    currency: "EUR",
    category: "accessory",
    featured: true,
    image: "/images/windcover-hero-cut.png",
    tileImage: "/images/windcover-timer-cut.png",
    tileBg: "#DAF5FF",
    tileScale: 1.0,
    tags: ["timer", "Type-C", "windcover"],
  },
];

const bySlug = (slug: string) => products.find((p) => p.slug === slug)!;

// Flagship 2x2 grid — explicit order: top-left, top-right, bottom-left, bottom-right
export const featuredProducts = [
  bySlug("bowl-phunnel"),        // FTP BOWL — sky blue
  bySlug("bowl-killer"),         // KILLER BOWL — grey
  bySlug("hmd-tct-op"),          // HMD TCT OP — grey
  bySlug("windcover-bomb-cap"),  // Windcover — sky blue
];
