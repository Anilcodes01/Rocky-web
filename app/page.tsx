'use client'

import { AuthDock } from "../components/auth-dock";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

const capabilities = [
  {
    title: "Voice or typing",
    description:
      "Talk naturally or type quietly depending on what your moment needs.",
  },
  {
    title: "Desktop presence",
    description:
      "The pet stays visible and lightweight instead of turning into a heavy app window.",
  },
  {
    title: "Helpful summaries",
    description:
      "Quick recaps, follow-ups, and useful nudges stay close to the character.",
  },
  {
    title: "Switchable personalities",
    description:
      "Rocky, Rhea, and Pip each bring a different feel and a different visual theme.",
  },
];

const panelTabs = [
  { id: "home", label: "Home" },
  { id: "capabilities", label: "Capabilities" },
  { id: "pets", label: "Pets" },
  { id: "download", label: "Download" },
] as const;

function AppleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.365 12.54c.02 2.155 1.89 2.872 1.91 2.88-.016.05-.298 1.02-.983 2.022-.592.866-1.206 1.728-2.176 1.745-.953.018-1.26-.566-2.35-.566-1.092 0-1.433.548-2.333.583-.935.036-1.648-.94-2.245-1.803-1.22-1.764-2.151-4.985-.9-7.16.62-1.08 1.729-1.763 2.933-1.78.917-.018 1.782.618 2.35.618.567 0 1.632-.764 2.75-.652.468.02 1.782.19 2.625 1.425-.067.042-1.567.914-1.58 2.688ZM14.98 7.522c.496-.6.83-1.433.74-2.265-.714.029-1.578.474-2.09 1.075-.46.534-.863 1.39-.754 2.206.796.061 1.607-.404 2.104-1.016Z" />
    </svg>
  );
}

function WindowsIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M3 5.52 10.39 4.5v7.04H3V5.52Zm8.47-1.17L21 3v8.54h-9.53V4.35ZM3 12.46h7.39v7.05L3 18.48v-6.02Zm8.47 0H21V21l-9.53-1.33v-7.21Z" />
    </svg>
  );
}

