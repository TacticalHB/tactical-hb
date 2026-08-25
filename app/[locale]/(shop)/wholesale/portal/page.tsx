import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n-text";
import {
  addonsFor,
  lineSku,
  partnerForUser,
  requestsForUser,
  wholesaleCatalogue,
} from "@/lib/wholesale-portal";
import { ACCOUNT_STATUS_TEXT, canAccessPortal } from "@/lib/wholesale-display";
import { addonPrice, bookPrice } from "@/lib/wholesale-prices";
import PortalClient, { type PortalProduct } from "@/components/wholesale/PortalClient";
import RequestHistory from "@/components/wholesale/RequestHistory";
import { SALES_EMAIL } from "@/lib/contact-info";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/* ---------------------------------------------------------------------------
   The wholesale portal — and the gate in front of it.

   FOUR OUTCOMES, AND ONLY ONE OF THEM RENDERS A CATALOGUE:

     not signed in   → the login page, with a redirect back here
     signed in, no application → an invitation to apply
     signed in, not approved   → a status screen, no prices, no quantities
     approved                  → the catalogue and the request builder

   THE PRICES ARE NOT IN THE PAGE UNLESS THE READER IS APPROVED. This is why
   the catalogue is assembled here rather than fetched by the client: an
   unapproved partner's HTML contains no dealer figures at all, so there is
   nothing to find in the network tab, nothing cached, and nothing a hidden
   element could be un-hidden to reveal.

   A page that refuses to render is still only a UI decision, so the submit
   action re-checks approval against the database on every call — see
   lib/wholesale-portal.
--------------------------------------------------------------------------- */

export default async function WholesalePortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const back = `/${locale}/wholesale/portal`;

  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect(`/${locale}/login?redirect=${encodeURIComponent(back)}`);

  const partner = await partnerForUser(user.id);

  if (!partner) return <NoApplication locale={locale} />;

  /* Read into a local so the negative branch narrows: canAccessPortal is a
     type predicate, which leaves exactly the three closed states below. */
  const status = partner.accountStatus;
  if (!canAccessPortal(status)) {
    return <NotApproved locale={locale} status={status} company={partner.company} />;
  }

  /* Dealer prices are resolved on the server and only for an approved reader.
     Where a product has none, the client is handed nulls and prints "quote on
     request" — it never sees a retail price to fall back on.

     A product with colours becomes one line PER COLOUR, each carrying its own
     stock sku and its own price, because that is what a trade order is placed
     against. A product without colours is a single line, and renders exactly
     as it did before. */
  /* THE BOOK DECIDES THE NUMBERS, and the book comes from the partner row.
     A partner with no book gets nulls all the way down — the portal prints
     "—" against every line and disables submit, which is the same refusal the
     server applies on the write path.

     Note the base price is looked up by SLUG, not by variant: the wholesale
     list quotes one figure for HMD TCT OP whatever the colour, unlike retail
     where Purple costs €2 more. */
  const book = partner.partnerType;

  const items: PortalProduct[] = wholesaleCatalogue().map((p) => {
    const base = book ? bookPrice(book, p.slug) : null;
    const addons = addonsFor(p);
    /* Add-on surcharges travel with the product so the client can price a
       configuration live without another round trip — and without ever being
       trusted: the server recomputes all of it on submit. */
    const addonPrices = Object.fromEntries(
      addons.map((a) => [a, book ? addonPrice(book, a) : null])
    ) as PortalProduct["addonPrices"];

    const shell = {
      slug: p.slug,
      name: p.nameEn,
      category: p.category,
      image: p.gridImage || p.image,
      /* Which add-ons this product takes, read from the catalogue on the
         server. The client renders what it is given rather than deciding for
         itself, so a bowl can never be shown a timer toggle. */
      addons,
      addonPrices,
    };

    const priced = { priceEur: base ? base.eur : null, priceUah: base ? base.uah : null };

    if (!p.variants?.length) {
      return {
        ...shell,
        lines: [{ key: lineSku(p.slug), variant: null, swatch: null, label: p.nameEn, ...priced }],
      };
    }
    return {
      ...shell,
      lines: p.variants.map((v) => ({
        key: lineSku(p.slug, v.name),
        variant: v.name,
        swatch: v.swatch,
        label: v.name,
        ...priced,
      })),
    };
  });

  const history = await requestsForUser(user.id);

  return (
    <div className="min-h-screen pt-32 pb-20" style={{ background: "var(--bg)" }}>
      <div className="page-container">
        <PortalClient locale={locale} partner={partner} products={items} />
        {history.length > 0 && <RequestHistory locale={locale} requests={history} />}
      </div>
    </div>
  );
}

