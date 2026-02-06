import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { Cinzel, Inter } from "next/font/google";
import gsap from "gsap";

const cinzel = Cinzel({
    subsets: ["latin"],
    weight: ["400", "700", "900"],
    variable: "--font-cinzel",
});

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

const Card = ({ className = "" }: { className?: string }) => (
    <div className={`relative w-40 h-60 group ${className}`}>
        {/* Stack effect layers */}
        <div className="absolute inset-0 translate-x-1 translate-y-1 bg-white/10 rounded-lg border border-white/5 blur-[1px]" />

        {/* Main Card Body */}
        <div className="absolute inset-0 bg-[#fdfaf3] rounded-lg shadow-2xl overflow-hidden shadow-black/80 border border-white/20">
            {/* Golden Inner Border */}
            <div className="absolute inset-[5px] border border-[#d4af37]/40 rounded-[7px]" />
            <div className="absolute inset-[7px] border border-[#d4af37]/20 rounded-[5px]" />

            {/* Texture/Noise */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }} />

            {/* Card Content Placeholder */}
            <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-black/10">
                <div className="w-10 h-10 border border-current rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 border border-current" />
                </div>
            </div>
        </div>
    </div>
);

const Deck = ({ className = "" }: { className?: string }) => (
    <div className={`relative w-40 h-60 ${className}`}>
        {/* Generate a thick stack effect using multiple layers */}
        {[...Array(12)].map((_, i) => (
            <div
                key={i}
                className="absolute inset-0 rounded-lg border border-black/10"
                style={{
                    transform: `translate(${i * 0.5}px, ${i * 0.5}px)`,
                    backgroundColor: i === 11 ? '#fdfaf3' : `hsl(45, 20%, ${90 - (i * 2)}%)`,
                    zIndex: 10 - i
                }}
            />
        ))}
        {/* Main top card with custom shadow to bridge the stack */}
        <Card className="shadow-xl hover:-translate-y-2 hover:-translate-x-0.5 transition-all duration-300 cursor-pointer relative z-20" />
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
        <div className={`${cinzel.variable} ${inter.variable} min-h-screen bg-[#0a0a0b] text-[#e0e0e0] font-sans selection:bg-amber-500/30 relative overflow-hidden`}>
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
                <div ref={cardsRef} className="flex flex-col lg:flex-row w-full items-center justify-between">
                    {/* Left Side: Empty container for future content */}
                    <div className="w-full lg:w-1/2 flex flex-col space-y-8 py-20 lg:py-0">
                        {/* Content will be added here */}
                    </div>

                    {/* Right Side: Shared container for Stage and Deck */}
                    <div className="w-full lg:w-1/2 flex items-center justify-center relative translate-x-0 lg:-translate-x-8 transition-transform duration-700">
                        {/* Central Stage (The 4 Cards) */}
                        <div className="animate-item relative w-full max-w-[600px] aspect-square flex items-center justify-center">
                            <div className="relative w-full h-full">
                                {/* Top Middle Card */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[105%]">
                                    <Card className="hover:-translate-y-2 transition-transform duration-300 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]" />
                                </div>

                                {/* Bottom Row: Left, Middle, Right */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[15%] flex gap-6">
                                    <Card className="hover:-translate-y-2 transition-transform duration-300 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]" />
                                    <Card className="hover:-translate-y-2 transition-transform duration-300 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]" />
                                    <Card className="hover:-translate-y-2 transition-transform duration-300 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]" />
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
        body {
            background: #0a0a0b;
        }
    `}</style>
);
