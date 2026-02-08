import React from "react";
import Head from "next/head";
import { Cinzel, Permanent_Marker, Orbitron, Exo_2 } from "next/font/google";
import dynamic from "next/dynamic";
import Galaxy from "../components/Galaxy";
import DecryptedText from "../components/DecryptedText";
import FuzzyText from "../components/FuzzyText";

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

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>OnlyTruth – The world&apos;s first combined and most accurate source of TRUTH</title>
      </Head>
      <div className={`${cinzel.variable} ${orbitron.variable} ${exo2.variable} min-h-screen bg-[#0a0a0b] text-white antialiased relative overflow-hidden font-sans`} style={{ fontFamily: "var(--font-exo), system-ui, sans-serif" }}>
        {/* Galaxy background – same as index, with more stars (higher density) */}
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
        {/* Dark overlay for content readability – same as index */}
        <div className="fixed inset-0 z-0 pointer-events-none bg-[#0a0a0b]/40" />

        {/* Grid overlay */}
        <div className="landing-grid-overlay fixed inset-0 z-0 pointer-events-none opacity-[0.12]" />

        {/* Neon edge lines: left pink, right blue, bottom-left green */}
        <div className="landing-neon-edges fixed inset-0 z-0 pointer-events-none">
          <div aria-hidden />
        </div>

        <main className="relative z-10 flex flex-col min-h-screen">
          {/* Hero – model overlaps TRUTH like astronaut over DESTINY */}
          <section className="flex-1 relative flex flex-col items-center justify-center px-6 pt-4 pb-8 text-center min-h-[85vh]">
            <div className="relative w-full max-w-2xl flex flex-col space-y-4 text-white tracking-tight text-center items-center -mt-[30vh]" style={{ fontFamily: "var(--font-cinzel), serif" }}>
              <h1 className="animate-item text-3xl md:text-4xl lg:text-5xl leading-[1.2] font-light relative z-0">
                <FuzzyText baseIntensity={0.05} hoverIntensity={0.5} enableHover fontSize="clamp(1.5rem, 5vw, 2.75rem)" fontWeight={300} className="block mx-auto text-center mb-2">
                  The world&apos;s first combined and
                </FuzzyText>
                <FuzzyText baseIntensity={0.05} hoverIntensity={0.5} enableHover fontSize="clamp(1.5rem, 5vw, 2.75rem)" fontWeight={300} className="block mx-auto text-center">
                  most accurate source of
                </FuzzyText>
              </h1>
            </div>
            {/* TRUTH in its own div, always on top (above the model) */}
            <div className="relative z-20 w-full max-w-2xl flex justify-center mt-[6vh]" style={{ fontFamily: "var(--font-cinzel), serif" }}>
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
            {/* Model behind TRUTH (z-10) */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-full max-w-4xl mt-[28vh] flex justify-center pointer-events-none" style={{ height: "min(560px, 68vh)" }}>
                <BuddhaGLB src="/buddha5.glb" height={560} className="rounded-lg overflow-hidden" />
              </div>
            </div>
          </section>

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
        `}</style>
      </div>
    </>
  );
}