/* ---- The three closed states ---------------------------------------------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pt-32 pb-20 px-6" style={{ background: "var(--bg)" }}>
      <div className="page-container max-w-[560px]">{children}</div>
    </div>
  );
}

function NoApplication({ locale }: { locale: string }) {
  return (
    <Shell>
      <h1 className="font-display text-4xl md:text-5xl mb-5" style={{ color: "var(--text)" }}>
        {t(locale, {
          en: "You don't have a trade account yet",
          uk: "У вас ще немає оптового акаунта",
          ja: "まだ取引アカウントがありません",
          ar: "ليس لديك حساب تجاري بعد",
        })}
      </h1>
      <p className="text-base leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
        {t(locale, {
          en: "You're signed in to your Tactical HB account, but wholesale is separate and approved by hand. Apply and we'll review your details.",
          uk: "Ви увійшли до свого акаунта Tactical HB, але оптовий доступ окремий і відкривається вручну. Подайте заявку — ми розглянемо ваші дані.",
          ja: "Tactical HB のアカウントにはログイン済みですが、卸売は別枠で、一件ずつ審査のうえ開設しています。お申し込みいただければ内容を確認します。",
          ar: "أنت مسجَّل الدخول إلى حسابك في Tactical HB، لكن الجملة منفصلة وتُعتمد يدويًا. قدّم طلبك وسنراجع بياناتك.",
        })}
      </p>
      <Link
        href={`/${locale}/wholesale/register`}
        className="inline-flex h-12 px-8 rounded-full items-center justify-center text-[15px] font-medium transition-opacity hover:opacity-85"
        style={{ background: "var(--accent)", color: "#111114" }}
      >
        {t(locale, {
          en: "Apply for a wholesale account",
          uk: "Подати заявку",
          ja: "卸売アカウントを申し込む",
          ar: "التقديم للحصول على حساب جملة",
        })}
      </Link>
    </Shell>
  );
}

function NotApproved({
  locale,
  status,
  company,
}: {
  locale: string;
  status: "pending" | "rejected" | "suspended";
  company: string;
}) {
  /* Each state says something different, because "under review" and
     "suspended" call for completely different actions from the reader. What
     none of them do is show a price or a quantity box. */
  const body = {
    pending: t(locale, {
      en: "Your application is with our team. We'll email you as soon as your account is open — usually once we've received your completed application form and trade documents.",
      uk: "Ваша заявка на розгляді. Ми напишемо, щойно акаунт буде відкрито — зазвичай після отримання заповненої форми та документів.",
      ja: "お申し込みを確認しています。アカウントを開設し次第メールでご連絡します。多くの場合、申込書と取引書類の到着後となります。",
      ar: "طلبك قيد المراجعة لدى فريقنا. سنراسلك بمجرد فتح حسابك — عادةً بعد استلام استمارة الطلب والمستندات التجارية.",
    }),
    rejected: t(locale, {
      en: "We weren't able to open a trade account on this application. If you think that's a mistake, or your circumstances have changed, please get in touch.",
      uk: "За цією заявкою ми не змогли відкрити оптовий акаунт. Якщо це помилка або обставини змінилися — напишіть нам.",
      ja: "このお申し込みでは取引アカウントを開設できませんでした。行き違いがある場合や状況が変わった場合は、ご連絡ください。",
      ar: "لم نتمكّن من فتح حساب تجاري بناءً على هذا الطلب. إن كان في الأمر خطأ أو تغيّرت ظروفك، تواصل معنا.",
    }),
    suspended: t(locale, {
      en: "Ordering on this account is paused. Please get in touch and we'll pick it up with you.",
      uk: "Замовлення на цьому акаунті призупинено. Напишіть нам — ми розберемося.",
      ja: "このアカウントでのご注文は一時停止しています。ご連絡いただければ対応します。",
      ar: "الطلب على هذا الحساب متوقف مؤقتًا. تواصل معنا وسنتابع الأمر معك.",
    }),
  }[status];

  return (
    <Shell>
      <span
        className="inline-block text-xs tracking-[0.2em] uppercase mb-5 px-3 py-1.5 rounded-full"
        style={{ background: "var(--bg-soft)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
      >
        {t(locale, ACCOUNT_STATUS_TEXT[status])}
      </span>
      <h1 className="font-display text-4xl md:text-5xl mb-5" style={{ color: "var(--text)" }}>
        {company}
      </h1>
      <p className="text-base leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
        {body}
      </p>
      <a
        href={`mailto:${SALES_EMAIL}`}
        dir="ltr"
        className="inline-flex h-12 px-8 rounded-full items-center justify-center text-[15px] font-medium transition-opacity hover:opacity-85"
        style={{ background: "var(--accent)", color: "#111114" }}
      >
        {SALES_EMAIL}
      </a>
    </Shell>
  );
}
