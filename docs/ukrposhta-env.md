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
# NAME AND PHONE ARE OPTIONAL and normally left blank: lib/sender.ts reads them
# from the Nova Poshta business cabinet, which is where that identity already
# lives and is maintained. Set these two only to lodge Ukrposhta parcels under a
# different name from the Nova Poshta account.
UKRPOSHTA_SENDER_NAME=
UKRPOSHTA_SENDER_PHONE=

# THE POSTCODE HAS NO FALLBACK AND MUST BE SUPPLIED before any shipment can be
# created. Nova Poshta addresses a sender by warehouse uuid and holds no postal
# code anywhere, so there is nothing to inherit. Quoting never needs it.
UKRPOSHTA_SENDER_POSTCODE=

# -----------------------------------------------------------------------------
#  Optional. AVIA unless this says GROUND.
#
#  Ground service out of Ukraine reaches only a few neighbours and is slow
#  enough that quoting it from a premium storefront invites a complaint.
# -----------------------------------------------------------------------------
# UKRPOSHTA_TRANSPORT_TYPE=AVIA
```
