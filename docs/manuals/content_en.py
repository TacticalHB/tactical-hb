# -*- coding: utf-8 -*-
"""English operator manual for THB-OS. Documents what exists on 27 July 2026."""

COVER = {
    "wordmark": "TACTICAL HB",
    "title": "THB-OS Operator Manual",
    "subtitle": "The internal operations centre — how to use it, day to day.",
    "meta": [
        "Version 1.0 · 27 July 2026 · covers Phases A–F",
        "Internal document. Not for customers or partners.",
        "tactical-hb.com/en/admin",
    ],
}

BLOCKS = [
    # ---------------------------------------------------------------- TOC ---
    ("h1", "Contents"),
    ("toc", [
        ("1", "Introduction"),
        ("2", "First login &amp; navigation"),
        ("3", "Commerce — Orders and Vouchers"),
        ("4", "Stock &amp; Production"),
        ("5", "Suppliers &amp; Costs"),
        ("6", "Finance"),
        ("7", "Wholesale CRM"),
        ("8", "Marketing"),
        ("9", "Command — the Weekly Brief"),
        ("10", "Projects &amp; Exhibitions"),
        ("11", "Your weekly routine"),
        ("12", "Safety &amp; troubleshooting"),
        ("13", "What is not built yet"),
    ]),

    # ------------------------------------------------------------ 1. INTRO --
    ("h1", "1. Introduction", "break"),

    ("h2", "What THB-OS is"),
    ("p", "THB-OS is the private operations centre for Tactical HB. It is where stock, costs, "
          "suppliers, machines, wholesale partners, marketing and future projects live together, "
          "with a set of assistants (called <b>agents</b>) that read all of it and tell you what "
          "they see."),
    ("p", "It is not a second website and not a product for customers. Nobody outside the company "
          "can reach it."),

    ("h2", "How it differs from the public shop"),
    ("table",
     ["", "The shop", "THB-OS"],
     [["Who it is for", "Customers", "You, and any admin you add"],
      ["What it looks like", "Light, premium, spacious", "Dark, dense, instrument panel"],
      ["Where it lives", "tactical-hb.com", "tactical-hb.com/en/admin"],
      ["What it does", "Sells", "Shows you the state of the business"]],
     [0.20, 0.40, 0.40]),
    ("p", "Both run from the same codebase and the same database. That is deliberate: orders, "
          "products and stock must never disagree with each other."),

    ("h2", "The core rule"),
    ("stop", "<b>Agents advise. They never act without your approval.</b><br/><br/>"
             "No agent changes a price, moves stock, spends money, or emails a customer or partner "
             "on its own. They read, and they write reports. Every action that touches money, "
             "stock or someone's inbox is a button you press yourself."),
    ("p", "There is exactly one place where a message can leave the system to a partner — the "
          "follow-up send gate in section 7 — and it takes two deliberate presses from you, "
          "against an address shown on screen."),

    ("h2", "How to open it"),
    ("steps", [
        "Go to <b>tactical-hb.com/en/admin</b> for English.",
        "Go to <b>tactical-hb.com/uk/admin</b> for Ukrainian.",
        "Or sign in on the shop and click the person icon in the header — for an admin it opens "
        "the console directly.",
    ]),
    ("p", "You can switch language at any time from the bottom of the sidebar. The console keeps "
          "you on the same page in the other language."),

    ("h2", "Who can get in"),
    ("p", "Access is controlled by the <b>ADMIN_EMAILS</b> environment variable in Vercel. It holds "
          "a list of email addresses. If your address is on that list and you are signed in, the "
          "console opens. If it is not, every admin page returns <b>404 Not found</b> — not "
          "&ldquo;forbidden&rdquo;, because we do not advertise that the console exists."),
    ("note", "If <b>ADMIN_EMAILS</b> is missing or empty, <i>nobody</i> gets in — including you. "
             "That is on purpose: a missing setting must never hand out access."),

    # ------------------------------------------------------- 2. NAVIGATION --
    ("h1", "2. First login &amp; navigation", "break"),

    ("h2", "Signing in"),
    ("steps", [
        "Open <b>tactical-hb.com/en/admin</b>.",
        "If you are signed out you are sent to the login page. Sign in with your admin email.",
        "You are returned to the page you asked for, not to your account page.",
    ]),

    ("h2", "The sidebar"),
    ("p", "The sidebar is your main doorway. Every screen in the system is listed here, grouped by "
          "department:"),
    ("table",
     ["Section", "Pages"],
     [["Command", "Ops map, Weekly Brief"],
      ["Commerce", "Orders, Vouchers"],
      ["Stock &amp; Production", "Stock, Stock Advisor"],
      ["Suppliers &amp; Costs", "Costs, Suppliers"],
      ["Workshop", "Machines"],
      ["Finance", "Finance, Cost &amp; Margin Guard"],
      ["Wholesale CRM", "Partners, Follow-ups"],
      ["Marketing", "Marketing, Strategist"],
      ["Projects", "Projects &amp; Exhibitions"]],
     [0.30, 0.70]),
    ("p", "At the bottom of the sidebar: language switch, <b>View shop</b>, <b>My account</b> (your "
          "own orders and loyalty as a customer), and <b>Sign out</b>."),

    ("h2", "The Ops map"),
    ("p", "Clicking <b>Ops map</b> — or the THB-OS wordmark — opens the home screen. It is a floor "
          "plan of the business:"),
    ("ul", [
        "<b>Department rooms</b> around the edge. Each is a real section; click the room title or "
        "one of its small chips to open a page.",
        "<b>Shared Memory</b> pulsing in the middle. That is the database every room reads from and "
        "writes to. It is a picture, not a button.",
        "<b>Agents</b> walking between the rooms and the centre, each carrying a short live label — "
        "for example &ldquo;Advisor · 3 low&rdquo;.",
    ]),
    ("p", "Below the map is a text <b>sitrep</b> — the same numbers written out as lines. If the "
          "map is ever unclear, the sitrep is the plain version."),
    ("note", "The Workshop and Suppliers pages appear as chips on the <b>Suppliers &amp; Costs</b> "
             "room, and the Margin Guard as a chip on the <b>Finance</b> room. The map grid is full, "
             "so they share rooms rather than being left off the map."),

    ("h2", "Status chips"),
    ("p", "Colour means health, and only health. Gold is used for the brand and for the main action "
          "button — never to say something is wrong."),
    ("table",
     ["Chip", "Meaning", "What to do"],
     [["<b>OK</b> / green", "Healthy", "Nothing"],
      ["<b>Low</b> / amber", "Worth attention soon", "Plan a batch or a follow-up"],
      ["<b>Critical</b> / red", "Acting now is overdue", "Deal with it today"],
      ["<b>Overstock</b>", "More than you can sell in the window", "Stop making it; consider a push"],
      ["<b>?</b> or &mdash; / grey", "Not known", "Usually means data has not been entered yet"]],
     [0.22, 0.40, 0.38]),

    # --------------------------------------------------------- 3. COMMERCE --
    ("h1", "3. Commerce — Orders and Vouchers", "break"),

    ("h2", "Orders"),
    ("p", "<b>Commerce › Orders</b> lists every order, newest first. It is a dispatch queue: it is "
          "read live every time you open it, so a parcel that just went out is never shown as "
          "waiting."),
    ("p", "Each order card shows: reference, date and time, status, the <b>Customer</b> block "
          "(name, email, phone), the <b>Delivery</b> block (method, city, branch), the "
          "<b>Products</b> list with quantities and add-ons, any voucher used, and the total."),

    ("h3", "Order statuses"),
    ("table",
     ["Status", "What it means"],
     [["<b>Paid</b>", "Monobank has confirmed the money. Stock has already been reduced. Yours to pack."],
      ["<b>Processing</b>", "Being prepared."],
      ["<b>Shipped</b>", "A Nova Poshta TTN exists and the parcel is moving. The customer has been emailed."],
      ["<b>Delivered</b>", "Nova Poshta reports it as delivered."],
      ["<b>Cancelled</b>", "Not counted in revenue anywhere."]],
     [0.20, 0.80]),
    ("note", "An order only exists <i>after</i> payment is confirmed, so there is no &ldquo;pending&rdquo; "
             "state to chase."),

    ("h3", "When to step in"),
    ("p", "The only thing you change here is the <b>Nova Poshta TTN</b>. Enter the number in the "
          "TTN field on the order and click <b>Save</b>. From then on the daily job tracks that "
          "parcel and moves the status by itself, and the customer gets the shipping email "
          "automatically."),
    ("ul", [
        "An order sitting in <b>Paid</b> with no TTN is waiting for you to dispatch it.",
        "<b>Track</b> opens the parcel on Nova Poshta.",
        "Clearing the TTN field and saving removes it.",
    ]),
    ("warn", "Statuses are not editable by hand. They move when the money arrives and when Nova "
             "Poshta reports movement. If a status looks wrong, the TTN is the thing to check."),

    ("h2", "Vouchers"),
    ("p", "<b>Commerce › Vouchers</b> does two things:"),
    ("ul", [
        "<b>Redeem a voucher</b> — enter the code from a customer and mark it used.",
        "A list of the <b>20 most recently issued vouchers</b>, so you can look a code up instead "
        "of retyping it from a message.",
    ]),
    ("p", "Each entry shows its code, its value and its expiry date. Vouchers are issued by the "
          "loyalty rules on the shop side; this screen is for looking them up and redeeming them."),

    # ------------------------------------------------------------ 4. STOCK --
    ("h1", "4. Stock &amp; Production", "break"),

    ("h2", "The idea behind the stock screen"),
    ("p", "A stock number that anyone can type over is a number nobody trusts. So you never edit a "
          "level directly. Every change is a <b>movement</b> with a reason attached, and the level "
          "you see is the running total of those movements. &ldquo;Why is this 4?&rdquo; always has "
          "an answer."),

    ("h2", "Reading the Stock list"),
    ("p", "<b>Stock &amp; Production › Stock</b> lists every line you hold. Each card shows:"),
    ("table",
     ["Field", "Meaning"],
     [["<b>On hand</b>", "How many you have now"],
      ["Status chip", "Critical, Low or OK, worked out from your thresholds"],
      ["<b>Unit cost</b>", "The current cost of one unit, or <i>not set</i>"],
      ["<b>Thresholds</b>", "<b>Critical at</b> and <b>Low at</b> — the two numbers that decide the chip"],
      ["<b>Movements</b>", "The history: every increase and decrease with its reason"]],
     [0.24, 0.76]),
    ("p", "A <b>sku</b> is one thing on a shelf. A product with no variants is just its name; a "
          "finish is written <i>product__variant</i>; a component is <i>part__name</i>. Black and "
          "purple are different objects on a shelf, so they are different lines."),

    ("h2", "Receiving stock"),
    ("steps", [
        "Open <b>Stock</b> and find the line.",
        "Click <b>Receive batch</b>.",
        "Enter the <b>Quantity</b> that arrived.",
        "Add a <b>Note</b> if it helps later (supplier, batch number).",
        "Click <b>Add</b>.",
    ]),
    ("p", "The level goes up by that amount and a <b>Batch received</b> movement is recorded."),

    ("h2", "Correcting stock"),
    ("p", "Use this after a physical count, when the system and the shelf disagree."),
    ("steps", [
        "Click <b>Correct</b> on the line.",
        "Enter <b>Counted on the shelf</b> — the true number in front of you, not the difference.",
        "Enter a <b>Reason</b>. This is required.",
        "Click <b>Apply</b>.",
    ]),
    ("p", "The system works out the difference itself and records a <b>Correction</b> movement with "
          "your reason attached."),

    ("h2", "Why stock can go negative"),
    ("p", "It is allowed on purpose. If a sale takes a line below zero, refusing it would throw away "
          "the record of a sale that really happened. A negative number is an honest &ldquo;the "
          "count was wrong&rdquo; — count the shelf and use <b>Correct</b>."),

    ("h2", "What happens automatically"),
    ("ul", [
        "When Monobank confirms payment, the items in that order are <b>deducted automatically</b> "
        "and recorded as <b>Order</b> movements.",
        "Add-on parts fitted to a device (lids, rubbers) are deducted too, because they are stocked "
        "in their own right.",
        "Nothing else moves stock. No agent can touch it.",
    ]),

    ("h2", "Setting thresholds"),
    ("steps", [
        "Click <b>Thresholds</b> on a line.",
        "Set <b>Critical at</b> and <b>Low at</b>.",
        "Click <b>Save</b>.",
    ]),
    ("p", "At or below <b>Critical at</b> the chip turns red. At or below <b>Low at</b> it turns "
          "amber. These two numbers also drive the low-stock email."),

    ("h2", "Stock Advisor"),
    ("p", "<b>Stock &amp; Production › Stock Advisor</b> answers one question: what should you make "
          "next, and how urgently."),
    ("note", "<b>There is no run button.</b> The Advisor recalculates every time you open the page, "
             "from live sales and stock. It is always current. (A copy is saved to the agent log "
             "each Monday, and whenever you press <b>Generate brief</b>, so you can see what it "
             "said in the past.)"),
    ("p", "Each row shows:"),
    ("table",
     ["Column", "Meaning"],
     [["<b>On hand</b>", "Current level"],
      ["<b>30 d</b>, <b>60 / 90 d</b>", "Units sold in those windows — your real sales speed"],
      ["<b>Cover</b>", "How many weeks the shelf lasts at that speed"],
      ["<b>Make</b>", "Suggested quantity to produce or reorder"],
      ["Status", "Critical, Low, OK or Overstock"]],
     [0.26, 0.74]),
    ("p", "Suggestions are rounded up to your <b>Batch size</b>, because &ldquo;make 23&rdquo; is a "
          "spreadsheet answer when the kiln holds 10."),
    ("h3", "Settings per line"),
    ("steps", [
        "Click <b>Settings</b> on a row.",
        "Enter <b>Lead time, days</b> — how long from deciding to having it on the shelf.",
        "Enter <b>Batch size</b> — the practical multiple you make in. Leave empty for no rounding.",
        "Click <b>Save</b>.",
    ]),
    ("warn", "The Advisor never changes stock. It suggests; you decide, produce, and then log the "
             "batch with <b>Receive batch</b>."),

    ("h2", "Low-stock email alerts"),
    ("p", "A check runs once a day as part of the evening job. You get an email when:"),
    ("ul", [
        "a line has <b>got worse</b> since the last alert — newly Low, or Low that has become "
        "Critical; or",
        "a line is still bad and the last alert about it has gone <b>stale</b>.",
    ]),
    ("p", "You are not emailed again every day for the same unchanged problem. When a line returns "
          "to OK, its alert state is cleared, so the next time it dips you hear about it. The mail "
          "goes to the shop's own address — never to a customer."),

    # ----------------------------------------------------- 5. SUPPLIERS -----
    ("h1", "5. Suppliers &amp; Costs", "break"),

    ("h2", "Why costs matter"),
    ("p", "Margin is revenue minus what things cost. Until a cost is entered, the system will not "
          "guess it — it shows a dash and counts the line as unknown. That is deliberate: a margin "
          "worked out over a silent zero is flattery, not information."),
    ("stop", "<b>This is the highest-value data entry in the whole system.</b> Enter unit costs and "
             "the Finance page, the Margin Guard, the Strategist and the Weekly Brief all start "
             "telling you the truth. Leave them out and every margin reads <i>unknown</i>."),

    ("h2", "Two kinds of cost"),
    ("table",
     ["", "Unit cost", "Cost entry"],
     [["What it is", "What one unit costs to have on the shelf",
       "Everything else: rent, salaries, logistics, fees, ads"],
      ["Where", "The product rows on the Costs page", "<b>Add a cost</b> form"],
      ["Dated?", "Yes — <b>From</b> a date, never overwritten",
       "Yes — <b>Date</b>, plus optional monthly period"]],
     [0.16, 0.42, 0.42]),

    ("h2", "Entering a unit cost"),
    ("steps", [
        "Open <b>Suppliers &amp; Costs › Costs</b>.",
        "Find the product row.",
        "Enter <b>₴ per unit</b>.",
        "Set <b>From</b> — the date this cost starts applying.",
        "Add a <b>Note</b> if useful, then click <b>Save</b>.",
    ]),
    ("warn", "The date matters. Entering today's date corrects today's figure. A <i>future</i> date "
             "leaves every margin already calculated exactly as it was. This is why costs are dated "
             "rather than overwritten — otherwise last quarter would silently get more or less "
             "profitable because of something you typed this morning."),

    ("h2", "Recording an operating cost"),
    ("steps", [
        "On the <b>Costs</b> page, use the <b>Add a cost</b> form.",
        "Pick a <b>Category</b>.",
        "Enter <b>Amount, ₴</b>. Fill <b>Invoiced in €</b> only if the bill itself was in euro.",
        "Set the <b>Date</b>.",
        "Pick a <b>Supplier</b> from the list, or type a name in the box below it.",
        "Choose a <b>Product</b> if the cost belongs to one; leave it as <b>General overhead</b> "
        "otherwise.",
        "Tick <b>Recurring monthly</b> for rent, salaries and the like.",
        "Click <b>Add</b>.",
    ]),

    ("h3", "Categories"),
    ("table",
     ["Category", "Use it for"],
     [["Manufacturing", "Production runs, outsourced work"],
      ["Materials", "Raw stock, filament, packaging"],
      ["Logistics", "What Nova Poshta and couriers charge <i>you</i>"],
      ["Tax", "Taxes and duties"],
      ["Shop", "Hosting, domains, software"],
      ["Salaries", "People"],
      ["R&amp;D", "Prototypes, experiments"],
      ["Exhibitions", "Actual fair spend (the planned budget lives on the fair record)"],
      ["Advertising", "Ad platform spend"],
      ["<b>Payment fees</b>", "Monobank acquiring and bank charges"],
      ["Other", "Everything else"]],
     [0.26, 0.74]),
    ("note", "<b>Payment fees</b> is worth using. Monobank does not report its commission anywhere "
             "the system can read, so until you enter that invoice every margin is <i>gross of "
             "acquiring</i> — and the Margin Guard will say so on its own page."),

    ("h2", "Suppliers"),
    ("p", "<b>Suppliers &amp; Costs › Suppliers</b> is your supplier book. Add a supplier and it "
          "becomes selectable on the Costs page and on machines."),
    ("steps", [
        "Fill <b>Name</b> — the only required field.",
        "Optionally add contact, email, phone, country, <b>Lead time, days</b>, <b>Currency</b>, "
        "website and notes.",
        "Click <b>Add</b>.",
    ]),
    ("p", "Each supplier card then shows <b>Spent</b> — the total of costs linked to that record — "
          "and how many cost entries and unit costs point at it. Use <b>Edit</b> to change details "
          "and <b>Delete</b> to remove the record."),
    ("note", "Deleting a supplier <b>never deletes money</b>. The costs stay exactly where they "
             "were, keeping the name that was typed at the time; they simply lose the link. "
             "Likewise, old cost rows typed by hand before a supplier existed are not rewritten to "
             "match — the totals only count what is actually linked."),
    ("p", "<b>Lead time</b> here is the supplier's own quoted lead time. It is separate from the "
          "lead time in the Stock Advisor on purpose — one is a promise, the other is what really "
          "happens, and merging them would let a salesman's optimism move a Critical threshold."),

    ("h2", "Workshop — Machines"),
    ("p", "<b>Workshop › Machines</b> registers your printers, lasers and other equipment, and works "
          "out what an hour on each one costs."),
    ("steps", [
        "Click into the <b>Add a machine</b> form. Only <b>Name</b> and <b>Kind</b> are required.",
        "Optionally add: purchase date, <b>Cost, ₴</b>, <b>Life, hours</b> (total productive hours "
        "you expect from it), <b>₴/hour running</b> (power and consumables), <b>Service, ₴/year</b> "
        "and <b>Hours a year</b>.",
        "Pick a <b>Supplier</b> if you bought it from one.",
        "Click <b>Add</b>.",
    ]),
    ("p", "The card then shows the hourly rate, and how much of it is actually known — for example "
          "<i>2 of 3 components known</i>. Blank inputs are treated as unknown, never as zero."),
    ("h3", "Booking time per product"),
    ("steps", [
        "Use <b>Book time per unit</b> at the bottom of the page.",
        "Pick the <b>Product</b> and the <b>Machine</b>.",
        "Enter <b>Minutes per unit</b>.",
        "Click <b>Save</b>.",
    ]),
    ("p", "The table <b>Machine time against entered unit cost</b> then compares, for each product, "
          "what its machine time is worth against the unit cost you actually entered, and gives a "
          "verdict: <i>machine time covered</i>, <i>barely covers machine time</i>, <i>below machine "
          "time alone</i>, or <i>no unit cost entered</i>."),
    ("stop", "<b>These figures are for planning and are not counted anywhere.</b> Nothing on the "
             "Workshop page is subtracted from any margin. If you decide a unit cost should include "
             "machine time, you enter that cost yourself on the Costs page — and then you must take "
             "the machine purchase <i>out</i> of cost entries, or the same hryvnia is counted twice."),

    # ---------------------------------------------------------- 6. FINANCE --
    ("h1", "6. Finance", "break"),

    ("h2", "The monthly table"),
    ("p", "<b>Finance › Finance</b> shows one row per month, newest first:"),
    ("table",
     ["Column", "Meaning"],
     [["<b>Orders</b>", "Countable orders that month"],
      ["<b>Goods</b>", "What the products sold for"],
      ["<b>Shipping</b>", "Delivery billed to customers"],
      ["<b>COGS</b>", "Unit costs of what sold"],
      ["<b>Opex</b>", "Operating costs for the month"],
      ["<b>Margin</b>", "Goods + Shipping &minus; COGS &minus; Opex"]],
     [0.20, 0.80]),
    ("warn", "<b>Goods</b> is not the whole charge. Delivery has always been billed on top of the "
             "goods price, so it is shown as its own column and counted separately. Margin includes "
             "both. Click any month to see its cost breakdown and product table below."),
    ("p", "A dagger (†) marks a month with gaps — orders with no hryvnia amount, or lines with no "
          "unit cost. The number is still shown, with the warning, because a figure plus an honest "
          "asterisk beats no figure at all."),

    ("h2", "Exchange rates"),
    ("p", "At the top of the Finance page is the <b>FX</b> panel: today's official National Bank "
          "rates for the euro and the dollar, the <b>Shop rate</b> your site uses, and the "
          "<b>Drift</b> between them with a verdict — <i>In line</i>, <i>Drifting</i> or <i>Far "
          "apart</i>."),
    ("p", "When they are far apart, the panel says which way it cuts: above the official rate, "
          "hryvnia customers pay more for add-ons than the euro price implies; below it, the shop "
          "absorbs the difference."),
    ("note", "This panel is <b>display only</b>. It changes no price. Catalogue prices are set by "
             "hand in both currencies; only add-ons and cart subtotals convert at the shop rate. To "
             "move that rate a developer edits one constant in the code."),

    ("h2", "Exporting for the accountant"),
    ("steps", [
        "Click <b>Orders CSV</b> for every order with its amounts, shipping, discount, voucher and "
        "partner.",
        "Click <b>Costs CSV</b> for every cost entry with category, amounts, period, supplier, "
        "product and note.",
    ]),
    ("p", "Both are full dumps, oldest first, with a byte marker so Ukrainian text opens correctly "
          "in Excel. Filtering is the accountant's job — we do not guess which slice is wanted."),

    ("h2", "Cost &amp; Margin Guard"),
    ("p", "<b>Finance › Cost &amp; Margin Guard</b> is the agent that judges profitability."),
    ("steps", [
        "Open the page.",
        "Click <b>Check margins</b>.",
        "The report appears, and is saved so you can see what it said before.",
    ]),
    ("note", "It also runs by itself every Monday evening, just before the Weekly Brief."),
    ("p", "It always reports on the <b>last full month</b>, never the running one. A margin worked "
          "out on the 3rd of the month is a rumour: the costs have not arrived and the percentage "
          "swings on every sale."),

    ("h3", "Reading the report"),
    ("table",
     ["Section", "What it tells you"],
     [["<b>Alerts</b>", "The findings, worst first. Empty means nothing needs attention."],
      ["<b>The month</b>", "Goods, shipping, COGS, opex, fees, ads and the final margin"],
      ["<b>Retail and wholesale</b>", "Gross margin per channel — revenue plus shipping, minus COGS"],
      ["<b>By product</b>", "Units, revenue, COGS, gross margin, % and a verdict per product"]],
     [0.28, 0.72]),
    ("p", "Verdicts are: <b>Below cost</b> (losing money), <b>Thin</b> (under 25%), <b>OK</b> "
          "(25–50%), <b>Strong</b> (50%+), and <b>Unknown</b> — which appears whenever any line of "
          "that product had no unit cost, because a partial figure would flatter it."),
    ("p", "Alerts cover: selling below cost, thin margins, a margin that has collapsed against its "
          "own three-month average, a channel under water, a month that lost money, and ad spend "
          "exceeding gross margin."),
    ("note", "Channel margin is <b>gross only</b>. Rent, salaries and ads are not split between "
             "retail and wholesale, because there is no honest way to divide them. The month's true "
             "net stays in the monthly table."),
    ("warn", "The Guard never changes a price. It flags things for you to decide."),

    # ------------------------------------------------------- 7. WHOLESALE ---
    ("h1", "7. Wholesale CRM", "break"),

    ("h2", "Partners"),
    ("p", "<b>Wholesale CRM › Partners</b> is one row per company: who they are, where they stand, "
          "and what they have ordered."),

    ("h3", "The pipeline, in plain words"),
    ("table",
     ["Stage", "What it means"],
     [["<b>Lead</b>", "An enquiry arrived. Nothing sent yet."],
      ["<b>Contacted</b>", "You replied, or the application form went out."],
      ["<b>Application in</b>", "Their completed application is in your hands."],
      ["<b>Active</b>", "They have ordered. A live relationship."],
      ["<b>Dormant</b>", "They were active and have gone quiet. Follow-up material."],
      ["<b>Rejected</b>", "Declined — by them or by you."]],
     [0.24, 0.76]),
    ("p", "You move partners through these stages by hand. No agent ever changes a stage."),

    ("h3", "Adding a partner"),
    ("steps", [
        "Fill <b>Company</b> — the only required field.",
        "Add <b>Contact name</b>, email, <b>Phone</b>, <b>Country</b>.",
        "Set <b>Correspondence language</b> — this decides which language a follow-up draft opens in.",
        "Set the <b>Status</b>.",
        "Optionally set <b>Follow up on</b> — a date you want to be reminded.",
        "Add <b>Notes</b>, then click <b>Add</b>.",
    ]),
    ("h3", "Linking orders"),
    ("p", "On a partner card, use <b>Link</b> and enter an order reference (<i>TCT-…</i> or the "
          "order id) to attach an order to that company. Linked orders drive their order count, "
          "their revenue and the &ldquo;last order&rdquo; date — which is what the follow-up list "
          "measures silence from. <b>Unlink</b> reverses it."),

    ("h2", "Follow-ups"),
    ("p", "<b>Wholesale CRM › Follow-ups</b> lists partners who have gone quiet, quietest first."),
    ("p", "A partner appears here when <b>both</b> are true:"),
    ("ul", [
        "their status is <b>Active</b> or <b>Dormant</b> — a real relationship, not a lead that "
        "never ordered; and",
        "their last order (or, if they never ordered, the date you added them) is more than "
        "<b>90 days</b> ago.",
    ]),
    ("p", "If the list says <i>Nobody has been quiet longer than 90 days</i>, there is genuinely "
          "nobody to write to. That is the normal, healthy state."),
    ("p", "Each card shows the company, its status, how long it has been quiet, the contact details, "
          "and — once you have written to them — when the last letter went and who sent it."),

    ("h3", "The send gate"),
    ("p", "This is the one place in the whole system where a message can reach someone outside the "
          "company. It takes three steps, and all three are yours."),
    ("steps", [
        "<b>Read.</b> The draft is shown in full. Switch between <b>EN</b> and <b>UK</b> if you want "
        "the other language.",
        "<b>Edit.</b> The subject and the letter are editable. What you edit is exactly what is "
        "sent. <b>Reset draft</b> puts the suggested wording back.",
        "<b>Confirm.</b> Click <b>Send from the system</b>. Nothing is sent yet — a bar appears "
        "showing the exact address. Only <b>Yes, send it</b> actually sends.",
    ]),
    ("p", "The letter goes out in the Tactical HB design — the same wordmark, colours and layout as "
          "your order confirmations — and replies come back to the sales inbox."),
    ("stop", "<b>What never happens automatically:</b><br/>"
             "&bull; No letter is ever sent on a schedule. The Monday job cannot reach a partner's "
             "inbox — it only writes to you.<br/>"
             "&bull; There is no &ldquo;send to everyone quiet&rdquo; button, and no bulk send exists "
             "anywhere in the system.<br/>"
             "&bull; Sending does not change the partner's status or their follow-up date. Sending a "
             "letter is not the same as deciding the relationship has changed — that stays your call, "
             "on the Partners page."),
    ("h3", "The 14-day cooldown"),
    ("p", "After a letter is delivered, that partner's send button closes for <b>14 days</b>. "
          "Silence is not a reason to write again, and without this the same company could be "
          "nudged every time you open the page. The card tells you when the button reopens."),
    ("p", "If something genuinely cannot wait, <b>Copy draft</b> and <b>Open in mail app</b> always "
          "work — and then you are unambiguously the sender."),
    ("note", "A partner with no email on file cannot be written to from the system. The card says "
             "so, and the copy button still works."),

    # ------------------------------------------------------- 8. MARKETING ---
    ("h1", "8. Marketing", "break"),

    ("h2", "Creative library"),
    ("p", "<b>Marketing › Marketing</b> holds two things. The first is the <b>Creative library</b> — "
          "a record of the assets you have, so they can be found and reused instead of remade."),
    ("steps", [
        "Fill <b>Title</b>.",
        "Pick a <b>Kind</b> (image, video and so on).",
        "Tick the <b>Channels</b> it suits.",
        "Paste a <b>Link</b> to where the file actually lives — Drive, Meta, anywhere.",
        "Optionally attach it to a <b>Product</b>.",
        "Add <b>Notes / copy text</b>, then click <b>Add</b>.",
    ]),
    ("note", "The system stores the <i>record</i> and the link. It does not host your files."),

    ("h2", "Ad spend"),
    ("p", "The second half is <b>Ad spend</b> — what you actually spent, and what you actually got."),
    ("steps", [
        "Pick a <b>Channel</b>: Meta, Instagram, Reddit, TikTok, Google, Email, Organic or Other.",
        "Enter the <b>Month</b> as <i>2026-08</i>.",
        "Enter the amount, and a <b>Campaign</b> name if useful.",
        "Enter <b>Clicks</b> and <b>Orders</b> if you know them — leave blank if you do not.",
        "Click <b>Add</b>.",
    ]),
    ("warn", "There is <b>no ad platform integration</b> anywhere in the system. Nothing is imported "
             "from Meta or Google, and nothing is spent by the system. These are numbers you enter "
             "from your own platform reports. Blank means &ldquo;not measured&rdquo;; zero means "
             "&ldquo;measured, and it was zero&rdquo;."),

    ("h2", "Strategist"),
    ("p", "<b>Marketing › Strategist</b> drafts next month's campaign outline."),
    ("steps", [
        "Open the page.",
        "Click <b>Draft a plan</b>.",
        "The plan appears and is saved. Previous plans are listed at the bottom.",
    ]),
    ("note", "Manual only — the Strategist does not run on a schedule."),
    ("p", "The plan contains: a suggested <b>budget</b> and split across channels (based on what you "
          "have actually spent and the results you entered); <b>Push</b> — what to advertise, with "
          "its margin and sales; <b>Don't advertise</b> — items that are Critical or Low, because "
          "advertising an empty shelf buys disappointment; <b>Creatives to reuse</b> and which "
          "products are missing one; <b>Consider pausing</b>; and <b>Copy drafts</b> in both "
          "languages."),
    ("stop", "The Strategist spends nothing and publishes nothing. There is no ad platform for it to "
             "talk to. Copy the text, edit it, and place it yourself."),

    # --------------------------------------------------------- 9. COMMAND ---
    ("h1", "9. Command — the Weekly Brief", "break"),

    ("p", "<b>Command › Weekly Brief</b> is the one-page situation report: the whole business in the "
          "time it takes to drink a coffee."),

    ("h2", "How it arrives"),
    ("table",
     ["", "Monday evening", "On demand"],
     [["How", "Automatic, about 21:00 Kyiv", "Click <b>Generate brief</b>"],
      ["Emailed?", "Yes, to the shop's own address", "No — you are already looking at it"],
      ["Saved?", "Yes", "Yes"]],
     [0.20, 0.40, 0.40]),

    ("h2", "What it summarises"),
    ("ul", [
        "<b>The week</b> — revenue, order count, and the change against the previous week.",
        "<b>Month to date</b> — revenue, COGS, opex and margin, with a warning if data is incomplete.",
        "<b>Margin for [last full month]</b> — what the Cost &amp; Margin Guard last found, with its "
        "worst findings and when it checked. This quotes the Guard; it does not recalculate.",
        "<b>Stock</b> — what is critical, and what the Advisor suggests making.",
        "<b>Wholesale</b> — follow-ups due, and who has gone quiet.",
        "<b>This week's sellers</b> — best products by revenue.",
        "<b>Project savings</b> — progress against each target.",
        "<b>This month's ad spend</b> — by channel.",
    ]),
    ("note", "The page shows the <b>saved report</b>, not a live recalculation. That is the point: "
             "&ldquo;what did it say last Monday&rdquo; must be answerable. Older briefs are listed "
             "underneath."),
    ("warn", "The brief is a summary. It changes nothing and sends nothing outside the company."),

    # -------------------------------------------------------- 10. PROJECTS --
    ("h1", "10. Projects &amp; Exhibitions", "break"),

    ("h2", "Projects"),
    ("p", "<b>Projects › Projects &amp; Exhibitions</b> is where future products are funded out of "
          "real profits."),
    ("steps", [
        "Enter a <b>Name</b> — the only required field. &ldquo;Tech bowl, someday&rdquo; is a "
        "legitimate row.",
        "Pick a <b>Status</b>: Idea, Saving, In progress, Done or Parked.",
        "Optionally set <b>Target, ₴</b>, <b>Monthly, ₴</b> (the set-aside you have chosen) and a "
        "<b>Deadline</b>.",
        "Click <b>Add</b>.",
    ]),

    ("h2", "Recording money set aside"),
    ("steps", [
        "On the project card, enter an amount and a <b>Date</b>.",
        "Add a <b>Note</b> if useful.",
        "Click <b>Record</b>.",
    ]),
    ("p", "The ledger is append-only. To correct a mistake, record a <b>negative</b> amount — that "
          "is also how you record taking money back out. <b>Recent entries</b> shows the history."),
    ("note", "The money itself lives in a bank this system has never heard of. The ledger records "
             "decisions you have already made."),

    ("h2", "The savings coach"),
    ("p", "The coach works out, per project, how much you need to set aside each month to hit the "
          "target by the deadline, and compares it with the rate you chose. It recalculates every "
          "time you open the page."),
    ("table",
     ["Verdict", "Meaning"],
     [["<b>on track</b>", "Your chosen monthly rate reaches the target in time"],
      ["<b>behind</b>", "Your rate misses the deadline — raise it or move the date"],
      ["<b>needs a monthly rate</b>", "There is a target and a deadline but no rate chosen yet"],
      ["<b>funded</b>", "Saved ≥ target. Ready to start."],
      ["<b>deadline passed</b>", "The date has gone with money still to find"],
      ["<b>no deadline</b> / <b>no target set</b>", "Not enough entered to pace it"]],
     [0.30, 0.70]),
    ("p", "Suggested amounts are rounded up to ₴100 — nobody budgets to the hryvnia."),
    ("warn", "Advisory only. The coach never moves money."),

    ("h2", "Exhibitions"),
    ("p", "Record fairs with name, location, dates, a <b>planned budget</b> and a status "
          "(Considering, Applied, Confirmed, Attended, Skipped)."),
    ("note", "The budget here is <b>the plan</b>. What you actually spend goes in <b>Costs</b> under "
             "the <i>Exhibitions</i> category — otherwise the same money would be counted twice."),

    # -------------------------------------------------------- 11. ROUTINE ---
    ("h1", "11. Your weekly routine", "break"),

    ("p", "A ten-minute pass, ideally on Monday or Tuesday."),
    ("steps", [
        "<b>Open the Ops map.</b> Look at the room chips. Anything red or amber is where your "
        "attention goes.",
        "<b>Check critical stock.</b> Stock &amp; Production › Stock. Anything red gets a production "
        "decision today.",
        "<b>Open the Stock Advisor.</b> It is already up to date. Read the <b>Make</b> column and "
        "decide what to produce. Log batches with <b>Receive batch</b> when they are done.",
        "<b>Review follow-ups.</b> Wholesale CRM › Follow-ups. Read each draft, edit it, and send "
        "the ones worth sending. If the list is empty, move on.",
        "<b>Skim finance.</b> Finance › Finance. Check this month's margin and glance at the FX "
        "drift. Then Cost &amp; Margin Guard › <b>Check margins</b> and read the Alerts section.",
        "<b>Read the Weekly Brief.</b> Command › Weekly Brief. It is already written from Monday "
        "evening, and it is in your inbox too.",
    ]),

    ("h2", "Monthly, as well"),
    ("ul", [
        "Enter the <b>Monobank invoice</b> in Costs under <b>Payment fees</b>.",
        "Enter <b>ad spend</b> and the results for the month just finished.",
        "Enter any <b>unit costs</b> that have changed, dated from when they changed.",
        "Record what you have <b>set aside</b> for each project.",
        "Download the two <b>CSVs</b> for your accountant.",
    ]),

    ("h2", "What runs without you"),
    ("table",
     ["Job", "When", "What it does"],
     [["Parcel tracking", "Daily, ~21:00 Kyiv", "Updates order statuses; emails customers when shipped"],
      ["Low-stock alert", "Daily", "Emails you when a line worsens"],
      ["Cost &amp; Margin Guard", "Mondays", "Writes the margin report"],
      ["Weekly Brief", "Mondays", "Writes the brief and emails it to you"]],
     [0.24, 0.22, 0.54]),
    ("note", "All four run on one scheduled job. None of them can email a customer anything except "
             "a shipping notification, and none can email a partner at all."),

    # ---------------------------------------------------------- 12. SAFETY --
    ("h1", "12. Safety &amp; troubleshooting", "break"),

    ("h2", "Admin pages show 404"),
    ("p", "You are signed in, but your address is not on the admin list."),
    ("steps", [
        "Open the project in Vercel › <b>Settings</b> › <b>Environment Variables</b>.",
        "Find <b>ADMIN_EMAILS</b>.",
        "Check your address is there, spelled exactly as you sign in, separated by commas.",
        "Redeploy for the change to take effect.",
    ]),
    ("note", "Signed out is different: you are <i>redirected to the login page</i>, not 404'd. A 404 "
             "means &ldquo;signed in, not an admin&rdquo;."),

    ("h2", "A page says &ldquo;check that migration … has been run&rdquo;"),
    ("p", "That banner means a database table the page needs does not exist yet. The page is not "
          "broken; it has nothing to read."),
    ("steps", [
        "Open the file named in the banner from <b>supabase/migrations/</b> in the repository.",
        "Copy the whole file.",
        "In Supabase, open <b>SQL Editor</b> › new query › paste › <b>Run</b>.",
        "Expect <i>Success. No rows returned.</i>",
        "Reload the page.",
    ]),
    ("warn", "Run migrations in number order, and only once each — although they are written to be "
             "safe to re-run if you are unsure."),

    ("h2", "Stock is not moving when orders come in"),
    ("ul", [
        "Check the sku exists on the <b>Stock</b> page. Stock only moves for lines the register "
        "knows about.",
        "Check the variant name matches the catalogue exactly, in English. A translated variant name "
        "will not match.",
        "Check migration <b>0015</b> has been run.",
        "Look at the <b>Movements</b> list on the line — if <b>Order</b> movements are absent, "
        "nothing was matched.",
    ]),

    ("h2", "Margins all read &ldquo;unknown&rdquo;"),
    ("p", "No unit costs are entered, or they are dated <i>after</i> the orders. A cost applies from "
          "its <b>From</b> date onwards. Enter costs dated on or before the orders you want costed."),

    ("h2", "The FX panel shows dashes"),
    ("p", "The National Bank was unreachable. Nothing else on the page depends on it, and it will "
          "return by itself."),

    ("h2", "An email did not arrive"),
    ("ul", [
        "Shipping notifications, alerts and the brief all depend on the mail service being "
        "configured. If nothing at all sends, that is the first thing to check with your developer.",
        "The follow-up gate reports failures on the card, and records the failed attempt, so a "
        "failure is never silent.",
    ]),

    ("h2", "The rules that protect you"),
    ("stop", "&bull; No agent spends money, changes a price, or moves stock.<br/>"
             "&bull; No agent emails a customer or a partner. The only outbound partner mail is the "
             "follow-up gate, and it needs two presses from you.<br/>"
             "&bull; Scheduled jobs can email <i>you</i> and can send a shipping notification. "
             "Nothing else.<br/>"
             "&bull; Stock changes only on a paid order or your own entry.<br/>"
             "&bull; Partner statuses change only when you change them.<br/>"
             "&bull; Unknown is shown as unknown, never as zero."),

    # ------------------------------------------------------------ 13. GAPS --
    ("h1", "13. What is not built yet", "break"),

    ("p", "So this manual is not mistaken for a description of a bigger system than exists:"),
    ("table",
     ["Area", "Status today"],
     [["<b>Growth &amp; Markets</b>",
       "The master plan lists this as a department (monthly growth actions, market notes, channel "
       "checklist). <b>It has no page and no data.</b> It is the only department in the plan with no "
       "screen."],
      ["<b>Order statuses</b>",
       "Cannot be edited by hand. They move on payment and on Nova Poshta tracking. Only the TTN is "
       "yours to set."],
      ["<b>Vouchers</b>",
       "You can redeem one and look up the last 20 issued. Creating or cancelling vouchers is not "
       "done from this screen."],
      ["<b>Ad platforms</b>",
       "No integration exists. All spend and results are typed in by you."],
      ["<b>Bulk follow-ups</b>",
       "Deliberately absent. One partner at a time, always."],
      ["<b>Machine costs</b>",
       "Never flow into unit costs automatically. The Workshop figures are for planning only."],
      ["<b>Exchange rates</b>",
       "Displayed only. No history is stored and no price is repriced."],
      ["<b>Payment fees</b>",
       "Monobank does not report its commission anywhere readable, so fees only appear if you enter "
       "the invoice yourself."],
      ["<b>Stock Advisor log</b>",
       "The page is always live, but a saved copy is only written on Mondays or when you press "
       "<b>Generate brief</b>."]],
     [0.24, 0.76]),

    ("gap", 14),
    ("note", "This manual describes THB-OS as it stands on <b>27 July 2026</b>, after Phase F. If a "
             "screen looks different from what is written here, the software has moved on and this "
             "document should be reissued."),
]
