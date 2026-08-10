import OperativeFile from "@/components/mr-hb/OperativeFile";

/* The page itself is only a locale handoff — every pixel is in the client
   component, because the whole experience is one piece of state (which beat
   you are on) and splitting it across a server boundary would buy nothing. */

export default async function MrHbPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <OperativeFile locale={locale} />;
}
