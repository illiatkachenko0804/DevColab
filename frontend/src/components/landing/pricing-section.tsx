"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

export function PricingSection() {
  return (
    <section className="py-24 px-6 max-w-5xl mx-auto w-full relative">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Transparent Pricing.</h2>
        <p className="text-xl text-muted max-w-2xl mx-auto">
          No credit card required. No hidden fees. Just pure productivity.
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ type: "spring", bounce: 0, duration: 0.6 }}
        className="glass-strong border border-separator/80 rounded-3xl p-8 md:p-12 max-w-3xl mx-auto shadow-2xl bg-surface/30 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl">
          <div className="w-48 h-48 bg-accent rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold mb-2">Portfolio Edition</h3>
            <div className="flex items-baseline justify-center md:justify-start gap-2 mb-4">
              <span className="text-5xl font-bold tracking-tight">$0</span>
              <span className="text-muted font-medium">/ forever</span>
            </div>
            <p className="text-muted leading-relaxed mb-6">
              Collabsy 2.0 is currently built as a showcase portfolio project. That means you get full access to what would normally be an Enterprise-tier SaaS product, completely for free.
            </p>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="inline-block w-full md:w-auto"
            >
              <Link 
                href="/dashboard"
                className="flex items-center justify-center whitespace-nowrap rounded-lg font-medium h-12 px-8 bg-foreground text-background shadow-lg hover:brightness-110 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-full"
              >
                Create Workspace
              </Link>
            </motion.div>
          </div>

          <div className="flex-1 w-full">
            <div className="bg-background/50 rounded-2xl p-6 border border-separator/50">
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted">What's included</h4>
              <ul className="space-y-4">
                {[
                  "Unlimited workspace members",
                  "All 6 core applications",
                  "Real-time WebSocket sync",
                  "No storage limits (for now)",
                  "Custom role management",
                  "Dark & Light themes"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-accent shrink-0" />
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
