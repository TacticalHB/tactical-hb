import "server-only";
import { buildStaffLetter, staffQuote } from "@/lib/staff-email";

/* ---------------------------------------------------------------------------
   The two staff alerts that were composed at their call sites.

   They were inline HTML inside a route handler and a server action, which
   worked and could not be looked at: the dev email preview can only render
   something it can call, so the only way to see either was to trigger a real
   registration and read your own inbox. Both are builders now, and both are in
   the preview registry.

   The third wholesale staff alert — the order request — stays in
   lib/wholesale-request-email beside the customer copy of the same request,
   because the two share the line table and would drift if separated.
--------------------------------------------------------------------------- */

function adminUrl(siteUrl: string, path: string): string {
  return `${siteUrl.replace(/\/$/, "")}${path}`;
}

/* ---- An enquiry through the public form ----------------------------------- */

export type EnquiryFields = {
  name: string;
  company: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  businessType?: string;
  message: string;
  /** Which storefront it came from — tells sales which language to reply in. */
  locale: string;
};

export function buildWholesaleEnquiryStaffMail(
  f: EnquiryFields,
  siteUrl: string
): { subject: string; html: string; text: string } {
  const rows: [string, string | null | undefined][] = [
    ["Name", f.name],
    ["Company", f.company],
    ["Email", f.email],
    ["Telephone", f.phone],
    ["Business type", f.businessType],
    ["Country", f.country],
    ["City", f.city],
    ["Language", f.locale === "uk" ? "Ukrainian" : "English"],
  ];

  const html = buildStaffLetter({
    title: "New wholesale enquiry",
    lead: `${f.company} got in touch through the website.`,
    rows,
    blocks: [staffQuote("Their message", f.message)],
    cta: { label: "Open partners", url: adminUrl(siteUrl, "/en/admin/partners") },
    status:
      "The application form has been sent to them automatically. No account exists yet — they have not registered.",
  });

  const text = [
    `New wholesale enquiry from ${f.company}.`,
    ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    "",
    f.message,
    "",
    adminUrl(siteUrl, "/en/admin/partners"),
    "The application form has been sent to them automatically. No account exists yet.",
  ].join("\n");

  return { subject: `Wholesale enquiry — ${f.company}`, html, text };
}

/* ---- A self-registration awaiting approval -------------------------------- */

export type ApplicationFields = {
  company: string;
  contactName?: string;
  email: string;
  phone?: string;
  country?: string;
  city?: string;
  businessType?: string;
  note?: string;
  locale: string;
};

export function buildWholesaleApplicationStaffMail(
  f: ApplicationFields,
  siteUrl: string
): { subject: string; html: string; text: string } {
  const rows: [string, string | null | undefined][] = [
    ["Company", f.company],
    ["Contact", f.contactName],
    ["Email", f.email],
    ["Telephone", f.phone],
    ["Business type", f.businessType],
    ["Country", f.country],
    ["City", f.city],
    ["Language", f.locale.toUpperCase()],
  ];

  const html = buildStaffLetter({
    title: "New wholesale application",
    lead: `${f.company} has registered and is awaiting approval.`,
    rows,
    blocks: f.note ? [staffQuote("What they told us", f.note)] : [],
    cta: { label: "Approve or decline", url: adminUrl(siteUrl, "/en/admin/partners") },
    status: "They cannot see dealer prices or submit anything until approved.",
  });

  const text = [
    `${f.company} has registered for a wholesale account and is awaiting approval.`,
    ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    "",
    f.note ?? "",
    "",
    `Approve or decline: ${adminUrl(siteUrl, "/en/admin/partners")}`,
    "They cannot see dealer prices or submit anything until approved.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: `Wholesale account application — ${f.company}`, html, text };
}
