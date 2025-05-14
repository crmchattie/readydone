'use client';

import useSWR from 'swr';
import { UIArtifact } from '@/components/artifact';
import { useCallback, useMemo, useRef, useEffect } from 'react';

export const initialArtifactData: UIArtifact = {
  documentId: 'init',
  content: '',
  kind: 'text',
  title: '',
  status: 'idle',
  isVisible: false,
  boundingBox: {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  },
};

type Selector<T> = (state: UIArtifact) => T;

export function useArtifactSelector<Selected>(selector: Selector<Selected>) {
  const { data: localArtifact } = useSWR<UIArtifact>('artifact', null, {
    fallbackData: initialArtifactData,
  });

  const selectedValue = useMemo(() => {
    if (!localArtifact) return selector(initialArtifactData);
    return selector(localArtifact);
  }, [localArtifact, selector]);

  return selectedValue;
}

export function useArtifact() {
  const { data: localArtifact, mutate: setLocalArtifact } = useSWR<UIArtifact>(
    'artifact',
    null,
    {
      fallbackData: initialArtifactData,
    },
  );

  // Keep track of browser session state
  const browserSessionRef = useRef<{
    sessionId?: string;
    instanceId?: string;
  }>({});

  const artifact = useMemo(() => {
    if (!localArtifact) return initialArtifactData;
    return localArtifact;
  }, [localArtifact]);

  const setArtifact = useCallback(
    (updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact)) => {
      setLocalArtifact((currentArtifact) => {
        const artifactToUpdate = currentArtifact || initialArtifactData;
        const newArtifact = typeof updaterFn === 'function' ? updaterFn(artifactToUpdate) : updaterFn;

        // If this is a browser artifact, preserve the session info
        if (newArtifact.kind === 'browser' && newArtifact.metadata) {
          browserSessionRef.current = {
            sessionId: newArtifact.metadata.sessionId,
            instanceId: newArtifact.metadata.instanceId
          };
        }

        return newArtifact;
      });
    },
    [setLocalArtifact],
  );

  const { data: localArtifactMetadata, mutate: setLocalArtifactMetadata } =
    useSWR<any>(
      () =>
        artifact.documentId ? `artifact-metadata-${artifact.documentId}` : null,
      null,
      {
        fallbackData: null,
      },
    );

  // Preserve browser session state in metadata
  useEffect(() => {
    if (artifact.kind === 'browser' && browserSessionRef.current.sessionId) {
      setLocalArtifactMetadata((current: any) => ({
        ...current,
        sessionId: browserSessionRef.current.sessionId,
        instanceId: browserSessionRef.current.instanceId
      }));
    }
  }, [artifact.kind, setLocalArtifactMetadata]);

  return useMemo(
    () => ({
      artifact,
      setArtifact,
      metadata: localArtifactMetadata,
      setMetadata: setLocalArtifactMetadata,
    }),
    [artifact, setArtifact, localArtifactMetadata, setLocalArtifactMetadata],
  );
}
