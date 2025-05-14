import { Artifact } from '@/components/create-artifact';
import { CopyIcon, RedoIcon, UndoIcon } from '@/components/icons';
import { ImageEditor } from '@/components/image-editor';
import { toast } from 'sonner';
import { UIArtifact } from '@/components/artifact';
import { DataStreamDelta } from '@/components/data-stream-handler';

export const imageArtifact = new Artifact({
  kind: 'image',
  description: 'Useful for image generation',
  onStreamPart: ({ streamPart, setArtifact }: { streamPart: DataStreamDelta; setArtifact: (updater: (draft: UIArtifact) => UIArtifact) => void }) => {
    if (streamPart.type === 'image-delta') {
      setArtifact((draftArtifact: UIArtifact) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible: true,
        status: 'streaming',
      }));
    }
  },
  content: ImageEditor,
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }: { handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }: { currentVersionIndex: number }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }: { handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }: { isCurrentVersion: boolean }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy image to clipboard',
      onClick: ({ content }: { content: string }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${content}`;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
              ]);
            }
          }, 'image/png');
        };

        toast.success('Copied image to clipboard!');
      },
    },
  ],
  toolbar: [],
});
