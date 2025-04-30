import { openai } from '@ai-sdk/openai';
import { embed, embedMany } from 'ai';
import { marked, Tokens } from 'marked';
import { myProvider } from './providers';


const embeddingModel = 'chat-model-embeddings-small';

// Add this function at the beginning of your file or in a utility module
function updateText(text: string): string {
    return text
        // .replace(/taxjar/gi, 'Cove')
        // .replace(/https?:\/\/\S+/gi, '')
        // .replace(/www\.\S+/gi, '')
        // .replace(/\S+@\S+\.\S+/gi, '')
        // .replace(/\s+/g, ' ')
        .trim();
}

interface ResourceMetadata {
  url: string;
  title: string;
}

interface EmbeddingChunk {
  content: string;
  embedding: number[];
}

const generateChunks = (input: string, maxChunkLength: number = 2000): string[] => {
  console.log('Starting generateChunks with input length:', input.length);
  const tokens = marked.lexer(input);
  console.log('Number of tokens:', tokens.length);
  const chunks: string[] = [];
  let currentChunk = '';
  let headers: { [key: number]: string } = {};
  let highestHeaderLevel = 6; // Initialize with the lowest priority (h6)

  const addChunk = () => {
    if (currentChunk.trim()) {
      const currentHeader = headers[highestHeaderLevel] || '';
    //   if we want to add the header to each chunk
    //   const chunkToAdd = currentHeader + currentChunk.trim();
      const chunkToAdd = currentChunk.trim();
      chunks.push(chunkToAdd);
      console.log('Added chunk, text:', chunkToAdd);
      console.log('Added chunk, length:', chunkToAdd.length);
      currentChunk = '';
    }
  };

  for (const token of tokens) {
    console.log('Processing token type:', token.type);
    switch (token.type) {
      case 'heading':
        const heading = token as Tokens.Heading;
        const headingText = updateText(heading.text);
        const headerContent = '#'.repeat(heading.depth) + ' ' + headingText + '\n\n';
        headers[heading.depth] = headerContent;
        highestHeaderLevel = Math.min(highestHeaderLevel, heading.depth);
        if (currentChunk.length + headingText.length > maxChunkLength) {
          console.log('New heading encountered, adding current chunk');
          addChunk();
        }
        currentChunk += headingText + ' ';
        break;
      case 'paragraph':
        const text = updateText((token as Tokens.Paragraph).text);
        console.log('Processed text length:', text.length);
        if (currentChunk.length + text.length > maxChunkLength) {
          console.log('Chunk size exceeded, adding chunk');
          addChunk();
        }
        currentChunk += text + '\n\n';
        break;
      case 'code':
        console.log('Adding code block, length:', token.text.length);
        addChunk();
        chunks.push(token.text);
        break;
      case 'list':
        console.log('Processing list with', (token as Tokens.List).items.length, 'items');
        (token as Tokens.List).items.forEach(item => {
          item.text = updateText(item.text);
          if (currentChunk.length + item.text.length > maxChunkLength) {
            console.log('Chunk size exceeded in list item, adding chunk');
            addChunk();
          }
          currentChunk += '- ' + item.text + '\n';
        });
        break;
      case 'table':
        console.log('Adding table, raw length:', token.raw.length);
        addChunk();
        chunks.push(token.raw);
        break;
      case 'blockquote':
        console.log('Processing blockquote, length:', token.text.length);
        if (currentChunk.length + token.text.length > maxChunkLength) {
          console.log('Chunk size exceeded in blockquote, adding chunk');
          addChunk();
        }
        currentChunk += '> ' + token.text + '\n';
        break;
      // Add more cases as needed
      default:
        console.log('Unhandled token type:', token.type);
    }
    
    if (currentChunk.length >= maxChunkLength) {
      console.log('Max chunk length reached, adding chunk');
      addChunk();
    }
  }

  addChunk();
  console.log('Finished generating chunks. Total chunks:', chunks.length);
  return chunks;
};

export const generateEmbeddings = async (
  content: string,
  metadata: ResourceMetadata
): Promise<EmbeddingChunk[]> => {
  console.log('Starting generateEmbeddings with input length:', content.length);
  const chunks = generateChunks(content);
  console.log('Generated', chunks.length, 'chunks');
  
  const chunksWithMetadata = chunks.map(chunk => 
    `Source: ${metadata.url}\nTitle: ${metadata.title}\n\nContent:\n${chunk}`
  );
  
  console.log('Calling embedMany with', chunksWithMetadata.length, 'chunks');
  const { embeddings } = await embedMany({
    model: openai.embedding(embeddingModel),
    values: chunksWithMetadata,
  });
  console.log('Received', embeddings.length, 'embeddings');
  
  return embeddings.map((embedding: number[], i: number) => ({ 
    content: chunksWithMetadata[i], 
    embedding 
  }));
};

export const generateEmbedding = async (content: string): Promise<number[]> => {
  const { embedding } = await embed({
    model: openai.embedding(embeddingModel),
    value: content.replaceAll('\\n', ' '),
  });
  return embedding;
};
