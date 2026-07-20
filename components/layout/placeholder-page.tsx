import { Badge, Card, Chip } from "@/components/ui";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  chips = [],
}: {
  eyebrow: string;
  title: string;
  description: string;
  chips?: string[];
}) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-200px)] max-w-7xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full overflow-hidden bg-cream p-8 md:p-12">
        <Badge tone="vip">{eyebrow}</Badge>
        <h1 className="mt-6 max-w-3xl font-serif text-4xl font-bold leading-tight text-burgundy-dark md:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-mauve-dark md:text-lg">{description}</p>
        {chips.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3">
            {chips.map((chip) => (
              <Chip key={chip}>{chip}</Chip>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
