import { verifyMessage as verifyEvmMessage } from 'viem';
import { verify } from 'ripple-keypairs';

export async function verifySignature({
  signature,
  payload,
  walletPublicKey,
  timestampTolerance = 1000 * 60 * 1, // 1 minutes
  mode = 'evm',
}: {
  signature: string | undefined;
  payload: Record<string, string> & { timestamp?: number };
  walletPublicKey: string;
  timestampTolerance?: number;
  mode?: 'evm' | 'xrp';
}): Promise<
  { verified: true; error?: never } | { verified: false; error: string }
> {
  if (!signature) {
    return {
      verified: false,
      error: 'Signature is not provided',
    };
  }

  if (!payload.timestamp) {
    return {
      verified: false,
      error: 'Timestamp is missing from payload',
    };
  }

  const { timestamp, ...payloadWithoutTimestamp } = payload;
  const now = Date.now();
  const timeDiff = now - timestamp;
  const timeDiffInSeconds = timeDiff / 1000;

  if (timeDiffInSeconds > timestampTolerance) {
    return {
      verified: false,
      error: 'Timestamp is too old',
    };
  }

  const payloadString = `${Object.keys(payloadWithoutTimestamp)
    .sort()
    .map(
      (key) =>
        `${key}=${JSON.stringify(payloadWithoutTimestamp[key as keyof typeof payloadWithoutTimestamp])}`,
    )
    .join('&')}&timestamp=${timestamp}`;

  const verified =
    mode === 'xrp'
      ? await verfityXrpMessage(payloadString, signature, walletPublicKey)
      : await verifyEvmMessage({
          message: payloadString,
          signature: signature as `0x${string}`,
          address: walletPublicKey as `0x${string}`,
        });

  return verified
    ? { verified: true }
    : { verified: false, error: 'Signature is invalid' };
}

async function verfityXrpMessage(
  message: string,
  signature: string,
  walletPublicKey: string,
) {
  const messageHex = Buffer.from(message, 'utf8').toString('hex');
  const publicKeyHex = Buffer.from(walletPublicKey, 'hex').toString('hex');

  return verify(messageHex, signature, publicKeyHex);
}
