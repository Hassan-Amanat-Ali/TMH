"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui";
import { getPageCopy, type ContentSlug } from "@/lib/content/marketing";
import { useLocale } from "@/components/providers/locale-provider";

export function ContentPage({ slug }: { slug: ContentSlug }) {
  const { locale } = useLocale();
  const copy = getPageCopy(locale, slug);

  return (
    <main className="bg-cream-100">
      <section className="border-b border-gold/20 bg-chrome text-cream">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-light">{copy.eyebrow}</p>
          <h1 className="mt-4 font-serif text-5xl font-bold text-gold-light sm:text-6xl">{copy.title}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-cream-200">{copy.intro}</p>
          {copy.cta ? (
            <Link href={copy.cta.href} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-gold px-6 text-sm font-bold text-burgundy-dark shadow-soft">
              {copy.cta.label}
              <ArrowRight size={17} />
            </Link>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-4 py-10 sm:px-6 lg:px-8">
        {copy.sections.map((section) => (
          <Card key={section.title} className="bg-white p-6">
            <h2 className="font-serif text-3xl font-bold text-burgundy">{section.title}</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-mauve-dark">
              {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </Card>
        ))}
      </section>
    </main>
  );
}
