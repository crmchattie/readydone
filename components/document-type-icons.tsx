'use client';

import { useState } from 'react';
import { FileIcon, CodeIcon, ImageIcon, LineChartIcon } from './icons';
import { DocumentListPopup } from './document-list-popup';
import type { ArtifactKind } from './artifact';

const DOCUMENT_TYPES = [
  { kind: 'text' as ArtifactKind, icon: FileIcon, label: 'Documents' },
  { kind: 'code' as ArtifactKind, icon: CodeIcon, label: 'Code' },
  { kind: 'sheet' as ArtifactKind, icon: LineChartIcon, label: 'Spreadsheets' },
//   { kind: 'image' as ArtifactKind, icon: ImageIcon, label: 'Images' }
] as const;

export function DocumentTypeIcons() {
  const [selectedType, setSelectedType] = useState<ArtifactKind | null>(null);

  return (
    <div className="flex gap-2">
      {DOCUMENT_TYPES.map(({ kind, icon: Icon, label }) => (
        <button
          key={kind}
          onClick={() => setSelectedType(kind)}
          className="p-2 hover:bg-muted rounded-md"
          title={label}
        >
          <Icon />
        </button>
      ))}
      
      <DocumentListPopup 
        kind={selectedType}
        isOpen={selectedType !== null}
        onClose={() => setSelectedType(null)}
      />
    </div>
  );
} 