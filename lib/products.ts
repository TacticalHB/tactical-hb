export type Variant = {
  name: string;
  swatch: string;
  /** The one image that represents this colour — grid tile, cart line, swatch. */
  image: string;
  price?: number;
  priceUah?: number;
  /**
   * This colour's own gallery, when it has more than one photograph.
   *
   * WHY THIS EXISTS RATHER THAN pdp.photos. A product with variants normally
   * has no pdp.photos at all: the gallery IS the variant images, so the colour
   * selector and the photo move together and picking Purple shows the purple
   * device. Adding pdp.photos to such a product silently severs that — the
   * selector becomes price-only and the picture stops following the colour.
   *
   * So a second black photograph could not simply be appended anywhere. This
   * gives one colour its own set while the others keep the single-image
   * behaviour they already had, and the swatch keeps driving the gallery.
   *
   * The first entry should be the same file as `image`, so the colour a
   * customer picks is the first thing they see.
   */
  photos?: string[];
};

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
  /** Packed weight in grams. For an HMD this is the weight WITHOUT the lid;
      the lid add-on adds LID_WEIGHT_G (see lib/hmd-options). Drives the real
      shipping weight in place of the old 1 kg default. */
  weightG: number;
  /** Packed carton size in millimetres. Used both on the page and to keep the
      Nova Poshta volumetric weight honest. */
  dims: { l: number; w: number; h: number };
  category: "hmd" | "bowl" | "accessory" | "windcover";
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
    /** Explicit gallery. OMIT IT to let the variant images be the gallery (the
        colour selector then drives the photo). An empty array is different: it
        blanks the gallery deliberately. */
    photos?: string[];
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
    taglineUk: "Алюміній без покриття. Нічому стиратися.",
    taglineEn: "Bare aluminium. Nothing to wear off.",
    descriptionUk: "HMD з алюмінію без покриття — чистий метал і рівномірне тепло без екстремальних температур. Включає кришку.",
    descriptionEn: "The bare aluminium HMD — uncoated metal, uniform heat distribution without temperature extremes. Includes lid.",
    price: 29,
    priceUah: 1080,
    currency: "EUR",
    weightG: 125,
    dims: { l: 122, w: 122, h: 42 },
    category: "hmd",
    featured: true,
    image: "/images/hmd-classic-1.jpg",
    gridImage: "/images/hmd-classic-1.jpg",
    pdp: {
      /* GALLERY ORDER IS FIXED — the filename number IS the gallery position, so
         a future fourth shot is hmd-classic-4.jpg appended at the end. -1 is the
         hero the customer meets first and must stay index 0. */
      photos: [
        "/images/hmd-classic-1.jpg", // 1st — product alone, studio background
        "/images/hmd-classic-2.jpg", // 2nd — product on the TCT box
        "/images/hmd-classic-3.jpg", // 3rd — in the open presentation box
      ],
      /* With a pdp block present the page reads shortEn/shortUk and never
         descriptionEn/descriptionUk — the latter are the grid card and the
         social/SEO fallback. The two say the same thing at different lengths
         and must be corrected together. */
      colourShownEn: "Bare Aluminium",
      colourShownUk: "Алюміній без покриття",
      shortEn:
        "Engineered for uniform heat distribution without extreme temperature swings. Inspired by the precision of weaponry, this dedicated aluminium device delivers mild, consistent smoking with extended session duration. The Classic is the bare aluminium expression of the HMD — machined metal with no coating and no surface treatment, so there is nothing on it to wear through or discolour with use. Set it and forget it — no constant coal manipulation required.",
      shortUk:
        "Розроблений для рівномірного розподілу тепла без екстремальних перепадів температури. Натхненний точністю зброї, цей спеціалізований алюмінієвий пристрій забезпечує м'яке, стабільне куріння та довші сесії. Classic — це версія HMD з алюмінію без покриття: оброблений метал без жодного шару зверху, тож на ньому нічому стиратися чи темніти з часом. Встановив — і забув: жодних постійних маніпуляцій з вугіллям.",
      benefitsEn: [
        "Mildness of smoking with rich, consistent flavour",
        "Extended session duration (90+ minutes with proper use)",
        "Bare aluminium — no coating to wear through or discolour",
        "Effortless experience — no constant coal rotation or adjustments",
        "Heating time of approximately 6 minutes under wind cover",
      ],
      benefitsUk: [
        "М'якість куріння з насиченим, стабільним смаком",
        "Подовжена тривалість сесії (90+ хвилин за правильного використання)",
        "Алюміній без покриття — немає шару, який стирається чи темніє",
        "Без зусиль — не потрібно постійно обертати чи поправляти вугілля",
        "Час нагріву — близько 6 хвилин під ковпаком",
      ],
      /* The care instructions are the device's, not the finish's, so all three
         HMDs carry the same three. Wording them differently per SKU would
         imply a difference in handling that does not exist. */
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
      /* Material and Finish are spelled EXACTLY so on purpose — lib/field-card
         looks those two labels up by their English text and lifts them onto the
         card. Rename either and the card silently loses the row. The heat
         figures are the same on all three because it is the same 125 g body;
         only the Finish row differs, and it is the one row that must never be
         copied between these products. */
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", valueEn: "Aviation aluminium", valueUk: "Авіаційний алюміній" },
        { labelEn: "Finish", labelUk: "Обробка", valueEn: "Bare aluminium, uncoated", valueUk: "Алюміній без покриття" },
        { labelEn: "Heating time", labelUk: "Час нагріву", valueEn: "≈ 6 min under wind cover", valueUk: "≈ 6 хв під ковпаком" },
        { labelEn: "Session duration", labelUk: "Тривалість сесії", valueEn: "90+ min with proper use", valueUk: "90+ хв за належного використання" },
      ],
      features: [
        { icon: "wave", titleEn: "Flavour", titleUk: "Смак", textEn: "Mild & consistent", textUk: "М'який і стабільний" },
        { icon: "clock", titleEn: "Session", titleUk: "Сесія", textEn: "90+ minutes", textUk: "90+ хвилин" },
        { icon: "hands", titleEn: "Effort", titleUk: "Зусилля", textEn: "Zero coal fuss", textUk: "Жодної метушні" },
        { icon: "flame", titleEn: "Heat-up", titleUk: "Нагрів", textEn: "≈ 6 minutes", textUk: "≈ 6 хвилин" },
      ],
    },
    tags: ["aluminium", "bare", "lid", "classic"],
  },
  {
    id: "hmd-a-craft",
    slug: "hmd-a-craft",
    nameUk: "HMD A.Craft",
    nameEn: "HMD A.Craft",
    taglineUk: "Крафтове видання з твердим анодуванням.",
    taglineEn: "Hard anodised craft edition.",
    descriptionUk: "Видання A.Craft з твердим анодованим покриттям алюмінію. Без кришки. Унікальна тактична естетика.",
    descriptionEn: "A.Craft edition with a hard anodised aluminium surface. Without lid. Unique tactical aesthetic.",
    price: 24,
    priceUah: 900,
    currency: "EUR",
    weightG: 125,
    dims: { l: 122, w: 122, h: 42 },
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
        "Engineered for uniform heat distribution without extreme temperature swings. Inspired by the precision of weaponry, this dedicated aluminium device delivers mild, consistent smoking with extended session duration. The A.Craft body is hard anodised — the finish is grown into the surface of the metal rather than laid on top of it, which is what lets it take heat and handling without marking. Set it and forget it — no constant coal manipulation required.",
      shortUk:
        "Розроблений для рівномірного розподілу тепла без екстремальних перепадів температури. Натхненний точністю зброї, цей спеціалізований алюмінієвий пристрій забезпечує м'яке, стабільне куріння та довші сесії. Корпус A.Craft має тверде анодоване покриття — воно утворюється в самому металі, а не лежить зверху, тому витримує жар і щоденне користування без слідів. Встановив — і забув: жодних постійних маніпуляцій з вугіллям.",
      benefitsEn: [
        "Mildness of smoking with rich, consistent flavour",
        "Extended session duration (90+ minutes with proper use)",
        "Hard anodised surface — resists wear, heat and marking",
        "Effortless experience — no constant coal rotation or adjustments",
        "Heating time of approximately 6 minutes under wind cover",
      ],
      benefitsUk: [
        "М'якість куріння з насиченим, стабільним смаком",
        "Подовжена тривалість сесії (90+ хвилин за правильного використання)",
        "Тверде анодоване покриття — стійке до зношування, жару та подряпин",
        "Без зусиль — не потрібно постійно обертати чи поправляти вугілля",
        "Час нагріву — близько 6 хвилин під ковпаком",
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
        { labelEn: "Material", labelUk: "Матеріал", valueEn: "Aviation aluminium", valueUk: "Авіаційний алюміній" },
        { labelEn: "Finish", labelUk: "Обробка", valueEn: "Hard anodised", valueUk: "Тверде анодування" },
        { labelEn: "Heating time", labelUk: "Час нагріву", valueEn: "≈ 6 min under wind cover", valueUk: "≈ 6 хв під ковпаком" },
        { labelEn: "Session duration", labelUk: "Тривалість сесії", valueEn: "90+ min with proper use", valueUk: "90+ хв за належного використання" },
      ],
      features: [
        { icon: "wave", titleEn: "Flavour", titleUk: "Смак", textEn: "Mild & consistent", textUk: "М'який і стабільний" },
        { icon: "clock", titleEn: "Session", titleUk: "Сесія", textEn: "90+ minutes", textUk: "90+ хвилин" },
        { icon: "hands", titleEn: "Effort", titleUk: "Зусилля", textEn: "Zero coal fuss", textUk: "Жодної метушні" },
        { icon: "flame", titleEn: "Heat-up", titleUk: "Нагрів", textEn: "≈ 6 minutes", textUk: "≈ 6 хвилин" },
      ],
    },
    tags: ["aluminium", "hard anodised"],
  },
  {
    id: "hmd-tct-op",
    slug: "hmd-tct-op",
    nameUk: "HMD TCT OP",
    nameEn: "HMD TCT OP",
    taglineUk: "Антипригарна поверхня, без PFOA.",
    taglineEn: "Non-stick surface, PFOA-free.",
    descriptionUk: "Повністю антипригарна поверхня, 100% без PFOA. Запобігає прилипанню тютюну, легке очищення. Доступний у фіолетовому та чорному кольорах.",
    descriptionEn: "Fully non-stick surface, 100% PFOA-free. Prevents tobacco adhesion, easy cleaning. Available in purple and black.",
    price: 30,
    priceUah: 1150,
    currency: "EUR",
    weightG: 125,
    dims: { l: 122, w: 122, h: 42 },
    category: "hmd",
    featured: true,
    // Black is the first variant and the main picture, so the fallbacks agree.
    image: "/images/hmd-op-black.png",
    tileImage: "/images/hmd-op-black.png",
    tileBg: "#f5f5f7",
    tileScale: 1.5,
    gridImage: "/images/hmd-op-black.png",
    variants: [
      {
        name: "Black",
        swatch: "#1c1c1e",
        image: "/images/hmd-op-black.png",
        price: 30,
        priceUah: 1150,
        /* Black's own gallery: the cut-out it has always had, then the
           packaging shot. Declared PER COLOUR rather than on the product,
           because a product-level list would replace the swatch-driven gallery
           and leave Purple showing a black device. Purple names no photos, so
           it keeps the one-image-per-variant rail it has always had. */
        photos: [
          "/images/hmd-op-black.png",   // 1st — the device alone, cut out
          "/images/hmd-op-black-2.jpg", // 2nd — boxed, with the PFOA-free mark
        ],
      },
      { name: "Purple", swatch: "#4a3d84", image: "/images/hmd-op-purple.png", price: 32, priceUah: 1200 },
    ],
    pdp: {
      /* No `photos` key on purpose: a list here outranks everything and would
         make the gallery the same for both finishes, so choosing Purple would
         stop changing the picture. Left absent, each colour answers for itself
         — Black from its own `photos`, Purple from the variant images. An empty
         array is not the way to say "none" either: it used to blank the gallery
         and the page read "Photos coming soon". */
      shortEn:
        "The HMD OP is built for overpack smoking. Inspired by the precision of weaponry, this dedicated aluminium device delivers mild, consistent smoking with extended session duration. Its fully non-stick, 100% PFOA-free surface repels tobacco residue, which keeps heat distribution even and cleaning effortless — even through intensive sessions. Offered in black and purple.",
      shortUk:
        "HMD OP створений для куріння в стилі overpack. Натхненний точністю зброї, цей спеціалізований алюмінієвий пристрій забезпечує м'яке, стабільне куріння та довші сесії. Повністю антипригарна поверхня (100% без PFOA) відштовхує залишки тютюну, завдяки чому тепло розподіляється рівномірно, а очищення не потребує зусиль навіть після інтенсивних сесій. Доступний у чорному та фіолетовому кольорах.",
      benefitsEn: [
        "Non-stick surface repels residue — bold overpacks without sticking or bitterness",
        "Optimised for overpacking — even heat for massive clouds and rich flavour",
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
        /* Material first and Finish second, same as the other two HMDs, because
           lib/field-card lifts exactly those two English labels onto the card.
           "Finishes" used to sit here meaning COLOURS while the Ukrainian label
           beside it already said Кольори — the two languages disagreed, and the
           English one collided with the real finish row. "Tactical-grade
           inspired" was not a material at all; it is the same aluminium body as
           the Classic and the A.Craft, and only the coating differs. */
        { labelEn: "Material", labelUk: "Матеріал", valueEn: "Aviation aluminium", valueUk: "Авіаційний алюміній" },
        { labelEn: "Finish", labelUk: "Обробка", valueEn: "Fully non-stick", valueUk: "Повністю антипригарна" },
        { labelEn: "Coating", labelUk: "Покриття", valueEn: "100% PFOA-free", valueUk: "100% без PFOA" },
        { labelEn: "Colours", labelUk: "Кольори", valueEn: "Black & purple", valueUk: "Чорний і фіолетовий" },
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
    weightG: 325,
    dims: { l: 109, w: 82, h: 82 },
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
        "Час нагріву — близько 6 хвилин під ковпаком",
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
    weightG: 300,
    dims: { l: 109, w: 82, h: 82 },
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
        "Час нагріву — близько 5 хвилин під ковпаком (2–3 кубики)",
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
    weightG: 345,
    dims: { l: 109, w: 82, h: 82 },
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
    id: "windcover-detonator",
    slug: "windcover-detonator",
    nameUk: "Windcover Detonator",
    nameEn: "Windcover Detonator",
    taglineUk: "Металевий ковпак у тактичному стилі.",
    taglineEn: "Metal wind cover in tactical style.",
    /* THE CATALOGUE PRICE IS THE COVER WITHOUT THE TIMER. The timer is an
       add-on selected on the product page (see lib/windcover-options), which is
       why the description no longer promises one — a card quoting ₴850 while
       describing a built-in timer would be selling the ₴1700 configuration at
       the bare price. */
    descriptionUk: "Суцільнометалевий ковпак із порошковим покриттям і лазерним гравіюванням. Таймер — опційно, кріпиться магнітом.",
    descriptionEn: "Solid metal wind cover with powder coating and laser engraving. Timer optional, attaches magnetically.",
    price: 23,
    priceUah: 850,
    currency: "EUR",
    weightG: 400,
    dims: { l: 210, w: 108, h: 108 },
    category: "windcover",
    featured: true,
    image: "/images/windcover-detonator-1.jpg",
    /* The flagship 2x2 tile keeps the older cut-out: it is the SAME physical
       cover, only the name changed, and a cut-out is what that tile needs —
       the new studio shots carry their own backdrop. */
    tileImage: "/images/windcover-tile.png",
    tileBg: "linear-gradient(180deg, #c9e6f6 0%, #e9f5fb 55%, #ffffff 100%)",
    tileScale: 1.18,
    tileBleed: true,
    gridImage: "/images/windcover-detonator-1.jpg",
    pdp: {
      /* MAIN FIRST, ALWAYS. -1 is the shot the card shows and the first frame
         of the gallery; a secondary angle must never be promoted ahead of it. */
      photos: [
        "/images/windcover-detonator-1.jpg",
        "/images/windcover-detonator-2.jpg",
        "/images/windcover-detonator-3.jpg",
      ],
      shortEn:
        "A precision-engineered metal wind cover designed in a bold tactical style. Made from solid metal with a durable powder-coated finish and crisp laser engraving, it provides reliable wind protection while adding a distinctive look to any setup.",
      shortUk:
        "Металевий ковпак точного виготовлення у виразному тактичному стилі. Суцільний метал, стійке порошкове покриття та чітке лазерне гравіювання — надійний захист від вітру, який водночас робить сетап помітним.",
      benefitsEn: [
        "Solid metal construction with powder coating for heat and scratch resistance, finished with permanent laser engraving",
        "Effective wind protection that maintains proper airflow for consistent heat and longer sessions",
        "Optional USB Type-C rechargeable countdown timer with LED display and bomb-style sound — set the time when placing coals to track the ideal heat-up window",
        "Magnetic attachment for quick and secure connection of the timer unit",
        "Ideal for busy lounges: the timer and sound help staff and customers easily identify which shisha is ready",
        "Available in two versions: standard wind cover or wind cover with magnetically attached timer",
      ],
      benefitsUk: [
        "Суцільнометалева конструкція з порошковим покриттям — стійка до нагріву та подряпин, із незмивним лазерним гравіюванням",
        "Ефективний захист від вітру зі збереженням правильного потоку повітря: рівний жар і довші сесії",
        "Опційний таймер зі зворотним відліком, LED-дисплеєм і звуком у стилі бомби, заряджається через USB Type-C — виставте час, коли кладете вугілля, і контролюйте розпал",
        "Магнітне кріплення — таймер приєднується швидко та надійно",
        "Зручно для завантажених кальянних: таймер і звук допомагають персоналу та гостям одразу зрозуміти, який кальян готовий",
        "Дві версії: стандартний ковпак або ковпак із таймером на магнітному кріпленні",
      ],
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", valueEn: "Metal + powder coating + laser engraving", valueUk: "Метал + порошкове покриття + лазерне гравіювання" },
        { labelEn: "Charging (timer version)", labelUk: "Заряджання (версія з таймером)", valueEn: "USB Type-C", valueUk: "USB Type-C" },
        { labelEn: "Attachment (timer version)", labelUk: "Кріплення (версія з таймером)", valueEn: "Magnetic", valueUk: "Магнітне" },
      ],
      statementEn: "Never miss the perfect heat-up window — and never wonder which bowl is ready.",
      statementUk: "Не пропустіть ідеальний момент розпалу — і більше не гадайте, який кальян готовий.",
    },
    tags: ["timer", "Type-C", "windcover"],
  },
  /* ---- KH ------------------------------------------------------------------
     The camouflage-faced cover. Same body, price and timer option as the
     Detonator — the finish is what differs, so the copy below is the family
     copy with the pattern called out rather than a second set of claims. */
  {
    id: "windcover-kh",
    slug: "windcover-kh",
    nameUk: "Windcover KH",
    nameEn: "Windcover KH",
    taglineUk: "Металевий ковпак із камуфляжем.",
    taglineEn: "Metal wind cover with camo finish.",
    descriptionUk: "Суцільнометалевий ковпак із камуфляжним принтом і UV-друком. Таймер — опційно, кріпиться магнітом.",
    descriptionEn: "Solid metal wind cover with a camouflage finish and UV print. Timer optional, attaches magnetically.",
    price: 23,
    priceUah: 850,
    currency: "EUR",
    weightG: 400,
    dims: { l: 210, w: 108, h: 108 },
    category: "windcover",
    featured: false,
    image: "/images/windcover-kh-1.jpg",
    gridImage: "/images/windcover-kh-1.jpg",
    pdp: {
      /* MAIN FIRST — see the note on the Detonator above. */
      photos: [
        "/images/windcover-kh-1.jpg",
        "/images/windcover-kh-2.jpg",
        "/images/windcover-kh-3.jpg",
      ],
      shortEn:
        "A precision-engineered metal wind cover in a camouflage finish. Made from solid metal with a durable powder-coated body and a crisp UV print, it provides reliable wind protection while adding a distinctive look to any setup.",
      shortUk:
        "Металевий ковпак точного виготовлення у камуфляжному оздобленні. Суцільний метал, стійке порошкове покриття та чіткий UV-друк — надійний захист від вітру, який водночас робить сетап помітним.",
      benefitsEn: [
        "Solid metal construction with powder coating for heat and scratch resistance, finished with a permanent UV print",
        "Camouflage face panel with the TCT roundel on the reverse",
        "Effective wind protection that maintains proper airflow for consistent heat and longer sessions",
        "Optional USB Type-C rechargeable countdown timer with LED display and bomb-style sound — set the time when placing coals to track the ideal heat-up window",
        "Magnetic attachment for quick and secure connection of the timer unit",
        "Available in two versions: standard wind cover or wind cover with magnetically attached timer",
      ],
      benefitsUk: [
        "Суцільнометалева конструкція з порошковим покриттям — стійка до нагріву та подряпин, із незмивним UV-друком",
        "Камуфляжна лицьова панель і знак TCT на звороті",
        "Ефективний захист від вітру зі збереженням правильного потоку повітря: рівний жар і довші сесії",
        "Опційний таймер зі зворотним відліком, LED-дисплеєм і звуком у стилі бомби, заряджається через USB Type-C — виставте час, коли кладете вугілля, і контролюйте розпал",
        "Магнітне кріплення — таймер приєднується швидко та надійно",
        "Дві версії: стандартний ковпак або ковпак із таймером на магнітному кріпленні",
      ],
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", valueEn: "Metal + powder coating + UV print", valueUk: "Метал + порошкове покриття + UV-друк" },
        { labelEn: "Finish", labelUk: "Оздоблення", valueEn: "Camouflage face panel", valueUk: "Камуфляжна лицьова панель" },
        { labelEn: "Charging (timer version)", labelUk: "Заряджання (версія з таймером)", valueEn: "USB Type-C", valueUk: "USB Type-C" },
        { labelEn: "Attachment (timer version)", labelUk: "Кріплення (версія з таймером)", valueEn: "Magnetic", valueUk: "Магнітне" },
      ],
      statementEn: "Never miss the perfect heat-up window — and never wonder which bowl is ready.",
      statementUk: "Не пропустіть ідеальний момент розпалу — і більше не гадайте, який кальян готовий.",
    },
    tags: ["timer", "Type-C", "windcover", "camo"],
  },
];

const bySlug = (slug: string) => products.find((p) => p.slug === slug)!;

// Flagship 2x2 grid — explicit order: top-left, top-right, bottom-left, bottom-right
export const featuredProducts = [
  bySlug("bowl-phunnel"),        // FTP BOWL — sky blue
  bySlug("bowl-killer"),         // KILLER BOWL — grey
  bySlug("hmd-tct-op"),          // HMD TCT OP — grey
  bySlug("windcover-detonator"), // Windcover Detonator — sky blue
];
