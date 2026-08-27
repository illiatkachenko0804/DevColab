"use client";

import { Navigation } from "@/components/landing/navigation";
import { VideoScroll } from "@/components/landing/video-scroll";
import { FeatureTabs } from "@/components/landing/feature-tabs";
import { SpeedSection } from "@/components/landing/speed-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { Footer } from "@/components/landing/footer";
import Link from "next/link";
import { motion } from "framer-motion";

function Hero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center pt-24 pb-12 px-6 text-center">
      <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted">
        The workspace <br className="hidden sm:block" /> built for engineers.
      </h1>
      <p className="text-xl text-muted max-w-2xl mb-10">
        Everything your team needs to build software faster. <br/> Everything in one seamless environment.
      </p>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="inline-block"
      >
        <Link 
          href="/dashboard"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium h-14 px-8 text-lg bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          Start Building Now
        </Link>
      </motion.div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-accent/30">
      <Navigation />
      <main className="flex-1">
        <Hero />
        <VideoScroll />
        <FeatureTabs />
        <SpeedSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
