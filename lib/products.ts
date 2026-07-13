export type Variant = { name: string; swatch: string; image: string; price?: number };

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
  tileBleed?: boolean;
  /* Nike-style products grid */
  gridImage?: string;
  variants?: Variant[];
  /* Nike-style product detail page */
  pdp?: {
    photos: string[];
    styleCode?: string;
    colourShownEn?: string;
    colourShownUk?: string;
    shortEn: string;
    shortUk: string;
    benefitsEn?: string[];
    benefitsUk?: string[];
    tipsEn?: string[];
    tipsUk?: string[];
    specs?: { labelEn: string; labelUk: string; value: string }[];
    statementEn?: string;
    statementUk?: string;
    features?: { icon: "flame" | "clock" | "hands" | "wave"; titleEn: string; titleUk: string; textEn: string; textUk: string }[];
  };
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
    image: "/images/hmd-acraft-cut.png",
    gridImage: "/images/hmd-acraft-cut.png",
    pdp: {
      photos: [
        "/images/hmd-acraft-cut.png",
        "/images/hmd-acraft-1.png",
        "/images/hmd-acraft-2.png",
        "/images/hmd-acraft-3.png",
      ],
      styleCode: "9E418",
      colourShownEn: "Tactical Grey",
      colourShownUk: "Тактичний сірий",
      shortEn:
        "Engineered for uniform heat distribution without extreme temperature swings. Inspired by the precision of weaponry, this high-quality, non-toxic aluminium device delivers mild, consistent smoking with extended session duration. Set it and forget it — no constant coal manipulation required.",
      shortUk:
        "Розроблений для рівномірного розподілу тепла без екстремальних перепадів температури. Натхненний точністю зброї, цей високоякісний нетоксичний алюмінієвий пристрій забезпечує м'яке, стабільне куріння та довші сесії. Встановив — і забув: жодних постійних маніпуляцій з вугіллям.",
      benefitsEn: [
        "Mildness of smoking with rich, consistent flavour",
        "Extended session duration (90+ minutes with proper use)",
        "Effortless experience — no constant coal rotation or adjustments",
        "Heating time of approximately 6 minutes under wind cover",
      ],
      benefitsUk: [
        "М'якість куріння з насиченим, стабільним смаком",
        "Подовжена тривалість сесії (90+ хвилин за правильного використання)",
        "Без зусиль — не потрібно постійно обертати чи поправляти вугілля",
        "Час нагріву — близько 6 хвилин під вітрозахистом",
      ],
      tipsEn: [
        "Never cool the device with water",
        "Use only soft, non-abrasive cloths for cleaning",
        "Do not preheat the HMD using a charcoal lighter",
      ],
      tipsUk: [
        "Ніколи не охолоджуйте пристрій водою",
        "Для чищення використовуйте лише м'які неабразивні серветки",
        "Не розігрівайте HMD на плитці для вугілля",
      ],
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", value: "Non-toxic aluminium" },
        { labelEn: "Surface", labelUk: "Поверхня", value: "A.Craft surface treatment" },
        { labelEn: "Heating time", labelUk: "Час нагріву", value: "≈ 6 min under wind cover" },
        { labelEn: "Session duration", labelUk: "Тривалість сесії", value: "90+ min with proper use" },
        { labelEn: "Weight", labelUk: "Вага", value: "—" },
        { labelEn: "Dimensions", labelUk: "Розміри", value: "—" },
      ],
      statementEn: "Set it. Forget it. Smoke longer.",
      statementUk: "Встановив. Забув. Куриш довше.",
      features: [
        { icon: "wave", titleEn: "Flavour", titleUk: "Смак", textEn: "Mild & consistent", textUk: "М'який і стабільний" },
        { icon: "clock", titleEn: "Session", titleUk: "Сесія", textEn: "90+ minutes", textUk: "90+ хвилин" },
        { icon: "hands", titleEn: "Effort", titleUk: "Зусилля", textEn: "Zero coal fuss", textUk: "Жодної метушні" },
        { icon: "flame", titleEn: "Heat-up", titleUk: "Нагрів", textEn: "≈ 6 minutes", textUk: "≈ 6 хвилин" },
      ],
    },
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
    tileBg: "#f5f5f7",
    tileScale: 1.5,
    gridImage: "/images/hmd-op-2-cut.png",
    variants: [
      { name: "Black", swatch: "#1c1c1e", image: "/images/hmd-op-2-cut.png", price: 21 },
      { name: "Purple", swatch: "#4a3d84", image: "/images/hmd-op-1-cut.png", price: 24 },
    ],
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
    tileImage: "/images/killer-bowl-tile.png",
    tileBg: "#f5f5f7",
    tileTitle: "KILLER BOWL",
    tileScale: 1.0,
    gridImage: "/images/killer-bowl-tile.png",
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
    gridImage: "/images/bowl-livanka-1-cut.png",
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
    tileImage: "/images/ftp-bowl-tile.png",
    tileBg: "linear-gradient(180deg, #c9e6f6 0%, #e9f5fb 55%, #ffffff 100%)",
    tileTitle: "FTP BOWL",
    tileScale: 1.0,
    gridImage: "/images/ftp-bowl-tile.png",
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
    tileImage: "/images/windcover-tile.png",
    tileBg: "linear-gradient(180deg, #c9e6f6 0%, #e9f5fb 55%, #ffffff 100%)",
    tileScale: 1.18,
    tileBleed: true,
    gridImage: "/images/windcover-tile.png",
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
