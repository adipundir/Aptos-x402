import { auth } from '@/lib/auth';
import { UserMenuClient } from './UserMenuClient';

export async function UserMenu() {
  const session = await auth();

  return <UserMenuClient session={session} />;
}
