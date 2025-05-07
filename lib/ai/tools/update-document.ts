import { DataStreamWriter, tool } from 'ai';
import { Session } from 'next-auth';
import { z } from 'zod';
import { getDocumentById, saveDocument } from '@/lib/db/queries';
import { documentHandlersByArtifactKind } from '@/lib/artifacts/server';

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Update Document Tool] ${message}`, data ? data : '');
};

interface UpdateDocumentProps {
  session: Session;
  dataStream: DataStreamWriter;
  chatId: string;
}

export const updateDocument = ({ session, dataStream, chatId }: UpdateDocumentProps) =>
  tool({
    description: 'Update a document with the given description.',
    parameters: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z
        .string()
        .describe('The description of changes that need to be made'),
    }),
    execute: async ({ id, description }) => {
      debug('Starting document update', { id, descriptionLength: description.length });
      
      try {
        debug('Fetching document');
        const document = await getDocumentById({ id });
        debug('Document fetch result', { 
          found: !!document,
          kind: document?.kind,
          hasContent: !!document?.content
        });

        if (!document) {
          debug('Document not found');
          return {
            error: 'Document not found',
          };
        }

        debug('Writing title to data stream');
        dataStream.writeData({
          type: 'clear',
          content: document.title,
        });

        debug('Finding document handler', { documentKind: document.kind });
        const documentHandler = documentHandlersByArtifactKind.find(
          (documentHandlerByArtifactKind) =>
            documentHandlerByArtifactKind.kind === document.kind,
        );

        if (!documentHandler) {
          debug('No document handler found', { kind: document.kind });
          throw new Error(`No document handler found for kind: ${document.kind}`);
        }
        debug('Document handler found', { handlerKind: documentHandler.kind });

        debug('Updating document using handler');
        await documentHandler.onUpdateDocument({
          document,
          description,
          dataStream,
          session,
          chatId
        });
        debug('Document updated successfully');

        debug('Finishing data stream');
        dataStream.writeData({ type: 'finish', content: '' });

        debug('Update completed successfully');
        return {
          id,
          title: document.title,
          kind: document.kind,
          content: 'The document has been updated successfully.',
        };
      } catch (error) {
        debug('Document update failed', { error: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    },
  });
