import { requireAdminPage } from "@/lib/admin-guard";
import { fetchExhibitions, fetchProjects } from "@/lib/projects-admin";
import {
  byExhibitionOrder,
  byProjectAttention,
  coachProject,
  coachSummary,
} from "@/lib/projects-display";
import { fetchFinanceMonths } from "@/lib/finance-admin";
import { kyivDate } from "@/lib/advisor-admin";
import { currentPeriod } from "@/lib/costs-display";
import { formatUah } from "@/lib/stock-display";
import ProjectForm from "@/components/admin/ProjectForm";
import ProjectCard from "@/components/admin/ProjectCard";
import ExhibitionForm from "@/components/admin/ExhibitionForm";
import ExhibitionCard from "@/components/admin/ExhibitionCard";

/* ---------------------------------------------------------------------------
   Admin: projects, exhibitions, and the Savings Coach (§6.6).

   The coach's whole footprint is arithmetic rendered on this page: needed
   per month, on or off track, and one affordability line comparing the sum
   of set-asides to what the last months actually earned. It is computed
   fresh on every load from the same rows the cards show — and it moves no
   money, because there is nothing here that could.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/projects");

  const uk = locale === "uk";
  const today = kyivDate(0);

  const [projectsRead, exhibitions, months] = await Promise.all([
    fetchProjects(),
    fetchExhibitions(),
    fetchFinanceMonths(4),
  ]);

  const projects =
    projectsRead === null ? null : [...projectsRead.projects].sort(byProjectAttention);

  // The last three FULL months' margins — the running month would flatter
  // or panic the average for no reason.
  const fullMonths = (months ?? []).filter((m) => m.month !== currentPeriod()).slice(0, 3);
  const avgMarginUah =
    months === null || fullMonths.length === 0
      ? null
      : Math.round(fullMonths.reduce((a, m) => a + m.marginUah, 0) / fullMonths.length);

  const summary =
    projects === null ? null : coachSummary(projects, today, avgMarginUah);

  const fairs = exhibitions === null ? null : [...exhibitions].sort(byExhibitionOrder);

  return (
    <div className="min-h-screen pt-10 pb-24" style={{ background: "#f7f6f4" }}>
      <div className="page-container">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-1" style={{ color: "#111" }}>
            {uk ? "Проєкти та виставки" : "Projects & Exhibitions"}
          </h1>
          <p className="text-[14.5px]" style={{ color: "#707072" }}>
            {projects === null
              ? uk
                ? "Не вдалося завантажити проєкти."
                : "Couldn't load projects."
              : uk
                ? `${projects.length} проєктів у реєстрі`
                : `${projects.length} project${projects.length === 1 ? "" : "s"} on the register`}
          </p>
        </header>

        {(projectsRead === null || exhibitions === null) && (
          <div
            className="rounded-lg px-5 py-4 mb-6 text-[14px]"
            style={{ border: "1px solid #e6d4d2", background: "#fdf6f5", color: "#96322c" }}
          >
            {uk
              ? "Перевірте, чи виконано міграцію 0021_projects.sql у Supabase."
              : "Check that migration 0021_projects.sql has been run in Supabase."}
          </div>
        )}

        {/* The coach's one-line verdict on the whole portfolio ------------- */}
        {summary !== null && summary.projectsCounted > 0 && (
          <div
            className="rounded-lg px-5 py-4 mb-6 text-[14px]"
            style={{
              border: "1px solid var(--border)",
              background: "#fff",
              color:
                summary.avgMarginUah !== null &&
                summary.totalNeededPerMonthUah > summary.avgMarginUah
                  ? "#96322c"
                  : "#3a3a3c",
            }}
          >
            {uk
              ? `Разом проєкти потребують ≈ ${formatUah(summary.totalNeededPerMonthUah)}/міс (${summary.projectsCounted} шт).`
              : `Together the paced projects need ≈ ${formatUah(summary.totalNeededPerMonthUah)}/mo (${summary.projectsCounted} of them).`}{" "}
            {summary.avgMarginUah === null
              ? uk
                ? "Середню маржу порахувати не вдалося — фінанси ще порожні."
                : "No margin average yet — finance has no full months."
              : uk
                ? `Середня маржа за останні ${fullMonths.length} міс: ${formatUah(summary.avgMarginUah)}.`
                : `The last ${fullMonths.length} full month${fullMonths.length === 1 ? "" : "s"} averaged ${formatUah(summary.avgMarginUah)} margin.`}
          </div>
        )}

        {/* Projects --------------------------------------------------------- */}
        <section className="mb-12">
          <div className="mb-4">
            <ProjectForm today={today} uk={uk} />
          </div>

          {projects !== null && projects.length === 0 && (
            <p className="text-[14.5px]" style={{ color: "#707072" }}>
              {uk
                ? "Реєстр порожній. Додайте перший проєкт вище — хоча б як ідею."
                : "The register is empty. Add the first project above — even as an idea."}
            </p>
          )}

          {projects !== null && projects.length > 0 && (
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--border)", background: "#fff" }}
            >
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  advice={coachProject(p, today)}
                  entries={projectsRead!.savingsByProject[p.id] ?? []}
                  today={today}
                  uk={uk}
                />
              ))}
            </div>
          )}
        </section>

        {/* Exhibitions -------------------------------------------------------- */}
        <section>
          <h2 className="text-[17px] font-semibold mb-3" style={{ color: "#111" }}>
            {uk ? "Виставки" : "Exhibitions"}
          </h2>

          <div className="mb-4">
            <ExhibitionForm uk={uk} />
          </div>

          {fairs !== null && fairs.length === 0 && (
            <p className="text-[14.5px]" style={{ color: "#707072" }}>
              {uk
                ? "Календар порожній. Фактичні витрати на виставки — у «Витратах», категорія «Виставки»."
                : "The calendar is empty. Actual fair costs live in Costs under the Exhibitions category."}
            </p>
          )}

          {fairs !== null && fairs.length > 0 && (
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--border)", background: "#fff" }}
            >
              {fairs.map((x) => (
                <ExhibitionCard key={x.id} exhibition={x} uk={uk} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
