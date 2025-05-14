'use client';

import { useEffect, useRef } from 'react';
import { PlusIcon, LoaderIcon } from 'lucide-react';
import type { ArtifactKind } from './artifact';
import { fetcher, generateUUID } from '@/lib/utils';
import { Button } from './ui/button';
import { Document } from '@/lib/db/schema';
import useSWR from 'swr';
import { useArtifact } from '@/hooks/use-artifact';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useChatStore } from '@/lib/stores/chat-store';

interface DocumentListPopupProps {
  kind: ArtifactKind | null;
  isOpen: boolean;
  onClose: () => void;
}

const documentTypeLabels: Record<ArtifactKind, string> = {
  text: 'Documents',
  code: 'Code Files',
  sheet: 'Spreadsheets',
  image: 'Images',
  browser: 'Browser Sessions'
};

export function DocumentListPopup({ kind, isOpen, onClose }: DocumentListPopupProps) {
  const { setArtifact } = useArtifact();
  const { chatId } = useChatStore();
  
  const { data: documents, error, isLoading } = useSWR<Document[]>(
    kind ? `/api/documents?kind=${kind}` : null,
    fetcher
  );

  if (!kind) return null;

  const handleNewDocument = async () => {
    const id = generateUUID();
    try {
      const response = await fetch(`/api/document?id=${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Untitled Document',
          kind,
          content: '',
          chatId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const doc = await response.json();
      setArtifact({
        documentId: doc.id,
        title: doc.title,
        kind: doc.kind,
        content: doc.content,
        isVisible: true,
        status: 'idle',
        boundingBox: {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight
        }
      });
      onClose();
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  const handleOpenDocument = async (doc: Document) => {
    setArtifact({
      documentId: doc.id,
      title: doc.title,
      kind: doc.kind,
      content: doc.content,
      isVisible: true,
      status: 'idle',
      boundingBox: {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{documentTypeLabels[kind]}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleNewDocument}
          >
            <PlusIcon size={16} />
            <span>New {documentTypeLabels[kind].slice(0, -1)}</span>
          </Button>

          {isLoading ? (
            <div className="py-8 text-center">
              <LoaderIcon className="size-6 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : error ? (
            <div className="py-4 text-center text-sm text-destructive">
              Failed to load documents
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="flex flex-col gap-2">
              {documents.map((doc) => (
                <Button
                  key={doc.id}
                  variant="ghost"
                  className="w-full justify-start truncate hover:bg-accent"
                  onClick={() => handleOpenDocument(doc)}
                >
                  {doc.title || 'Untitled Document'}
                </Button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No {documentTypeLabels[kind].toLowerCase()} yet
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 