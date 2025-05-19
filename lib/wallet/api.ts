import { z } from 'zod';

const WALLET_API_URL = 'https://alpha-wallet.agentlayer.xyz/api';

const createPaymentPayload = z.object({
  from: z.string(),
  amount: z.string(),
  tokenAddress: z.string(),
  tokenNetwork: z.string(),
  description: z.string(),
  expiredInMinutes: z.number().optional(),
});

type CreatePaymentPayload = z.infer<typeof createPaymentPayload>;

const createPaymentResponse = z.object({
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED']),
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  expiredAt: z.coerce.date(),
  from: z.string(),
  to: z.string(),
  tokenNetwork: z.string(),
  tokenAddress: z.string(),
  description: z.string(),
  metadata: z.record(z.unknown()),
  txnHash: z.string().nullable(),
  callbackUrl: z.string().nullable(),
  amount: z.string(),
});

type CreatePaymentResponse = z.infer<typeof createPaymentResponse>;

export async function createPayment(
  payload: CreatePaymentPayload,
): Promise<CreatePaymentResponse> {
  const isXRP = payload.tokenNetwork.includes('xrpl');

  const response = await fetch(`${WALLET_API_URL}/agent/payment`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'X-WALLET-KEY':
        (isXRP
          ? process.env.AGENT_WALLET_KEY_XRP
          : process.env.AGENT_WALLET_KEY_EVM) ?? '',
    },
  });

  const data = await response.json();

  return createPaymentResponse.parse(data);
}

// TODO:
export async function processCallback(payload: any) {
  return '';
}
