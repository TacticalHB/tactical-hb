"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

/* ---------------------------------------------------------------------------
   Secured Payment / Delivery / Returns & Exchanges — expandable rows under the
   cart summary, each opening a modal.

   The wording deliberately mirrors the About page. A customer who compares the
   two must not find different terms, and Monobank reviewed the About copy.
--------------------------------------------------------------------------- */

type SectionId = "payment" | "delivery" | "returns";

function CardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="13" rx="2" />
      <path d="M2.5 10.5h19" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M2.5 7.5h11v9h-11z" />
      <path d="M13.5 11h4l3 3v2.5h-7z" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M3.5 7.5L12 4l8.5 3.5v9L12 20l-8.5-3.5z" />
      <path d="M3.5 7.5L12 11l8.5-3.5M12 11v9" />
    </svg>
  );
}

export default function CartInfoSections({ locale }: { locale: string }) {
  const uk = locale === "uk";
  const [open, setOpen] = useState<SectionId | null>(null);

  const rows: { id: SectionId; icon: React.ReactNode; title: string; sub: string }[] = [
    {
      id: "payment",
      icon: <CardIcon />,
      title: uk ? "Захищена оплата" : "Secured Payment",
      sub: uk ? "Plata by Mono, Apple Pay, Google Pay, PayPal" : "Plata by Mono, Apple Pay, Google Pay, PayPal",
    },
    {
      id: "delivery",
      icon: <TruckIcon />,
      title: uk ? "Доставка" : "Delivery",
      sub: uk ? "Нова Пошта та Укрпошта" : "Nova Poshta and Ukrposhta",
    },
    {
      id: "returns",
      icon: <BoxIcon />,
      title: uk ? "Повернення та обмін" : "Returns & Exchanges",
      sub: uk ? "30 днів, без винятків" : "30 days, no excluded items",
    },
  ];

  const content: Record<SectionId, { title: string; body: React.ReactNode }> = {
    payment: {
      title: uk ? "Захищена оплата" : "Secured Payment",
      body: uk ? (
        <>
          <p className="mb-4">
            Ми приймаємо оплату карткою через Plata by Mono, а також Apple Pay, Google Pay і PayPal.
          </p>
          <p className="mb-4">
            Кожен платіж обробляє сертифікований платіжний шлюз — дані вашої картки передаються в
            зашифрованому вигляді й ніколи не зберігаються на наших серверах.
          </p>
          <p className="mb-4">
            Оплата займає кілька дотиків і не потребує реєстрації. Щойно платіж пройде, ви отримаєте
            підтвердження на пошту, а ми почнемо готувати замовлення того ж робочого дня.
          </p>
          <p style={{ color: "var(--text-faint)" }}>
            Ціни вказано у гривні (₴) для замовлень в Україні та в євро (€) для інших країн.
          </p>
        </>
      ) : (
        <>
          <p className="mb-4">
            We accept card payments through Plata by Mono, along with Apple Pay, Google Pay and PayPal.
          </p>
          <p className="mb-4">
            Every transaction is handled by a certified payment gateway — your card details travel
            encrypted and are never stored on our servers.
          </p>
          <p className="mb-4">
            Checkout takes a few taps and needs no account. You&apos;ll receive confirmation by email the
            moment your payment succeeds, and we begin preparing your order the same working day.
          </p>
          <p style={{ color: "var(--text-faint)" }}>
            Prices are shown in hryvnia (₴) for orders within Ukraine and in euro (€) elsewhere.
          </p>
        </>
      ),
    },
    delivery: {
      title: uk ? "Доставка" : "Delivery",
      body: uk ? (
        <>
          <p className="mb-4">
            Ми відправляємо замовлення Новою Поштою та Укрпоштою — у відділення, поштомат або
            кур&apos;єром за вашою адресою.
          </p>
          <p className="mb-4">
            Передаємо посилку перевізникові протягом 1–2 робочих днів після підтвердження оплати.
          </p>
          <p>
            Вартість доставки розраховується за тарифами перевізника та сплачується отримувачем, якщо
            умовами акції не передбачено інше. Номер накладної надійде на вашу пошту одразу після
            відправлення.
          </p>
        </>
      ) : (
        <>
          <p className="mb-4">
            We ship with Nova Poshta and Ukrposhta — to a branch, a parcel locker, or by courier to
            your door.
          </p>
          <p className="mb-4">
            Orders are handed to the carrier within 1–2 business days of payment confirmation.
          </p>
          <p>
            Delivery is charged at the carrier&apos;s own rates and paid by the recipient on collection,
            unless a promotion states otherwise. A tracking number is emailed to you as soon as the
            parcel is dispatched.
          </p>
        </>
      ),
    },
    returns: {
      title: uk ? "Повернення та обмін" : "Returns & Exchanges",
      body: uk ? (
        <>
          <p className="mb-5">
            Якщо щось не підійшло — ми це виправимо. Будь-яке замовлення можна повернути протягом
            30 днів: без винятків за категоріями та зайвих запитань.
          </p>
          <ul className="flex flex-col gap-2.5 mb-5 list-disc pl-5">
            <li>Повернути замовлення можна протягом 30 днів з дати отримання.</li>
            <li>Виріб має бути невикористаним і повернутися у повній комплектації, в упаковці, в якій надійшов.</li>
            <li>У нас немає переліку товарів, що не підлягають поверненню.</li>
            <li>Витрати на пересилання товару до нас покриває покупець.</li>
          </ul>
          <p className="mb-4">
            Щоб оформити повернення, напишіть на{" "}
            <a href="mailto:admin@tactical-hb.com" className="underline underline-offset-2" style={{ color: "var(--text)" }}>
              admin@tactical-hb.com
            </a>{" "}
            і вкажіть номер замовлення — ми надішлемо інструкцію того ж дня.
          </p>
          <p>
            Кошти повертаються тим самим способом, яким було здійснено оплату, протягом 14 днів після
            отримання та перевірки товару.
          </p>
        </>
      ) : (
        <>
          <p className="mb-5">
            If something isn&apos;t right, we&apos;ll make it right. Any order can be returned within 30 days —
            no excluded categories, no awkward questions.
          </p>
          <ul className="flex flex-col gap-2.5 mb-5 list-disc pl-5">
            <li>Return any order within 30 days of the date you received it.</li>
            <li>The item should be unused and returned complete, in the packaging it arrived in.</li>
            <li>We keep no list of non-returnable products.</li>
            <li>The cost of sending the item back to us is covered by the customer.</li>
          </ul>
          <p className="mb-4">
            To start a return, email{" "}
            <a href="mailto:admin@tactical-hb.com" className="underline underline-offset-2" style={{ color: "var(--text)" }}>
              admin@tactical-hb.com
            </a>{" "}
            with your order number and we&apos;ll send return instructions the same day.
          </p>
          <p>
            Refunds are issued to the original payment method within 14 days of us receiving and
            inspecting the returned item.
          </p>
        </>
      ),
    },
  };

  const active = open ? content[open] : null;

  return (
    <>
      <div className="mt-8">
        {rows.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setOpen(r.id)}
            aria-haspopup="dialog"
            className="w-full flex items-center gap-4 py-5 text-left transition-opacity hover:opacity-70"
            style={{ borderTop: i === 0 ? "1px solid var(--border)" : "1px solid var(--border)" }}
          >
            <span className="shrink-0" style={{ color: "var(--text-muted)" }}>{r.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px]" style={{ color: "var(--text)" }}>{r.title}</span>
              <span className="block text-[12.5px] mt-0.5" style={{ color: "var(--text-muted)" }}>{r.sub}</span>
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              className="shrink-0" style={{ color: "var(--text-muted)" }} aria-hidden="true">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>
        ))}
      </div>

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={active?.title ?? ""}
        closeLabel={uk ? "Закрити" : "Close"}
      >
        {active?.body}
      </Modal>
    </>
  );
}
