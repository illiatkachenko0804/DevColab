"use client";

import { useScroll, useTransform, useMotionValueEvent, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MockOSDesktop } from "./mock-os-desktop";

const FRAME_COUNT = 124;

export function VideoScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mockOsRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (mockOsRef.current) {
      // Fade in from 0.2 to 0.23, clamp between 0 and 1
      const opacity = Math.min(1, Math.max(0, (latest - 0.2) / 0.03));
      // Force !important to override any conflicting CSS rules causing the black screen
      mockOsRef.current.style.setProperty("opacity", opacity.toString(), "important");
    }
  });

  // Map 0 -> 0.2 of scroll to frames 1 -> 124 (fast video scrub)
  const frameIndex = useTransform(scrollYProgress, [0, 0.2], [1, FRAME_COUNT]);
  const videoOpacity = useTransform(scrollYProgress, [0.2, 0.23], [1, 0], { clamp: true });
  
  // Hide video canvas completely after crossfade to prevent any ghosting
  const videoDisplay = useTransform(scrollYProgress, (v) => v > 0.24 ? "none" : "block");



  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new window.Image();
      const paddedIndex = i.toString().padStart(4, "0");
      img.src = `/frames/frame_${paddedIndex}.jpg`;
      img.onload = () => {
        if (i === 1) {
          drawFrame(img);
        }
      };
      loadedImages.push(img);
    }
    setImages(loadedImages);
  }, []);

  const drawFrame = (img: HTMLImageElement | undefined) => {
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth*.75;
    canvas.height = canvas.width * (9 / 16); // Maintain 16:10 aspect ratio

    const scale = Math.max(
      canvas.width / img.width,
      canvas.height / img.height
    );
    const x = (canvas.width / 2) - (img.width / 2) * scale;
    const y = (canvas.height / 2) - (img.height / 2) * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  };

  useEffect(() => {
    const handleResize = () => {
      const currentIndex = Math.floor(frameIndex.get());
      if (images[currentIndex - 1]) {
        drawFrame(images[currentIndex - 1]);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [images, frameIndex]);

  useMotionValueEvent(frameIndex, "change", (latest) => {
    const index = Math.max(1, Math.min(FRAME_COUNT, Math.floor(latest)));
    const currentFrame = images[index - 1]; 
    
    if (currentFrame && currentFrame.complete) {
      requestAnimationFrame(() => {
        drawFrame(currentFrame);
      });
    }
  });

  return (
    <div ref={containerRef} className="h-[800vh] w-full bg-background relative">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
        
        {/* Video Canvas Container */}
        <motion.div 
          className="relative w-[85vw] md:w-[75vw] aspect-[16/10] sm:aspect-video rounded-2xl overflow-hidden shadow-2xl border border-separator bg-black"
        >
          {/* Canvas for the video frames */}
          <motion.canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full object-cover" 
            style={{ opacity: videoOpacity, display: videoDisplay }}
          />

          {/* Home Screen Component that fades in and runs its own scroll animations */}
          <div 
            ref={mockOsRef}
            className="absolute inset-0 w-full h-full"
            style={{ opacity: 0 }}
          >
            <MockOSDesktop scrollYProgress={scrollYProgress} />
          </div>

          {/* Glossy overlay effect to make it look like a screen */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none z-10" />
        </motion.div>

      </div>
    </div>
  );
}
