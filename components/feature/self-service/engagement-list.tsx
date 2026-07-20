import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui";
import type { EngagementProfile } from "@/lib/server/services/member-self-service";

export function EngagementList({ title, eyebrow, items, empty }: { title: string; eyebrow: string; items: EngagementProfile[]; empty: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-4xl font-bold text-burgundy-dark">{title}</h1>
      {items.length ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link key={`${item.id}-${item.createdAt}`} href={`/profiles/${item.id}`}>
              <Card className="overflow-hidden bg-white">
                <div className="relative aspect-[4/3]">
                  <Image src={item.photo} alt={item.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-mauve">{item.createdAt}</p>
                  <h2 className="mt-1 font-serif text-2xl font-bold text-burgundy">
                    {item.name}, {item.age}
                  </h2>
                  <p className="mt-1 text-sm text-mauve-dark">{item.location}</p>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-mauve-dark">{item.headline}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="mt-6 bg-white p-8 text-mauve-dark">{empty}</Card>
      )}
    </section>
  );
}
