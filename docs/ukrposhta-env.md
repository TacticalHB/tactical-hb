# Ukrposhta — environment variables

Copy the **names** below into `.env.local` on your machine and into the Vercel
project settings for the deployed site. Nothing with a real value in it belongs
in the repository.

This lives in `docs/` rather than as a `.env.*.example` on purpose: `.gitignore`
matches `.env*` with no exceptions, and an absolute rule is worth more than a
tidy filename. A template that has to be force-added teaches the habit of
force-adding env files.

```bash
# Which environment the client talks to — or whether it talks at all.
#
#  off         Ukrposhta is not offered. Credentials stay in place, dormant;
#              checkout quotes Nova Post alone, exactly as before this
#              integration existed. THIS IS WHAT PRODUCTION SHOULD HOLD until
#              a shipment has actually been created in sandbox.
#  sandbox     dev.ukrposhta.ua  — test parcels, no money, safe to hammer
#  production  www.ukrposhta.ua  — REAL parcels and REAL money
#
# Only the exact words `sandbox` and `production` switch it on; anything else,
# including this variable being absent, means OFF. And only the exact word
# `production` reaches the live host. A missing or mistyped variable must never
# be the thing that decides whether a shipment is real.
#
# `off` exists because deleting four secrets is a terrible off switch: it means
# pasting them back in under time pressure on the day you want the feature.
UKRPOSHTA_API_MODE=sandbox

# -----------------------------------------------------------------------------
#  SANDBOX credentials
#
#  Both sets can live here at once. The mode above decides which set is read,
#  and the other is never looked at — so sandbox mode physically cannot reach a
#  production bearer. That is the whole reason the names carry the environment
#  instead of one name whose value you swap on cutover day.
# -----------------------------------------------------------------------------
UKRPOSHTA_SANDBOX_BEARER_ECOM=
UKRPOSHTA_SANDBOX_BEARER_TRACKING=
UKRPOSHTA_SANDBOX_COUNTERPARTY_TOKEN=
UKRPOSHTA_SANDBOX_COUNTERPARTY_UUID=

# -----------------------------------------------------------------------------
#  PRODUCTION credentials
#
#  Safe to fill in now and leave dormant — they are only read once
#  UKRPOSHTA_API_MODE says `production`. Filling them ahead of time is better
#  than pasting secrets in a hurry on the day of the cutover.
# -----------------------------------------------------------------------------
UKRPOSHTA_PRODUCTION_BEARER_ECOM=
UKRPOSHTA_PRODUCTION_BEARER_TRACKING=
UKRPOSHTA_PRODUCTION_COUNTERPARTY_TOKEN=
UKRPOSHTA_PRODUCTION_COUNTERPARTY_UUID=

# -----------------------------------------------------------------------------
#  Sender identity — needed to CREATE a shipment, not to quote one.
#  The international price endpoint asks only for the destination and the
#  parcel, so quoting works before any of this is filled in.
# -----------------------------------------------------------------------------
# BOOKING IS A SEPARATE SWITCH FROM QUOTING, because they are separate
# decisions. Quoting is a calculation and can run against production all day
# without consequence; booking creates a real parcel with a real label and a
# real charge. Off unless this says on.
UKRPOSHTA_BOOKING=off

# THE CUSTOMS CODE, and there is deliberately no default. Ukrposhta requires a
# УКТЗЕД classification on EVERY international parcel — not just the US — and
# verifies it against their tariff table, so a well-formed guess is rejected.
# It goes on a customs declaration attached to a real parcel; the wrong one
# risks a hold or a seizure. Ask the Ukrposhta manager or the accountant.
UKRPOSHTA_HS_CODE=

# THE STREET AND HOUSE ARE REQUIRED FOR INTERNATIONAL BOOKING — see the postcode
# note below. They are the sender's and the RETURN address on a customs
# declaration, so they must be the real dispatch address, in Latin characters.
# UKRPOSHTA_SENDER_STREET=
# UKRPOSHTA_SENDER_HOUSE=

# NAME AND PHONE ARE OPTIONAL and normally left blank: lib/sender.ts reads them
# from the Nova Poshta business cabinet, which is where that identity already
# lives and is maintained. Set these two only to lodge Ukrposhta parcels under a
# different name from the Nova Poshta account.
UKRPOSHTA_SENDER_NAME=
UKRPOSHTA_SENDER_PHONE=

# THE POSTCODE HAS NO FALLBACK AND MUST BE SUPPLIED before any shipment can be
# created. Nova Poshta addresses a sender by warehouse uuid and holds no postal
# code anywhere, so there is nothing to inherit. Quoting never needs it.
#
# THE POSTCODE IS NOT ENOUGH FOR AN INTERNATIONAL PARCEL, and the documentation
# is misleading here. Table 2.1 marks only `country` and `postcode` as required,
# which is true of CREATING an address — but a shipment to Germany with a
# street-less sender address is refused with "should include only latin
# characters at fields: Sender address, Return address", an error that names the
# wrong problem. Adding a Latin street and house number clears it. Confirmed
# against production on 28 August 2026: same address, same everything, street
# absent = refused, street present = booked.
UKRPOSHTA_SENDER_POSTCODE=

# THE SENDER'S TAX NUMBER — the ІПН/РНОКПП of the ФОП, ten digits.
#
# OPTIONAL, AND WORTH SETTING. Left blank, the code creates a throwaway client
# just to read the number back off the account — proven on 27 August 2026, when
# a single probe run against production created TWO clients instead of one.
# Both were correctly typed, so nothing is broken, but the account collects one
# extra permanent record per cold start for no reason. Setting this skips the
# round trip and the litter.
#
# TEN DIGITS IS CONFIRMED. Production accepted a ten-digit tin and the client
# reads back with it; the international PDF that says twelve for a sole trader
# is wrong.
#
# IT IS `tin`, NOT `edrpou`. Ukrposhta keeps two fields — `edrpou` for a legal
# entity's ЄДРПОУ (5-8 digits) and `tin` for a person's or a ФОП's ІПН (10).
# Pushing a ten-digit sole-trader number into the company field is what produced
# "EDRPOU should contain 8-9 digits" for weeks; the number was fine, the field
# was wrong. UKRPOSHTA_SENDER_EDRPOU is still read as a fallback for accounts
# that really are companies.
UKRPOSHTA_SENDER_TIN=

# Optional. The sender is created as PRIVATE_ENTREPRENEUR (ФОП) unless this
# says otherwise — COMPANY or INDIVIDUAL are the other two. Sending nothing at
# all is NOT neutral: the API defaults to COMPANY, and then demands a ЄДРПОУ.
# UKRPOSHTA_SENDER_CLIENT_TYPE=PRIVATE_ENTREPRENEUR

# -----------------------------------------------------------------------------
#  Optional. AVIA unless this says GROUND.
#
#  Ground service out of Ukraine reaches only a few neighbours and is slow
#  enough that quoting it from a premium storefront invites a complaint.
# -----------------------------------------------------------------------------
# UKRPOSHTA_TRANSPORT_TYPE=AVIA
```
