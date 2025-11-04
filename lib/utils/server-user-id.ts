import { cookies } from 'next/headers';
import { USER_ID_COOKIE } from './user-id';

const DEFAULT_USER_ID = 'default-user';

export async function getServerUserId(): Promise<string> {
  const store = await cookies();
  const userId = store.get(USER_ID_COOKIE)?.value;
  return userId ?? DEFAULT_USER_ID;
}
