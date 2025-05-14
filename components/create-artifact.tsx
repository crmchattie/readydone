import { Suggestion } from '@/lib/db/schema';
import { UseChatHelpers } from '@ai-sdk/react';
import { ComponentType, Dispatch, ReactNode, SetStateAction } from 'react';
import { DataStreamDelta } from './data-stream-handler';
import { UIArtifact } from './artifact';

export type ArtifactActionContext<M = any> = {
  content: string;
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  mode: 'edit' | 'diff';
  metadata: M;
  setMetadata: Dispatch<SetStateAction<M>>;
};

type ArtifactAction<M = any> = {
  icon: ReactNode;
  label?: string;
  description: string;
  onClick: (context: ArtifactActionContext<M>) => Promise<void> | void;
  isDisabled?: (context: ArtifactActionContext<M>) => boolean;
};

export type ArtifactToolbarContext = {
  appendMessage: UseChatHelpers['append'];
};

export type ArtifactToolbarItem = {
  description: string;
  icon: ReactNode;
  onClick: (context: ArtifactToolbarContext) => void;
};

interface ArtifactContent<M = any> {
  title: string;
  content: string;
  mode: 'edit' | 'diff';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  status: 'streaming' | 'idle';
  suggestions: Array<Suggestion>;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  isInline: boolean;
  getDocumentContentById: (index: number) => string;
  isLoading: boolean;
  metadata: M;
  setMetadata: Dispatch<SetStateAction<M>>;
}

interface InitializeParameters<M = any> {
  documentId: string;
  setMetadata: Dispatch<SetStateAction<M>>;
}

export interface ArtifactConfig<K extends string, M = any> {
  kind: K;
  description: string;
  content: ComponentType<any>;
  actions: Array<any>;
  toolbar: Array<any>;
  onStreamPart?: (args: { streamPart: any; setArtifact: any }) => void;
  initialize?: (args: { documentId: string; setMetadata: (metadata: M) => void }) => void;
  cleanup?: (args: { metadata: M }) => boolean;
}

export class Artifact<K extends string = string, M = any> {
  private config: ArtifactConfig<K, M>;

  constructor(config: ArtifactConfig<K, M>) {
    this.config = config;
  }

  get kind() {
    return this.config.kind;
  }

  get description() {
    return this.config.description;
  }

  get content() {
    return this.config.content;
  }

  get actions() {
    return this.config.actions;
  }

  get toolbar() {
    return this.config.toolbar;
  }

  get onStreamPart() {
    return this.config.onStreamPart;
  }

  get initialize() {
    return this.config.initialize;
  }

  get cleanup() {
    return this.config.cleanup;
  }
}

export type ArtifactKind = 'text' | 'code' | 'image' | 'sheet' | 'browser';
