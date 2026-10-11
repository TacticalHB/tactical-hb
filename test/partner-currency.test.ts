import { test } from "node:test";
import assert from "node:assert/strict";
import { countryCurrency, partnerCurrency } from "@/lib/wholesale-display";

/* ---------------------------------------------------------------------------
   One currency per wholesale partner (Mario, 11 Oct 2026).

   A euro partner never sees hryvnia and a hryvnia partner never sees euro,
   whichever language they browse in. The storefront locale is deliberately NOT
   an input here — that is the point: nothing the visitor switches can move it.
--------------------------------------------------------------------------- */

test("the currency staff set on the card always wins", () => {
  assert.equal(partnerCurrency({ currency: "EUR", country: "Ukraine", locale: "uk" }), "EUR");
  assert.equal(partnerCurrency({ currency: "UAH", country: "Germany", locale: "en" }), "UAH");
});

test("unset: the country decides — Ukraine in any spelling is hryvnia, anywhere else euro", () => {
  for (const c of ["Ukraine", "україна", "Україна", "UA", "ukr"]) assert.equal(countryCurrency(c), "UAH", c);
  for (const c of ["Germany", "Spain", "Japan", "United Kingdom"]) assert.equal(countryCurrency(c), "EUR", c);
  assert.equal(partnerCurrency({ currency: null, country: "Poland", locale: "uk" }), "EUR");
});

test("no country either: the registration language, as requests were priced before", () => {
  assert.equal(partnerCurrency({ currency: null, country: "", locale: "uk" }), "UAH");
  assert.equal(partnerCurrency({ currency: null, country: null, locale: "en" }), "EUR");
});

test("an unrecognised stored value is ignored, never trusted through", () => {
  assert.equal(partnerCurrency({ currency: "USD", country: "Germany", locale: "en" }), "EUR");
});
