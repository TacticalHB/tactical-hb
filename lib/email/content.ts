import "server-only";

/* ---------------------------------------------------------------------------
   The copy, keyed by flow step and locale.

   ENGLISH IS THE CONTENT PACK, VERBATIM. Subjects, preheaders, body and CTA
   labels are transcribed from Tactical_HB_Email_Content_Pack.pdf and should
   only change when that document does.

   THE UKRAINIAN IS MINE, AND THAT IS A DEVIATION WORTH KNOWING ABOUT. The pack
   was exported with a font carrying no Cyrillic glyphs: all 3,580 characters of
   the approved Ukrainian render as .notdef boxes and are not recoverable from
   the file by any means. Mario's instruction was to write it rather than wait
   for a re-export, so this is written to match the storefront's own voice —
   the same vocabulary the shop already uses for чаша, пристрій нагріву,
   ковпак, "Зібрати сет" — not a machine translation of the English.

   If the pack is ever re-exported with a working font, replace the `uk` halves
   here and nothing else: no logic reads the words.

   URLS ARE BUILT, NOT WRITTEN. Every path goes through a locale-aware helper,
   because a hardcoded /en/... in a Ukrainian mail is the kind of mistake that
   survives review and lands in an inbox.
--------------------------------------------------------------------------- */

export type Locale = "en" | "uk";

export type EmailCopy = {
  subject: string;
  preheader: string;
  headline: string;
  paragraphs: string[];
  bullets?: string[];
  primaryLabel: string;
  secondaryLabel?: string;
};

export type WelcomeStep = "W1" | "W2" | "W3" | "W4";
export type PostPurchaseStep = "P1";
export type CartStep = "C1" | "C2" | "C3";

const SITE = (process.env.SITE_URL || "https://tactical-hb.com").replace(/\/$/, "");

