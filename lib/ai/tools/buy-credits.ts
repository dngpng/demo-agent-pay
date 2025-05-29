import { createPayment } from '@/lib/wallet/api';
import { createCreditPurchase, getUserPaymentMethods } from '@/lib/db/queries';
import type { Session } from 'next-auth';
import type { UserPaymentMethod } from '@/lib/db/schema';
import {
  calculateAmountToPay,
  XRP_TOKEN_NETWORK,
  EVM_TOKEN_NETWORK,
  XRP_TOKEN_ADDRESS,
  EVM_TOKEN_ADDRESS,
} from '@/lib/utils';
import { tool } from 'ai';
import { z } from 'zod';
export interface BuyCreditParams {
  paymentMethodId: string;
  amountToPurchase: string; // credits to add
}

export const executeBuyCredit =
  (session: Session, chatId: string, messageId: string) =>
  async ({ paymentMethodId, amountToPurchase }: BuyCreditParams) => {
    const userId = session.user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Fetch payment method
    const methods = await getUserPaymentMethods(userId);
    const paymentMethod = methods.find(
      (m: UserPaymentMethod) => m.id === paymentMethodId,
    );
    if (!paymentMethod) throw new Error('Payment method not found');

    let tokenAddress = '';
    let tokenNetwork = '';
    let provider: 'AgentPay-EVM' | 'AgentPay-XRP';

    if (paymentMethod.method === 'AgentPay-EVM') {
      tokenAddress = EVM_TOKEN_ADDRESS;
      tokenNetwork = EVM_TOKEN_NETWORK;
      provider = 'AgentPay-EVM';
    } else if (paymentMethod.method === 'AgentPay-XRP') {
      tokenAddress = XRP_TOKEN_ADDRESS;
      tokenNetwork = XRP_TOKEN_NETWORK;
      provider = 'AgentPay-XRP';
    } else {
      throw new Error('Unsupported payment method');
    }

    // Calculate amount to pay based on credits and provider
    const amountToPay = calculateAmountToPay(amountToPurchase, provider);

    const description = `Purchase of ${amountToPurchase} credits`;

    const payment = await createPayment({
      from: paymentMethod.reference, // wallet address
      amount: amountToPay,
      tokenAddress,
      tokenNetwork,
      description,
    });

    const [purchase] = await createCreditPurchase({
      userId,
      paymentMethodId,
      amount: amountToPurchase,
      description,
      provider,
      providerReference: payment.id,
      chatId,
      messageId,
    });

    console.log('purchase created: ', purchase.id, 'payment: ', payment.id);

    return purchase;
  };

export const buyCredit = tool({
  description: 'Buy credits',
  parameters: z.object({
    paymentMethodId: z.string().describe('The ID of the payment method to use'),
    amountToPurchase: z.string().describe('The amount of credits to purchase'),
  }),
  // no execute function, we want human in the loop.
});
