import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { rememberAccount } from '@/lib/savedAccounts';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  selectedAvatar: string | null;
  onComplete: () => void;
}
export default function SaveLoginDialog({ open, onOpenChange, userId, email, username, avatarUrl, selectedAvatar, onComplete }: Props) {
  const finish = (remembered: boolean) => {
    if (remembered) rememberAccount({ id: userId, email, username, avatar_url: avatarUrl, selected_avatar: selectedAvatar, remembered });
    onOpenChange(false);
    onComplete();
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Remember this account?</DialogTitle>
        <DialogDescription>Save your account name and email on this device. Switching accounts still requires your password.</DialogDescription>
      </DialogHeader>
      <Button onClick={() => finish(true)}>Remember Account</Button>
      <Button variant="ghost" onClick={() => finish(false)}>Not Now</Button>
    </DialogContent>
  </Dialog>;
}