/** Absolute, locale-prefixed. The only way a URL should be made in this module. */
export function url(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE}/${locale}${clean}`;
}

/* ---- Welcome ------------------------------------------------------------ */

export const WELCOME: Record<WelcomeStep, Record<Locale, EmailCopy>> = {
  W1: {
    en: {
      subject: "Welcome to Tactical HB",
      preheader: "Precision accessories. Built to last.",
      headline: "You're on the list.",
      paragraphs: [
        "Tactical HB is a Ukrainian brand of premium hookah accessories — engineered with military-grade attention to detail, finished for real sessions, not display cases.",
        "Here's what this list is for:",
      ],
      bullets: [
        "Short field notes on heat, setup, and gear",
        "First look at new pieces",
        "Practical kit logic (bowl → HMD → wind cover)",
      ],
      primaryLabel: "Explore the collection",
      secondaryLabel: "Build a setup",
    },
    uk: {
      subject: "Вітаємо в Tactical HB",
      preheader: "Точні аксесуари. Зроблено надовго.",
      headline: "Ви у списку.",
      paragraphs: [
        "Tactical HB — український бренд преміальних аксесуарів для кальяну. Зроблено з військовою увагою до деталей і розраховано на справжні сесії, а не на вітрину.",
        "Ось для чого цей список:",
      ],
      bullets: [
        "Короткі нотатки про жар, сетап і спорядження",
        "Першими про нові вироби",
        "Практична логіка комплекту (чаша → пристрій нагріву → ковпак)",
      ],
      primaryLabel: "Переглянути колекцію",
      secondaryLabel: "Зібрати сет",
    },
  },

  W2: {
    en: {
      subject: "Bowl. Heat. Cover.",
      preheader: "The order that actually matters.",
      headline: "Bowl. Heat. Cover.",
      paragraphs: ["A complete session is a system:"],
      bullets: [
        "Bowl — holds the tobacco and sets the flavour path",
        "HMD — manages heat so you stop babysitting coals",
        "Wind cover — locks the session when air moves against you",
      ],
      primaryLabel: "Build a setup",
      secondaryLabel: "Shop HMDs",
    },
    uk: {
      subject: "Чаша. Жар. Ковпак.",
      preheader: "Порядок, який справді має значення.",
      headline: "Чаша. Жар. Ковпак.",
      paragraphs: ["Повноцінна сесія — це система:"],
      bullets: [
        "Чаша — тримає тютюн і задає смаковий профіль",
        "Пристрій нагріву — керує жаром, і вугілля більше не потребує няньки",
        "Ковпак — тримає сесію, коли повітря працює проти вас",
      ],
      primaryLabel: "Зібрати сет",
      secondaryLabel: "Пристрої нагріву",
    },
  },

  W3: {
    en: {
      subject: "Uniform heat. Built to last.",
      preheader: "Why the HMD sits at the centre of the kit.",
      headline: "Uniform heat. Built to last.",
      paragraphs: [
        "If you only add one piece after the bowl, make it the heat device.",
        "An HMD evens the temperature, protects the pack, and cuts the constant coal dance. Ours are machined and finished for repeated use — Classic, A.Craft, and OP each have a distinct character, same standard.",
        "Pair it with a bowl you already trust. Add a wind cover when you need the session locked in.",
      ],
      primaryLabel: "Shop HMD TCT Classic",
      secondaryLabel: "View all heat devices",
    },
    uk: {
      subject: "Рівний жар. Зроблено надовго.",
      preheader: "Чому пристрій нагріву — центр комплекту.",
      headline: "Рівний жар. Зроблено надовго.",
      paragraphs: [
        "Якщо після чаші додавати лише одну річ — нехай це буде пристрій нагріву.",
        "Він вирівнює температуру, береже забивку і прибирає постійні танці з вугіллям. Наші оброблені й доведені під регулярне використання: Classic, A.Craft і OP мають різний характер, але один стандарт.",
        "Поєднайте з чашею, якій уже довіряєте. Додайте ковпак, коли сесію треба тримати.",
      ],
      primaryLabel: "HMD TCT Classic",
      secondaryLabel: "Усі пристрої нагріву",
    },
  },

  W4: {
    en: {
      subject: "Ranks, not random discounts",
      preheader: "Operative → Specialist → Captain → Colonel.",
      headline: "Ranks, not random discounts",
      paragraphs: [
        "On Tactical HB, spend builds rank — Recruit through Colonel — with milestones and rewards that match how you actually buy.",
        "Colonel unlocks a permanent status benefit on the account. Until then, every order moves you through the system.",
        "If you haven't ordered yet, start with one solid piece or a full setup. The rank follows the session, not the other way around.",
      ],
      primaryLabel: "View loyalty",
      secondaryLabel: "Shop bestsellers",
    },
    uk: {
      subject: "Звання, а не випадкові знижки",
      preheader: "Оператив → Спеціаліст → Капітан → Полковник.",
      headline: "Звання, а не випадкові знижки",
      paragraphs: [
        "У Tactical HB покупки будують звання — від Рекрута до Полковника, з етапами й винагородами, які відповідають тому, як ви справді купуєте.",
        "Полковник відкриває постійну перевагу на акаунті. До того кожне замовлення просуває вас системою.",
        "Якщо ще не замовляли — почніть з однієї надійної речі або повного сету. Звання йде за сесією, а не навпаки.",
      ],
      primaryLabel: "Мої бонуси",
      secondaryLabel: "Популярні товари",
    },
  },
};

/* ---- Abandoned cart ------------------------------------------------------
   No discount in any of the three. The pack is explicit that C1 and C2 carry
   none, and that C3's premium default is none either until the business
   decides otherwise — so there is no coupon slot in this data at all, which
   is the surest way for one not to appear by accident.
------------------------------------------------------------------------- */

export const CART: Record<CartStep, Record<Locale, EmailCopy>> = {
  C1: {
    en: {
      subject: "Your bag is waiting",
      preheader: "{{product_name}} is still there.",
      headline: "Your bag is waiting",
      paragraphs: [
        "You left something in your shopping bag.",
        "Complete the order when you're ready — or open Build a setup if you want the rest of the kit matched.",
      ],
      primaryLabel: "Return to bag",
      secondaryLabel: "Continue shopping",
    },
    uk: {
      subject: "Ваш кошик чекає",
      preheader: "{{product_name}} досі там.",
      headline: "Ваш кошик чекає",
      paragraphs: [
        "Ви залишили дещо в кошику.",
        "Завершіть замовлення, коли буде зручно — або відкрийте «Зібрати сет», щоб підібрати решту комплекту.",
      ],
      primaryLabel: "Повернутися до кошика",
      secondaryLabel: "Продовжити покупки",
    },
  },

  C2: {
    en: {
      subject: "Still thinking it through?",
      preheader: "Heat, pack, and cover — the system behind the pieces.",
      headline: "Still thinking it through?",
      paragraphs: [
        "A single accessory is useful. A matched setup is better.",
        "If your bag has a bowl, the natural next step is heat management. If it has an HMD, a wind cover locks the session when you need it.",
        "Same craft standard on every line — natural clay, machined metal, tactical finishes.",
      ],
      primaryLabel: "Complete your order",
      secondaryLabel: "Build a setup",
    },
    uk: {
      subject: "Ще обмірковуєте?",
      preheader: "Жар, забивка і ковпак — система за окремими деталями.",
      headline: "Ще обмірковуєте?",
      paragraphs: [
        "Окремий аксесуар — корисний. Підібраний сет — кращий.",
        "Якщо в кошику чаша, наступний крок — керування жаром. Якщо пристрій нагріву — ковпак тримає сесію тоді, коли це потрібно.",
        "Один стандарт роботи в кожній позиції: натуральна глина, оброблений метал, тактичне оздоблення.",
      ],
      primaryLabel: "Завершити замовлення",
      secondaryLabel: "Зібрати сет",
    },
  },

  C3: {
    en: {
      subject: "Last note on your bag",
      preheader: "We held the items. No pressure.",
      headline: "Last note on your bag",
      paragraphs: [
        "Your bag is still saved.",
        "If the timing wasn't right, no problem — the pieces will be here. If you were close to ordering, this is a clean moment to finish.",
        "Questions on fit, heat, or shipping? Reply to this email.",
      ],
      primaryLabel: "Return to bag",
      secondaryLabel: "Contact us",
    },
    uk: {
      subject: "Останнє нагадування про кошик",
      preheader: "Ми зберегли позиції. Без тиску.",
      headline: "Останнє нагадування про кошик",
      paragraphs: [
        "Ваш кошик усе ще збережений.",
        "Якщо момент був невдалий — нічого страшного, речі нікуди не подінуться. Якщо ви були близькі до замовлення, зараз спокійна нагода його завершити.",
        "Питання щодо сумісності, жару чи доставки? Просто відповідайте на цей лист.",
      ],
      primaryLabel: "Повернутися до кошика",
      secondaryLabel: "Зв'язатися з нами",
    },
  },
};

/* ---- Post-purchase ------------------------------------------------------
   ONE MAIL, DAYS AFTER THE PARCEL. Not another shipping update: the courier
   mail already said where it is. This asks how the session went and points at
   the one thing a first-time buyer usually has not done yet, which is finish
   the kit.

   NO DISCOUNT, and none in the data to add by accident — same rule as the
   cart series.

   THE ENGLISH FOLLOWS THE PACK'S P1 (subject and preheader are its words
   verbatim); the body is written to the structure the brief specifies —
   thanks, soft cross-sell, reply for questions — in the register the rest of
   the pack uses, because P1's body was never transcribed out of the PDF. The
   Ukrainian is mine for the reason recorded at the top of this file: the pack
   has no recoverable Cyrillic.
------------------------------------------------------------------------- */

export const POST_PURCHASE: Record<PostPurchaseStep, Record<Locale, EmailCopy>> = {
  P1: {
    en: {
      subject: "How is the session?",
      preheader: "If you started with one piece, the system still has room.",
      headline: "How is the session?",
      paragraphs: [
        "Thank you for your order — it should be with you by now.",
        "If you started with one piece, the rest of the system is still open. A bowl sets the flavour path, a heat device takes the coal dance out of it, and a wind cover holds the session when the air moves. Build a setup puts the three together in one pass and prices them as they go.",
        "Anything not sitting right — fit, heat, a part that arrived marked — reply to this email. It reaches a person.",
      ],
      primaryLabel: "Build a setup",
      secondaryLabel: "View your orders",
    },
    uk: {
      subject: "Як сесія?",
      preheader: "Якщо почали з однієї речі — система ще має місце.",
      headline: "Як сесія?",
      paragraphs: [
        "Дякуємо за замовлення — воно вже мало дійти до вас.",
        "Якщо ви почали з однієї речі, решта системи ще відкрита. Чаша задає смаковий профіль, пристрій нагріву прибирає танці з вугіллям, а ковпак тримає сесію, коли працює повітря. «Зібрати сет» складає всі три за один раз і одразу рахує ціну.",
        "Якщо щось не так — посадка, жар, пошкоджена деталь — просто відповідайте на цей лист. Його читає людина.",
      ],
      primaryLabel: "Зібрати сет",
      secondaryLabel: "Мої замовлення",
    },
  },
};

export const POST_PURCHASE_LINKS: Record<PostPurchaseStep, { primary: string; secondary: string }> = {
  P1: { primary: "/setup", secondary: "/account/orders" },
};

/** Where each step's buttons point. Paths only — `url()` adds site + locale. */
export const WELCOME_LINKS: Record<WelcomeStep, { primary: string; secondary: string }> = {
  W1: { primary: "/products", secondary: "/setup" },
  W2: { primary: "/setup", secondary: "/products" },
  W3: { primary: "/products/hmd-tct-classic", secondary: "/products" },
  W4: { primary: "/account/loyalty", secondary: "/products" },
};

export const CART_LINKS: Record<CartStep, { primary: string; secondary: string }> = {
  C1: { primary: "/cart", secondary: "/products" },
  C2: { primary: "/cart", secondary: "/setup" },
  C3: { primary: "/cart", secondary: "/contact" },
};