const pets = [
  {
    name: "Rocky",
    shortLabel: "Warm guardian",
    description: "A warm, sturdy golem who feels like a tiny guardian for your screen.",
    heroDescription:
      "Rocky lives on your screen, chats by voice or typing, summarizes useful things, and makes the desktop feel grounded and friendly.",
    heroImage: "/rocky-hero.png",
    capabilitiesImage: "/rocky-capabilities-image.png",
    petGif: "/pets/rocky-idle.gif",
    capabilitiesTitle: "Grounded, warm, and quietly capable.",
    capabilitiesDescription:
      "Rocky’s section leans into earthy light, mossy warmth, and a steadier feel so the useful features come across as calm and dependable.",
    image: "/rocky-image.png",
    theme: {
      "--background": "#f8ead7",
      "--foreground": "#2f1d11",
      "--rocky-bg": "#f8ead7",
      "--rocky-text": "#2f1d11",
      "--rocky-muted": "#73523c",
      "--rocky-section-label": "#8a5c2c",
      "--rocky-card": "rgba(255, 249, 241, 0.78)",
      "--rocky-panel": "rgba(255, 247, 238, 0.82)",
      "--rocky-outline": "rgba(101, 62, 27, 0.14)",
      "--rocky-chip-text": "#724821",
      "--rocky-selection": "rgba(195, 127, 66, 0.28)",
      "--theme-glow-left": "rgba(214, 164, 99, 0.42)",
      "--theme-glow-right": "rgba(101, 156, 79, 0.18)",
      "--theme-title-gradient": "linear-gradient(135deg,#d8974b,#b46a2e,#7d9a4f)",
      "--theme-button-gradient": "linear-gradient(135deg,#2f2015,#6f4a2f)",
      "--theme-panel-gradient": "linear-gradient(160deg,#fff4e4,#f1e1cd 55%,#dde7c9)",
      "--theme-download-gradient": "linear-gradient(135deg,#3a2416,#684329 45%,#6e8450)",
      "--theme-icon-gradient": "linear-gradient(135deg,#e9bc7f,#d7a25f)",
      "--theme-orb": "radial-gradient(circle at top left, rgba(255,220,171,0.68), transparent 36%), radial-gradient(circle at 80% 14%, rgba(130,161,97,0.28), transparent 28%), linear-gradient(180deg, rgba(255,249,241,0.92), rgba(248,234,215,0.3) 45%, transparent)",
      "--capabilities-overlay": "linear-gradient(90deg,rgba(249,243,231,0.9)_0%,rgba(245,237,220,0.78)_42%,rgba(228,236,210,0.42)_100%)",
      "--capabilities-sheen": "linear-gradient(180deg,rgba(255,255,255,0.16),rgba(221,232,198,0.24))",
      "--capabilities-card": "rgba(255,249,242,0.58)",
      "--capabilities-card-border": "rgba(255,255,255,0.62)",
      "--capabilities-card-shadow": "0 20px 50px rgba(115, 92, 52, 0.16)",
      "--capabilities-heading": "#2f1d11",
      "--capabilities-copy": "#6a513e",
      "--capabilities-pill": "rgba(255,255,255,0.56)",
      "--capabilities-pill-text": "#655039",
      "--capabilities-icon-bg": "linear-gradient(135deg,rgba(255,252,245,0.96),rgba(226,214,181,0.9))",
      "--capabilities-icon-text": "#7d5a33",
    },
  },
  {
    name: "Rhea",
    shortLabel: "Soft bloom",
    description: "A calm little stone spirit with a floral spark and a sweeter, softer desktop energy.",
    heroDescription:
      "Rhea brings a gentler mood to the same helpful companion, with warmer blush tones and a calmer presence on screen.",
    heroImage: "/rhea-hero.png",
    capabilitiesImage: "/rhea-capabilities-image.png",
    petGif: "/pets/rhea-idle.gif",
    capabilitiesTitle: "Soft, bright, and gently supportive.",
    capabilitiesDescription:
      "Rhea’s version uses floral light and warmer blush tones so the capabilities feel calmer, sweeter, and a little more magical.",
    image: "/rhea-image.png",
    theme: {
      "--background": "#f8e7d9",
      "--foreground": "#351f1a",
      "--rocky-bg": "#f8e7d9",
      "--rocky-text": "#351f1a",
      "--rocky-muted": "#7d5b52",
      "--rocky-section-label": "#a04f67",
      "--rocky-card": "rgba(255, 248, 243, 0.82)",
      "--rocky-panel": "rgba(255, 243, 237, 0.84)",
      "--rocky-outline": "rgba(111, 69, 54, 0.14)",
      "--rocky-chip-text": "#8d4f3e",
      "--rocky-selection": "rgba(219, 121, 139, 0.28)",
      "--theme-glow-left": "rgba(232, 170, 122, 0.34)",
      "--theme-glow-right": "rgba(242, 99, 167, 0.2)",
      "--theme-title-gradient": "linear-gradient(135deg,#dc9b58,#f06d8d,#b04db1)",
      "--theme-button-gradient": "linear-gradient(135deg,#3a2018,#9a4b5f)",
      "--theme-panel-gradient": "linear-gradient(160deg,#fff4eb,#fae0d7 55%,#ffd9ef)",
      "--theme-download-gradient": "linear-gradient(135deg,#3c2118,#7f4e33 45%,#ac4f82)",
      "--theme-icon-gradient": "linear-gradient(135deg,#f2c586,#f39ac3)",
      "--theme-orb": "radial-gradient(circle at top left, rgba(255,216,179,0.58), transparent 36%), radial-gradient(circle at 82% 16%, rgba(245,112,176,0.2), transparent 28%), linear-gradient(180deg, rgba(255,247,242,0.92), rgba(248,231,217,0.3) 45%, transparent)",
      "--capabilities-overlay": "linear-gradient(90deg,rgba(255,246,241,0.88)_0%,rgba(252,239,232,0.74)_40%,rgba(251,227,238,0.42)_100%)",
      "--capabilities-sheen": "linear-gradient(180deg,rgba(255,255,255,0.14),rgba(248,217,233,0.26))",
      "--capabilities-card": "rgba(255,248,247,0.54)",
      "--capabilities-card-border": "rgba(255,255,255,0.64)",
      "--capabilities-card-shadow": "0 20px 50px rgba(169, 111, 126, 0.16)",
      "--capabilities-heading": "#351f1a",
      "--capabilities-copy": "#745752",
      "--capabilities-pill": "rgba(255,255,255,0.56)",
      "--capabilities-pill-text": "#855d67",
      "--capabilities-icon-bg": "linear-gradient(135deg,rgba(255,251,248,0.96),rgba(247,205,224,0.9))",
      "--capabilities-icon-text": "#a04f67",
    },
  },
  {
    name: "Pip",
    shortLabel: "Playful penguin",
    description: "A cheerful penguin built for cute reactions, gentle nudges, and playful little bursts of joy.",
    heroDescription:
      "Pip gives the app a cooler, brighter mood with soft wintery blues and warm golden pops around the interface.",
    heroImage: "/pip-hero.png",
    capabilitiesImage: "/pip-capabilites-image.png",
    petGif: "/pets/pip-idle.gif",
    capabilitiesTitle: "Soft, bright, and still surprisingly helpful.",
    capabilitiesDescription:
      "Pip brings an airy winter palette to the feature section, so the useful bits feel lighter, calmer, and a little more playful.",
    image: "/pip.png",
    theme: {
      "--background": "#edf2f8",
      "--foreground": "#18263d",
      "--rocky-bg": "#edf2f8",
      "--rocky-text": "#18263d",
      "--rocky-muted": "#5a6a82",
      "--rocky-section-label": "#3b6188",
      "--rocky-card": "rgba(255, 255, 255, 0.8)",
      "--rocky-panel": "rgba(245, 248, 252, 0.88)",
      "--rocky-outline": "rgba(31, 57, 91, 0.12)",
      "--rocky-chip-text": "#2a5177",
      "--rocky-selection": "rgba(73, 134, 197, 0.24)",
      "--theme-glow-left": "rgba(145, 172, 208, 0.32)",
      "--theme-glow-right": "rgba(255, 181, 51, 0.16)",
      "--theme-title-gradient": "linear-gradient(135deg,#344d78,#5a7db0,#f2a11f)",
      "--theme-button-gradient": "linear-gradient(135deg,#18263d,#355981)",
      "--theme-panel-gradient": "linear-gradient(160deg,#ffffff,#ebf3fb 55%,#dce7f4)",
      "--theme-download-gradient": "linear-gradient(135deg,#18263d,#30537b 45%,#d99122)",
      "--theme-icon-gradient": "linear-gradient(135deg,#adc4df,#ffcf70)",
      "--theme-orb": "radial-gradient(circle at top left, rgba(205,222,241,0.6), transparent 36%), radial-gradient(circle at 82% 16%, rgba(255,188,79,0.18), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.94), rgba(237,242,248,0.34) 45%, transparent)",
      "--capabilities-overlay": "linear-gradient(90deg,rgba(248,251,255,0.92)_0%,rgba(241,247,255,0.82)_38%,rgba(233,242,252,0.5)_100%)",
      "--capabilities-sheen": "linear-gradient(180deg,rgba(255,255,255,0.18),rgba(220,233,248,0.3))",
      "--capabilities-card": "rgba(255,255,255,0.58)",
      "--capabilities-card-border": "rgba(255,255,255,0.7)",
      "--capabilities-card-shadow": "0 20px 50px rgba(121, 151, 194, 0.14)",
      "--capabilities-heading": "#22324d",
      "--capabilities-copy": "#5f7390",
      "--capabilities-pill": "rgba(255,255,255,0.6)",
      "--capabilities-pill-text": "#4d6789",
      "--capabilities-icon-bg": "linear-gradient(135deg,rgba(255,255,255,0.95),rgba(210,226,246,0.9))",
      "--capabilities-icon-text": "#5877a0",
    },
  },
] as const;

