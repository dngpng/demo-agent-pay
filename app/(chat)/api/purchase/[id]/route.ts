import { auth } from '@/app/(auth)/auth';
import { getCreditPurchase } from '@/lib/db/queries';
import { z } from 'zod';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const id = params.id;
  if (!id || !z.string().uuid().safeParse(id).success) {
    return new Response('Missing purchase id', { status: 400 });
  }

  try {
    const purchase = await getCreditPurchase({ id, userId: session.user.id });
    if (!purchase) {
      return new Response('Not found', { status: 404 });
    }
    return Response.json(purchase);
  } catch (error) {
    return new Response('Failed to fetch purchase', { status: 500 });
  }
}
