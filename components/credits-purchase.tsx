import type { CreditPurchase, UserPaymentMethod } from '@/lib/db/schema';
import { calculateAmountToPay, fetcher, shortenAddress } from '@/lib/utils';
import useSWR from 'swr';
import { Button } from './ui/button';
import type { BuyCreditParams } from '@/lib/ai/tools/buy-credits';
import Link from 'next/link';
import { useState } from 'react';

export function CreditsPurchaseConfirmation({
  args,
  onConfirm,
  onCancel,
}: {
  args: BuyCreditParams;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { amountToPurchase, paymentMethodId } = args;

  const {
    data: methods,
    isLoading,
    error,
  } = useSWR<UserPaymentMethod[]>('/api/payment/method', fetcher);

  const selectedMethod = methods?.find((m) => m.id === paymentMethodId);

  if (!selectedMethod?.method) {
    return <div>Error: Payment method not found</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="p-6 rounded-2xl border border-dashed">
      <p>Please confirm the credit purchase</p>
      <div className="flex flex-col gap-4 mt-4">
        <p>
          Credits to purchase: <strong>{amountToPurchase}</strong>
        </p>
        <p>
          Payment Method: <strong>{selectedMethod.method}</strong>{' '}
          <span className="text-xs font-mono">
            ({shortenAddress(selectedMethod.reference)})
          </span>
        </p>
        <p>
          Total Payment:{' '}
          <strong>
            {formatPaymentAmount(amountToPurchase, selectedMethod.method)}
          </strong>
        </p>
      </div>

      <div className="flex gap-2 mt-4">
        <Button onClick={onConfirm}>Confirm</Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function CreditsPurchaseLink({ result }: { result: CreditPurchase }) {
  const {
    data: purchase,
    isLoading,
    error,
  } = useSWR<CreditPurchase>(`/api/purchase/${result.id}`, fetcher, {
    fallbackData: result,
    refreshInterval: (data) => {
      if (data?.status === 'pending') {
        return 3000;
      } else {
        return 0;
      }
    },
  });

  const [isPaying, setIsPaying] = useState(false);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!purchase) {
    return <div>Error: Purchase not found</div>;
  }

  if (purchase.status === 'completed') {
    return (
      <div>
        <p>Purchase completed.</p>
      </div>
    );
  }

  if (purchase.status === 'failed') {
    return (
      <div>
        <p>Purchase failed. Please try again.</p>
      </div>
    );
  }

  if (purchase.status === 'pending') {
    if (!purchase.providerReference) {
      return <div>Error: Purchase not found</div>;
    }

    return (
      <div className="flex flex-col gap-2">
        <p>
          Please click the following button to complete the payment on AgentPay.
        </p>

        {isPaying ? (
          <Button disabled={true}>Waiting for confirmation ...</Button>
        ) : (
          <Link
            href={`https://alpha.agentlayer.xyz/pay/${result.providerReference}`}
            target="_blank"
            rel="noreferrer"
          >
            <Button onClick={() => setIsPaying(true)}>Pay with AgentPay</Button>
          </Link>
        )}
      </div>
    );
  }
}

function formatPaymentAmount(
  creditAmount: string,
  method: 'AgentPay-EVM' | 'AgentPay-XRP',
) {
  return (
    <>
      <span className="font-bold">
        {Number(calculateAmountToPay(creditAmount, method)) / Math.pow(10, 6)}
      </span>
      <span>{method === 'AgentPay-EVM' ? 'USDC' : 'XRP'}</span>
    </>
  );
}
