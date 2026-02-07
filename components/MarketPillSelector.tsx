'use client';

import React from 'react';
import { cn } from './utils';

export type MarketPillItem = {
  id: number;
  label: string;
};

export interface MarketPillSelectorProps {
  items: MarketPillItem[];
  /** Single selection: one id. Multi selection: up to 2 ids, [0]=X axis, [1]=Y axis. */
  selectedId?: number;
  selectedIds?: number[];
  onSelect: (id: number) => void;
  /** When true, user must select exactly two markets (for 2D chart). */
  multiSelect?: boolean;
  className?: string;
  baseColor?: string;
  pillColor?: string;
  pillTextColor?: string;
  hoveredPillTextColor?: string;
}

const MarketPillSelector: React.FC<MarketPillSelectorProps> = ({
  items,
  selectedId,
  selectedIds = [],
  onSelect,
  multiSelect = false,
  className = '',
  baseColor = '#0a0a0a',
  pillColor = '#ffffff',
  pillTextColor = '#000000',
  hoveredPillTextColor = '#ffffff',
}) => {
  const ids = multiSelect ? selectedIds : selectedId != null ? [selectedId] : [];
  const isActive = (id: number) => ids.includes(id);

  return (
    <nav
      className={cn('market-pill-selector', className)}
      aria-label="Select market"
      style={{
        display: 'flex',
        alignItems: 'center',
        width: 'max-content',
        height: 42,
        padding: 3,
        background: baseColor,
        borderRadius: 9999,
        gap: 3,
      }}
    >
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', alignItems: 'stretch', gap: 3 }}>
        {items.map((item) => {
          const active = isActive(item.id);
          return (
            <li key={item.id} style={{ display: 'flex', height: '100%' }}>
              <button
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={item.label}
                onClick={() => onSelect(item.id)}
                className={cn('market-pill-btn', active && 'market-pill-btn-active')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  padding: '0 18px',
                  background: active ? pillColor : baseColor,
                  color: active ? pillTextColor : hoveredPillTextColor,
                  border: 'none',
                  borderRadius: 9999,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 16,
                  textTransform: 'uppercase',
                  letterSpacing: '0.2px',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.2s, color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (active) return;
                  e.currentTarget.style.background = '#1a1a1a';
                  e.currentTarget.style.color = hoveredPillTextColor;
                }}
                onMouseLeave={(e) => {
                  if (active) return;
                  e.currentTarget.style.background = baseColor;
                  e.currentTarget.style.color = hoveredPillTextColor;
                }}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MarketPillSelector;
