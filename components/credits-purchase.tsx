import type { CreditPurchase, UserPaymentMethod } from '@/lib/db/schema';
import { calculateAmountToPay, fetcher, shortenAddress } from '@/lib/utils';
import useSWR from 'swr';
import { Button } from './ui/button';
import type { BuyCreditParams } from '@/lib/ai/tools/buy-credits';
import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export function CreditsPurchaseConfirmation({
  args,
  isReadonly,
  isLoading,
  onConfirm,
  onCancel,
}: {
  args: BuyCreditParams;
  onConfirm: () => void;
  onCancel: () => void;
  isReadonly: boolean;
  isLoading: boolean;
}) {
  const { amountToPurchase, paymentMethodId } = args;

  const {
    data: methods,
    isLoading: isLoadingMethods,
    error,
  } = useSWR<UserPaymentMethod[]>('/api/payment/method', fetcher);

  const selectedMethod = methods?.find((m) => m.id === paymentMethodId);

  if (!selectedMethod?.method) {
    return <div>Error: Payment method not found</div>;
  }

  if (isLoadingMethods) {
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

      {isLoading ? (
        <div>
          <Button disabled={true} variant="secondary">
            Submitting ...
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 mt-4">
          <Button onClick={onConfirm} disabled={isReadonly}>
            Confirm
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isReadonly}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export function CreditsPurchaseLink({
  result,
}: { result: CreditPurchase | string }) {
  const id = typeof result === 'string' ? null : result.id;
  const fallbackData = typeof result === 'string' ? undefined : result;

  const {
    data: purchase,
    isLoading,
    error,
  } = useSWR<CreditPurchase>(`/api/purchase/${id}`, fetcher, {
    isPaused: () => id !== null,
    fallbackData,
    refreshInterval: (data) => {
      if (data?.status === 'pending') {
        return 3000;
      } else {
        return 0;
      }
    },
  });

  const [isPaying, setIsPaying] = useState(false);

  if (typeof result === 'string') {
    return (
      <div className="flex gap-2 items-center">
        <XCircle className="shrink-0size-4 text-destructive" />
        <p>Error: {result}</p>
      </div>
    );
  }

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
      <div className="flex gap-2 items-center">
        <CheckCircle2 className="shrink-0size-4 text-green-500" />
        <p>Purchase completed.</p>
      </div>
    );
  }

  if (purchase.status === 'failed') {
    return (
      <div className="flex gap-2 items-center">
        <XCircle className="shrink-0size-4 text-destructive" />
        <p>Purchase failed. Please try again.</p>
      </div>
    );
  }

  if (purchase.status === 'pending') {
    if (!purchase.providerReference) {
      return (
        <div className="flex gap-2 items-center">
          <XCircle className="shrink-0size-4 text-destructive" />
          <p>Purchase not found</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 items-start">
        <p>
          Please click the following button to complete the payment on AgentPay.
        </p>

        {isPaying ? (
          <Button disabled={true} className="">
            Waiting for confirmation ...
          </Button>
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
