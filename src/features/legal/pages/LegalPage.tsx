import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ArrowLeft, FileText, Mail } from "lucide-react";
import { legalDocuments, legalResponsible } from "../legal-content";
import { LegalLinks } from "../components/LegalLinks";
function isDocumentKey(value: string): value is keyof typeof legalDocuments {
  return Object.hasOwn(legalDocuments, value);
}
export function LegalPage() {
  const [searchParams] = useSearchParams();
  const publicCatalog = searchParams.get("volver") === "coleccion";
  const { document = "privacidad" } = useParams();
  const content = isDocumentKey(document) ? legalDocuments[document] : null;
  useEffect(() => {
    const previous = window.document.title;
    window.document.title = `${content?.title ?? "Documento no encontrado"} · ARMA`;
    window.scrollTo(0, 0);
    return () => {
      window.document.title = previous;
    };
  }, [content]);
  return (
    <main className="min-h-dvh bg-arma-background px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          to={publicCatalog ? "/coleccion" : "/"}
          className="inline-flex min-h-11 items-center gap-2 text-sm text-arma-active underline underline-offset-4"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          {publicCatalog ? "Volver al catálogo" : "Volver a ARMA"}
        </Link>
        <header className="mt-7 border-b border-arma-border pb-7">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-arma-active">
            <FileText size={16} aria-hidden="true" /> ARMA · INFORMACIÓN LEGAL
          </p>
          <h1 className="mt-4 font-arma-heading text-4xl leading-tight tracking-tight sm:text-5xl">
            {content?.title ?? "Documento no encontrado"}
          </h1>
          {content ? (
            <>
              <p className="mt-4 max-w-prose text-base leading-7 text-arma-neutral">
                {content.intro}
              </p>
              <p className="mt-3 text-xs text-arma-muted">
                Actualizado el {legalResponsible.updatedAt} · México
              </p>
            </>
          ) : (
            <p className="mt-4">
              Elige uno de los documentos del pie de página.
            </p>
          )}
        </header>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <article className="min-w-0 space-y-8">
            {content?.sections.map((section, index) => (
              <section
                key={section.title}
                aria-labelledby={`legal-section-${index}`}
              >
                <h2
                  id={`legal-section-${index}`}
                  className="font-arma-heading text-2xl"
                >
                  {section.title}
                </h2>
                <div className="mt-3 max-w-[70ch] space-y-3 text-sm leading-7 text-arma-neutral">
                  {section.paragraphs.map((text) => (
                    <p key={text}>{text}</p>
                  ))}
                </div>
              </section>
            ))}
          </article>
          <aside
            aria-label="Contacto del responsable"
            className="min-w-0 rounded-arma border border-arma-active/20 bg-arma-primary-soft p-5 lg:sticky lg:top-8"
          >
            <h2 className="text-sm font-semibold">Responsable de ARMA</h2>
            <p className="mt-3 text-sm leading-6">{legalResponsible.name}</p>
            <p className="mt-3 text-xs leading-6 text-arma-neutral">
              {legalResponsible.address}
            </p>
            <a
              href={`mailto:${legalResponsible.email}`}
              className="mt-4 flex min-h-11 items-start gap-2 break-all text-sm text-arma-active underline underline-offset-4"
            >
              <Mail size={17} className="mt-1 shrink-0" aria-hidden="true" />
              {legalResponsible.email}
            </a>
          </aside>
        </div>
        <footer className="mt-10 border-t border-arma-border pt-5">
          <LegalLinks publicCatalog={publicCatalog} />
        </footer>
      </div>
    </main>
  );
}
