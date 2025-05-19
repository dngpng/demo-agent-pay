import useSWR from 'swr';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { User } from 'next-auth';

export const CREDIT_KEY = `/api/credit`;

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SidebarUserCredit({ user }: { user: User }) {
  const { data, error, isLoading } = useSWR<{ balance: string }>(
    user ? CREDIT_KEY : null,
    fetcher,
  );
  const balance = data?.balance ?? '...';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-10">
              <span>Credits: {isLoading ? '...' : balance}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            className="w-[--radix-popper-anchor-width]"
          >
            <DropdownMenuItem className="cursor-pointer">
              Buy Credits
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              View Credit History
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
