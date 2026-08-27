"use client";

import { motion } from "framer-motion";
import { Command, Search, Code2, LayoutGrid, MessageSquare, Terminal } from "lucide-react";

export function SpeedSection() {
  return (
    <section className="py-32 px-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[120px] -z-10 opacity-50" />
      
      <div className="max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center gap-16">
        {/* Text content */}
        <div className="lg:w-1/2 text-left">
          <div className="inline-flex items-center rounded-full border border-separator bg-surface/50 px-3 py-1 text-sm font-medium text-muted mb-6">
            <Terminal className="h-4 w-4 mr-2" />
            Keyboard-first design
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Move at the speed <br className="hidden sm:block" /> of thought.
          </h2>
          <p className="text-xl text-muted leading-relaxed mb-8">
            Engineers hate slow interfaces. That's why Collabsy is built with zero-latency responses and comprehensive keyboard shortcuts. Press <kbd className="px-2 py-1 bg-surface border border-separator rounded-md text-sm mx-1 font-sans">⌘</kbd> + <kbd className="px-2 py-1 bg-surface border border-separator rounded-md text-sm mx-1 font-sans">K</kbd> anywhere to navigate your entire workspace without ever touching your mouse.
          </p>
          
          <ul className="space-y-4">
            {[
              "Instant transitions with Framer Motion springs",
              "Real-time WebSocket data synchronization",
              "Optimized for 60fps rendering across all apps"
            ].map((text, i) => (
              <li key={i} className="flex items-center gap-3 text-muted">
                <div className="h-2 w-2 rounded-full bg-accent" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Visual Showcase (Mock Command Palette) */}
        <div className="lg:w-1/2 w-full perspective-1000">
          <motion.div 
            initial={{ opacity: 0, y: 30, rotateX: 10 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", bounce: 0, duration: 0.8 }}
            className="w-full max-w-md mx-auto glass-strong bg-background/80 backdrop-blur-2xl border border-separator/80 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center px-4 py-4 border-b border-separator/50">
              <Search className="h-5 w-5 text-muted mr-3 shrink-0" />
              <div className="flex-1 text-lg text-muted">Search workspace...</div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface rounded text-xs text-muted font-sans border border-separator">ESC</kbd>
              </div>
            </div>
            
            <div className="p-2 space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider">Suggestions</div>
              
              <div className="flex items-center gap-3 px-3 py-2.5 bg-accent text-accent-foreground rounded-lg cursor-pointer">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="flex-1 font-medium">Jump to General Chat</span>
                <span className="text-xs opacity-70">G</span>
              </div>
              
              <div className="flex items-center gap-3 px-3 py-2.5 text-foreground hover:bg-hover rounded-lg cursor-pointer transition-colors">
                <LayoutGrid className="h-4 w-4 shrink-0 text-muted" />
                <span className="flex-1 font-medium">Open Frontend Sprint</span>
                <span className="text-xs text-muted">S</span>
              </div>
              
              <div className="flex items-center gap-3 px-3 py-2.5 text-foreground hover:bg-hover rounded-lg cursor-pointer transition-colors">
                <Code2 className="h-4 w-4 shrink-0 text-muted" />
                <span className="flex-1 font-medium">Find React Context snippet</span>
                <span className="text-xs text-muted">C</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
