"use client";

import { 
  Bell, 
  ChevronDown, 
  Command, 
  Search, 
  Wifi, 
  MessageSquare, 
  LayoutGrid, 
  Code2, 
  Users, 
  Folder, 
  Settings as SettingsIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, type MotionValue, useTransform } from "framer-motion";

const APPS = [
  { id: "chat", label: "Chat", icon: MessageSquare, accent: "#0a84ff" },
  { id: "projects", label: "Projects", icon: LayoutGrid, accent: "#ff9f0a" },
  { id: "snippets", label: "Snippets", icon: Code2, accent: "#bf5af2" },
  { id: "members", label: "Members", icon: Users, accent: "#64d2ff" },
  { id: "files", label: "Files", icon: Folder, accent: "#5e5ce6" },
  { id: "settings", label: "Settings", icon: SettingsIcon, accent: "#8e8e93" },
];

const FEATURES = [
  { 
    id: 'projects_selector', 
    title: 'Workspaces', 
    desc: 'Switch seamlessly between different projects and teams you are part of.', 
    target: [5, 1.5], 
    box: [50, 65] 
  },
  { 
    id: 'widgets', 
    title: 'Smart Dashboard', 
    desc: 'See your assigned tasks, online members, and recent notifications at a glance.', 
    target: [50, 28.5], 
    box: [50, 65] 
  },
  { 
    id: 'chat', 
    title: 'Chat', 
    desc: 'Real-time communication for your team. Create channels and share code snippets instantly.', 
    target: [42.5, 96], 
    box: [50, 65] 
  },
  { 
    id: 'projects', 
    title: 'Projects', 
    desc: 'Kanban boards tailored for developers. Track bugs and plan sprints.', 
    target: [45.5, 96], 
    box: [50, 65] 
  },
  { 
    id: 'snippets', 
    title: 'Snippets', 
    desc: "Your team's shared code library with full syntax highlighting.", 
    target: [48.5, 96], 
    box: [50, 65] 
  },
  { 
    id: 'members', 
    title: 'Members', 
    desc: 'See who is online in real-time and manage role-based access.', 
    target: [51.5, 96], 
    box: [50, 65] 
  },
  { 
    id: 'files', 
    title: 'Files', 
    desc: 'Secure cloud storage for assets. Drag, drop, and share instantly.', 
    target: [54.5, 96], 
    box: [50, 65] 
  },
  { 
    id: 'settings', 
    title: 'Settings', 
    desc: 'Configure integrations, billing, and customize your workspace environment.', 
    target: [57.5, 96], 
    box: [50, 65] 
  },
];

