"use client";

import { useRef, useState } from "react";
import { t } from "@/lib/i18n-text";
import { SALES_EMAIL } from "@/lib/contact-info";
import { createClient } from "@/lib/supabase/client";
import {
  confirmDocumentUpload,
  deleteWholesaleDocument,
  requestDocumentUpload,
  saveWholesaleApplication,
  submitWholesaleApplication,
} from "@/app/actions/wholesale";
import {
  ACCEPTED_TYPES,
  DOC_KINDS,
  DOC_KIND_TEXT,
  LIMITS,
  MAX_BYTES,
  PRODUCT_INTERESTS,
  PRODUCT_INTEREST_TEXT,
  PROOF_KINDS,
  VOLUMES,
  VOLUME_TEXT,
  YEARS,
  YEARS_TEXT,
  missingFor,
  type Application,
  type ApplicationAnswers,
  type ApplicationDocument,
  type DocKind,
  type Missing,
} from "@/lib/wholesale-application-display";

/* ---------------------------------------------------------------------------
   The online wholesale application (23 Oct 2026) — step 2 of opening a trade
   account, straight after registering, and what the portal shows a pending
   partner until it is done.

   It replaced the PDF applicants kept missing. Nothing here says "received"
   until the server has every required answer and at least one proof
   document; until then the portal keeps bringing them back to this page.

   FILES GO STRAIGHT TO PRIVATE STORAGE: the server hands out a one-time
   signed URL, the browser uploads to it, and the server then checks the file
   landed before recording it. A phone photo never touches our server, so
   Vercel's 4.5 MB request limit does not apply.
--------------------------------------------------------------------------- */

const BUCKET = "wholesale-documents";

/** iPhones sometimes hand over HEIC with an empty type — read it off the name. */
function typeOf(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "heic" ? "image/heic" : ext === "heif" ? "image/heif" : ext === "pdf" ? "application/pdf" : "";
}

