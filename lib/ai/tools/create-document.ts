import { generateUUID } from '@/lib/utils';
import { DataStreamWriter, tool } from 'ai';
import { z } from 'zod';
import { Session } from 'next-auth';
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server';

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Create Document Tool] ${message}`, data ? data : '');
};

interface CreateDocumentProps {
  session: Session;
  dataStream: DataStreamWriter;
  chatId: string;
}

export const createDocument = ({ session, dataStream, chatId }: CreateDocumentProps) =>
  tool({
    description:
      'Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind.',
    parameters: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, kind }) => {
      debug('Starting document creation', { title, kind, chatId });
      
      try {
        const id = generateUUID();
        debug('Generated document ID', { id });

        debug('Writing kind to data stream');
        dataStream.writeData({
          type: 'kind',
          content: kind,
        });

        debug('Writing ID to data stream');
        dataStream.writeData({
          type: 'id',
          content: id,
        });

        debug('Writing title to data stream');
        dataStream.writeData({
          type: 'title',
          content: title,
        });

        debug('Clearing data stream');
        dataStream.writeData({
          type: 'clear',
          content: '',
        });

        debug('Finding document handler', { kind });
        const documentHandler = documentHandlersByArtifactKind.find(
          (documentHandlerByArtifactKind) =>
            documentHandlerByArtifactKind.kind === kind,
        );

        if (!documentHandler) {
          debug('No document handler found', { kind });
          throw new Error(`No document handler found for kind: ${kind}`);
        }
        debug('Document handler found', { handlerKind: documentHandler.kind });

        debug('Creating document using handler');
        await documentHandler.onCreateDocument({
          id,
          title,
          dataStream,
          session,
          chatId
        });
        debug('Document created successfully');

        debug('Finishing data stream');
        dataStream.writeData({ type: 'finish', content: '' });

        debug('Document creation completed');
        return {
          id,
          title,
          kind,
          content: 'A document was created and is now visible to the user.',
        };
      } catch (error) {
        debug('Document creation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    },
  });
