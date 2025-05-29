import type { CoreAssistantMessage, CoreToolMessage, UIMessage } from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Document } from '@/lib/db/schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getMostRecentSystemMessage(messages: Array<UIMessage>) {
  const systemMessages = messages.filter(
    (message) => message.role === 'system',
  );

  return systemMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

export const EVM_TOKEN_ADDRESS =
  process.env.AGENTPAY_EVM_TOKEN_ADDRESS ||
  '0xb31ff0188118a615AebC106FeCb3f5596D5d61E3'; // Mock USDC on Sepolia
export const EVM_TOKEN_DECIMALS = process.env.AGENTPAY_EVM_TOKEN_DECIMALS || 6;
export const EVM_TOKEN_NETWORK =
  process.env.AGENTPAY_EVM_TOKEN_NETWORK || '11155111'; // Sepolia
export const XRP_TOKEN_ADDRESS = process.env.AGENTPAY_XRP_TOKEN_ADDRESS || ''; // Empty for Native XRP
export const XRP_TOKEN_DECIMALS = process.env.AGENTPAY_XRP_TOKEN_DECIMALS || 6;
export const XRP_TOKEN_NETWORK =
  process.env.AGENTPAY_XRP_TOKEN_NETWORK || 'xrpl-testnet'; // Testnet

// Temporary conversion ratios (1 credit = X token)
const CREDIT_TO_EVM_TOKEN_RATIO = 0.01; // 1 credit = 0.01 USDC
const CREDIT_TO_XRP_TOKEN_RATIO = 0.004; // 1 credit = 0.004 XRP

export function calculateAmountToPay(
  amountToPurchase: string,
  provider: 'AgentPay-EVM' | 'AgentPay-XRP',
): string {
  const credits = Number(amountToPurchase);
  if (provider === 'AgentPay-EVM') {
    return BigInt(
      credits *
        CREDIT_TO_EVM_TOKEN_RATIO *
        Math.pow(10, Number(EVM_TOKEN_DECIMALS)),
    ).toString();
  } else if (provider === 'AgentPay-XRP') {
    return BigInt(
      credits *
        CREDIT_TO_XRP_TOKEN_RATIO *
        Math.pow(10, Number(XRP_TOKEN_DECIMALS)),
    ).toString();
  }
  throw new Error('Unsupported provider');
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
