"use client";

import Link from "next/link";
import Image from "next/image";
import { products } from "@/lib/products";
import { useFavourites } from "@/hooks/useFavourites";
import { useCart } from "@/components/CartContext";

/* Product data comes from the local catalogue (lib/products.ts).
   If products ever move to a DB/CMS, this is where you'd fetch them by the
   saved product_slug values instead of looking them up in the array. */

function Skeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="aspect-square animate-pulse" style={{ background: "var(--bg-soft)" }} />
          <div className="p-4 space-y-2">
            <div className="h-4 w-2/3 rounded animate-pulse" style={{ background: "var(--bg-soft)" }} />
            <div className="h-3 w-1/3 rounded animate-pulse" style={{ background: "var(--bg-soft)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FavouritesList({ locale }: { locale: string }) {
  const uk = locale === "uk";
  // isLoggedIn lets us show guests their local hearts + a sign-in CTA, instead
  // of pretending they have nothing saved.
  const { favourites, isLoading, error, isLoggedIn, toggleFavourite } = useFavourites();
  const { addToCart } = useCart();

  const items = favourites
    .map((slug) => products.find((p) => p.slug === slug))
    .filter((p): p is (typeof products)[number] => Boolean(p));

  const L = {
    title: uk ? "Обране" : "Favourites",
    count: (n: number) => (uk ? `${n} товарів` : `${n} item${n === 1 ? "" : "s"}`),
    empty: uk ? "Тут поки порожньо" : "Nothing saved yet",
    emptyHint: uk
      ? "Натискайте ♡ на товарах, щоб зберегти їх сюди."
      : "Tap the heart on any product to save it here.",
    browse: uk ? "Переглянути товари" : "Browse products",
    remove: uk ? "Прибрати" : "Remove",
    add: uk ? "Додати в кошик" : "Add to bag",
    guestTitle: uk ? "Збережено лише на цьому пристрої" : "Saved on this device only",
    guestBody: uk
      ? "Створіть безкоштовний акаунт, щоб зберігати обране на всіх пристроях — те, що ви зберегли, перенесеться автоматично."
      : "Create a free account to keep your favourites across devices — anything you've saved will move over automatically.",
    createAccount: uk ? "Створити акаунт" : "Create account",
    logIn: uk ? "Увійти" : "Log in",
  };

  /* Guests aren't redirected away — they see their local hearts plus this nudge. */
  const guestBanner = !isLoggedIn && !isLoading && (
    <div className="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4" style={{ background: "var(--bg-soft)" }}>
      <div className="flex-1">
        <div className="text-sm font-semibold" style={{ color: "#111" }}>{L.guestTitle}</div>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{L.guestBody}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link href={`/${locale}/register`} className="h-10 leading-[40px] px-5 rounded-full text-xs font-medium"
          style={{ background: "#111", color: "#fff" }}>{L.createAccount}</Link>
        <Link href={`/${locale}/login`} className="h-10 leading-[40px] px-5 rounded-full text-xs font-medium border"
          style={{ borderColor: "var(--border-strong)", color: "#111" }}>{L.logIn}</Link>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-3xl font-semibold" style={{ color: "#111" }}>{L.title}</h1>
        {!isLoading && items.length > 0 && (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>{L.count(items.length)}</span>
        )}
      </div>

      {error && (
        <div className="mb-5 text-sm px-4 py-3 rounded-lg" style={{ background: "#fdecec", color: "#b42318" }}>{error}</div>
      )}

      {guestBanner}

      {isLoading ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border py-16 px-6 text-center" style={{ borderColor: "var(--border)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.4" className="mx-auto mb-4">
            <path d="M12 20s-7-4.5-9-9c-1.2-2.8.4-6 3.5-6C8.5 5 10 6.5 12 9c2-2.5 3.5-4 5.5-4 3.1 0 4.7 3.2 3.5 6-2 4.5-9 9-9 9Z" />
          </svg>
          <p className="text-lg font-medium" style={{ color: "#111" }}>{L.empty}</p>
          <p className="text-sm mt-1 mb-6" style={{ color: "var(--text-muted)" }}>{L.emptyHint}</p>
          <Link href={`/${locale}/products`} className="inline-block h-11 leading-[44px] px-7 rounded-full text-sm font-medium"
            style={{ background: "#111", color: "#fff" }}>
            {L.browse}
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((p) => (
            <div key={p.slug} data-fav-item className="rounded-2xl border overflow-hidden group" style={{ borderColor: "var(--border)" }}>
              <Link href={`/${locale}/products/${p.slug}`} className="block relative aspect-square" style={{ background: "#f5f5f5" }}>
                <Image src={p.gridImage || p.image} alt={uk ? p.nameUk : p.nameEn} fill sizes="(max-width:640px) 100vw, 33vw" className="object-contain p-6" />
              </Link>
              <div className="p-4">
                <Link href={`/${locale}/products/${p.slug}`} className="block text-[15px] font-medium hover:opacity-70" style={{ color: "#111" }}>
                  {uk ? p.nameUk : p.nameEn}
                </Link>
                <div className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>€{p.price.toFixed(2)}</div>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={(e) => {
                      const img = (e.currentTarget.closest("[data-fav-item]") as HTMLElement)?.querySelector("img");
                      addToCart(p, (img as HTMLElement) ?? null);
                    }}
                    className="h-9 px-4 rounded-full text-xs font-medium"
                    style={{ background: "#111", color: "#fff" }}
                  >
                    {L.add}
                  </button>
                  <button onClick={() => toggleFavourite(p.slug)} className="text-xs underline underline-offset-2 hover:opacity-70"
                    style={{ color: "var(--text-muted)" }}>
                    {L.remove}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
