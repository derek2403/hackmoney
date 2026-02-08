import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { Audiowide, Cinzel, Permanent_Marker, Orbitron, Exo_2 } from "next/font/google";
import dynamic from "next/dynamic";
import gsap from "gsap";
import Galaxy from "../components/Galaxy";
import DecryptedText from "../components/DecryptedText";
import FuzzyText from "../components/FuzzyText";
import TrueFocus from "../components/TrueFocus";
import CountUp from "../components/CountUp";

const BuddhaGLB = dynamic(() => import("../components/BuddhaGLB"), { ssr: false });

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-cinzel",
});

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
});

const exo2 = Exo_2({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-exo",
});

const audiowide = Audiowide({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-audiowide",
});

const Card = ({ className = "", imageSrc }: { className?: string; imageSrc?: string }) => (
  <div className={`relative w-48 h-72 group ${className}`}>
    <div className="absolute inset-0 translate-x-1 translate-y-1 bg-white/10 rounded-lg border border-white/5 blur-[2px]" />
    <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-white/5 rounded-lg blur-[1px]" />
    <div className="absolute inset-0 bg-[#fdfaf3] rounded-lg shadow-2xl overflow-hidden shadow-black/80 border border-white/20 backdrop-blur-sm">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-10" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }} />
      {imageSrc && (
        <div className="absolute inset-0">
          <Image src={imageSrc} alt="Card content" fill className="object-cover" />
        </div>
      )}
    </div>
  </div>
);

const CARD_POOL = [
  "/cards/trending.png",
  "/cards/politics.png",
  "/cards/crypto.png",
  "/cards/tech.png",
  "/cards/cover.png",
];

const THREE_CARDS = ["/cards/tradewar.png", "/cards/iranwar.png", "/cards/uselection.png"];
const IRAN_WAR_MARKETS = [
  { image: "/US%20Iran.jpg", alt: "US Iran", name: "US strikes Iran by January 31?", odds: 60 },
  { image: "/Khamenei.jpg", alt: "Khamenei", name: "Khamenei out as Supreme Leader of Iran by January 31?", odds: 70 },
  { image: "/israeliran.jpg", alt: "Israel Iran", name: "Israel next strikes Iran by January 31?", odds: 50 },
];

type ViewPhase = "intro" | "transitioning" | "cards";

