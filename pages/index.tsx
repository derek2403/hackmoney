import React from "react";
import Image from "next/image";
import { Cinzel, Inter } from "next/font/google";

const cinzel = Cinzel({
    subsets: ["latin"],
    weight: ["400", "700", "900"],
    variable: "--font-cinzel",
});

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export default function Home() {
    return (
        <div className={`${cinzel.variable} ${inter.variable} min-h-screen bg-[#0a0a0b] text-[#e0e0e0] font-sans selection:bg-amber-500/30`}>
            {/* Background elements for depth */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(45,45,55,0.15)_0%,transparent_70%)]" />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
            </div>

            <main className="relative z-10 container mx-auto px-6 lg:px-12 flex flex-col lg:flex-row min-h-screen items-center justify-between py-20 lg:py-0">
                {/* Left Side: Empty container for future content */}
                <div className="w-full lg:w-1/2 flex flex-col space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
                    {/* Content removed per user request */}
                </div>

                {/* Right Side: Image */}
                <div className="w-full lg:w-1/2 flex items-center justify-center relative mt-16 lg:mt-0 animate-in fade-in zoom-in-95 duration-1000 delay-300">
                    {/* Decorative glows around the image */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[500px] max-h-[500px] bg-amber-500/20 blur-[100px] rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border border-amber-500/10 rounded-full animate-[spin_20s_linear_infinite]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] border border-white/5 rounded-full animate-[spin_30s_linear_infinite_reverse]" />

                    <div className="relative z-10 w-full max-w-[600px] aspect-square rounded-full overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/5 ring-1 ring-white/10">
                        <Image
                            src="/star.png"
                            alt="The Davincci Geometry"
                            fill
                            className="object-cover opacity-90 scale-105"
                            priority
                        />
                    </div>
                </div>
            </main>

            {/* Bottom Nav / Socials */}
            <footer className="fixed bottom-0 left-0 w-full p-8 z-20 flex justify-between items-end pointer-events-none">

            </footer>

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
    `}</style>
);