function FeatureHighlight({ 
  feature, 
  index, 
  scrollYProgress 
}: { 
  feature: typeof FEATURES[0], 
  index: number, 
  scrollYProgress: MotionValue<number> 
}) {
  // Features run from scroll 0.25 to 0.95
  const start = 0.25 + (index * 0.0875);
  const end = start + 0.0875;
  
  // Fade in, hold, fade out
  const opacity = useTransform(
    scrollYProgress, 
    [start - 0.01, start + 0.01, end - 0.01, end + 0.01], 
    [0, 1, 1, 0]
  );
  
  const scale = useTransform(
    scrollYProgress, 
    [start - 0.01, start + 0.01, end - 0.01, end + 0.01], 
    [0.9, 1, 1, 0.9]
  );

  return (
    <motion.div 
      className="absolute inset-0 pointer-events-none z-50"
      style={{ opacity }}
    >
      {/* SVG Line connecting the box to the target */}
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Animated Line */}
        <motion.line 
          x1={`${feature.box[0]}%`} 
          y1={`${feature.box[1]}%`} 
          x2={`${feature.target[0]}%`} 
          y2={`${feature.target[1]}%`} 
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth={2}
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          style={{ pathLength: opacity }} // Ties line drawing to fade-in
        />
        
        {/* Target Circle (The dot on the app/element) */}
        <circle 
          cx={`${feature.target[0]}%`} 
          cy={`${feature.target[1]}%`} 
          r="4" 
          fill="#fff" 
          filter="url(#glow)"
        />
      </svg>

      {/* Floating Info Box */}
      <motion.div 
        className="absolute w-64 -translate-x-1/2 -translate-y-1/2"
        style={{ 
          left: `${feature.box[0]}%`, 
          top: `${feature.box[1]}%`,
          scale
        }}
      >
        <div className="glass-strong rounded-xl border border-white/20 p-4 shadow-2xl backdrop-blur-xl bg-black/50 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-xl pointer-events-none" />
          <h3 className="text-sm font-bold text-white tracking-wide uppercase mb-1 drop-shadow-md">
            {feature.title}
          </h3>
          <p className="text-xs text-white/80 leading-relaxed">
            {feature.desc}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function MockOSDesktop({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const [now, setNow] = useState<Date | null>(null);
  
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeString = now?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = now?.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div 
      className="dark relative flex h-full w-full flex-col overflow-hidden text-foreground font-sans text-sm bg-background"
      style={{ background: "radial-gradient(120% 120% at 20% 0%, #2b6cb0 0%, #1a365d 38%, #111827 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: "radial-gradient(60% 50% at 80% 10%, rgba(191,90,242,0.35), transparent 60%), radial-gradient(50% 40% at 10% 90%, rgba(10,132,255,0.35), transparent 60%)" }}
      />

      {/* Render all feature highlights */}
      {FEATURES.map((feature, index) => (
        <FeatureHighlight 
          key={feature.id} 
          feature={feature} 
          index={index} 
          scrollYProgress={scrollYProgress} 
        />
      ))}

      {/* Menu Bar */}
      <header className="glass-strong relative z-30 flex h-7 shrink-0 items-center gap-3 border-b border-separator px-3 text-[13px]">
        <span className="grid h-4 w-4 place-items-center rounded-[5px] bg-accent text-[10px] font-bold text-white">D</span>
        <div className="relative z-40">
          <button type="button" className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-semibold transition-colors text-foreground">
            <span className="h-3 w-3 rounded-[4px] bg-[#64d2ff]" />
            Illia's Project
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </div>
        
        <span className="hidden font-medium text-foreground/70 sm:inline">Desktop</span>
        
        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-1.5 text-foreground/80">
          <button type="button" className="flex items-center gap-1.5 rounded-md px-2 py-0.5 transition-colors text-foreground">
            <Search className="h-3.5 w-3.5" />
            <span className="hidden items-center gap-0.5 text-xs text-muted md:flex"><Command className="h-3 w-3" />K</span>
          </button>

          <span className="hidden items-center gap-1.5 rounded-md px-2 py-0.5 text-xs text-muted lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            1
          </span>

          <Wifi className="hidden h-3.5 w-3.5 md:block" />
          
          <div className="flex h-7 w-7 items-center justify-center opacity-80">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
          </div>

          <button type="button" className="relative flex h-7 w-7 items-center justify-center rounded-md transition-colors text-foreground">
            <Bell className="h-[18px] w-[18px]" />
          </button>

          <span className="hidden tabular-nums text-foreground/80 sm:block">{dateString}</span>
          <span className="tabular-nums">{timeString}</span>

          <div className="relative z-40 ml-1 flex items-center">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-sm overflow-hidden">
              II
            </div>
          </div>
        </div>
      </header>

      {/* Main Desktop Area (Widgets) */}
      <main className="relative z-10 min-h-0 flex-1">
        <div className="absolute inset-0 overflow-y-auto px-6 pb-24 pt-8 no-scrollbar transition-all duration-300 opacity-100">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 text-white">
              <h1 className="text-3xl font-semibold tracking-tight drop-shadow">Good evening, Illia.</h1>
              <p className="mt-1 flex items-center gap-2 text-white/70">
                Press
                <kbd className="inline-flex items-center gap-0.5 rounded-md border border-white/25 bg-white/10 px-1.5 py-0.5 text-xs text-white"><Command className="h-3 w-3" />K</kbd>
                to search, or pick an app from the dock.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="glass-strong group flex flex-col rounded-2xl border border-white/15 p-5 text-left shadow-[var(--shadow-pop)] sm:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">My tasks in Board</span>
                </div>
                <div className="space-y-2.5 max-h-[180px] min-h-[36px] overflow-y-auto no-scrollbar">
                  <span className="text-sm text-muted">No tasks assigned to you.</span>
                </div>
              </div>
              
              <div className="glass-strong group flex flex-col rounded-2xl border border-white/15 p-5 text-left shadow-[var(--shadow-pop)]">
                <span className="mb-3 text-sm font-semibold text-foreground">Online now · 0</span>
                <div className="space-y-2.5 max-h-[180px] min-h-[36px] overflow-y-auto no-scrollbar">
                  <span className="text-sm text-muted">No one online.</span>
                </div>
              </div>
              
              <div className="glass-strong group flex flex-col rounded-2xl border border-white/15 p-5 text-left shadow-[var(--shadow-pop)] sm:col-span-2 lg:col-span-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Bell className="h-4 w-4" /> Recent notifications
                  </span>
                </div>
                <div className="space-y-2 max-h-[180px] min-h-[36px] overflow-y-auto no-scrollbar">
                  <span className="text-sm text-muted">No notifications yet.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Dock */}
      <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center">
        <div className="glass-strong pointer-events-auto flex items-end gap-3 overflow-visible rounded-[22px] border border-white/15 px-3 py-2 shadow-[var(--shadow-dock)] backdrop-blur-xl">
          {APPS.map((app) => (
            <div key={app.id} className="group/dock relative flex flex-col items-center">
              <div style={{ width: 46, height: 46 }} className="relative">
                <div
                  className="absolute bottom-0 left-0 flex items-center justify-center rounded-[22%] border border-white/15 shadow-md transition-transform duration-300"
                  style={{ width: 46, height: 46 }}
                >
                  <span
                    className="flex h-full w-full items-center justify-center rounded-[22%]"
                    style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${app.accent} 88%, white) 0%, ${app.accent} 100%)` }}
                  >
                    <app.icon className="h-1/2 w-1/2 text-white drop-shadow-sm" strokeWidth={2} />
                  </span>
                </div>
              </div>
              {/* <span className="mt-1 h-1 w-1 rounded-full bg-transparent" /> */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
