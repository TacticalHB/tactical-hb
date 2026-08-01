# Tactical HB — Fiscal & payment wording (FOP group 2)

**Status:** Working standard for the shop. Confirm final PRRO line format with accountant / PRRO provider before treating as locked forever.  
**Last updated:** 1 August 2026  
**Model:** Shipping is calculated at checkout and **included in the order total**. Customer pays **one amount** for the order (goods for the selected destination). We do **not** sell a separate delivery service.

---

## 1. Commercial rule

| Layer | Rule |
|--------|------|
| Checkout | May show shipping for clarity; **charge one grand total** |
| Customer docs | Order / goods; price includes delivery to destination |
| Monobank | Payment purpose = order/goods (see below) |
| PRRO | Goods/order total only — **no** separate fiscal line “delivery service” |
| Ops/admin | May store `product_subtotal`, `shipping_cost`, `grand_total` internally |

**Conversion (EUR storefront):** shipping in UAH ÷ **51** = EUR (2 decimal places, normal rounding).  
Ukrainian storefront stays in UAH end-to-end.

---

## 2. Monobank payment purpose

Use exactly (substitute real order id):

| Locale | Purpose string |
|--------|----------------|
| **UK** | `Оплата замовлення {order_id} Tactical HB` |
| **EN** | `Order {order_id} payment Tactical HB` |

**Do not use:** `оплата за доставку`, `delivery services`, `courier`, `послуга доставки`.

---

## 3. PRRO / fiscal receipt (recommended structure)

Until accountant/PRRO support confirms pixel-perfect labels:

- Fiscalise **sale of goods** for the **full amount charged**.
- Lines = product name(s) only (with variants/options if required by your PRRO mapping).
- **No** separate fiscal nomenclature line for “delivery service”.
- Receipt total must equal Monobank charge amount.
- Order number may appear in non-fiscal fields / email / packing docs.

Final product-name format and tax/department codes: **accountant + PRRO provider**.

---

## 4. Public offer — required clause

### English

The total price of the order is the price of the goods for the selected delivery destination. Where delivery is arranged by us through postal or courier partners, the applicable delivery amount is calculated at checkout and **included in the order total**. The customer pays a single amount for the order. A separate delivery service is not sold to the customer.

### Ukrainian

Загальна вартість замовлення є ціною товару для обраного напрямку доставки. Якщо доставку організовуємо ми через поштових або кур’єрських партнерів, відповідна сума розраховується під час оформлення замовлення і **включається до загальної вартості замовлення**. Покупець сплачує одну суму за замовлення. Окрема послуга доставки покупцю не продається.

---

## 5. Checkout microcopy

| Locale | Text |
|--------|------|
| **EN** | Order total includes shipping to your destination. |
| **UK** | До суми замовлення включено доставку до обраного напрямку. |

---

## 6. Payment & Delivery page (summary intent)

- One payment at checkout = full order total.  
- Shipping calculated by destination/weight/service and **included** in that total.  
- No second invoice for “delivery service”.  
- Ukraine: Nova Poshta (branch / poshtomat / courier as available).  
- International: selected countries; shipping included in total before payment; customs rules of destination may apply to recipient.  
- After pay: confirmation → dispatch → tracking.

Full page copy may follow the approved Payment & Delivery brief; meaning must match this file.

---

## 7. Surfaces that must stay consistent

- Checkout Order Summary (subtotal / shipping / **total**)
- Payment step and Monobank invoice creation
- Order confirmation email / page
- Payment & Delivery page (EN + UK)
- Public offer / Terms of sale (EN + UK)
- Cart info drawers, About, FAQ, Returns — no “pay shipping on collection” or “separate delivery service” contradictions

---

## 8. Still for the accountant (human)

Confirm when convenient:

1. Exact PRRO product line labels for multi-item carts.  
2. Any mandatory department/tax codes in your PRRO.  
3. Final sign-off on Monobank purpose string above.

Until then, the shop follows this document.
