# Ukrposhta — environment variables

Copy the **names** below into `.env.local` on your machine and into the Vercel
project settings for the deployed site. Nothing with a real value in it belongs
in the repository.

This lives in `docs/` rather than as a `.env.*.example` on purpose: `.gitignore`
matches `.env*` with no exceptions, and an absolute rule is worth more than a
tidy filename. A template that has to be force-added teaches the habit of
force-adding env files.

```bash
# Which environment the client talks to.
#
#  sandbox     dev.ukrposhta.ua  — test parcels, no money, safe to hammer
#  production  www.ukrposhta.ua  — REAL parcels and REAL money
#
# Anything other than the exact word `production`, including this variable
# being absent entirely, means sandbox. That is deliberate: a missing variable
# must never be the thing that decides whether a shipment is real.
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
UKRPOSHTA_SENDER_NAME=
UKRPOSHTA_SENDER_PHONE=
UKRPOSHTA_SENDER_POSTCODE=

# -----------------------------------------------------------------------------
#  Optional. AVIA unless this says GROUND.
#
#  Ground service out of Ukraine reaches only a few neighbours and is slow
#  enough that quoting it from a premium storefront invites a complaint.
# -----------------------------------------------------------------------------
# UKRPOSHTA_TRANSPORT_TYPE=AVIA
```
