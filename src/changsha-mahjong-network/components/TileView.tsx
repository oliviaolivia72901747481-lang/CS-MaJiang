import React from 'react';
import { TileView as BaseTileView } from '../../changsha-mahjong-ui/components/TileView.jsx';
import { Tile } from '../../changsha-mahjong/types/tile.js';

export interface TileViewProps {
  tile?: Tile;
  hidden?: boolean;
  selected?: boolean;
  disabled?: boolean;
  isLatestDiscard?: boolean;
  onClick?: () => void;
  highlightType?: 'chi' | 'peng' | 'gang' | 'source' | 'latest' | 'candidate' | 'hand-participant' | 'meld-new';
  className?: string;
  role?: string;
}

export function TileView({ className = '', highlightType, role, ...rest }: TileViewProps) {
  const extraClasses = [];
  if (highlightType === 'source') {
    extraClasses.push('tile-action-source');
  } else if (highlightType === 'hand-participant' || highlightType === 'chi' || highlightType === 'peng' || highlightType === 'gang') {
    extraClasses.push('tile-hand-participant');
  } else if (highlightType === 'candidate') {
    extraClasses.push('tile-candidate');
  } else if (highlightType === 'meld-new') {
    extraClasses.push('meld-newly-formed');
  }

  if (role === 'source') {
    extraClasses.push('tile-action-source');
  } else if (role === 'hand-participant') {
    extraClasses.push('tile-hand-participant');
  } else if (role === 'candidate') {
    extraClasses.push('tile-candidate');
  }

  const combinedClass = [className, ...extraClasses].filter(Boolean).join(' ');

  let baseHighlight: any = highlightType;
  if (highlightType === 'hand-participant') {
    baseHighlight = 'chi';
  } else if (highlightType === 'meld-new') {
    baseHighlight = 'latest';
  }

  return (
    <BaseTileView 
      className={combinedClass} 
      highlightType={baseHighlight}
      {...rest} 
    />
  );
}
