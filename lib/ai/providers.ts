import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { fireworks } from '@ai-sdk/fireworks';
import { xai } from '@ai-sdk/xai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model-small': openai('gpt-4.1-mini'),
        'chat-model-large': openai('gpt-4.1'),
        'chat-model-embeddings-large': openai('text-embedding-3-large'),
        'chat-model-embeddings-small': openai('text-embedding-3-small'),
        'chat-model-reasoning': wrapLanguageModel({
          model: fireworks('accounts/fireworks/models/deepseek-r1'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openai('gpt-4.1-mini'),
        'artifact-model': openai('gpt-4.1-mini'),
        'chat-model-grok': xai('grok-2-1212'),
        'chat-model-reasoning-grok': wrapLanguageModel({
          model: xai('grok-3-mini-beta'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model-grok': xai('grok-2-1212'),
        'artifact-model-grok': xai('grok-2-1212'),
      },
      imageModels: {
        'small-model': openai.image('dall-e-2'),
        'large-model': openai.image('dall-e-3'),
        'small-model-grok': xai.image('grok-2-image'),
      },
    });
