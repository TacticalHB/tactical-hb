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
  /* Japanese is OPTIONAL on every copy field. Absent means the English is
     used, which is the same fallback lib/i18n-text and i18n/request.ts apply —
     never Ukrainian. Product NAMES have no Ja twin on purpose: nameEn and
     nameUk already hold the same Latin string, and a name is not translated. */
  taglineJa?: string;
  taglineAr?: string;
  descriptionUk: string;
  descriptionEn: string;
  descriptionJa?: string;
  descriptionAr?: string;
  price: number;
  /** Hand-set UAH price (not a conversion of `price`) — see lib/currency.ts */
  priceUah: number;
  /* ---- Dealer prices -----------------------------------------------------
     Optional, and UNSET on every product until a real dealer list exists.

     Absent does not mean "use the retail price". It means the wholesale
     portal prints "quote on request" against that line and submits it as a
     quantity ask with no total — which is a perfectly ordinary request, and
     the only honest thing to show when the number has not been agreed.
     Exposing retail as though it were trade would misprice the first order
     somebody placed against it.

     Hand-set in both currencies for the same reason priceUah is: the trade
     terms in Ukraine are not a conversion of the euro ones. */
  wholesalePriceEur?: number;
  wholesalePriceUah?: number;
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
    colourShownJa?: string;
    colourShownAr?: string;
    shortEn: string;
    shortUk: string;
    shortJa?: string;
    shortAr?: string;
    benefitsEn?: string[];
    benefitsUk?: string[];
    benefitsJa?: string[];
    benefitsAr?: string[];
    tipsEn?: string[];
    tipsUk?: string[];
    tipsJa?: string[];
    tipsAr?: string[];
    specs?: {
      labelEn: string;
      labelUk: string;
      labelJa?: string;
      labelAr?: string;
      valueEn: string;
      valueUk: string;
      valueJa?: string;
      valueAr?: string;
    }[];
    statementEn?: string;
    statementUk?: string;
    features?: { icon: "flame" | "clock" | "hands" | "wave" | "cloud" | "user" | "droplet" | "mesh" | "layers" | "shield" | "sparkle"; titleEn: string; titleUk: string; titleJa?: string; titleAr?: string; textEn: string; textUk: string; textJa?: string; textAr?: string }[];
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
    taglineJa: "素地のアルミニウム。すり減るものがありません。",
    taglineAr: "ألمنيوم خام. لا شيء يزول بالاستعمال.",
    descriptionUk: "HMD з алюмінію без покриття — чистий метал і рівномірне тепло без екстремальних температур. Кришка — опція.",
    descriptionEn: "The bare aluminium HMD — uncoated metal, uniform heat distribution without temperature extremes. Lid optional.",
    descriptionJa: "素地アルミニウムの HMD — 無垢の金属で、極端な温度差のない均一な熱まわり。リッドは別売です。",
    descriptionAr: "جهاز إدارة حرارة من ألمنيوم خام — معدن بلا طلاء، وتوزيع حرارة منتظم بلا تطرّف. الغطاء اختياري.",
    /* THE DEVICE ALONE. No lid in the box and none in this figure — the lid is
       an add-on here exactly as it is on the other two devices.

       The page still OPENS with the lid and the ring ticked, the same as every
       other device: this is the price the grid card quotes, not the one the
       configurator lands on. Base and default are two different things and
       only the first of them lives here. */
    price: 23,
    priceUah: 850,
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
      colourShownJa: "素地アルミニウム",
      colourShownAr: "ألمنيوم خام",
      shortEn:
        "Engineered for uniform heat distribution without extreme temperature swings. Inspired by the precision of weaponry, this dedicated aluminium device delivers mild, consistent smoking with extended session duration. The Classic is the bare aluminium expression of the HMD — machined metal with no coating and no surface treatment, so there is nothing on it to wear through or discolour with use. Set it and forget it — no constant coal manipulation required.",
      shortUk:
        "Розроблений для рівномірного розподілу тепла без екстремальних перепадів температури. Натхненний точністю зброї, цей спеціалізований алюмінієвий пристрій забезпечує м'яке, стабільне куріння та довші сесії. Classic — це версія HMD з алюмінію без покриття: оброблений метал без жодного шару зверху, тож на ньому нічому стиратися чи темніти з часом. Встановив — і забув: жодних постійних маніпуляцій з вугіллям.",
      shortJa:
        "極端な温度変化を伴わない均一な熱分布のために設計されています。武器づくりの精度から着想を得たこの専用アルミニウムデバイスは、まろやかで安定した吸い心地と長いセッションをもたらします。Classic は HMD の素地アルミニウム版です。コーティングも表面処理もない削り出しの金属なので、使ううちにすり減ったり変色したりする層がありません。セットしたら、あとは任せるだけ — 炭を絶えず動かす必要はありません。",
      shortAr:
        "مهندس لتوزيع حرارة منتظم بلا تقلّبات حادة. ومستوحًى من دقّة صناعة السلاح، يمنحك هذا الجهاز الألمنيومي تدخينًا لطيفًا وثابتًا وجلسات أطول. وClassic هو صورة الألمنيوم الخام من هذا الجهاز — معدن مخرَّط بلا طلاء وبلا معالجة سطحية، فلا شيء عليه يزول أو يتغيّر لونه بالاستعمال. اضبطه وانسَه — بلا تحريك متواصل للفحم.",
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
      benefitsJa: [
        "豊かで安定した香味と、まろやかな吸い心地",
        "長いセッション（適切にお使いいただいた場合 90分以上）",
        "素地アルミニウム — すり減ったり変色したりする被膜がありません",
        "手間いらず — 炭を回したり調整し続ける必要がありません",
        "ウインドカバー使用時の加熱時間は約6分",
      ],
      benefitsAr: [
        "تدخين لطيف بنكهة غنية وثابتة",
        "جلسات أطول (أكثر من 90 دقيقة عند الاستخدام السليم)",
        "ألمنيوم خام — لا طلاء يزول أو يتغيّر لونه",
        "بلا عناء — لا حاجة إلى تدوير الفحم أو تعديله باستمرار",
        "زمن التسخين نحو 6 دقائق تحت غطاء الرياح",
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
      tipsJa: [
        "水で本体を冷やさないでください",
        "清掃には柔らかく研磨性のない布のみをお使いください",
        "炭用のヒーターで HMD を予熱しないでください",
      ],
      tipsAr: [
        "لا تبرّد الجهاز بالماء أبدًا",
        "استخدم للتنظيف قطعًا ناعمة غير كاشطة فقط",
        "لا تسخّن الجهاز مسبقًا على ولّاعة الفحم",
      ],
      /* Material and Finish are spelled EXACTLY so on purpose — lib/field-card
         looks those two labels up by their English text and lifts them onto the
         card. Rename either and the card silently loses the row. The heat
         figures are the same on all three because it is the same 125 g body;
         only the Finish row differs, and it is the one row that must never be
         copied between these products. */
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", labelJa: "素材", labelAr: "المادة", valueEn: "Aviation aluminium", valueUk: "Авіаційний алюміній", valueJa: "航空アルミニウム", valueAr: "ألمنيوم طيران" },
        { labelEn: "Finish", labelUk: "Обробка", labelJa: "仕上げ", labelAr: "التشطيب", valueEn: "Bare aluminium, uncoated", valueUk: "Алюміній без покриття", valueJa: "素地アルミニウム、無塗装", valueAr: "ألمنيوم خام بلا طلاء" },
        { labelEn: "Heating time", labelUk: "Час нагріву", labelJa: "加熱時間", labelAr: "زمن التسخين", valueEn: "≈ 6 min under wind cover", valueUk: "≈ 6 хв під ковпаком", valueJa: "ウインドカバー使用時 約6分", valueAr: "نحو 6 دقائق تحت غطاء الرياح" },
        { labelEn: "Session duration", labelUk: "Тривалість сесії", labelJa: "セッション時間", labelAr: "مدة الجلسة", valueEn: "90+ min with proper use", valueUk: "90+ хв за належного використання", valueJa: "適切な使用で 90分以上", valueAr: "أكثر من 90 دقيقة عند الاستخدام السليم" },
      ],
      features: [
        { icon: "wave", titleEn: "Flavour", titleUk: "Смак", titleJa: "香味", titleAr: "النكهة", textEn: "Mild & consistent", textUk: "М'який і стабільний", textJa: "まろやかで安定", textAr: "لطيف وثابت" },
        { icon: "clock", titleEn: "Session", titleUk: "Сесія", titleJa: "セッション", titleAr: "الجلسة", textEn: "90+ minutes", textUk: "90+ хвилин", textJa: "90分以上", textAr: "أكثر من 90 دقيقة" },
        { icon: "hands", titleEn: "Effort", titleUk: "Зусилля", titleJa: "手間", titleAr: "الجهد", textEn: "Zero coal fuss", textUk: "Жодної метушні", textJa: "炭いらずの手間なし", textAr: "بلا عناء الفحم" },
        { icon: "flame", titleEn: "Heat-up", titleUk: "Нагрів", titleJa: "加熱", titleAr: "التسخين", textEn: "≈ 6 minutes", textUk: "≈ 6 хвилин", textJa: "約6分", textAr: "نحو 6 دقائق" },
      ],
    },
    tags: ["aluminium", "bare", "classic"],
  },
  {
    id: "hmd-a-craft",
    slug: "hmd-a-craft",
    nameUk: "HMD A.Craft",
    nameEn: "HMD A.Craft",
    taglineUk: "Крафтове видання з твердим анодуванням.",
    taglineEn: "Hard anodised craft edition.",
    taglineJa: "ハードアノダイズド仕上げのクラフトエディション。",
    taglineAr: "إصدار حرفي بأكسدة صلبة.",
    descriptionUk: "Видання A.Craft з твердим анодованим покриттям алюмінію. Без кришки. Унікальна тактична естетика.",
    descriptionEn: "A.Craft edition with a hard anodised aluminium surface. Without lid. Unique tactical aesthetic.",
    descriptionJa: "アルミニウムをハードアノダイズド処理した A.Craft エディション。リッドなし。独自のタクティカルな佇まい。",
    descriptionAr: "إصدار A.Craft بسطح ألمنيوم مؤكسد أكسدة صلبة. بلا غطاء. حضور تكتيكي مميّز.",
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
      colourShownJa: "タクティカルグレー",
      colourShownAr: "رمادي تكتيكي",
      shortEn:
        "Engineered for uniform heat distribution without extreme temperature swings. Inspired by the precision of weaponry, this dedicated aluminium device delivers mild, consistent smoking with extended session duration. The A.Craft body is hard anodised — the finish is grown into the surface of the metal rather than laid on top of it, which is what lets it take heat and handling without marking. Set it and forget it — no constant coal manipulation required.",
      shortUk:
        "Розроблений для рівномірного розподілу тепла без екстремальних перепадів температури. Натхненний точністю зброї, цей спеціалізований алюмінієвий пристрій забезпечує м'яке, стабільне куріння та довші сесії. Корпус A.Craft має тверде анодоване покриття — воно утворюється в самому металі, а не лежить зверху, тому витримує жар і щоденне користування без слідів. Встановив — і забув: жодних постійних маніпуляцій з вугіллям.",
      shortJa:
        "極端な温度変化を伴わない均一な熱分布のために設計されています。武器づくりの精度から着想を得たこの専用アルミニウムデバイスは、まろやかで安定した吸い心地と長いセッションをもたらします。A.Craft のボディはハードアノダイズド処理 — 被膜を上から載せるのではなく、金属の表面そのものを変化させて育てた仕上げです。だからこそ、熱にも日々の扱いにも跡を残さず耐えます。セットしたら、あとは任せるだけ — 炭を絶えず動かす必要はありません。",
      shortAr:
        "مهندس لتوزيع حرارة منتظم بلا تقلّبات حادة. ومستوحًى من دقّة صناعة السلاح، يمنحك هذا الجهاز الألمنيومي تدخينًا لطيفًا وثابتًا وجلسات أطول. وجسم A.Craft مؤكسد أكسدة صلبة — إذ ينشأ التشطيب داخل سطح المعدن نفسه لا فوقه، وهو ما يجعله يحتمل الحرارة والاستعمال دون أن يترك أثرًا. اضبطه وانسَه — بلا تحريك متواصل للفحم.",
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
      benefitsJa: [
        "豊かで安定した香味と、まろやかな吸い心地",
        "長いセッション（適切にお使いいただいた場合 90分以上）",
        "ハードアノダイズド表面 — 摩耗、熱、傷に強い仕上げ",
        "手間いらず — 炭を回したり調整し続ける必要がありません",
        "ウインドカバー使用時の加熱時間は約6分",
      ],
      benefitsAr: [
        "تدخين لطيف بنكهة غنية وثابتة",
        "جلسات أطول (أكثر من 90 دقيقة عند الاستخدام السليم)",
        "سطح مؤكسد أكسدة صلبة — يقاوم التآكل والحرارة والخدوش",
        "بلا عناء — لا حاجة إلى تدوير الفحم أو تعديله باستمرار",
        "زمن التسخين نحو 6 دقائق تحت غطاء الرياح",
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
      tipsJa: [
        "水で本体を冷やさないでください",
        "清掃には柔らかく研磨性のない布のみをお使いください",
        "炭用のヒーターで HMD を予熱しないでください",
      ],
      tipsAr: [
        "لا تبرّد الجهاز بالماء أبدًا",
        "استخدم للتنظيف قطعًا ناعمة غير كاشطة فقط",
        "لا تسخّن الجهاز مسبقًا على ولّاعة الفحم",
      ],
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", labelJa: "素材", labelAr: "المادة", valueEn: "Aviation aluminium", valueUk: "Авіаційний алюміній", valueJa: "航空アルミニウム", valueAr: "ألمنيوم طيران" },
        { labelEn: "Finish", labelUk: "Обробка", labelJa: "仕上げ", labelAr: "التشطيب", valueEn: "Hard anodised", valueUk: "Тверде анодування", valueJa: "ハードアノダイズド", valueAr: "أكسدة صلبة" },
        { labelEn: "Heating time", labelUk: "Час нагріву", labelJa: "加熱時間", labelAr: "زمن التسخين", valueEn: "≈ 6 min under wind cover", valueUk: "≈ 6 хв під ковпаком", valueJa: "ウインドカバー使用時 約6分", valueAr: "نحو 6 دقائق تحت غطاء الرياح" },
        { labelEn: "Session duration", labelUk: "Тривалість сесії", labelJa: "セッション時間", labelAr: "مدة الجلسة", valueEn: "90+ min with proper use", valueUk: "90+ хв за належного використання", valueJa: "適切な使用で 90分以上", valueAr: "أكثر من 90 دقيقة عند الاستخدام السليم" },
      ],
      features: [
        { icon: "wave", titleEn: "Flavour", titleUk: "Смак", titleJa: "香味", titleAr: "النكهة", textEn: "Mild & consistent", textUk: "М'який і стабільний", textJa: "まろやかで安定", textAr: "لطيف وثابت" },
        { icon: "clock", titleEn: "Session", titleUk: "Сесія", titleJa: "セッション", titleAr: "الجلسة", textEn: "90+ minutes", textUk: "90+ хвилин", textJa: "90分以上", textAr: "أكثر من 90 دقيقة" },
        { icon: "hands", titleEn: "Effort", titleUk: "Зусилля", titleJa: "手間", titleAr: "الجهد", textEn: "Zero coal fuss", textUk: "Жодної метушні", textJa: "炭いらずの手間なし", textAr: "بلا عناء الفحم" },
        { icon: "flame", titleEn: "Heat-up", titleUk: "Нагрів", titleJa: "加熱", titleAr: "التسخين", textEn: "≈ 6 minutes", textUk: "≈ 6 хвилин", textJa: "約6分", textAr: "نحو 6 دقائق" },
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
    taglineJa: "非粘着表面、PFOA フリー。",
    taglineAr: "سطح غير لاصق، خالٍ من PFOA.",
    descriptionUk: "Повністю антипригарна поверхня, 100% без PFOA. Запобігає прилипанню тютюну, легке очищення. Доступний у фіолетовому та чорному кольорах.",
    descriptionEn: "Fully non-stick surface, 100% PFOA-free. Prevents tobacco adhesion, easy cleaning. Available in purple and black.",
    descriptionJa: "完全な非粘着表面、100% PFOA フリー。タバコの付着を防ぎ、お手入れも簡単です。パープルとブラックをご用意しています。",
    descriptionAr: "سطح غير لاصق تمامًا، خالٍ من PFOA بنسبة 100٪. يمنع التصاق المعسّل ويسهّل التنظيف. متوفر بالبنفسجي والأسود.",
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
      shortJa:
        "HMD OP はオーバーパック向けに作られています。武器づくりの精度から着想を得たこの専用アルミニウムデバイスは、まろやかで安定した吸い心地と長いセッションをもたらします。完全な非粘着かつ 100% PFOA フリーの表面がタバコの残りを寄せつけないため、熱が均一に伝わり、激しいセッションのあとでも手入れに手間がかかりません。ブラックとパープルの2色。",
      shortAr:
        "صُنع HMD OP للتعبئة الغزيرة. ومستوحًى من دقّة صناعة السلاح، يمنحك هذا الجهاز الألمنيومي تدخينًا لطيفًا وثابتًا وجلسات أطول. وسطحه غير اللاصق تمامًا والخالي من PFOA بنسبة 100٪ يدفع بقايا المعسّل عنه، فيبقى توزيع الحرارة منتظمًا والتنظيف بلا عناء — حتى بعد الجلسات المكثّفة. متوفر بالأسود والبنفسجي.",
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
      benefitsJa: [
        "非粘着表面が残りを寄せつけません — 大胆なオーバーパックでも、貼りつきや苦みが出ません",
        "オーバーパックに最適化 — 均一な熱で、豊かな煙と香味を引き出します",
        "なめらかで扱いやすいセッションと、澄んだ軽い吸い込み",
        "丈夫でお手入れも簡単 — 残りはさっと拭き取れます",
        "通常の TCT HMD としても使えますが、本領はオーバーパックにあります",
      ],
      benefitsAr: [
        "سطح غير لاصق يدفع البقايا — تعبئة غزيرة بلا التصاق ولا مرارة",
        "مهيّأ للتعبئة الغزيرة — حرارة منتظمة لسحب كثيف ونكهة غنية",
        "جلسات سلسة ومنضبطة بسحب نظيف بلا مجهود",
        "متين وسهل التنظيف — تُمسح البقايا مباشرة",
        "يصلح كجهاز TCT عادي، لكنه مصنوع لأسلوب التعبئة الغزيرة",
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
      tipsJa: [
        "水で本体を冷やさないでください",
        "清掃には柔らかく研磨性のない布のみをお使いください",
        "炭用のヒーターで HMD を予熱しないでください",
      ],
      tipsAr: [
        "لا تبرّد الجهاز بالماء أبدًا",
        "استخدم للتنظيف قطعًا ناعمة غير كاشطة فقط",
        "لا تسخّن الجهاز مسبقًا على ولّاعة الفحم",
      ],
      specs: [
        /* Material first and Finish second, same as the other two HMDs, because
           lib/field-card lifts exactly those two English labels onto the card.
           "Finishes" used to sit here meaning COLOURS while the Ukrainian label
           beside it already said Кольори — the two languages disagreed, and the
           English one collided with the real finish row. "Tactical-grade
           inspired" was not a material at all; it is the same aluminium body as
           the Classic and the A.Craft, and only the coating differs. */
        { labelEn: "Material", labelUk: "Матеріал", labelJa: "素材", labelAr: "المادة", valueEn: "Aviation aluminium", valueUk: "Авіаційний алюміній", valueJa: "航空アルミニウム", valueAr: "ألمنيوم طيران" },
        { labelEn: "Finish", labelUk: "Обробка", labelJa: "仕上げ", labelAr: "التشطيب", valueEn: "Fully non-stick", valueUk: "Повністю антипригарна", valueJa: "完全非粘着", valueAr: "غير لاصق تمامًا" },
        { labelEn: "Coating", labelUk: "Покриття", labelJa: "コーティング", labelAr: "الطلاء", valueEn: "100% PFOA-free", valueUk: "100% без PFOA", valueJa: "100% PFOA フリー", valueAr: "خالٍ من PFOA بنسبة 100٪" },
        { labelEn: "Colours", labelUk: "Кольори", labelJa: "カラー", labelAr: "الألوان", valueEn: "Black & purple", valueUk: "Чорний і фіолетовий", valueJa: "ブラックとパープル", valueAr: "أسود وبنفسجي" },
      ],
      features: [
        { icon: "shield", titleEn: "Surface", titleUk: "Поверхня", titleJa: "表面", titleAr: "السطح", textEn: "100% PFOA-free", textUk: "100% без PFOA", textJa: "100% PFOA フリー", textAr: "خالٍ من PFOA بنسبة 100٪" },
        { icon: "flame", titleEn: "Overpack", titleUk: "Overpack", titleJa: "オーバーパック", titleAr: "تعبئة غزيرة", textEn: "Even heat", textUk: "Рівномірне тепло", textJa: "均一な熱", textAr: "حرارة منتظمة" },
        { icon: "wave", titleEn: "Draw", titleUk: "Тяга", titleJa: "吸い込み", titleAr: "السحب", textEn: "Smooth & clean", textUk: "М'яка і чиста", textJa: "なめらかで澄んだ", textAr: "سلس ونظيف" },
        { icon: "sparkle", titleEn: "Cleaning", titleUk: "Очищення", titleJa: "お手入れ", titleAr: "التنظيف", textEn: "Wipes clean", textUk: "Легко витерти", textJa: "拭くだけ", textAr: "يُمسح بسهولة" },
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
    taglineJa: "手づくりの天然クレイ。",
    taglineAr: "طين طبيعي مصنوع يدويًا.",
    descriptionUk: "Класична форма ручної роботи з натуральної глини. Сильний та насичений дим. Оптимальна товщина стінок для стабільного утримання тепла.",
    descriptionEn: "Classic handmade bowl from natural clay. Strong and rich smoke. Optimal wall thickness for steady heat retention.",
    descriptionJa: "天然クレイの手づくりクラシックボウル。力強く濃厚な煙。安定した保熱のための最適な肉厚。",
    descriptionAr: "رأس كلاسيكي مصنوع يدويًا من طين طبيعي. دخان قوي وغني. سماكة جدران مثالية لاحتفاظ ثابت بالحرارة.",
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
      colourShownJa: "マットブラック",
      colourShownAr: "أسود مطفأ",
      shortEn:
        "The classic shape of a hand-made Killer bowl in natural clay. A well-deserved name — your smoke is strong and rich, while the optimal wall thickness holds heat steadily without overheating your flavour, guaranteeing long sessions free of bitterness.",
      shortUk:
        "Класична форма killer-чаші ручної роботи з натуральної глини. Заслужена назва — дим міцний і насичений, а оптимальна товщина стінок стабільно утримує тепло, не перепалюючи смак, гарантуючи довгі сесії без гіркоти.",
      shortJa:
        "天然クレイで手づくりした Killer ボウルの、そのままの定番シェイプ。名前のとおり、煙は力強く濃厚です。最適な肉厚が熱を安定して保ち、香味を焼きすぎないため、苦みの出ない長いセッションをお約束します。",
      shortAr:
        "الشكل الكلاسيكي لرأس Killer المصنوع يدويًا من طين طبيعي. اسم عن جدارة — فالدخان قوي وغني، بينما تحفظ سماكة الجدران المثالية الحرارة بثبات دون أن تحرق النكهة، ما يضمن جلسات طويلة بلا مرارة.",
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
      benefitsJa: [
        "豊かで安定した香味と、まろやかな吸い心地",
        "長いセッション（適切にお使いいただいた場合 70分以上）",
        "ウインドカバー使用時の加熱時間は約6分",
      ],
      benefitsAr: [
        "تدخين لطيف بنكهة غنية وثابتة",
        "جلسات أطول (أكثر من 70 دقيقة عند الاستخدام السليم)",
        "زمن التسخين نحو 6 دقائق تحت غطاء الرياح",
      ],
      tipsEn: [
        "Never cool the device with water",
        "Handle with care — natural clay is fragile",
      ],
      tipsUk: [
        "Ніколи не охолоджуйте виріб водою",
        "Поводьтеся обережно — натуральна глина крихка",
      ],
      tipsJa: [
        "水で本体を冷やさないでください",
        "天然クレイは割れやすいため、取り扱いにご注意ください",
      ],
      tipsAr: [
        "لا تبرّد الرأس بالماء أبدًا",
        "تعامل معه بعناية — الطين الطبيعي هشّ",
      ],
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", labelJa: "素材", labelAr: "المادة", valueEn: "Natural clay", valueUk: "Натуральна глина", valueJa: "天然クレイ", valueAr: "طين طبيعي" },
        { labelEn: "Surface", labelUk: "Поверхня", labelJa: "表面", labelAr: "السطح", valueEn: "Glazed black matte", valueUk: "Чорна матова глазур", valueJa: "ブラックマットの釉薬", valueAr: "دهان أسود مطفأ" },
      ],
      features: [
        { icon: "wave", titleEn: "Flavour", titleUk: "Смак", titleJa: "香味", titleAr: "النكهة", textEn: "Mild & rich", textUk: "М'який і насичений" },
        { icon: "clock", titleEn: "Session", titleUk: "Сесія", titleJa: "セッション", titleAr: "الجلسة", textEn: "70+ minutes", textUk: "70+ хвилин" },
        { icon: "flame", titleEn: "Heat-up", titleUk: "Нагрів", titleJa: "加熱", titleAr: "التسخين", textEn: "≈ 6 minutes", textUk: "≈ 6 хвилин", textJa: "約6分", textAr: "نحو 6 دقائق" },
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
    taglineJa: "明るくやわらかな、ひとりの時間に。",
    taglineAr: "جلسات فردية مشرقة وناعمة.",
    descriptionUk: "Ручна робота з натуральної глини. Яскравий та м'який дим 35–40 хвилин. Для індивідуального використання. Ємність 10–12 г.",
    descriptionEn: "Handmade from natural clay. Bright and soft smoke for 35–40 minutes. For solo use. Capacity 10–12g.",
    descriptionJa: "天然クレイの手づくり。35〜40分の明るくやわらかな煙。おひとり用。容量 10〜12g。",
    descriptionAr: "مصنوع يدويًا من طين طبيعي. دخان مشرق وناعم لمدة 35–40 دقيقة. للاستخدام الفردي. السعة 10–12 غ.",
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
      colourShownJa: "マットブラック",
      colourShownAr: "أسود مطفأ",
      shortEn:
        "A hand-made bowl in natural clay, shaped for a bright, soft smoke that runs 35–40 minutes. A small internal rim holds the molasses in place while the optimal wall thickness keeps the mix from overheating — built for the focused solo session.",
      shortUk:
        "Чаша ручної роботи з натуральної глини, форма якої дарує яскравий і м'який дим протягом 35–40 хвилин. Невеликий внутрішній бортик утримує патоку, а оптимальна товщина стінок не дає суміші перегріватися — створена для зосередженої соло-сесії.",
      shortJa:
        "天然クレイを手づくりしたボウル。35〜40分続く、明るくやわらかな煙のために形づくられています。内側の小さなリムが糖蜜を受け止め、最適な肉厚がミックスの焼けすぎを防ぎます。ひとりでじっくり向き合うセッションのために。",
      shortAr:
        "رأس مصنوع يدويًا من طين طبيعي، مصمَّم لدخان مشرق وناعم يمتد من 35 إلى 40 دقيقة. تمسك حافة داخلية صغيرة المعسّل في موضعه، بينما تمنع سماكة الجدران المثالية احتراق الخلطة — مصنوع للجلسة الفردية المركّزة.",
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
      benefitsJa: [
        "35〜40分続く、明るくやわらかな煙",
        "糖蜜の落ちを抑える内側の小さなリム",
        "最適な肉厚が焼けすぎを防ぎます",
        "おひとり用に設計",
        "ウインドカバー使用時の加熱時間は約5分（炭2〜3個）",
      ],
      benefitsAr: [
        "دخان مشرق وناعم لمدة 35–40 دقيقة",
        "حافة داخلية صغيرة تؤخّر نزول المعسّل",
        "سماكة جدران مثالية تمنع الاحتراق",
        "مصمَّم للاستخدام الفردي",
        "زمن التسخين نحو 5 دقائق تحت غطاء الرياح (2–3 قطع فحم)",
      ],
      tipsEn: [
        "Never cool the device with water",
        "Handle with care — natural clay is fragile",
      ],
      tipsUk: [
        "Ніколи не охолоджуйте виріб водою",
        "Поводьтеся обережно — натуральна глина крихка",
      ],
      tipsJa: [
        "水で本体を冷やさないでください",
        "天然クレイは割れやすいため、取り扱いにご注意ください",
      ],
      tipsAr: [
        "لا تبرّد الرأس بالماء أبدًا",
        "تعامل معه بعناية — الطين الطبيعي هشّ",
      ],
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", labelJa: "素材", labelAr: "المادة", valueEn: "Natural clay", valueUk: "Натуральна глина", valueJa: "天然クレイ", valueAr: "طين طبيعي" },
        { labelEn: "Tobacco capacity", labelUk: "Ємність тютюну", labelJa: "タバコ容量", labelAr: "سعة المعسّل", valueEn: "10–12 g", valueUk: "10–12 г", valueJa: "10〜12 g", valueAr: "10–12 غ" },
      ],
      features: [
        { icon: "cloud", titleEn: "Smoke", titleUk: "Дим", textEn: "Bright & soft", textUk: "Яскравий і м'який" },
        { icon: "clock", titleEn: "Session", titleUk: "Сесія", titleJa: "セッション", titleAr: "الجلسة", textEn: "35–40 minutes", textUk: "35–40 хвилин" },
        { icon: "user", titleEn: "Made for", titleUk: "Формат", textEn: "Solo use", textUk: "Соло-сесії" },
        { icon: "flame", titleEn: "Heat-up", titleUk: "Нагрів", titleJa: "加熱", titleAr: "التسخين", textEn: "≈ 5 minutes", textUk: "≈ 5 хвилин" },
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
    taglineJa: "手づくりの天然クレイ。",
    taglineAr: "طين طبيعي مصنوع يدويًا.",
    descriptionUk: "Класичний фанель з унікальною вставкою. Неймовірна насиченість та м'якість диму. Для тих, хто цінує процес.",
    descriptionEn: "Classic phunnel with unique insert. Incredible richness and mildness of smoke. For those who value the process.",
    descriptionJa: "独自のインサートを備えたクラシックなファンネル。驚くほど濃厚でまろやかな煙。過程を大切にする方へ。",
    descriptionAr: "فانل كلاسيكي بقطعة داخلية مميّزة. دخان غني ولطيف إلى حد مذهل. لمن يقدّر التجربة.",
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
      colourShownJa: "マットブラック",
      colourShownAr: "أسود مطفأ",
      shortEn:
        "The FTP is a hand-made clay phunnel with a clever 2-in-1 design and two interchangeable inserts. Drop in the aluminium sleeve for a true phunnel — no molasses down the stem, just clean, even airflow — or the stainless-steel mesh screen for the open, powerful draw of a killer bowl. Deep, rich flavour with an effortless, mild pull, whether you're chasing clouds or settling in for a long session.",
      shortUk:
        "FTP — це фанель ручної роботи з глини з розумним дизайном 2-в-1 та двома змінними вставками. Встановіть алюмінієву гільзу для справжнього фанеля — жодної патоки в шахті, лише чистий рівномірний потік повітря — або вставку зі сталевою сіткою для відкритої, потужної тяги killer-чаші. Глибокий насичений смак і легка м'яка тяга — чи то ви ганяєтеся за хмарами, чи налаштувалися на довгу сесію.",
      shortJa:
        "FTP は、2-in-1 の巧みな設計と2種類の交換式インサートを備えた、クレイ製の手づくりファンネルです。アルミニウムスリーブを入れれば本格的なファンネル — 糖蜜がステムに落ちず、澄んだ均一な気流だけが残ります。ステンレスメッシュのスクリーンに替えれば、killer ボウルのような開いた力強い吸い込みに。深く豊かな香味と、力のいらないまろやかな吸い込みを、大きな煙を求めるときにも、長くくつろぐときにも。",
      shortAr:
        "FTP فانل من الطين مصنوع يدويًا بتصميم ذكي 2 في 1 وقطعتين داخليتين قابلتين للتبديل. ضع الكم الألمنيومي لتحصل على فانل حقيقي — بلا نزول للمعسّل في الشيشة، وبتدفق هواء نظيف ومنتظم — أو ضع الشبكة من الفولاذ المقاوم للصدأ لتحصل على السحب المفتوح والقوي لرأس killer. نكهة عميقة وغنية وسحب لطيف بلا مجهود، سواء كنت تلاحق الدخان الكثيف أو تستقر لجلسة طويلة.",
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
      benefitsJa: [
        "交換式インサートによる 2-in-1 設計",
        "クラシックなファンネルモード — 糖蜜がステムに落ちません",
        "メッシュスクリーンのタクティカルモード — 開いた気流と力強い吸い込み",
        "深く豊かな香味と、力のいらないまろやかな吸い込み",
        "大きな煙にも、長くゆったりしたセッションにも",
      ],
      benefitsAr: [
        "تصميم 2 في 1 بقطع داخلية قابلة للتبديل",
        "وضع الفانل الكلاسيكي — بلا نزول للمعسّل في الشيشة",
        "الوضع التكتيكي بالشبكة — تدفق مفتوح وسحب قوي",
        "نكهة عميقة وغنية بسحب لطيف بلا مجهود",
        "مناسب للدخان الكثيف وللجلسات الطويلة الهادئة على السواء",
      ],
      tipsEn: [
        "Never cool the device with water",
        "Handle with care — natural clay is fragile",
      ],
      tipsUk: [
        "Ніколи не охолоджуйте виріб водою",
        "Поводьтеся обережно — натуральна глина крихка",
      ],
      tipsJa: [
        "水で本体を冷やさないでください",
        "天然クレイは割れやすいため、取り扱いにご注意ください",
      ],
      tipsAr: [
        "لا تبرّد الرأس بالماء أبدًا",
        "تعامل معه بعناية — الطين الطبيعي هشّ",
      ],
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", labelJa: "素材", labelAr: "المادة", valueEn: "Natural clay", valueUk: "Натуральна глина", valueJa: "天然クレイ", valueAr: "طين طبيعي" },
        { labelEn: "Design", labelUk: "Дизайн", labelJa: "設計", labelAr: "التصميم", valueEn: "2-in-1 (interchangeable inserts)", valueUk: "2-в-1 (змінні вставки)", valueJa: "2-in-1（交換式インサート）", valueAr: "2 في 1 (قطع داخلية قابلة للتبديل)" },
        { labelEn: "Insert 1", labelUk: "Вставка 1", labelJa: "インサート 1", labelAr: "القطعة الداخلية 1", valueEn: "Aluminium phunnel sleeve", valueUk: "Алюмінієва вставка-фанел", valueJa: "アルミニウム製ファンネルスリーブ", valueAr: "كم فانل من الألمنيوم" },
        { labelEn: "Insert 2", labelUk: "Вставка 2", labelJa: "インサート 2", labelAr: "القطعة الداخلية 2", valueEn: "Stainless steel mesh screen", valueUk: "Сітка з нержавіючої сталі", valueJa: "ステンレスメッシュスクリーン", valueAr: "شبكة من الفولاذ المقاوم للصدأ" },
      ],
      features: [
        { icon: "layers", titleEn: "Design", titleUk: "Дизайн", titleJa: "設計", titleAr: "التصميم", textEn: "2-in-1 inserts", textUk: "2-в-1 вставки" },
        { icon: "droplet", titleEn: "Phunnel", titleUk: "Фанель", textEn: "No molasses drip", textUk: "Без патоки в шахті" },
        { icon: "mesh", titleEn: "Tactical", titleUk: "Тактичний", textEn: "Mesh screen", textUk: "Сталева сітка" },
        { icon: "wave", titleEn: "Flavour", titleUk: "Смак", titleJa: "香味", titleAr: "النكهة", textEn: "Deep & rich", textUk: "Глибокий і насичений" },
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
    taglineJa: "タクティカルスタイルのメタルウインドカバー。",
    taglineAr: "غطاء رياح معدني بطابع تكتيكي.",
    /* THE CATALOGUE PRICE IS THE COVER WITHOUT THE TIMER. The timer is an
       add-on selected on the product page (see lib/windcover-options), which is
       why the description no longer promises one — a card quoting ₴850 while
       describing a built-in timer would be selling the ₴1700 configuration at
       the bare price. */
    descriptionUk: "Суцільнометалевий ковпак із порошковим покриттям і лазерним гравіюванням. Таймер — опційно, кріпиться магнітом.",
    descriptionEn: "Solid metal wind cover with powder coating and laser engraving. Timer optional, attaches magnetically.",
    descriptionJa: "粉体塗装とレーザー刻印を施した無垢のメタルウインドカバー。タイマーは別売、マグネットで装着します。",
    descriptionAr: "غطاء رياح معدني صلب بطلاء بودرة ونقش ليزر. المؤقّت اختياري ويثبّت مغناطيسيًا.",
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
      shortJa:
        "大胆なタクティカルスタイルで設計された、精密なメタルウインドカバー。無垢の金属に耐久性の高い粉体塗装と、くっきりとしたレーザー刻印。確かな防風性能とともに、どんなセットにも際立つ佇まいを添えます。",
      shortAr:
        "غطاء رياح معدني مهندس بدقة بتصميم تكتيكي جريء. مصنوع من معدن صلب بتشطيب بودرة متين ونقش ليزر واضح، يوفّر حماية موثوقة من الرياح ويضيف حضورًا مميزًا إلى أي طقم.",
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
      benefitsJa: [
        "熱と傷に強い粉体塗装を施した無垢メタル構造に、消えないレーザー刻印",
        "適切な気流を保ちながら風を防ぎ、安定した熱と長いセッションを支えます",
        "USB Type-C 充電式のカウントダウンタイマー（別売）。LED 表示と爆発音風のサウンドで、炭を置いたときに時間を設定すれば、理想の加熱時間を追えます",
        "マグネット装着で、タイマーの取り付け・取り外しが素早く確実",
        "忙しいラウンジに最適：タイマーと音で、どのシーシャが仕上がったかをスタッフもお客様もすぐに把握できます",
        "2つの仕様をご用意：標準のウインドカバー、またはマグネット装着タイマー付き",
      ],
      benefitsAr: [
        "بنية معدنية صلبة بطلاء بودرة يقاوم الحرارة والخدوش، مع نقش ليزر دائم",
        "حماية فعّالة من الرياح تحافظ على تدفق الهواء السليم لحرارة ثابتة وجلسات أطول",
        "مؤقّت تنازلي اختياري يُشحن عبر USB Type-C بشاشة LED وصوت على طراز التفجير — اضبط الوقت عند وضع الفحم لتتابع فترة التسخين المثالية",
        "تثبيت مغناطيسي لربط وحدة المؤقّت بسرعة وإحكام",
        "مثالي للاونجات المزدحمة: المؤقّت والصوت يساعدان الطاقم والزبائن على معرفة أي شيشة جاهزة",
        "متوفر بنسختين: غطاء رياح عادي، أو غطاء رياح بمؤقّت مثبّت مغناطيسيًا",
      ],
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", labelJa: "素材", labelAr: "المادة", valueEn: "Metal + powder coating + laser engraving", valueUk: "Метал + порошкове покриття + лазерне гравіювання", valueJa: "メタル + 粉体塗装 + レーザー刻印", valueAr: "معدن + طلاء بودرة + نقش ليزر" },
        { labelEn: "Charging (timer version)", labelUk: "Заряджання (версія з таймером)", labelJa: "充電（タイマー仕様）", labelAr: "الشحن (نسخة المؤقّت)", valueEn: "USB Type-C", valueUk: "USB Type-C", valueJa: "USB Type-C", valueAr: "USB Type-C" },
        { labelEn: "Attachment (timer version)", labelUk: "Кріплення (версія з таймером)", labelJa: "装着（タイマー仕様）", labelAr: "التثبيت (نسخة المؤقّت)", valueEn: "Magnetic", valueUk: "Магнітне", valueJa: "マグネット式", valueAr: "مغناطيسي" },
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
    taglineJa: "カモフラージュ仕上げのメタルウインドカバー。",
    taglineAr: "غطاء رياح معدني بتشطيب تمويهي.",
    descriptionUk: "Суцільнометалевий ковпак із камуфляжним принтом і UV-друком. Таймер — опційно, кріпиться магнітом.",
    descriptionEn: "Solid metal wind cover with a camouflage finish and UV print. Timer optional, attaches magnetically.",
    descriptionJa: "カモフラージュ仕上げと UV プリントを施した無垢のメタルウインドカバー。タイマーは別売、マグネットで装着します。",
    descriptionAr: "غطاء رياح معدني صلب بتشطيب تمويهي وطباعة UV. المؤقّت اختياري ويثبّت مغناطيسيًا.",
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
      shortJa:
        "カモフラージュ仕上げの、精密なメタルウインドカバー。無垢の金属に耐久性の高い粉体塗装のボディと、くっきりとした UV プリント。確かな防風性能とともに、どんなセットにも際立つ佇まいを添えます。",
      shortAr:
        "غطاء رياح معدني مهندس بدقة بتشطيب تمويهي. مصنوع من معدن صلب بجسم مطلي بالبودرة وطباعة UV واضحة، يوفّر حماية موثوقة من الرياح ويضيف حضورًا مميزًا إلى أي طقم.",
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
      benefitsJa: [
        "熱と傷に強い粉体塗装を施した無垢メタル構造に、消えない UV プリント",
        "前面はカモフラージュ、背面には TCT のラウンデル",
        "適切な気流を保ちながら風を防ぎ、安定した熱と長いセッションを支えます",
        "USB Type-C 充電式のカウントダウンタイマー（別売）。LED 表示と爆発音風のサウンドで、炭を置いたときに時間を設定すれば、理想の加熱時間を追えます",
        "マグネット装着で、タイマーの取り付け・取り外しが素早く確実",
        "2つの仕様をご用意：標準のウインドカバー、またはマグネット装着タイマー付き",
      ],
      benefitsAr: [
        "بنية معدنية صلبة بطلاء بودرة يقاوم الحرارة والخدوش، مع طباعة UV دائمة",
        "لوحة أمامية بتمويه وشعار TCT الدائري على الوجه الخلفي",
        "حماية فعّالة من الرياح تحافظ على تدفق الهواء السليم لحرارة ثابتة وجلسات أطول",
        "مؤقّت تنازلي اختياري يُشحن عبر USB Type-C بشاشة LED وصوت على طراز التفجير — اضبط الوقت عند وضع الفحم لتتابع فترة التسخين المثالية",
        "تثبيت مغناطيسي لربط وحدة المؤقّت بسرعة وإحكام",
        "متوفر بنسختين: غطاء رياح عادي، أو غطاء رياح بمؤقّت مثبّت مغناطيسيًا",
      ],
      specs: [
        { labelEn: "Material", labelUk: "Матеріал", labelJa: "素材", labelAr: "المادة", valueEn: "Metal + powder coating + UV print", valueUk: "Метал + порошкове покриття + UV-друк", valueJa: "メタル + 粉体塗装 + UV プリント", valueAr: "معدن + طلاء بودرة + طباعة UV" },
        { labelEn: "Finish", labelUk: "Оздоблення", labelJa: "仕上げ", labelAr: "التشطيب", valueEn: "Camouflage face panel", valueUk: "Камуфляжна лицьова панель", valueJa: "カモフラージュのフェイスパネル", valueAr: "لوحة أمامية بتمويه" },
        { labelEn: "Charging (timer version)", labelUk: "Заряджання (версія з таймером)", labelJa: "充電（タイマー仕様）", labelAr: "الشحن (نسخة المؤقّت)", valueEn: "USB Type-C", valueUk: "USB Type-C", valueJa: "USB Type-C", valueAr: "USB Type-C" },
        { labelEn: "Attachment (timer version)", labelUk: "Кріплення (версія з таймером)", labelJa: "装着（タイマー仕様）", labelAr: "التثبيت (نسخة المؤقّت)", valueEn: "Magnetic", valueUk: "Магнітне", valueJa: "マグネット式", valueAr: "مغناطيسي" },
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