export default function LandingPage() {
  const router = useRouter();
  const cardsRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const topCardSlotRef = useRef<HTMLDivElement>(null);
  const bottomRowRef = useRef<HTMLDivElement>(null);
  const threeCardsRowRef = useRef<HTMLDivElement>(null);

  const [displayedCards, setDisplayedCards] = React.useState([
    "/cards/trending.png",
    "/cards/politics.png",
    "/cards/crypto.png",
    "/cards/tech.png",
  ]);
  const [selectedCardIndex, setSelectedCardIndex] = React.useState<number | null>(null);
  const [promotingFromIndex, setPromotingFromIndex] = React.useState<number | null>(null);
  const [layoutMode, setLayoutMode] = React.useState<"four" | "three">("four");
  const [animateNewBottomRow, setAnimateNewBottomRow] = React.useState(false);
  const [phase, setPhase] = React.useState<ViewPhase>("intro");
  const cardsVisible = phase === "cards";
  const [mounted, setMounted] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  useEffect(() => setMounted(true), []);

  // When transitioning: tagline smoothly minimises then switch to cards
  useEffect(() => {
    if (phase !== "transitioning" || !taglineRef.current) return;
    gsap.to(taglineRef.current, {
      opacity: 0,
      scale: 0,
      duration: 0.5,
      ease: "power2.in",
      transformOrigin: "center center",
      onComplete: () => setPhase("cards"),
    });
  }, [phase]);

  // Politics clicked: all 4 cards minimise, then show 3 cards
  useEffect(() => {
    if (promotingFromIndex !== 1 || !cardsRef.current) return;
    const cardEls = cardsRef.current.querySelectorAll(".card-display");
    if (cardEls.length < 4) return;
    gsap.to(cardEls, {
      opacity: 0,
      scale: 0,
      duration: 0.65,
      ease: "power2.in",
      transformOrigin: "center center",
      overwrite: true,
      onComplete: () => {
        setDisplayedCards(THREE_CARDS);
        setLayoutMode("three");
        setPromotingFromIndex(null);
        setSelectedCardIndex(null);
        setAnimateNewBottomRow(true);
      },
    });
  }, [promotingFromIndex]);

  // Three-card row pop-out
  useEffect(() => {
    if (!animateNewBottomRow || layoutMode !== "three" || !threeCardsRowRef.current) return;
    const children = Array.from(threeCardsRowRef.current.children) as HTMLElement[];
    if (children.length === 0) return;
    gsap.set(children, { opacity: 0, y: 40, scale: 0.88 });
    gsap.to(children, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.7,
      ease: "back.out(1.05)",
      onComplete: () => setAnimateNewBottomRow(false),
    });
  }, [animateNewBottomRow, layoutMode]);

  // Cards view entrance
  useEffect(() => {
    if (phase !== "cards" || !cardsRef.current) return;
    const container = cardsRef.current;
    const cardEls = container.querySelectorAll(".card-display");
    gsap.set(container, { opacity: 0 });
    gsap.set(cardEls, { opacity: 0, scale: 0.88 });
    gsap.set(cardEls[0], { y: 0 });
    gsap.set(Array.from(cardEls).slice(1), { y: 40 });
    const tl = gsap.timeline({ delay: 0.15 });
    tl.to(container, { opacity: 1, duration: 0.4, ease: "power2.out" });
    tl.to(cardEls, { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.12, ease: "back.out(1.05)" }, 0.1);
  }, [phase]);

  const onFindOutTruthClick = () => {
    if (phase === "intro") setPhase("transitioning");
  };

  return (
    <>
      <Head>
        <title>OnlyTruth – The world&apos;s first combined and most accurate source of TRUTH</title>
      </Head>
      <div className={`${cinzel.variable} ${orbitron.variable} ${exo2.variable} ${audiowide.variable} min-h-screen bg-[#0a0a0b] text-white antialiased relative overflow-hidden font-sans`} style={{ fontFamily: "var(--font-exo), system-ui, sans-serif" }}>
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
          <Galaxy
            mouseRepulsion
            mouseInteraction
            density={1.1}
            glowIntensity={0.2}
            saturation={0.4}
            hueShift={140}
            twinkleIntensity={0.9}
            rotationSpeed={0.05}
            repulsionStrength={8}
            autoCenterRepulsion={0}
            starSpeed={0.3}
            speed={0.3}
          />
        </div>
        <div className="fixed inset-0 z-0 pointer-events-none bg-[#0a0a0b]/40" />
        <div className="landing-grid-overlay fixed inset-0 z-0 pointer-events-none opacity-[0.12]" />
        <div className="landing-neon-edges fixed inset-0 z-0 pointer-events-none">
          <div aria-hidden />
        </div>

        <main className="relative z-10 flex flex-col min-h-screen container mx-auto px-6 lg:px-12 py-12">
          <div className="flex flex-col w-full items-center gap-16 lg:gap-20 flex-1">
            {/* Intro: everything waits for model to load, then content fades in */}
            {phase !== "cards" && (
              <div
                ref={taglineRef}
                className="flex-1 relative w-full min-h-[85vh] flex flex-col items-center justify-center px-6 pt-4 pb-8 text-center"
              >
                {/* Content (tagline, TRUTH, button) hidden until model ready */}
                <div
                  className={`relative z-20 transition-opacity duration-500 ${modelReady ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                  aria-hidden={!modelReady}
                >
                  <div className="relative w-full max-w-2xl flex flex-col space-y-4 text-white tracking-tight text-center items-center -mt-[30vh]" style={{ fontFamily: "var(--font-cinzel), serif" }}>
                    <h1 className="animate-item text-3xl md:text-4xl lg:text-5xl leading-[1.2] font-light relative z-0">
                      <FuzzyText baseIntensity={0.05} hoverIntensity={0.5} enableHover fontSize="clamp(1.5rem, 5vw, 2.75rem)" fontWeight={300} className="block mx-auto text-center mb-4">
                        The world&apos;s first combined and
                      </FuzzyText>
                      <FuzzyText baseIntensity={0.05} hoverIntensity={0.5} enableHover fontSize="clamp(1.5rem, 5vw, 2.75rem)" fontWeight={300} className="block mx-auto text-center">
                        most accurate source of
                      </FuzzyText>
                    </h1>
                  </div>
                  <div className="relative w-full max-w-2xl flex justify-center mt-[6vh]" style={{ fontFamily: "var(--font-cinzel), serif" }}>
                    <DecryptedText
                      text="TRUTH"
                      animateOn="view"
                      revealDirection="start"
                      sequential
                      speed={100}
                      maxIterations={500}
                      className={`${permanentMarker.className} text-white font-black tracking-widest`}
                      parentClassName={`${permanentMarker.className} text-white font-black tracking-widest text-5xl md:text-6xl lg:text-8xl block uppercase text-center`}
                    />
                  </div>
                </div>
                {/* Model: loads first; onLoad reveals content above */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-full max-w-4xl mt-[28vh] flex justify-center" style={{ height: "min(560px, 68vh)", minHeight: 560 }}>
                    {mounted ? (
                      <BuddhaGLB
                        src="/buddha5.glb"
                        height={560}
                        className="rounded-lg overflow-hidden"
                        onLoad={() => setModelReady(true)}
                      />
                    ) : (
                      <div className="w-full rounded-lg overflow-hidden flex items-center justify-center bg-white/5" style={{ height: 560 }}>
                        <span className="text-white/50 text-sm">Loading…</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Find out the Truth – visible only after model ready (Audiowide font) */}
                <button
                  type="button"
                  onClick={onFindOutTruthClick}
                  className={`${audiowide.className} absolute bottom-[20vh] left-0 right-0 z-20 flex justify-center text-white/90 cursor-pointer border-0 bg-transparent p-0 transition-opacity duration-500 ${modelReady ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                  style={{ fontWeight: 400 }}
                  aria-hidden={!modelReady}
                >
                  <div className="text-lg md:text-xl font-normal tracking-wide hover:text-white transition-colors">
                    <TrueFocus
                      sentence="Find out the Truth"
                      manualMode={false}
                      blurAmount={5}
                      borderColor="#24b8cc"
                      animationDuration={0.5}
                      pauseBetweenAnimations={1}
                    />
                  </div>
                </button>
              </div>
            )}

            {/* Cards view – same as index (four cards or three after Politics) */}
            {cardsVisible && (
              <div className={`w-full relative ${layoutMode === "three" ? "flex-1 flex flex-col items-center justify-center -translate-y-40" : "flex items-center justify-center"}`}>
                {layoutMode === "four" && (
                  <div ref={cardsRef} className="animate-item relative w-full max-w-[600px] aspect-square flex items-center justify-center">
                    <div className="relative w-full h-full">
                      <div
                        ref={topCardSlotRef}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedCardIndex((i) => (i === 0 ? null : 0))}
                        onKeyDown={(e) => e.key === "Enter" && setSelectedCardIndex((i) => (i === 0 ? null : 0))}
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[105%] cursor-pointer rounded-lg transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b] ${selectedCardIndex === 0 ? "ring-2 ring-purple-600 ring-offset-2 ring-offset-[#0a0a0b] scale-105 z-10" : ""}`}
                      >
                        <Card imageSrc={displayedCards[0]} className="card-display animate-breathing hover:-translate-y-6 transition-transform duration-300 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.9)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.95)]" />
                      </div>
                      <div ref={bottomRowRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[15%] flex gap-6">
                        {[1, 2, 3].map((idx) => (
                          <div
                            key={idx}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (idx === 1 && displayedCards[1] === "/cards/politics.png") setPromotingFromIndex(1);
                              else setSelectedCardIndex((i) => (i === idx ? null : idx));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (idx === 1 && displayedCards[1] === "/cards/politics.png") setPromotingFromIndex(1);
                                else setSelectedCardIndex((i) => (i === idx ? null : idx));
                              }
                            }}
                            className={`cursor-pointer rounded-lg transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b] ${selectedCardIndex === idx ? "ring-2 ring-purple-600 ring-offset-2 ring-offset-[#0a0a0b] scale-105 z-10 -translate-y-6" : "hover:-translate-y-6"}`}
                          >
                            <Card imageSrc={displayedCards[idx]} className="card-display animate-breathing transition-transform duration-300 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.9)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.95)]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {layoutMode === "three" && (
                  <div ref={threeCardsRowRef} className="flex items-center justify-center gap-6 w-full max-w-[700px]">
                    {[0, 1, 2].map((idx) => (
                      <div key={idx} className={`relative ${idx === 1 ? "group/middle" : ""}`}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (idx === 1) router.push("/IranWar");
                            else setSelectedCardIndex((i) => (i === idx ? null : idx));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (idx === 1) router.push("/IranWar");
                              else setSelectedCardIndex((i) => (i === idx ? null : idx));
                            }
                          }}
                          className={`group/card relative overflow-hidden rounded-lg cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b] transition-transform duration-300 ease-out ${selectedCardIndex === idx ? "ring-2 ring-purple-600 ring-offset-2 ring-offset-[#0a0a0b] scale-105 z-10 -translate-y-6" : "hover:-translate-y-6"}`}
                          style={animateNewBottomRow ? { opacity: 0, transform: "translateY(40px) scale(0.88)" } : undefined}
                        >
                          <Card imageSrc={displayedCards[idx]} className="card-display animate-breathing transition-transform duration-300 ease-out shadow-[0_35px_70px_-15px_rgba(0,0,0,0.9)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.95)]" />
                          <div className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center bg-white/5 backdrop-blur-md border border-white/20">
                            <span className="text-sm font-bold text-white/95 drop-shadow-md px-3 text-center">Click to enter market</span>
                          </div>
                        </div>
                        {idx === 1 && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-6 flex gap-8 opacity-0 pointer-events-none group-hover/middle:opacity-100 group-hover/middle:pointer-events-auto transition-opacity duration-300 z-20">
                            {IRAN_WAR_MARKETS.map((m) => (
                              <a key={m.alt} href={m.image} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center w-44 shrink-0 group/img animate-breathing">
                                <div className="rounded-lg overflow-hidden border-2 border-white/20 shadow-xl group-hover/img:border-purple-500/50 transition-colors w-44 h-56">
                                  <Image src={m.image} alt={m.alt} width={176} height={224} className="w-full h-full object-cover" />
                                </div>
                                <p className="mt-2 text-sm font-semibold text-white/90 leading-tight w-44 line-clamp-3 text-center">{m.name}</p>
                                <p className="mt-1 text-lg font-bold text-purple-400 text-center flex items-center justify-center gap-0.5">
                                  Odds: <CountUp from={0} to={m.odds} direction="up" duration={1} startWhen className="count-up-text" />%
                                </p>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <style jsx global>{`
          .landing-grid-overlay {
            background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
            background-size: 40px 40px;
          }
          .landing-neon-edges::before,
          .landing-neon-edges::after,
          .landing-neon-edges > div {
            position: absolute;
            pointer-events: none;
          }
          .landing-neon-edges::before {
            content: "";
            left: 0;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(180deg, transparent, #ff2a6d, #d9047f, transparent);
            box-shadow: 0 0 12px #ff2a6d, 0 0 24px #ff2a6d40;
          }
          .landing-neon-edges::after {
            content: "";
            right: 0;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(180deg, transparent, #05d9e8, #00f5ff, transparent);
            box-shadow: 0 0 12px #05d9e8, 0 0 24px #05d9e840;
          }
          .landing-neon-edges > div {
            left: 0;
            bottom: 0;
            width: 120px;
            height: 2px;
            background: linear-gradient(90deg, #00ff87, #00ff8740, transparent);
            box-shadow: 0 0 12px #00ff87, 0 0 24px #00ff8740;
          }
          @keyframes breath {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
          .animate-breathing {
            animation: breath 2.5s ease-in-out infinite;
          }
        `}</style>
      </div>
    </>
  );
}
