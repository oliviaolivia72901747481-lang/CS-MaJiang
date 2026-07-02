import React from 'react';

export interface HintCardProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
}

export function HintCard({ title, icon, children }: HintCardProps) {
  return (
    <div className="coach-hint-card">
      <div className="hint-card-header">
        {icon && <span className="hint-card-icon">{icon}</span>}
        <h4 className="hint-card-title">{title}</h4>
      </div>
      <div className="hint-card-body">{children}</div>
    </div>
  );
}
