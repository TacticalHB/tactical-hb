export type Variant = { name: string; swatch: string; image: string; price?: number; priceUah?: number };

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
  /** Hand-set UAH price (not a conversion of `price`) — see lib/currency.ts */
  priceUah: number;
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
    specs?: { labelEn: string; labelUk: string; valueEn: string; valueUk: string }[];
    statementEn?: string;
    statementUk?: string;
    features?: { icon: "flame" | "clock" | "hands" | "wave" | "cloud" | "user" | "droplet" | "mesh" | "layers" | "shield" | "sparkle"; titleEn: string; titleUk: string; textEn: string; textUk: string }[];
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
    price: 29,
    priceUah: 1080,
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
    price: 24,
    priceUah: 900,
    currency: "EUR",
    category: "hmd",
    featured: true,
    image: "/images/hmd-acraft-hero.png",
    gridImage: "/images/hmd-acraft-hero.png",
    pdp: {
      photos: [
        "/images/hmd-acraft-hero.png",
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
        { labelEn: "Material", labelUk: "Матеріал", valueEn: "Non-toxic aluminium", valueUk: "Нетоксичний алюміній" },
        { labelEn: "Surface", labelUk: "Поверхня", valueEn: "A.Craft surface treatment", valueUk: "Обробка поверхні A.Craft" },
        { labelEn: "Heating time", labelUk: "Час нагріву", valueEn: "≈ 6 min under wind cover", valueUk: "≈ 6 хв під вітрозахистом" },
        { labelEn: "Session duration", labelUk: "Тривалість сесії", valueEn: "90+ min with proper use", valueUk: "90+ хв за належного використання" },
        { labelEn: "Weight", labelUk: "Вага", valueEn: "—", valueUk: "—" },
        { labelEn: "Dimensions", labelUk: "Розміри", valueEn: "—", valueUk: "—" },
      ],
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
    price: 30,
    priceUah: 1150,
    currency: "EUR",
    category: "hmd",
    featured: true,
    image: "/images/hmd-op-purple.png",
    tileImage: "/images/hmd-op-black.png",
    tileBg: "#f5f5f7",
    tileScale: 1.5,
    gridImage: "/images/hmd-op-black.png",
    variants: [
      { name: "Black", swatch: "#1c1c1e", image: "/images/hmd-op-black.png", price: 30, priceUah: 1150 },
      { name: "Purple", swatch: "#4a3d84", image: "/images/hmd-op-purple.png", price: 32, priceUah: 1200 },
    ],
    pdp: {
      photos: [],
      shortEn:
        "The HMD OP is a heat-management device engineered for overpack smoking. Its fully non-stick, 100% PFOA-free surface repels tobacco residue for clean, consistent heat distribution and effortless cleaning — even through intensive sessions. Precision-built and durable, it comes in black and purple finishes for a refined, tactical aesthetic.",
      shortUk:
        "HMD OP — це пристрій для нагріву, розроблений для куріння в стилі overpack. Повністю антипригарна поверхня (100% без PFOA) відштовхує залишки тютюну, забезпечуючи чистий, рівномірний розподіл тепла та легке очищення навіть під час інтенсивних сесій. Виготовлений з точністю та розрахований на довговічність, доступний у чорному та фіолетовому кольорах.",
      benefitsEn: [
        "Non-stick surface repels residue — bold overpacks without sticking or bitterness",
        "Optimized for overpacking — even heat for massive clouds and rich flavour",
        "Smooth, controlled sessions with a clean, effortless draw",
        "Durable and easy to clean — residue wipes straight off",
        "Doubles as a regular TCT HMD, but built for overpack style",
      ],
      benefitsUk: [
        "Антипригарна поверхня відштовхує залишки — сміливі overpack-набивки без прилипання та гіркоти",
        "Оптимізований для overpack — рівномірне тепло для великих хмар і насиченого смаку",
        "М'які, контрольовані сесії з чистою, легкою тягою",
        "Довговічний і легкий в очищенні — залишки легко витираються",
        "Працює і як звичайний TCT HMD, але створений для overpack-стилю",
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
        { labelEn: "Surface", labelUk: "Поверхня", valueEn: "Fully non-stick", valueUk: "Повністю антипригарна" },
        { labelEn: "Coating", labelUk: "Покриття", valueEn: "100% PFOA FREE", valueUk: "100% БЕЗ PFOA" },
        { labelEn: "Finishes", labelUk: "Кольори", valueEn: "Black & purple", valueUk: "Чорний і фіолетовий" },
        { labelEn: "Material", labelUk: "Матеріал", valueEn: "Tactical-grade inspired", valueUk: "Тактичного класу" },
      ],
      features: [
        { icon: "shield", titleEn: "Surface", titleUk: "Поверхня", textEn: "100% PFOA-free", textUk: "100% без PFOA" },
        { icon: "flame", titleEn: "Overpack", titleUk: "Overpack", textEn: "Even heat", textUk: "Рівномірне тепло" },
        { icon: "wave", titleEn: "Draw", titleUk: "Тяга", textEn: "Smooth & clean", textUk: "М'яка і чиста" },
        { icon: "sparkle", titleEn: "Cleaning", titleUk: "Очищення", textEn: "Wipes clean", textUk: "Легко витерти" },
      ],
    },
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
    price: 11,
    priceUah: 420,
    currency: "EUR",
    category: "bowl",
    featured: true,
    image: "/images/killer-hero-v2.png",
    tileImage: "/images/killer-bowl-tile.png",
    tileBg: "#f5f5f7",
    tileTitle: "KILLER BOWL",
    tileScale: 1.0,
    gridImage: "/images/killer-hero-v2.png",
    pdp: {
      photos: [
        "/images/killer-hero-v2.png",
        "/images/killer-2.png",
        "/images/killer-3.png",
      ],
      colourShownEn: "Matte Black",
      colourShownUk: "Матовий чорний",
      shortEn:
        "The classic shape of a hand-made Killer bowl in natural clay. A well-deserved name — your smoke is strong and rich, while the optimal wall thickness holds heat steadily without overheating your flavour, guaranteeing long sessions free of bitterness.",
      shortUk:
        "Класична форма killer-чаші ручної роботи з натуральної глини. Заслужена назва — дим міцний і насичений, а оптимальна товщина стінок стабільно утримує тепло, не перепалюючи смак, гарантуючи довгі сесії без гіркоти.",
      benefitsEn: [
        "Mildness of smoking with rich, consistent flavour",
        "Extended session duration (70+ minutes with proper use)",
        "Heating time of approximately 6 minutes under wind cover",
      ],
      benefitsUk: [
        "М'якість куріння з насиченим, стабільним смаком",
        "Подовжена тривалість сесії (70+ хвилин за правильного використання)",
        "Час нагріву — близько 6 хвилин під вітрозахистом",
      ],
      tipsEn: [
        "Never cool the device with water",
        "Handle with care — natural clay is fragile",
      ],
      tipsUk: [
        "Ніколи не охолоджуйте виріб водою",
        "Поводьтеся обережно — натуральна глина крихка",
      ],
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", valueEn: "Natural clay", valueUk: "Натуральна глина" },
        { labelEn: "Surface", labelUk: "Поверхня", valueEn: "Glazed black matte", valueUk: "Чорна матова глазур" },
      ],
      features: [
        { icon: "wave", titleEn: "Flavour", titleUk: "Смак", textEn: "Mild & rich", textUk: "М'який і насичений" },
        { icon: "clock", titleEn: "Session", titleUk: "Сесія", textEn: "70+ minutes", textUk: "70+ хвилин" },
        { icon: "flame", titleEn: "Heat-up", titleUk: "Нагрів", textEn: "≈ 6 minutes", textUk: "≈ 6 хвилин" },
        { icon: "hands", titleEn: "Craft", titleUk: "Крафт", textEn: "Handmade", textUk: "Ручна робота" },
      ],
    },
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
    price: 10,
    priceUah: 370,
    currency: "EUR",
    category: "bowl",
    featured: false,
    image: "/images/livanka-hero.png",
    gridImage: "/images/livanka-hero.png",
    pdp: {
      photos: ["/images/livanka-hero.png", "/images/livanka-2.png", "/images/livanka-3.png"],
      colourShownEn: "Matte Black",
      colourShownUk: "Матовий чорний",
      shortEn:
        "A hand-made bowl in natural clay, shaped for a bright, soft smoke that runs 35–40 minutes. A small internal rim holds the molasses in place while the optimal wall thickness keeps the mix from overheating — built for the focused solo session.",
      shortUk:
        "Чаша ручної роботи з натуральної глини, форма якої дарує яскравий і м'який дим протягом 35–40 хвилин. Невеликий внутрішній бортик утримує патоку, а оптимальна товщина стінок не дає суміші перегріватися — створена для зосередженої соло-сесії.",
      benefitsEn: [
        "Bright and soft smoke for 35–40 minutes",
        "Small internal rim that delays molasses",
        "Optimal wall thickness prevents overheating",
        "Designed for solo use",
        "Heating time of approximately 5 minutes under wind cover (2–3 cubes)",
      ],
      benefitsUk: [
        "Яскравий і м'який дим протягом 35–40 хвилин",
        "Невеликий внутрішній бортик, що затримує патоку",
        "Оптимальна товщина стінок запобігає перегріву",
        "Створена для індивідуального використання",
        "Час нагріву — близько 5 хвилин під вітрозахистом (2–3 кубики)",
      ],
      tipsEn: [
        "Never cool the device with water",
        "Handle with care — natural clay is fragile",
      ],
      tipsUk: [
        "Ніколи не охолоджуйте виріб водою",
        "Поводьтеся обережно — натуральна глина крихка",
      ],
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", valueEn: "Natural clay", valueUk: "Натуральна глина" },
        { labelEn: "Tobacco capacity", labelUk: "Ємність тютюну", valueEn: "10–12 g", valueUk: "10–12 г" },
        { labelEn: "Weight", labelUk: "Вага", valueEn: "—", valueUk: "—" },
        { labelEn: "Measurements", labelUk: "Розміри", valueEn: "—", valueUk: "—" },
      ],
      features: [
        { icon: "cloud", titleEn: "Smoke", titleUk: "Дим", textEn: "Bright & soft", textUk: "Яскравий і м'який" },
        { icon: "clock", titleEn: "Session", titleUk: "Сесія", textEn: "35–40 minutes", textUk: "35–40 хвилин" },
        { icon: "user", titleEn: "Made for", titleUk: "Формат", textEn: "Solo use", textUk: "Соло-сесії" },
        { icon: "flame", titleEn: "Heat-up", titleUk: "Нагрів", textEn: "≈ 5 minutes", textUk: "≈ 5 хвилин" },
      ],
    },
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
    price: 13,
    priceUah: 500,
    currency: "EUR",
    category: "bowl",
    featured: true,
    image: "/images/ftp-hero-v2.png",
    tileImage: "/images/ftp-bowl-tile.png",
    tileBg: "linear-gradient(180deg, #c9e6f6 0%, #e9f5fb 55%, #ffffff 100%)",
    tileTitle: "FTP BOWL",
    tileScale: 1.0,
    gridImage: "/images/ftp-hero-v2.png",
    pdp: {
      photos: ["/images/ftp-hero-v2.png", "/images/ftp-2.png", "/images/ftp-3.png"],
      colourShownEn: "Matte Black",
      colourShownUk: "Матовий чорний",
      shortEn:
        "The FTP is a hand-made clay phunnel with a clever 2-in-1 design and two interchangeable inserts. Drop in the aluminium sleeve for a true phunnel — no molasses down the stem, just clean, even airflow — or the stainless-steel mesh screen for the open, powerful draw of a killer bowl. Deep, rich flavour with an effortless, mild pull, whether you're chasing clouds or settling in for a long session.",
      shortUk:
        "FTP — це фанель ручної роботи з глини з розумним дизайном 2-в-1 та двома змінними вставками. Встановіть алюмінієву гільзу для справжнього фанеля — жодної патоки в шахті, лише чистий рівномірний потік повітря — або вставку зі сталевою сіткою для відкритої, потужної тяги killer-чаші. Глибокий насичений смак і легка м'яка тяга — чи то ви ганяєтеся за хмарами, чи налаштувалися на довгу сесію.",
      benefitsEn: [
        "2-in-1 design with interchangeable inserts",
        "Classic Phunnel Mode — no molasses dripping down the stem",
        "Tactical Mode with mesh screen — open draw and strong pull",
        "Deep, rich flavour with effortless, mild draws",
        "Suited to both big-cloud and long, chill sessions",
      ],
      benefitsUk: [
        "Дизайн 2-в-1 зі змінними вставками",
        "Класичний режим фанеля — патока не стікає в шахту",
        "Тактичний режим із сіткою — відкрита тяга та потужний потік",
        "Глибокий насичений смак і легка м'яка тяга",
        "Підходить і для хмар, і для довгих спокійних сесій",
      ],
      tipsEn: [
        "Never cool the device with water",
        "Handle with care — natural clay is fragile",
      ],
      tipsUk: [
        "Ніколи не охолоджуйте виріб водою",
        "Поводьтеся обережно — натуральна глина крихка",
      ],
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", valueEn: "Natural clay", valueUk: "Натуральна глина" },
        { labelEn: "Design", labelUk: "Дизайн", valueEn: "2-in-1 (interchangeable inserts)", valueUk: "2-в-1 (змінні вставки)" },
        { labelEn: "Insert 1", labelUk: "Вставка 1", valueEn: "Aluminium phunnel sleeve", valueUk: "Алюмінієва вставка-фанел" },
        { labelEn: "Insert 2", labelUk: "Вставка 2", valueEn: "Stainless steel mesh screen", valueUk: "Сітка з нержавіючої сталі" },
      ],
      features: [
        { icon: "layers", titleEn: "Design", titleUk: "Дизайн", textEn: "2-in-1 inserts", textUk: "2-в-1 вставки" },
        { icon: "droplet", titleEn: "Phunnel", titleUk: "Фанель", textEn: "No molasses drip", textUk: "Без патоки в шахті" },
        { icon: "mesh", titleEn: "Tactical", titleUk: "Тактичний", textEn: "Mesh screen", textUk: "Сталева сітка" },
        { icon: "wave", titleEn: "Flavour", titleUk: "Смак", textEn: "Deep & rich", textUk: "Глибокий і насичений" },
      ],
    },
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
    price: 23,
    priceUah: 850,
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
