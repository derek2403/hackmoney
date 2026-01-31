import React, { useState, useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const GRID_SIZE = 60;

const GridDebug = () => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    const horizontalRange = Math.ceil(centerX / GRID_SIZE);
    const verticalRange = Math.ceil(centerY / GRID_SIZE);

    // Coordinates identified from user images
    // Bottom pane: y=255, h=90 -> Top=210, Bottom=300
    const starredCoords = [
        "-540,-300", "-540,210", "-540,300",
        "540,-300", "540,210", "540,300"
    ];

    // Merged regions (rows) to highlight - combined for seamless look
    type MergedBlock = {
        y: number;
        height: number;
        startX: number;
        endX: number;
        isSolidBlack?: boolean;
        hideVerticalDividers?: boolean;
    };

    const mergedBlocks: MergedBlock[] = [
        // Top Merged Block (y=-300 -> -270, moved down by 0.5 dots)
        // "merge all cell tgt no need to split each 3" -> hide vertical dividers
        { y: -270, height: GRID_SIZE, startX: -540, endX: 540, hideVerticalDividers: true },

        // Big Black Rectangle (Central)
        // y=-30 (moved down by 0.5 dots/30px from -60)
        // Width: -540 to 540 (to match stars)
        { y: -30, height: 420, startX: -540, endX: 540, isSolidBlack: true },

        // Lower block moved down by 1 dot (y=210 -> y=270) covering y=240 and y=300
        // Updated: Reduced height to 1.5 dots (90px). 
        // y=270 was center for 120px height (210-330).
        // New height 90px. Top remains 210. Bottom becomes 300. Center = 255.
        { y: 255, height: 90, startX: -540, endX: 540 }
    ];

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {/* Merged Cell Highlights */}
            {mergedBlocks.map((block, idx) => (
                <div
                    key={`merged-${idx}`}
                    className={`absolute border-y border-black/10 ${block.isSolidBlack ? 'bg-black' : 'bg-[#f7f8f3]'}`}
                    style={{
                        left: `${centerX + block.startX}px`,
                        top: `${centerY + block.y - (block.height / 2)}px`,
                        width: `${block.endX - block.startX}px`,
                        height: `${block.height}px`,
                    }}
                >
                    {/* "Trusted By" Label for the bottom block (idx 2) */}
                    {idx === 2 && (
                        <>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#f7f8f3] px-2 text-[10px] text-gray-500 font-mono tracking-widest uppercase z-10">
                                Trusted By
                            </div>

                            {/* Partner Logos */}
                            {/* Partner Logos */}
                            {[{
                                name: "Polymarket", icon: (
                                    <div
                                        className="h-24 w-128 bg-[#636361]" // Increased size by 200% (h-6->h-12, w-32->w-64)
                                        style={{
                                            maskImage: 'url(/polymarket.png)',
                                            WebkitMaskImage: 'url(/polymarket.png)',
                                            maskSize: 'contain',
                                            WebkitMaskSize: 'contain',
                                            maskRepeat: 'no-repeat',
                                            WebkitMaskRepeat: 'no-repeat',
                                            maskPosition: 'center',
                                            WebkitMaskPosition: 'center'
                                        }}
                                    />
                                )
                            }, {
                                name: "Kalshi", icon: (
                                    <div
                                        className="h-24 w-128 bg-[#636361]"
                                        style={{
                                            maskImage: 'url(/kalshi.png)',
                                            WebkitMaskImage: 'url(/kalshi.png)',
                                            maskSize: 'contain',
                                            WebkitMaskSize: 'contain',
                                            maskRepeat: 'no-repeat',
                                            WebkitMaskRepeat: 'no-repeat',
                                            maskPosition: 'center',
                                            WebkitMaskPosition: 'center'
                                        }}
                                    />
                                )
                            }, {
                                name: "Dow Jones", icon: (
                                    <div
                                        className="h-12 w-64 bg-[#636361]"
                                        style={{
                                            maskImage: 'url(/dow.png)',
                                            WebkitMaskImage: 'url(/dow.png)',
                                            maskSize: 'contain',
                                            WebkitMaskSize: 'contain',
                                            maskRepeat: 'no-repeat',
                                            WebkitMaskRepeat: 'no-repeat',
                                            maskPosition: 'center',
                                            WebkitMaskPosition: 'center'
                                        }}
                                    />
                                )
                            }, {
                                name: "Yahoo Finance", icon: (
                                    <div
                                        className="h-10 w-64 bg-[#636361]"
                                        style={{
                                            maskImage: 'url(/yahoo.png)',
                                            WebkitMaskImage: 'url(/yahoo.png)',
                                            maskSize: 'contain',
                                            WebkitMaskSize: 'contain',
                                            maskRepeat: 'no-repeat',
                                            WebkitMaskRepeat: 'no-repeat',
                                            maskPosition: 'center',
                                            WebkitMaskPosition: 'center'
                                        }}
                                    />
                                )
                            }, {
                                name: "Circle", icon: (
                                    <div
                                        className="h-8 w-32 bg-[#636361]"
                                        style={{
                                            maskImage: 'url(/circle.png)',
                                            WebkitMaskImage: 'url(/circle.png)',
                                            maskSize: 'contain',
                                            WebkitMaskSize: 'contain',
                                            maskRepeat: 'no-repeat',
                                            WebkitMaskRepeat: 'no-repeat',
                                            maskPosition: 'center',
                                            WebkitMaskPosition: 'center'
                                        }}
                                    />
                                )
                            }, {
                                name: "EF", icon: (
                                    <div
                                        className="h-10 w-64 bg-[#636361]"
                                        style={{
                                            maskImage: 'url(/ef.png)',
                                            WebkitMaskImage: 'url(/ef.png)',
                                            maskSize: 'contain',
                                            WebkitMaskSize: 'contain',
                                            maskRepeat: 'no-repeat',
                                            WebkitMaskRepeat: 'no-repeat',
                                            maskPosition: 'center',
                                            WebkitMaskPosition: 'center'
                                        }}
                                    />
                                )
                            }].map((partner, pIdx) => (
                                <div
                                    key={`partner-${pIdx}`}
                                    className="absolute top-0 bottom-0 flex items-center justify-center gap-3"
                                    style={{
                                        left: `${pIdx * (GRID_SIZE * 3)}px`,
                                        width: `${GRID_SIZE * 3}px`
                                    }}
                                >
                                    {partner.icon}
                                </div>
                            ))}
                        </>
                    )}

                    {/* Only render vertical grid lines if NOT solid black AND NOT explicitly hidden */}
                    {!block.isSolidBlack && !block.hideVerticalDividers && Array.from({ length: Math.floor((block.endX - block.startX) / (GRID_SIZE * 3)) + 1 }).map((_, i) => (
                        <div
                            key={`vline-${i}`}
                            className="absolute top-0 bottom-0 w-[1px] bg-black/10"
                            style={{
                                left: `${i * (GRID_SIZE * 3)}px`
                            }}
                        />
                    ))}

                    {/* Rightmost closing line */}
                    {!block.isSolidBlack && !block.hideVerticalDividers && <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-black/10" />}
                </div>
            ))}

            {/* Stars - Rendered directly from coordinates list to support non-grid-aligned positions (like y=210) */}
            {starredCoords.map((coord, idx) => {
                const [x, y] = coord.split(',').map(Number);
                return (
                    <div
                        key={`star-${idx}`}
                        className="absolute"
                        style={{
                            left: `${centerX + x}px`,
                            top: `${centerY + y}px`,
                        }}
                    >
                        {/* The Star Icon - Custom 4-point cross-star */}
                        <div className="absolute -translate-x-1/2 -translate-y-1/2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black">
                                <path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z" fill="currentColor" fillOpacity="0.8" />
                            </svg>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default function Home() {
    // Debug toggle removed - GridDebug is now permanent design

    return (
        <div className={`${geistSans.variable} ${geistMono.variable} font-sans h-screen overflow-hidden bg-[#f7f8f3] text-black relative`}>
            {/* Grid Lines Background */}
            <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)`,
                    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                    /* 
                       Shift by half grid size so the grid line (at edge of tile) serves as the center axis. 
                       - 0.5px adjusts for the 1px line width to be perfectly centered.
                    */
                    backgroundPosition: `calc(50% + ${GRID_SIZE / 2}px - 0.5px) calc(50% + ${GRID_SIZE / 2}px - 0.5px)`
                }}
            />

            {/* Grid Elements (Stars, Merged Blocks) */}
            <GridDebug />
        </div>
    );
}
