import { tool } from 'ai';
import { z } from 'zod';
import { getCreditsByUserId } from '@/lib/db/queries';
import type { Session } from 'next-auth';

interface CheckCreditsProps {
  session: Session;
}

export const creditsCheckResultSchema = z.object({
  isEnough: z.boolean(),
  balance: z.string(),
  message: z.string(),
});

export type CreditsCheckResult = z.infer<typeof creditsCheckResultSchema>;

export const checkCredits = ({ session }: CheckCreditsProps) =>
  tool({
    description:
      'Check if the user has enough credits (greater than zero) to continue.',
    parameters: z.object({}),
    execute: async (): Promise<CreditsCheckResult> => {
      const userId = session.user?.id;
      if (!userId) {
        return {
          isEnough: false,
          balance: '0',
          message: 'User session or user ID not found.',
        };
      }
      const balance = await getCreditsByUserId(userId);
      const numericBalance = Number(balance);
      const isEnough = numericBalance > 0;
      return {
        isEnough,
        balance: balance.toString(),
        message: isEnough
          ? 'User has enough credits to continue.'
          : 'User does not have enough credits to continue.',
      };
    },
  });
