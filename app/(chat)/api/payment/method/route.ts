import { auth } from '@/app/(auth)/auth';
import { getUserPaymentMethods } from '@/lib/db/queries';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const methods = await getUserPaymentMethods(session.user.id);
    return Response.json(methods);
  } catch (error) {
    return new Response('Failed to fetch payment methods', { status: 500 });
  }
}
