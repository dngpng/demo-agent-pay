'use client';

import type { CreditsCheckResult } from '@/lib/ai/tools/check-credits';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';
import useSWR from 'swr';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import { useState } from 'react';
import type { UserPaymentMethod } from '@/lib/db/schema';
import { calculateAmountToPay, fetcher, shortenAddress } from '@/lib/utils';

export default function CreditsCheck({
  result,
  onSubmit,
}: {
  result: CreditsCheckResult;
  onSubmit: (amount: string, paymentMethod: UserPaymentMethod) => void;
}) {
  const { isEnough, balance } = result;
  const [amount, setAmount] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const {
    data: methods,
    isLoading,
    error,
  } = useSWR<UserPaymentMethod[]>('/api/payment/method', fetcher);

  if (isEnough) {
    return null;
  }

  const selectedMethod = methods?.find((m) => m.id === paymentMethodId);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMethod) {
      return;
    }
    onSubmit(amount, selectedMethod);
    setAmount('');
    setPaymentMethodId('');
    setPopoverOpen(false);
  };

  return (
    <div className="border border-dashed p-4 rounded-2xl flex justify-between items-center">
      <p>
        Your current credits:{' '}
        <strong>{Number(balance) < 0 ? 0 : Number(balance)}</strong>
      </p>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button className="shrink-0" variant="secondary">
            Buy Credits
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end">
          <form
            className="flex flex-col gap-6 min-w-[220px]"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="credit-amount">Credit Amount</Label>
              <Input
                id="credit-amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                autoComplete="off"
              />
              <div className="flex gap-2 mt-1">
                {[200, 500, 1000, 5000].map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant={amount === String(v) ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setAmount(String(v))}
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select
                value={paymentMethodId}
                onValueChange={setPaymentMethodId}
              >
                <SelectTrigger id="payment-method">
                  <SelectValue
                    placeholder={isLoading ? 'Loading...' : 'Select method'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {isLoading && (
                    <SelectItem value="" disabled>
                      Loading...
                    </SelectItem>
                  )}
                  {error && (
                    <SelectItem value="" disabled>
                      Error loading
                    </SelectItem>
                  )}
                  {methods?.length === 0 && (
                    <SelectItem value="" disabled>
                      No methods
                    </SelectItem>
                  )}
                  {methods?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex gap-2 items-baseline">
                        <span className="font-bold shrink-0">{m.method}</span>
                        <span className="text-xs font-mono">
                          {shortenAddress(m.reference)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Payment Amount</Label>
              <div className="text-lg flex items-center gap-2">
                {amount && selectedMethod?.method ? (
                  <>
                    <span className="font-bold">
                      {Number(
                        calculateAmountToPay(amount, selectedMethod.method),
                      ) / Math.pow(10, 6)}
                    </span>
                    <span>
                      {selectedMethod.method === 'AgentPay-EVM'
                        ? 'USDC'
                        : 'XRP'}
                    </span>
                  </>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
            <Button type="submit" disabled={!amount || !paymentMethodId}>
              Proceed
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
