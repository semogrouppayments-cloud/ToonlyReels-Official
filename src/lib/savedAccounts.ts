export interface SavedAccount {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  selected_avatar: string | null;
  remembered: boolean;
}
const key = 'toonreels_saved_accounts';
export const readSavedAccounts = (): SavedAccount[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(value)) return [];
    const accounts = value.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
      .filter(row => typeof row.id === 'string' && typeof row.email === 'string')
      .slice(0, 3).map(row => ({
        id: row.id as string, email: row.email as string,
        username: typeof row.username === 'string' ? row.username : 'Account',
        avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
        selected_avatar: typeof row.selected_avatar === 'string' ? row.selected_avatar : null,
        remembered: row.remembered === true,
      }));
    // Discard legacy reversible PINs and any other unknown fields.
    localStorage.setItem(key, JSON.stringify(accounts));
    return accounts;
  } catch { return []; }
};
export const rememberAccount = (account: SavedAccount) => {
  const accounts = readSavedAccounts().filter(row => row.id !== account.id);
  localStorage.setItem(key, JSON.stringify([account, ...accounts].slice(0, 3)));
};
