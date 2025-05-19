import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  getPurchaseByPaymentId,
  updateCreditPurchase,
  updateUserCredit,
} from '@/lib/db/queries';
import { verifySignature } from '@/lib/signature';

const paymentCallbackPayloadSchema = z.object({
  paymentId: z.string(),
  txnHash: z.string().optional(),
  eventName: z.string(),
  eventType: z.string(),
  eventId: z.string(),
  timestamp: z.number(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;

  if (type !== 'evm' && type !== 'xrp') {
    return new Response('Invalid type', { status: 400 });
  }

  const walletPublicKey =
    type === 'evm'
      ? process.env.AGENT_WALLET_EVM
      : process.env.AGENT_WALLET_XRP;

  if (!walletPublicKey) {
    console.error('Wallet address not setup');
    return new Response('Wallet address not setup', { status: 500 });
  }

  const headers = request.headers;
  const signature = headers.get('x-callback-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  const body = await request.json();

  console.log(
    `[Callback] ${type} / sig:${signature} / body:${JSON.stringify(body)}`,
  );

  const { verified, error } = await verifySignature({
    signature,
    payload: body,
    walletPublicKey,
    mode: type,
  });

  if (!verified) {
    console.error(error);
    return new Response('Fail to verify signature', { status: 400 });
  }

  const payload = paymentCallbackPayloadSchema.safeParse(body);

  if (!payload.success) {
    return new Response('Invalid payload', { status: 400 });
  }

  const { paymentId, eventName, txnHash } = payload.data;

  console.log(
    `[Callback] ${type} / sig:${signature} / paymentId:${paymentId} / eventName:${eventName} / txnHash:${txnHash}`,
  );

  switch (eventName) {
    case 'payment-success':
      return await handlePurchase({ paymentId, status: 'success', txnHash });
    case 'payment-cancelled':
      return await handlePurchase({ paymentId, status: 'cancelled' });
    case 'payment-failed':
      return await handlePurchase({ paymentId, status: 'failed' });
    default:
      return new Response(`Unknown event name: ${eventName}`, { status: 400 });
  }
}

async function handlePurchase({
  paymentId,
  txnHash,
  status,
}: {
  paymentId: string;
  txnHash?: string;
  status: 'success' | 'cancelled' | 'failed';
}) {
  const purchase = await getPurchaseByPaymentId({ paymentId });

  if (!purchase) {
    return new Response('Purchase not found', { status: 404 });
  }

  if (purchase.status !== 'pending') {
    return new Response('Purchase is not pending', { status: 400 });
  }

  try {
    if (status === 'success') {
      await updateCreditPurchase({
        id: purchase.id,
        status: 'completed',
        metadata: {
          txnHash,
        },
      });
      await updateUserCredit({
        userId: purchase.userId,
        amount: purchase.amount,
        type: 'purchase',
        description: `Purchase ${purchase.id}`,
        referenceId: purchase.id,
      });
    } else if (status === 'cancelled') {
      await updateCreditPurchase({
        id: purchase.id,
        status: 'cancelled',
        metadata: {},
      });
    } else if (status === 'failed') {
      await updateCreditPurchase({
        id: purchase.id,
        status: 'failed',
        metadata: {},
      });
    }

    console.info(
      `[Callback] purchase with paymentId:${paymentId} updated to status:${status}`,
    );

    return new Response('Purchase updated', { status: 200 });
  } catch (error) {
    console.error(
      `[Callback] Failed to update purchase in database, paymentId:${paymentId}`,
      error,
    );
    return new Response('Failed to update purchase in database', {
      status: 500,
    });
  }
}