export default function Home() {
  const [activePetIndex, setActivePetIndex] = useState(0);
  const [activePanel, setActivePanel] = useState<"home" | "capabilities" | "pets" | "download">("home");
  const activePet = pets[activePetIndex];

  const themeStyle = useMemo(
    () => activePet.theme as CSSProperties,
    [activePet.theme],
  );

  const panelBackground = activePanel === "capabilities"
    ? activePet.capabilitiesImage
    : activePet.heroImage;
  const cyclePet = (direction: number) => {
    setActivePetIndex((current) => (current + direction + pets.length) % pets.length);
  };

  return (
    <main
      style={themeStyle}
      className="relative h-screen overflow-hidden bg-[var(--rocky-bg)] text-[var(--rocky-text)] transition-[background-color,color] duration-500"
    >
      <AuthDock />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[42rem]"
        style={{ backgroundImage: "var(--theme-orb)" }}
      />
      <div
        className="pointer-events-none absolute left-[-6rem] top-44 h-56 w-56 rounded-full blur-3xl transition-colors duration-500"
        style={{ backgroundColor: "var(--theme-glow-left)" }}
      />
      <div
        className="pointer-events-none absolute right-[-5rem] top-[28rem] h-72 w-72 rounded-full blur-3xl transition-colors duration-500"
        style={{ backgroundColor: "var(--theme-glow-right)" }}
      />

      <section className="flex h-screen w-full flex-col pt-0">
        <div
          className="relative flex h-screen w-full items-end overflow-hidden px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12"
        >
          <div className="absolute inset-0">
            <motion.div
              key={`${activePet.name}-${activePanel}`}
              initial={{ opacity: 0.3, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <Image
                src={panelBackground}
                alt={`${activePet.name} ${activePanel} background`}
                fill
                priority
                className="object-cover object-center"
                sizes="100vw"
              />
            </motion.div>
            {activePanel === "capabilities" ? (
              <>
                <div className="absolute inset-0" style={{ background: "var(--capabilities-overlay)" }} />
                <div className="absolute inset-0" style={{ background: "var(--capabilities-sheen)" }} />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_28%,_rgba(24,16,10,0.56)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,18,10,0.4)_0%,transparent_14%,transparent_78%,rgba(28,18,10,0.4)_100%)]" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,11,8,0.82)_0%,rgba(17,11,8,0.58)_36%,rgba(17,11,8,0.22)_64%,rgba(17,11,8,0.08)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,6,5,0.3)_0%,rgba(8,6,5,0.18)_16%,rgba(14,9,7,0.34)_100%)]" />
              </>
            )}
          </div>

          <div className="relative z-10 flex min-h-[calc(100vh-4rem)] w-full flex-col">
            <div className="flex items-start justify-between gap-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActivePanel("home")}
                  className="flex h-20 w-20 items-center justify-center"
                >
                  <Image
                    src={activePet.image}
                    alt={`${activePet.name} icon`}
                    width={100}
                    height={100}
                    className="h-full w-full object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.28)]"
                    priority
                  />
                </button>
                <div>
                  <p
                    className="text-lg font-semibold"
                    style={{ color: activePanel === "capabilities" ? "var(--capabilities-heading)" : "#ffffff" }}
                  >
                    {activePet.name}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: activePanel === "capabilities" ? "var(--capabilities-copy)" : "rgba(255,255,255,0.72)" }}
                  >
                    The cutest desktop companion for workdays and late-night tabs.
                  </p>
                </div>
              </div>

              <div className="flex max-w-[46rem] flex-wrap items-center justify-end gap-2">
                <motion.button
                  type="button"
                  onClick={() => cyclePet(-1)}
                  aria-label="Show previous pet"
                  whileHover={{ y: -2, scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur transition"
                  style={{
                    borderColor: activePanel === "capabilities" ? "rgba(83, 67, 45, 0.18)" : "rgba(255,255,255,0.2)",
                    background: activePanel === "capabilities" ? "rgba(255,255,255,0.48)" : "rgba(255,255,255,0.12)",
                    color: activePanel === "capabilities" ? "var(--capabilities-heading)" : "#ffffff",
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => cyclePet(1)}
                  aria-label="Show next pet"
                  whileHover={{ y: -2, scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur transition"
                  style={{
                    borderColor: activePanel === "capabilities" ? "rgba(83, 67, 45, 0.18)" : "rgba(255,255,255,0.2)",
                    background: activePanel === "capabilities" ? "rgba(255,255,255,0.48)" : "rgba(255,255,255,0.12)",
                    color: activePanel === "capabilities" ? "var(--capabilities-heading)" : "#ffffff",
                  }}
                >
                  <ChevronRight className="h-5 w-5" />
                </motion.button>
                <div className="flex flex-wrap justify-end gap-2">
                  {panelTabs.map((tab) => {
                    const isActive = activePanel === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActivePanel(tab.id)}
                        className="rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur transition"
                        style={{
                          borderColor:
                            activePanel === "capabilities"
                              ? isActive
                                ? "rgba(83, 67, 45, 0.32)"
                                : "rgba(83, 67, 45, 0.16)"
                              : isActive
                                ? "rgba(255,255,255,0.5)"
                                : "rgba(255,255,255,0.18)",
                          background:
                            activePanel === "capabilities"
                              ? isActive
                                ? "rgba(255,255,255,0.64)"
                                : "rgba(255,255,255,0.38)"
                              : isActive
                                ? "rgba(255,255,255,0.22)"
                                : "rgba(255,255,255,0.1)",
                          color:
                            activePanel === "capabilities"
                              ? "var(--capabilities-heading)"
                              : isActive
                                ? "#ffffff"
                                : "rgba(255,255,255,0.78)",
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <motion.div
              key={`${activePet.name}-${activePanel}-content`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className=" flex flex-1 min-h-0 items-center pb-2"
            >
              {activePanel === "home" && (
                <div className="max-w-[46rem]">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/14 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.14)] backdrop-blur">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    {activePet.name}, desktop pet, tiny assistant, soft chaos manager.
                  </div>

                  <h1 className="max-w-4xl text-5xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
                    A desktop companion that feels{" "}
                    <span
                      className="bg-clip-text text-transparent"
                      style={{ backgroundImage: "var(--theme-title-gradient)" }}
                    >
                      helpful, adorable, and alive.
                    </span>
                  </h1>

                  <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82 sm:text-xl">
                    {activePet.heroDescription}
                  </p>

                  <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                    <motion.button
                      type="button"
                      onClick={() => setActivePanel("download")}
                      whileHover={{ y: -3, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex min-h-16 items-center justify-center gap-3 rounded-full px-6 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(37,24,49,0.26)] transition hover:shadow-[0_22px_48px_rgba(37,24,49,0.34)] sm:flex-none"
                      style={{ backgroundImage: "var(--theme-button-gradient)" }}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12">
                        <AppleIcon className="h-5 w-5" />
                      </span>
                      <span className="whitespace-nowrap">Download for macOS</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => setActivePanel("download")}
                      whileHover={{ y: -3, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex min-h-16 items-center justify-center gap-3 rounded-full border border-white/18 bg-white/14 px-6 py-4 text-base font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/18 sm:flex-none"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12">
                        <WindowsIcon className="h-5 w-5" />
                      </span>
                      <span className="whitespace-nowrap">Download for Windows</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => setActivePanel("pets")}
                      whileHover={{ y: -3, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex min-h-16 items-center justify-center rounded-full border border-white/18 bg-white/14 px-6 py-4 text-base font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/18 sm:flex-none"
                    >
                      <span className="whitespace-nowrap">Meet the pets</span>
                    </motion.button>
                  </div>
                </div>
              )}

              {activePanel === "capabilities" && (
                <div className="grid min-h-0 w-full items-start gap-8 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="max-w-[42rem] self-start  4">
                    <div
                      className="inline-block rounded-[2rem]  px-6 py-6 backdrop-blur-md"
                      style={{
                        background: "rgba(255,255,255,0.34)",
                        borderColor: "rgba(255,255,255,0.45)",
                        boxShadow: "0 18px 50px rgba(0,0,0,0.08)",
                      }}
                    >
                    <p className="text-sm font-semibold" style={{ color: "var(--capabilities-pill-text)" }}>
                      Capabilities
                    </p>
                    <h2 className="mt-4 text-4xl font-black sm:text-5xl lg:text-6xl" style={{ color: "var(--capabilities-heading)" }}>
                      {activePet.capabilitiesTitle}
                    </h2>
                    <p className="mt-5 max-w-xl text-base leading-8 sm:text-lg" style={{ color: "var(--capabilities-copy)" }}>
                      {activePet.capabilitiesDescription}
                    </p>
                  
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {capabilities.map((capability, index) => (
                        <motion.article
                          key={capability.title}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="rounded-[1.6rem]  px-5 py-4 backdrop-blur-md"
                          style={{
                            background: "var(--capabilities-card)",
                            borderColor: "var(--capabilities-card-border)",
                            boxShadow: "var(--capabilities-card-shadow)",
                          }}
                        >
                          <div className="mb-2 text-sm font-bold" style={{ color: "var(--capabilities-icon-text)" }}>
                            {capability.title}
                          </div>
                          <p className="text-sm leading-6" style={{ color: "var(--capabilities-copy)" }}>
                            {capability.description}
                          </p>
                        </motion.article>
                      ))}
                    </div>
                  </div>

                  <div className="relative hidden min-h-[34rem] lg:flex items-end justify-center">
                    <motion.div
                      key={`${activePet.name}-capability-character`}
                      initial={{ opacity: 0, y: 16, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="relative"
                    >
                      <div className="absolute inset-x-10 bottom-4 h-10 rounded-full bg-black/12 blur-2xl" />
                    
                    </motion.div>
                  </div>
                </div>
              )}

              {activePanel === "pets" && (
                <div className="mx-auto grid w-full max-w-7xl gap-5 self-end md:grid-cols-3">
                  {pets.map((pet, index) => {
                    const isActive = index === activePetIndex;

                    return (
                      <article
                        key={pet.name}
                        className={`overflow-hidden rounded-[2rem]  transition ${
                          isActive ? "border-white/55" : "border-white/18 hover:border-white/30"
                        }`}
                      >
                        <div className="relative flex min-h-44 items-center justify-center overflow-hidden">
                          <Image
                            src={pet.petGif}
                            alt={pet.name}
                            width={220}
                            height={220}
                            unoptimized
                            className="relative z-10 h-36 w-auto object-contain drop-shadow-[0_22px_30px_rgba(0,0,0,0.18)]"
                          />
                        </div>
                        <div className="p-5 text-white">
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="text-2xl font-black">{pet.name}</h3>
                            <button
                              type="button"
                              onClick={() => setActivePetIndex(index)}
                              className="rounded-full border border-white/18 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40"
                            >
                              {isActive ? "Selected" : "Preview"}
                            </button>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-white/68">{pet.shortLabel}</p>
                          <p className="mt-3 text-sm leading-6 text-white/82">{pet.description}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {activePanel === "download" && (
                <div
                  className="mx-auto max-w-5xl self-end overflow-hidden rounded-[2.4rem] border border-white/18 px-8 py-8 text-white shadow-[0_22px_70px_rgba(26,20,38,0.28)] sm:px-10 lg:px-12"
                  style={{ backgroundImage: "var(--theme-download-gradient)" }}
                >
                  <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                    <div>
                      <p className="text-sm font-semibold text-white/55">Download {activePet.name}</p>
                      <h2 className="mt-4 max-w-2xl text-4xl font-black sm:text-5xl">Bring a tiny desktop creature home.</h2>
                      <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">
                        Start with {activePet.name} today and switch between the full pet lineup whenever you want your desktop companion to feel more grounded, softer, or more playful.
                      </p>
                    </div>
                    <div className="grid gap-4">
                      <a href="#" className="inline-flex items-center justify-between rounded-[1.6rem] border border-white/15 bg-white/8 px-5 py-5 transition hover:bg-white/12">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                            <AppleIcon className="h-6 w-6" />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-white/60">Available now</p>
                            <p className="text-2xl font-bold">Download for macOS</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-white/12 px-3 py-1 text-sm font-semibold">DMG</span>
                      </a>
                      <a href="#" className="inline-flex items-center justify-between rounded-[1.6rem] border border-white/12 bg-black/10 px-5 py-5 transition hover:bg-black/16">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                            <WindowsIcon className="h-6 w-6" />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-white/55">Also available</p>
                            <p className="mt-1 text-2xl font-bold">Download for Windows</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/80">EXE</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
            </div>
          </div>
      </section>
    </main>
  );
}
