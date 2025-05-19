import { getUserPaymentMethods } from '@/lib/db/queries';
import { tool } from 'ai';
import type { Session } from 'next-auth';
import { z } from 'zod';

interface CheckCreditsProps {
  session: Session;
}

export const paymentMethodsSchema = z.object({
  message: z.string(),
  methods: z.array(
    z.object({
      id: z.string(),
      method: z.string(),
    }),
  ),
});

export type PaymentMethods = z.infer<typeof paymentMethodsSchema>;

export const getPaymentMethods = ({ session }: CheckCreditsProps) =>
  tool({
    description: 'Get the payment methods for the user.',
    parameters: z.object({}),
    execute: async (): Promise<PaymentMethods> => {
      const userId = session.user?.id;
      if (!userId) {
        return {
          message: 'User session or user ID not found.',
          methods: [],
        };
      }

      const methods = await getUserPaymentMethods(userId);

      return {
        message: 'Payment methods retrieved successfully.',
        methods: methods.map((method) => ({
          id: method.id,
          method: method.method,
        })),
      };
    },
  });
