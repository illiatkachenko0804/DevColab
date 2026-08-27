"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { APPS } from "@/lib/apps";
import { CheckCircle2 } from "lucide-react";

const APP_DETAILS: Record<string, { desc: string; features: string[] }> = {
  chat: {
    desc: "Seamless communication for your team. Create dedicated text channels for different topics or jump into direct messages. See who is typing right now and track unread messages instantly.",
    features: ["Text channels & DMs", "Mentions and tagging", "Live typing indicators", "Unread message badges"],
  },
  projects: {
    desc: "Agile project management for developers. Organize tasks in a prioritized Backlog or move them into active Sprints. Visualize your workflow on a Kanban board with custom labels.",
    features: ["Kanban board & Backlog views", "Sprint planning", "Custom labels & assignees", "Markdown task descriptions"],
  },
  snippets: {
    desc: "A shared repository for your team's code snippets. Save reusable blocks of code, categorize them with tags, and get rich syntax highlighting for any programming language.",
    features: ["Rich syntax highlighting", "Language selection", "Tagging and categorization", "Live code editor"],
  },
  members: {
    desc: "Manage access to your workspace. Invite new collaborators via email or their @devtag, and assign Admin or Member roles to control permissions across the platform.",
    features: ["Workspace member list", "Admin & Member roles", "Email & @devtag invitations", "Access revocation"],
  },
  files: {
    desc: "Secure asset storage directly inside your workspace. Organize uploads into nested folders, set specific access levels, and preview images right in the browser.",
    features: ["Drag and drop uploads", "Nested folder structures", "In-app image previews", "Granular access controls"],
  },
  settings: {
    desc: "Configure your personal and workspace preferences. Update your profile, secure your account with Two-Factor Authentication (2FA), and switch between Light and Dark themes.",
    features: ["Workspace administration", "Profile management", "Two-Factor Authentication", "Light & Dark themes"],
  }
};

export function FeatureTabs() {
  const [activeTab, setActiveTab] = useState(APPS[0].id);

  const activeApp = APPS.find((a) => a.id === activeTab)!;
  const details = APP_DETAILS[activeApp.id];

  return (
    <section className="py-24 px-6 max-w-6xl mx-auto w-full">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need.</h2>
        <p className="text-xl text-muted max-w-2xl mx-auto">
          Explore the core applications built into Collabsy. No context switching, just seamless collaboration.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
        {/* Left Side: App Selector */}
        <div className="flex flex-col gap-2 lg:w-1/3">
          {APPS.map((app) => {
            const isActive = activeTab === app.id;
            const Icon = app.icon;
            
            return (
              <button
                key={app.id}
                onClick={() => setActiveTab(app.id)}
                className={`relative flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-300 ${
                  isActive ? "text-foreground" : "text-muted hover:bg-surface/50 hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-surface border border-separator rounded-xl -z-10 shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                
                <div 
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm"
                  style={{ 
                    background: isActive 
                      ? `linear-gradient(135deg, color-mix(in srgb, ${app.accent} 80%, white) 0%, ${app.accent} 100%)` 
                      : "var(--background)",
                    color: isActive ? "white" : "var(--muted)",
                    border: isActive ? "none" : "1px solid var(--separator)"
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{app.label}</h3>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Side: Feature Details */}
        <div className="lg:w-2/3 relative min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col"
            >
              <div 
                className="inline-flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg mb-6"
                style={{ 
                  background: `linear-gradient(135deg, color-mix(in srgb, ${activeApp.accent} 80%, white) 0%, ${activeApp.accent} 100%)`,
                  color: "white"
                }}
              >
                <activeApp.icon className="h-8 w-8" />
              </div>
              
              <h3 className="text-3xl font-bold mb-4">{activeApp.label}</h3>
              <p className="text-lg text-muted/90 leading-relaxed mb-8 max-w-xl">
                {details.desc}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                {details.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 bg-surface/50 p-4 rounded-xl border border-separator/50">
                    <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: activeApp.accent }} />
                    <span className="font-medium text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
