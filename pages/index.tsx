import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { Cinzel } from "next/font/google";
import gsap from "gsap";
import DecryptedText from "../components/DecryptedText";

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

// Card pool with different card types
const CARD_POOL = [
    "/cards/trending.png",
    "/cards/politics.png",
    "/cards/crypto.png",
    "/cards/tech.png",
    "/cards/cover.png",
    // Add more card variants if you have them
];

type ViewPhase = "intro" | "transitioning" | "cards";

export default function Home() {
    const cardsRef = useRef<HTMLDivElement>(null);
    const deckRef = useRef<HTMLDivElement>(null);
    const taglineRef = useRef<HTMLDivElement>(null);

    // State to track currently displayed cards
    const [displayedCards, setDisplayedCards] = React.useState([
        "/cards/trending.png",
        "/cards/politics.png",
        "/cards/crypto.png",
        "/cards/tech.png",
    ]);

    // Phase: intro (tagline) -> transitioning (tagline out) -> cards
    const [phase, setPhase] = React.useState<ViewPhase>("intro");
    const cardsVisible = phase === "cards";

    // Show deck card only after TRUTH decrypt animation completes
    const [truthRevealed, setTruthRevealed] = React.useState(false);
    const deckCardWrapperRef = useRef<HTMLDivElement>(null);

    // Deck card entrance: same style as the four cards (container fade + card y/scale/back.out)
    // Initial state is set via inline styles to avoid first-frame flash; GSAP animates from there
    useEffect(() => {
        if (!truthRevealed || !deckCardWrapperRef.current || !deckRef.current) return;
        const container = deckCardWrapperRef.current;
        const cardEl = deckRef.current;

        const tl = gsap.timeline({ delay: 0.15 });
        tl.to(container, { opacity: 1, duration: 0.4, ease: "power2.out" });
        tl.to(
            cardEl,
            { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.05)" },
            0.1
        );
    }, [truthRevealed]);

    // When transitioning: animate tagline out, then switch to cards
    useEffect(() => {
        if (phase !== "transitioning" || !taglineRef.current) return;
        gsap.to(taglineRef.current, {
            opacity: 0,
            scale: 0.98,
            duration: 0.5,
            ease: "power2.in",
            onComplete: () => setPhase("cards"),
        });
    }, [phase]);

    // When cards view mounts: smooth card entrance
    useEffect(() => {
        if (phase !== "cards" || !cardsRef.current) return;

        const container = cardsRef.current;
        const cardEls = container.querySelectorAll(".card-display");
        gsap.set(container, { opacity: 0 });
        gsap.set(cardEls, { opacity: 0, y: 40, scale: 0.88 });

        const tl = gsap.timeline({ delay: 0.15 });
        tl.to(container, { opacity: 1, duration: 0.4, ease: "power2.out" });
        tl.to(
            cardEls,
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.7,
                stagger: 0.12,
                ease: "back.out(1.05)",
            },
            0.1
        );
    }, [phase]);

    // Click TRUTH deck: first click starts transition to cards, later clicks deal
    const onDeckClick = () => {
        if (phase === "intro") {
            setPhase("transitioning");
        } else if (phase === "cards") {
            dealNewCards();
        }
    };

    // Function to deal new cards with custom pixelation and flip animation
    const dealNewCards = async () => {
        // Get 4 random cards from the pool
        const shuffled = [...CARD_POOL].sort(() => Math.random() - 0.5);
        const newCards = shuffled.slice(0, 4);

        // Deck pulse animation
        if (deckRef.current) {
            gsap.to(deckRef.current, {
                scale: 0.95,
                duration: 0.1,
                yoyo: true,
                repeat: 1,
                ease: "power2.inOut"
            });
        }

        // Get all card elements
        const cardElements = cardsRef.current?.querySelectorAll('.card-display');
        if (!cardElements) return;

        // Step 1: Smooth fade out current cards
        await new Promise<void>((resolve) => {
            gsap.to(cardElements, {
                opacity: 0,
                scale: 0.92,
                y: 20,
                duration: 0.5,
                stagger: 0.06,
                ease: "power2.in",
                onComplete: resolve
            });
        });

        // Step 2: Update state with new cards
        setDisplayedCards(newCards);

        // Step 3: Wait a moment for DOM update
        await new Promise(resolve => setTimeout(resolve, 50));

        // Step 4: Smooth transition in new cards
        const newCardElements = cardsRef.current?.querySelectorAll('.card-display');
        if (newCardElements) {
            gsap.set(newCardElements, { opacity: 0, y: 30, scale: 0.9 });
            gsap.to(newCardElements, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.6,
                stagger: 0.1,
                ease: "back.out(1.08)",
            });
        }
    };

    return (
        <div className={`${cinzel.variable} min-h-screen bg-[#0a0a0b] text-[#e0e0e0] font-serif selection:bg-amber-500/30 relative overflow-hidden`}>
            {/* Background elements for depth */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[#0a0a0b]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(45,45,55,0.2)_0%,transparent_70%)]" />
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }} />
            </div>

            {/* Background Image from public */}
            <div
                className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/Background.jpg')" }}
            />

            <main className="relative z-10 container mx-auto px-6 lg:px-12 min-h-screen flex flex-col items-center py-12">
                <div className="flex flex-col w-full items-center gap-16 lg:gap-20 flex-1">
                    {/* Tagline + TRUTH deck – fades out when transitioning to cards */}
                    {phase !== "cards" && (
                        <div
                            ref={taglineRef}
                            className="w-full max-w-2xl flex flex-col space-y-4 text-white tracking-tight text-center items-center mt-[calc(50vh-18rem)] mb-4"
                        >
                            <h1 className="animate-item text-3xl md:text-4xl lg:text-5xl leading-[1.2] font-light">
                                The world&apos;s first combined and<br />
                                most accurate source of<br />
                                <DecryptedText
                                    text="TRUTH"
                                    animateOn="view"
                                    revealDirection="start"
                                    sequential
                                    speed={200}
                                    maxIterations={500}
                                    className={`${cinzel.className} text-black font-black tracking-widest`}
                                    parentClassName={`${cinzel.className} text-black font-black tracking-widest text-5xl md:text-6xl lg:text-7xl block mt-4 mb-0 uppercase`}
                                    onComplete={() => setTruthRevealed(true)}
                                />
                            </h1>
                            <div className="mt-2" />

                            {/* TRUTH deck card – shown after TRUTH animation completes (same entrance as four cards) */}
                            {truthRevealed && (
                                <div
                                    ref={deckCardWrapperRef}
                                    className="flex justify-center"
                                    style={{ opacity: 0 }}
                                >
                                    <div
                                        ref={deckRef}
                                        onClick={onDeckClick}
                                        className="cursor-pointer"
                                        style={{ opacity: 0, transform: "translateY(40px) scale(0.88)" }}
                                    >
                                        <Deck className="scale-90 opacity-90 hover:opacity-100 hover:scale-100 transition-all duration-500" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cards – only visible after clicking the TRUTH deck; replaces tagline view */}
                    {cardsVisible && (
                        <div className="w-full flex items-center justify-center relative">
                            {/* Central Stage (The 4 Cards) */}
                            <div ref={cardsRef} className="animate-item relative w-full max-w-[600px] aspect-square flex items-center justify-center">
                                <div className="relative w-full h-full">
                                    {/* Top Middle Card */}
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[105%]">
                                        <Card imageSrc={displayedCards[0]} className="card-display hover:-translate-y-2 transition-transform duration-300 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.9)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.95)]" />
                                    </div>

                                    {/* Bottom Row: 3 Cards */}
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[15%] flex gap-6">
                                        <Card imageSrc={displayedCards[1]} className="card-display hover:-translate-y-2 transition-transform duration-300 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.9)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.95)]" />
                                        <Card imageSrc={displayedCards[2]} className="card-display hover:-translate-y-2 transition-transform duration-300 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.9)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.95)]" />
                                        <Card imageSrc={displayedCards[3]} className="card-display hover:-translate-y-2 transition-transform duration-300 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.9)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.95)]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