function sizeText(bytes: number | null): string {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function WholesaleApplication({
  locale,
  initial,
  suggestedName,
  onSent,
}: {
  locale: string;
  initial: Application;
  /** Pre-fills the confirmation with the contact name they registered with. */
  suggestedName?: string | null;
  onSent: () => void;
}) {
  const T = (en: string, uk: string, ja: string, ar: string) => t(locale, { en, uk, ja, ar });
  const L = {
    step1: T("Account", "Акаунт", "アカウント", "الحساب"),
    step2: T("Application", "Заявка", "お申し込み", "الطلب"),
    step3: T("Review", "Розгляд", "審査", "المراجعة"),
    title: T("Finish your application", "Завершіть заявку", "お申し込みを完了してください", "أكمل طلبك"),
    intro: T(
      "Your account is created. These details and one document are what we need to open it — about five minutes. We review applications within 2–3 business days.",
      "Акаунт створено. Щоб відкрити його, нам потрібні ці дані та один документ — це займе близько п'яти хвилин. Ми розглядаємо заявки протягом 2–3 робочих днів.",
      "アカウントは作成されました。開設に必要なのは以下の情報と書類1点のみで、所要時間は約5分です。審査は2〜3営業日以内に行います。",
      "أُنشئ حسابك. ولفتحه نحتاج إلى هذه البيانات ومستند واحد — نحو خمس دقائق. نراجع الطلبات خلال 2–3 أيام عمل."
    ),
    business: T("Your business", "Ваш бізнес", "事業について", "نشاطك التجاري"),
    legalName: T("Legal company name", "Юридична назва компанії / ФОП", "会社の正式名称", "الاسم القانوني للشركة"),
    taxId: T("Tax or company registration number", "Податковий або реєстраційний номер (ЄДРПОУ / ІПН)", "税番号または法人登記番号", "الرقم الضريبي أو رقم السجل التجاري"),
    address: T("Business address", "Адреса бізнесу", "事業所の所在地", "عنوان النشاط التجاري"),
    years: T("Years in business", "Скільки років працюєте", "事業年数", "سنوات النشاط"),
    website: T("Website or Instagram", "Сайт або Instagram", "ウェブサイトまたは Instagram", "الموقع الإلكتروني أو Instagram"),
    after: T("What you're looking for", "Що вас цікавить", "ご希望について", "ما الذي تبحث عنه"),
    volume: T("Expected monthly volume", "Очікуваний обсяг на місяць", "月間の想定数量", "الكمية الشهرية المتوقعة"),
    products: T("Products you're interested in", "Товари, які вас цікавлять", "ご関心のある製品", "المنتجات التي تهمّك"),
    referral: T("How did you hear about us?", "Як ви про нас дізналися?", "当社を何でお知りになりましたか？", "كيف عرفت عنّا؟"),
    comments: T("Anything else we should know", "Що ще нам варто знати", "その他お伝えいただきたいこと", "أي شيء آخر ينبغي أن نعرفه"),
    documents: T("Documents", "Документи", "書類", "المستندات"),
    docsIntro: T(
      "A photo or PDF is fine. Your company registration or tax certificate is required (one of the two); the rest helps us decide faster.",
      "Підійде фото або PDF. Документ про реєстрацію або податкова довідка обовʼязкові (одне з двох); решта допоможе вирішити швидше.",
      "写真または PDF で構いません。会社登記書類または納税証明書のいずれか1点は必須です。その他の書類は審査を早める助けになります。",
      "تكفي صورة أو ملف PDF. سجل الشركة أو الشهادة الضريبية مطلوب (أحدهما)؛ والباقي يساعدنا على القرار أسرع."
    ),
    upload: T("Upload a file or take a photo", "Завантажити файл або зробити фото", "ファイルをアップロード / 写真を撮る", "ارفع ملفًا أو التقط صورة"),
    uploadAnother: T("Add another", "Додати ще", "さらに追加", "أضف آخر"),
    uploading: T("Uploading…", "Завантаження…", "アップロード中…", "جارٍ الرفع…"),
    remove: T("Remove", "Видалити", "削除", "إزالة"),
    oneOf: T("One of these two is required", "Обовʼязково одне з цих двох", "このうち1点は必須です", "أحد هذين مطلوب"),
    optional: T("optional", "необовʼязково", "任意", "اختياري"),
    confirm: T("Confirm", "Підтвердження", "確認", "التأكيد"),
    confirmText: T(
      "I confirm that the details above are correct and that I may apply on behalf of this business.",
      "Підтверджую, що наведені дані правильні і що я маю право подати заявку від імені цього бізнесу.",
      "上記の内容が正確であり、この事業を代表して申し込む権限があることを確認します。",
      "أؤكد أن البيانات أعلاه صحيحة وأنه يحق لي التقدّم بالطلب نيابة عن هذا النشاط التجاري."
    ),
    fullName: T("Your full name", "Ваше повне імʼя", "お名前（フルネーム）", "اسمك الكامل"),
    send: T("Send application", "Надіслати заявку", "申し込みを送信", "إرسال الطلب"),
    sending: T("Sending…", "Надсилаємо…", "送信中…", "جارٍ الإرسال…"),
    save: T("Save and finish later", "Зберегти й завершити пізніше", "保存して後で完了する", "احفظ وأكمل لاحقًا"),
    saved: T("Saved — you can come back to it from your account.", "Збережено — повернутися можна зі свого акаунта.", "保存しました。アカウントからいつでも再開できます。", "تم الحفظ — يمكنك العودة إليه من حسابك."),
    choose: T("Choose…", "Оберіть…", "選択してください…", "اختر…"),
    tooBig: T("That file is over 15 MB — please send a smaller one.", "Файл більший за 15 МБ — надішліть менший.", "15MB を超えています。より小さいファイルをお送りください。", "الملف أكبر من 15 ميغابايت — يُرجى إرسال ملف أصغر."),
    badType: T("Please send a PDF or a photo (JPG, PNG, HEIC).", "Надішліть PDF або фото (JPG, PNG, HEIC).", "PDF または写真（JPG・PNG・HEIC）をお送りください。", "يُرجى إرسال ملف PDF أو صورة (JPG أو PNG أو HEIC)."),
    failed: T("Something went wrong. Please try again.", "Щось пішло не так. Спробуйте ще раз.", "問題が発生しました。もう一度お試しください。", "حدث خطأ ما. يُرجى المحاولة مرة أخرى."),
    notReady: T(
      "Applications can't be saved just now. Please try again later, or email your documents to us.",
      "Зараз заявку не вдається зберегти. Спробуйте пізніше або надішліть документи нам на пошту.",
      "現在お申し込みを保存できません。後ほどお試しいただくか、書類をメールでお送りください。",
      "تعذّر حفظ الطلبات حاليًا. يُرجى المحاولة لاحقًا أو إرسال مستنداتك إلينا بالبريد."
    ),
    missingTitle: T("Still needed:", "Ще потрібно:", "未入力の項目：", "ما زال مطلوبًا:"),
    proofNeeded: T("a registration or tax document", "документ про реєстрацію або податкова довідка", "登記書類または納税証明書", "سجل الشركة أو المستند الضريبي"),
    confirmNeeded: T("your name in the confirmation", "ваше імʼя в підтвердженні", "確認欄のお名前", "اسمك في خانة التأكيد"),
    emailInstead: T("Prefer email? Send the documents to", "Зручніше поштою? Надішліть документи на", "メールをご希望の場合は、書類を次の宛先へお送りください：", "تفضّل البريد؟ أرسل المستندات إلى"),
  };

  const [a, setA] = useState<ApplicationAnswers>({
    legalName: initial.legalName,
    address: initial.address,
    taxId: initial.taxId,
    yearsInBusiness: initial.yearsInBusiness,
    website: initial.website,
    expectedVolume: initial.expectedVolume,
    productsInterest: initial.productsInterest,
    referralSource: initial.referralSource,
    comments: initial.comments,
  });
  const [docs, setDocs] = useState<ApplicationDocument[]>(initial.documents);
  const [confirmed, setConfirmed] = useState(false);
  const [name, setName] = useState(initial.confirmedName ?? suggestedName ?? "");
  const [busy, setBusy] = useState<"save" | "send" | null>(null);
  const [uploading, setUploading] = useState<DocKind | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [missing, setMissing] = useState<Missing[]>([]);
  const fileRefs = useRef<Partial<Record<DocKind, HTMLInputElement | null>>>({});

  const set = <K extends keyof ApplicationAnswers>(k: K, v: ApplicationAnswers[K]) => setA((prev) => ({ ...prev, [k]: v }));
  const errorText = (e: string) => (e === "not_ready" ? L.notReady : e === "too_big" ? L.tooBig : e === "bad_type" ? L.badType : L.failed);

  async function upload(kind: DocKind, file: File) {
    setMessage(null);
    const type = typeOf(file);
    if (!ACCEPTED_TYPES.includes(type)) return setMessage({ tone: "error", text: L.badType });
    if (file.size > MAX_BYTES) return setMessage({ tone: "error", text: L.tooBig });
    const supabase = createClient();
    if (!supabase) return setMessage({ tone: "error", text: L.notReady });
    setUploading(kind);
    try {
      const slot = await requestDocumentUpload(kind, file.name, type, file.size);
      if (!slot.ok) return setMessage({ tone: "error", text: errorText(slot.error) });
      const up = await supabase.storage.from(BUCKET).uploadToSignedUrl(slot.path, slot.token, file, { contentType: type });
      if (up.error) return setMessage({ tone: "error", text: L.failed });
      const done = await confirmDocumentUpload(slot.path, kind, file.name, type, file.size);
      if (!done.ok) return setMessage({ tone: "error", text: errorText(done.error) });
      setDocs((prev) => [...prev, done.document]);
      setMissing((m) => (PROOF_KINDS.includes(kind) ? m.filter((x) => x !== "proof") : m));
    } finally {
      setUploading(null);
      const input = fileRefs.current[kind];
      if (input) input.value = "";
    }
  }

  async function remove(id: string) {
    const res = await deleteWholesaleDocument(id);
    if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== id));
    else setMessage({ tone: "error", text: errorText(res.error) });
  }

  async function save() {
    setBusy("save");
    setMessage(null);
    const res = await saveWholesaleApplication(a);
    setBusy(null);
    setMessage(res.ok ? { tone: "ok", text: L.saved } : { tone: "error", text: errorText(res.error) });
  }

  async function send() {
    setMessage(null);
    const local = missingFor(a, docs, confirmed ? name : "");
    if (local.length) {
      setMissing(local);
      return;
    }
    setBusy("send");
    const res = await submitWholesaleApplication(a, name);
    setBusy(null);
    if (res.ok) return onSent();
    if (res.missing) setMissing(res.missing);
    else setMessage({ tone: "error", text: errorText(res.error) });
  }

  const label = "block text-xs tracking-[0.2em] uppercase mb-2";
  const labelStyle = { color: "var(--text-faint)" };
  const req = <span style={{ color: "var(--accent-ink)" }}> *</span>;
  const opt = <span className="normal-case tracking-normal" style={{ color: "var(--text-faint)" }}> · {L.optional}</span>;
  const bad = (k: Missing) => missing.includes(k);
  const invalid = { borderColor: "#b42318" };
  const missingLabel: Record<Missing, string> = {
    legalName: L.legalName,
    address: L.address,
    taxId: L.taxId,
    proof: L.proofNeeded,
    confirmation: L.confirmNeeded,
  };

  const chip = (on: boolean) => ({
    background: on ? "var(--accent)" : "transparent",
    color: on ? "#111114" : "var(--text)",
    border: `1px solid ${on ? "var(--accent)" : "var(--border-strong)"}`,
  });

  const section = (n: number, title: string) => (
    <div className="flex items-center gap-3 mb-5 mt-2">
      <span className="font-display text-[22px] leading-none" style={{ color: "var(--accent-ink)" }}>0{n}</span>
      <h2 className="font-display text-2xl leading-none" style={{ color: "var(--text)" }}>{title}</h2>
    </div>
  );

  return (
    <div className="max-w-[620px]">
      {/* Where they are: account done, application now, review next. */}
      <ol className="flex items-center gap-2 mb-8 text-[12px] tracking-[0.14em] uppercase" aria-label={L.title}>
        {[L.step1, L.step2, L.step3].map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span className="w-6 h-px" style={{ background: "var(--border-strong)" }} aria-hidden="true" />}
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold tracking-normal"
              style={
                i === 0
                  ? { background: "var(--text)", color: "var(--bg)" }
                  : i === 1
                    ? { background: "var(--accent)", color: "#111114" }
                    : { border: "1px solid var(--border-strong)", color: "var(--text-faint)" }
              }
            >
              {i === 0 ? "✓" : i + 1}
            </span>
            <span style={{ color: i === 1 ? "var(--text)" : "var(--text-faint)" }}>{s}</span>
          </li>
        ))}
      </ol>

      <h1 className="font-display text-4xl md:text-5xl mb-4" style={{ color: "var(--text)" }}>{L.title}</h1>
      <p className="text-base leading-relaxed mb-10" style={{ color: "var(--text-muted)" }}>{L.intro}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex flex-col gap-5"
        noValidate
      >
        {section(1, L.business)}
        <div>
          <label className={label} style={labelStyle} htmlFor="wa-legal">{L.legalName}{req}</label>
          <input id="wa-legal" className="field" maxLength={LIMITS.legalName} value={a.legalName} onChange={(e) => set("legalName", e.target.value)} style={bad("legalName") ? invalid : undefined} />
        </div>
        <div>
          <label className={label} style={labelStyle} htmlFor="wa-tax">{L.taxId}{req}</label>
          <input id="wa-tax" className="field" dir="ltr" maxLength={LIMITS.taxId} value={a.taxId} onChange={(e) => set("taxId", e.target.value)} style={bad("taxId") ? invalid : undefined} />
        </div>
        <div>
          <label className={label} style={labelStyle} htmlFor="wa-address">{L.address}{req}</label>
          <textarea id="wa-address" className="field" rows={2} maxLength={LIMITS.address} value={a.address} onChange={(e) => set("address", e.target.value)} style={bad("address") ? invalid : undefined} />
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={label} style={labelStyle} htmlFor="wa-years">{L.years}{opt}</label>
            <select id="wa-years" className="field" value={a.yearsInBusiness} onChange={(e) => set("yearsInBusiness", e.target.value as ApplicationAnswers["yearsInBusiness"])}>
              <option value="">{L.choose}</option>
              {YEARS.map((y) => <option key={y} value={y}>{t(locale, YEARS_TEXT[y])}</option>)}
            </select>
          </div>
          <div>
            <label className={label} style={labelStyle} htmlFor="wa-web">{L.website}{opt}</label>
            <input id="wa-web" className="field" dir="ltr" maxLength={LIMITS.website} value={a.website} onChange={(e) => set("website", e.target.value)} />
          </div>
        </div>

        <div className="h-px my-4" style={{ background: "var(--border)" }} />
        {section(2, L.after)}
        <div>
          <span className={label} style={labelStyle}>{L.volume}{opt}</span>
          <div className="flex flex-wrap gap-2">
            {VOLUMES.map((v) => (
              <button key={v} type="button" onClick={() => set("expectedVolume", a.expectedVolume === v ? "" : v)} aria-pressed={a.expectedVolume === v} className="h-10 px-4 rounded-full text-[14px] transition-colors" style={chip(a.expectedVolume === v)}>
                {t(locale, VOLUME_TEXT[v])}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={label} style={labelStyle}>{L.products}{opt}</span>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_INTERESTS.map((p) => {
              const on = a.productsInterest.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("productsInterest", on ? a.productsInterest.filter((x) => x !== p) : [...a.productsInterest, p])}
                  className="h-10 px-4 rounded-full text-[14px] transition-colors"
                  style={chip(on)}
                >
                  {t(locale, PRODUCT_INTEREST_TEXT[p])}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className={label} style={labelStyle} htmlFor="wa-ref">{L.referral}{opt}</label>
          <input id="wa-ref" className="field" maxLength={LIMITS.referralSource} value={a.referralSource} onChange={(e) => set("referralSource", e.target.value)} />
        </div>
        <div>
          <label className={label} style={labelStyle} htmlFor="wa-comments">{L.comments}{opt}</label>
          <textarea id="wa-comments" className="field" rows={3} maxLength={LIMITS.comments} value={a.comments} onChange={(e) => set("comments", e.target.value)} />
        </div>

        <div className="h-px my-4" style={{ background: "var(--border)" }} />
        {section(3, L.documents)}
        <p className="text-sm leading-relaxed -mt-2" style={{ color: "var(--text-muted)" }}>{L.docsIntro}</p>
        <div className="flex flex-col gap-3">
          {DOC_KINDS.map((kind) => {
            const mine = docs.filter((d) => d.kind === kind);
            const proof = PROOF_KINDS.includes(kind);
            return (
              <div
                key={kind}
                className="rounded-2xl px-4 py-4"
                style={{ border: `1px solid ${proof && bad("proof") ? "#b42318" : "var(--border)"}`, background: "var(--bg-soft)" }}
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="text-[15px] font-medium" style={{ color: "var(--text)" }}>
                    {t(locale, DOC_KIND_TEXT[kind])}
                  </span>
                  <span className="text-[12px]" style={{ color: proof ? "var(--accent-ink)" : "var(--text-faint)" }}>
                    {proof ? L.oneOf : L.optional}
                  </span>
                </div>
                {mine.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-2">
                    {mine.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-3 text-[14px] rounded-xl px-3 py-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                        <span className="flex items-center gap-2 min-w-0">
                          <span aria-hidden="true" style={{ color: "var(--accent-ink)" }}>✓</span>
                          <span className="truncate" dir="ltr" style={{ color: "var(--text)" }}>{d.filename}</span>
                          <span className="shrink-0 text-[12px]" style={{ color: "var(--text-faint)" }}>{sizeText(d.sizeBytes)}</span>
                        </span>
                        <button type="button" onClick={() => remove(d.id)} className="text-[12px] underline underline-offset-4 shrink-0" style={{ color: "var(--text-faint)" }}>
                          {L.remove}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <input
                  ref={(el) => {
                    fileRefs.current[kind] = el;
                  }}
                  type="file"
                  accept="application/pdf,image/*,.heic,.heif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(kind, f);
                  }}
                />
                <button
                  type="button"
                  disabled={uploading !== null}
                  onClick={() => fileRefs.current[kind]?.click()}
                  className="mt-3 h-10 px-4 rounded-full text-[14px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
                  style={{ border: "1px solid var(--border-strong)", color: "var(--text)", background: "var(--bg)" }}
                >
                  {uploading === kind ? L.uploading : mine.length ? L.uploadAnother : L.upload}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-[13px]" style={{ color: "var(--text-faint)" }}>
          {L.emailInstead}{" "}
          <a href={`mailto:${SALES_EMAIL}`} dir="ltr" className="underline underline-offset-4" style={{ color: "var(--text-muted)" }}>{SALES_EMAIL}</a>
        </p>

        <div className="h-px my-4" style={{ background: "var(--border)" }} />
        {section(4, L.confirm)}
        <label className="flex items-start gap-3 text-[15px] leading-relaxed cursor-pointer" style={{ color: "var(--text)" }}>
          <input type="checkbox" className="mt-1 w-4 h-4 accent-[var(--accent)]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>{L.confirmText}</span>
        </label>
        <div>
          <label className={label} style={labelStyle} htmlFor="wa-name">{L.fullName}{req}</label>
          <input id="wa-name" className="field" maxLength={LIMITS.confirmedName} value={name} onChange={(e) => setName(e.target.value)} style={bad("confirmation") ? invalid : undefined} />
        </div>

        {missing.length > 0 && (
          <div className="text-sm px-4 py-3 rounded-lg" style={{ background: "#fdecec", color: "#b42318" }} role="alert">
            <strong className="font-medium">{L.missingTitle}</strong> {missing.map((m) => missingLabel[m]).join(" · ")}
          </div>
        )}
        {message && (
          <div className="text-sm px-4 py-3 rounded-lg" style={message.tone === "ok" ? { background: "var(--bg-soft)", color: "var(--text)" } : { background: "#fdecec", color: "#b42318" }} role="status">
            {message.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <button
            type="submit"
            disabled={busy !== null || uploading !== null}
            className="h-12 px-8 rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#111114" }}
          >
            {busy === "send" ? L.sending : L.send}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy !== null || uploading !== null}
            className="h-12 px-6 rounded-full text-[15px] transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ border: "1px solid var(--border-strong)", color: "var(--text)" }}
          >
            {busy === "save" ? "…" : L.save}
          </button>
        </div>
      </form>
    </div>
  );
}
