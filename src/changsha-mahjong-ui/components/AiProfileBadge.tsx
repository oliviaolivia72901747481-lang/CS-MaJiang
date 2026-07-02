import React from 'react';

export interface AiProfileBadgeProps {
  profile?: 'balanced' | 'fastHu' | 'bigHu' | 'defensive' | string;
}

export function AiProfileBadge({ profile }: AiProfileBadgeProps) {
  if (!profile) return null;

  let label = '';
  let className = '';

  switch (profile) {
    case 'balanced':
      label = '⚖️ 均衡型';
      className = 'badge-balanced';
      break;
    case 'fastHu':
      label = '🚀 快胡型';
      className = 'badge-fast-hu';
      break;
    case 'bigHu':
      label = '👑 大胡型';
      className = 'badge-big-hu';
      break;
    case 'defensive':
      label = '🛡️ 防守型';
      className = 'badge-defensive';
      break;
    default:
      label = `🤖 ${profile}`;
      className = 'badge-default';
  }

  return (
    <span className={`ai-profile-badge ${className}`}>
      {label}
    </span>
  );
}
