import { Suspense } from "react";
import { ContactForm } from "@/components/feature/content/contact-form";

export default function ContactPage() {
  return (
    <main className="bg-cream-100">
      <section className="border-b border-gold/20 bg-chrome text-cream">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-light">Support</p>
          <h1 className="mt-4 font-serif text-5xl font-bold text-gold-light sm:text-6xl">Contact us</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-cream-200">Send a support request, advertising enquiry, safety concern, or suspension appeal. Appeals are stored separately so moderators can review them in the admin phase.</p>
        </div>
      </section>
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Suspense fallback={null}>
            <ContactForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
