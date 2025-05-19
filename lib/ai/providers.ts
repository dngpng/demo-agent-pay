import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

import { setGlobalDispatcher, ProxyAgent } from "undici";

// Set up proxy for fetch using undici
if (process.env.http_proxy) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const proxyAgent = new ProxyAgent(process.env.http_proxy);
  setGlobalDispatcher(proxyAgent);
}

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
        'chat-model': openai('o4-mini'),
        'chat-model-reasoning': wrapLanguageModel({
          model: openai('o4-mini'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openai('o4-mini'),
        'artifact-model': openai('o4-mini'),
      },
      imageModels: {
        'small-model': xai.image('grok-2-image'),
      },
    });
