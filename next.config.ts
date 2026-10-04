import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* The partner-only product sheets live outside public/ (they carry trade
     prices) and are read at request time, so they must be traced into the
     function that serves them. */
  outputFileTracingIncludes: {
    "/api/wholesale/sheet/[lang]": ["./private/wholesale/**/*"],
  },
};

export default withNextIntl(nextConfig);
