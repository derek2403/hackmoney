import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { Cinzel } from "next/font/google";
import gsap from "gsap";

const cinzel = Cinzel({
    subsets: ["latin"],
    weight: ["400", "700", "900"],
    variable: "--font-cinzel",
});

const Card = ({ className = "", imageSrc }: { className?: string; imageSrc?: string }) => (
    <div className={`relative w-48 h-72 group ${className}`}>
        {/* Stack effect layers with blur */}
        <div className="absolute inset-0 translate-x-1 translate-y-1 bg-white/10 rounded-lg border border-white/5 blur-[2px]" />
        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-white/5 rounded-lg blur-[1px]" />

        {/* Main Card Body with enhanced blur shadow */}
        <div className="absolute inset-0 bg-[#fdfaf3] rounded-lg shadow-2xl overflow-hidden shadow-black/80 border border-white/20 backdrop-blur-sm">

            {/* Texture/Noise */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-10" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }} />

            {/* Card Image */}
            {imageSrc && (
                <div className="absolute inset-0">
                    <Image
                        src={imageSrc}
                        alt="Card content"
                        fill
                        className="object-cover"
                    />
                </div>
            )}
        </div>
    </div>
);

const Deck = ({ className = "" }: { className?: string }) => (
    <div className={`relative w-48 h-72 ${className} group/deck`}>
        {/* Glowing effect layers - MAXIMUM VISIBILITY */}
        <div className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-br from-amber-300/70 via-yellow-200/70 to-orange-300/70 blur-3xl opacity-90 group-hover/deck:opacity-100 transition-opacity duration-500 animate-pulse-glow" />
        <div className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-br from-amber-400/60 via-yellow-300/60 to-orange-400/60 blur-4xl opacity-95 group-hover/deck:opacity-100 transition-opacity duration-500 animate-pulse-glow-slow" />
        <div className="absolute inset-0 -z-10 rounded-lg bg-amber-300/50 blur-[120px] opacity-90 animate-pulse-glow-slow" />

        {/* Generate a thick stack effect using multiple layers with blur */}
        {[...Array(12)].map((_, i) => (
            <div
                key={i}
                className="absolute inset-0 rounded-lg border border-black/10"
                style={{
                    transform: `translate(${i * 0.5}px, ${i * 0.5}px)`,
                    backgroundColor: i === 11 ? '#fdfaf3' : `hsl(45, 20%, ${90 - (i * 2)}%)`,
                    zIndex: 10 - i,
                    filter: i < 11 ? 'blur(0.5px)' : 'none'
                }}
            />
        ))}
        {/* Main top card with cover image and enhanced glow shadow */}
        <Card
            imageSrc="/cards/cover.png"
            className="shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85),0_0_60px_rgba(251,191,36,0.6),0_0_90px_rgba(251,191,36,0.3)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.9),0_0_100px_rgba(251,191,36,0.8),0_0_140px_rgba(251,191,36,0.4)] hover:-translate-y-3 hover:scale-105 transition-all duration-500 cursor-pointer relative z-20"
        />
    </div>
);

export default function Home() {
    const cardsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!cardsRef.current) return;

        const items = cardsRef.current.querySelectorAll('.animate-item');
        gsap.set(items, { opacity: 0, scale: 0.8, y: 30 });

        gsap.to(items, {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1.2,
            stagger: 0.1,
            ease: "expo.out",
            delay: 0.3
        });
    }, []);

    return (
        <div className={`${cinzel.variable} min-h-screen bg-[#0a0a0b] text-[#e0e0e0] font-serif selection:bg-amber-500/30 relative overflow-hidden`}>
            {/* Background elements for depth */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[#0a0a0b]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(45,45,55,0.2)_0%,transparent_70%)]" />
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }} />
            </div>

            {/* Expanded Background Image + Gradient Merge */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="relative w-full h-full">
                    {/* The Star Image - Massive Scale */}
                    <div className="absolute inset-0 translate-x-[15%] lg:translate-x-[20%] scale-[1.3] lg:scale-[1.5]">
                        <Image
                            src="/star.png"
                            alt="The Davincci Geometry"
                            fill
                            className="object-contain opacity-70"
                            priority
                        />
                    </div>

                    {/* Dark Background Overlay for the left side - Shifted left to reveal more stars */}
                    <div className="absolute inset-y-0 left-0 w-[50%] bg-gradient-to-r from-[#0a0a0b] via-[#0a0a0b] to-transparent z-1" />
                    <div className="absolute inset-0 bg-[#0a0a0b]/10 z-2" />
                </div>
            </div>

            <main className="relative z-10 container mx-auto px-6 lg:px-12 min-h-screen flex items-center">
                <div className="flex flex-col lg:flex-row w-full items-center justify-between">
                    {/* Left Side: Big Tagline */}
                    <div className="w-full lg:w-1/2 flex flex-col space-y-4 py-20 lg:py-0 text-white tracking-tight">
                        <h1 className="animate-item text-3xl md:text-4xl lg:text-5xl leading-[1.2] font-light">
                            The world&apos;s first combined and<br />
                            most accurate source of<br />
                            <span className={`${cinzel.className} text-white font-black tracking-widest text-5xl md:text-6xl lg:text-7xl block mt-4 mb-2 uppercase`}>
                                TRUTH
                            </span>
                        </h1>
                        <div className="mt-8" />

                        {/* Shape-shifting Enter Button */}
                        <div className="animate-item flex">
                            <button className={`
                                group relative px-10 py-3 bg-white text-black font-black tracking-widest text-sm
                                transition-all duration-500 ease-in-out
                                [clip-path:polygon(10px_0%,calc(100%-10px)_0%,100%_50%,calc(100%-10px)_100%,10px_100%,0%_50%)]
                                hover:[clip-path:polygon(0%_0%,100%_0%,100%_100%,100%_100%,0%_100%,0%_100%)]
                                hover:rounded-sm
                                ${cinzel.className}
                            `}>
                                ENTER
                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </button>
                        </div>
                    </div>

                    {/* Right Side: Shared container for Stage and Deck */}
                    <div className="w-full lg:w-1/2 flex items-center justify-center relative translate-x-0 lg:-translate-x-8 transition-transform duration-700">
                        {/* Central Stage (The 4 Cards) */}
                        <div className="animate-item relative w-full max-w-[600px] aspect-square flex items-center justify-center">
                            <div className="relative w-full h-full">
                                {/* Top Middle Card - Trending */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[105%]">
                                    <Card imageSrc="/cards/trending.png" className="hover:-translate-y-2 transition-transform duration-300 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.9)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.95)]" />
                                </div>

                                {/* Bottom Row: Politics, Crypto, Tech */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[15%] flex gap-6">
                                    <Card imageSrc="/cards/politics.png" className="hover:-translate-y-2 transition-transform duration-300 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.9)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.95)]" />
                                    <Card imageSrc="/cards/crypto.png" className="hover:-translate-y-2 transition-transform duration-300 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.9)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.95)]" />
                                    <Card imageSrc="/cards/tech.png" className="hover:-translate-y-2 transition-transform duration-300 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.9)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.95)]" />
                                </div>
                            </div>
                        </div>

                        {/* Deck of Cards (Far Right) */}
                        <div className="animate-item absolute right-0 lg:-right-12 top-1/2 -translate-y-[105%]">
                            <Deck className="scale-90 opacity-80 hover:opacity-100 hover:scale-100 transition-all duration-500" />
                        </div>
                    </div>
                </div>
            </main>

            <GlobalStyles />
        </div>
    );
}
// Global styles for custom animations and components
const GlobalStyles = () => (
    <style jsx global>{`
        .vertical-text {
            writing-mode: vertical-rl;
        }
        @keyframes subtle-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        @keyframes pulse-glow {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes pulse-glow-slow {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 0.95; transform: scale(1.12); }
        }
        .animate-pulse-glow {
            animation: pulse-glow 2s ease-in-out infinite;
        }
        .animate-pulse-glow-slow {
            animation: pulse-glow-slow 3s ease-in-out infinite;
        }
        body {
            background: #0a0a0b;
        }
    `}</style>
);
