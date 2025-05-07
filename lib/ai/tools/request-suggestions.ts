import { z } from 'zod';
import { Session } from 'next-auth';
import { DataStreamWriter, streamObject, tool } from 'ai';
import { getDocumentById, saveSuggestions, getDocumentAccess } from '@/lib/db/queries';
import { Suggestion } from '@/lib/db/schema';
import { generateUUID } from '@/lib/utils';
import { myProvider } from '../providers';

// Debug helper
const debug = (message: string, data?: any) => {
  console.debug(`[Request Suggestions Tool] ${message}`, data ? data : '');
};

interface RequestSuggestionsProps {
  session: Session;
  dataStream: DataStreamWriter;
}

export const requestSuggestions = ({
  session,
  dataStream,
}: RequestSuggestionsProps) =>
  tool({
    description: 'Request suggestions for a document',
    parameters: z.object({
      documentId: z
        .string()
        .describe('The ID of the document to request edits'),
    }),
    execute: async ({ documentId }) => {
      debug('Starting suggestions request', { documentId });
      
      try {
        debug('Fetching document');
        const document = await getDocumentById({ id: documentId });
        debug('Document fetch result', { 
          found: !!document,
          hasContent: !!document?.content
        });

        if (!document || !document.content) {
          debug('Document not found or empty');
          return {
            error: 'Document not found',
          };
        }

        debug('Checking user access');
        const access = await getDocumentAccess({ 
          documentId: document.id, 
          documentCreatedAt: document.createdAt 
        });
        
        const userAccess = access.find(a => 
          a.user.id === session.user?.id && 
          ['owner', 'editor'].includes(a.role)
        );
        debug('Access check result', { 
          hasAccess: !!userAccess,
          role: userAccess?.role
        });

        if (!userAccess) {
          debug('User unauthorized');
          return {
            error: 'Unauthorized to request suggestions for this document',
          };
        }

        const suggestions: Array<
          Omit<Suggestion, 'userId' | 'createdAt' | 'documentCreatedAt'>
        > = [];

        debug('Starting suggestion generation');
        const { elementStream } = streamObject({
          model: myProvider.languageModel('artifact-model'),
          system:
            'You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.',
          prompt: document.content,
          output: 'array',
          schema: z.object({
            originalSentence: z.string().describe('The original sentence'),
            suggestedSentence: z.string().describe('The suggested sentence'),
            description: z.string().describe('The description of the suggestion'),
          }),
        });
        debug('Stream object created');

        debug('Processing suggestions stream');
        for await (const element of elementStream) {
          const suggestion = {
            originalText: element.originalSentence,
            suggestedText: element.suggestedSentence,
            description: element.description,
            id: generateUUID(),
            documentId: documentId,
            isResolved: false,
          };

          debug('Writing suggestion to data stream', { suggestionId: suggestion.id });
          dataStream.writeData({
            type: 'suggestion',
            content: suggestion,
          });

          suggestions.push(suggestion);
        }
        debug('Suggestions processing completed', { suggestionCount: suggestions.length });

        const userId = session.user?.id;
        if (userId) {
          debug('Saving suggestions', { userId, suggestionCount: suggestions.length });
          await saveSuggestions({
            suggestions: suggestions.map(suggestion => ({
              ...suggestion,
              userId,
              createdAt: new Date(),
              documentCreatedAt: document.createdAt,
            })),
            userId,
          });
          debug('Suggestions saved successfully');
        } else {
          debug('No user ID available, skipping suggestion save');
        }

        debug('Request completed successfully');
        return {
          id: documentId,
          title: document.title,
          kind: document.kind,
          message: 'Suggestions have been added to the document',
        };
      } catch (error) {
        debug('Suggestions request failed', { error: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
      }
    },
  });
