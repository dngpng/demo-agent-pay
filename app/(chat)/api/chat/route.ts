import { auth } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import { myProvider } from '@/lib/ai/providers';
import { buyCredit, executeBuyCredit } from '@/lib/ai/tools/buy-credits';
import { checkCredits } from '@/lib/ai/tools/check-credits';
import { createDocument } from '@/lib/ai/tools/create-document';
import { getPaymentMethods } from '@/lib/ai/tools/get-payment-methods';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { processToolCalls } from '@/lib/ai/utils';
import { isProductionEnvironment } from '@/lib/constants';
import {
  deleteChatById,
  getChatById,
  getCreditsByUserId,
  saveChat,
  saveMessages,
  updateMessage,
  updateUserCredit,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentSystemMessage,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import {
  type UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { generateTitleFromUserMessage } from '../../actions';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
    } = await request.json();

    const session = await auth();

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);
    const systemMessage = getMostRecentSystemMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id, userId: session.user.id, title });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Forbidden', { status: 403 });
      }
    }

    const messagesToSave = [
      {
        chatId: id,
        id: userMessage.id,
        role: 'user',
        parts: userMessage.parts,
        attachments: userMessage.experimental_attachments ?? [],
        createdAt: new Date(),
      },
    ];

    if (systemMessage) {
      messagesToSave.push({
        chatId: id,
        id: systemMessage.id,
        role: 'system',
        parts: systemMessage.parts,
        attachments: [],
        createdAt: new Date(),
      });
    }

    await saveMessages({
      messages: messagesToSave,
    });

    return createDataStreamResponse({
      execute: async (dataStream) => {
        const tools = {
          buyCredit,
          checkCredits: checkCredits({ session }),
          getPaymentMethods: getPaymentMethods({ session }),
          getWeather,
          createDocument: createDocument({ session, dataStream }),
          updateDocument: updateDocument({ session, dataStream }),
          requestSuggestions: requestSuggestions({
            session,
            dataStream,
          }),
        };

        const proccessedMessages = await processToolCalls(
          {
            messages,
            dataStream,
            tools,
          },
          {
            buyCredit: executeBuyCredit(
              session,
              id,
              messages[messages.length - 1].id,
            ),
          },
          async (processedMessage) => {
            const message = messages.find(
              (item) => item.id === processedMessage.id,
            );

            if (message) {
              await updateMessage({
                id: message.id,
                parts: processedMessage.parts,
              });
            }
          },
        );

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel }),
          messages: proccessedMessages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'checkCredits',
                  'buyCredit',
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                ],
          tools,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          onFinish: async ({ response, usage, toolCalls, toolResults }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });

                const credits = await getCreditsByUserId(session.user.id);

                if (Number(credits) > 0) {
                  await updateUserCredit({
                    userId: session.user.id,
                    amount: (
                      Math.floor(usage.totalTokens / 100) * -1
                    ).toString(),
                    type: 'spend',
                    referenceId: id,
                  });
                }
              } catch (error) {
                console.error(error);
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    const deletedChat = await deleteChatById({ id });

    return Response.json(deletedChat, { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
