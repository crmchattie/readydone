import { Artifact } from '@/components/create-artifact';
import { BrowserContent } from '@/components/browser-content';
import { UIArtifact } from '@/components/artifact';

interface BrowserMetadata {
  sessionId?: string;
  instanceId?: string;
  steps?: any[];
  isLoading?: boolean;
}

export const browserArtifact = new Artifact<'browser', BrowserMetadata>({
  kind: 'browser',
  description: 'Browser session',
  content: BrowserContent,
  actions: [],
  toolbar: [],
  onStreamPart: ({ streamPart, setArtifact, setMetadata }) => {
    if (streamPart.type === 'text-delta') {
      setArtifact((draft: UIArtifact) => ({
        ...draft,
        content: streamPart.content as string,
        isVisible: true,
        status: 'streaming',
      }));
    }
  },
  initialize: async ({ documentId, setMetadata }) => {
    console.log('[BrowserArtifact] Initializing', { documentId });
    setMetadata({
      sessionId: undefined,
      instanceId: undefined,
      steps: [],
      isLoading: false
    });
  },
  cleanup: ({ metadata }) => {
    // Don't cleanup if we have session info
    if (metadata?.sessionId) {
      console.log('[BrowserArtifact] Preserving session during cleanup', metadata);
      return false; // Prevent cleanup
    }
    return true; // Allow cleanup
  }
}); 