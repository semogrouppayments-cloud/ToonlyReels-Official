import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function AccountDeletion() {
  return <main className="min-h-screen bg-background text-foreground p-6">
    <div className="max-w-xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Delete your ToonlyReels account</h1>
      <p>Sign in, open Settings, and select Delete Account. Confirm the request to remove the account and its uploaded media.</p>
      <p>Account-owned profile, settings, interactions, private documents and media are removed. Transaction audit records may retain amounts and dates with account references removed.</p>
      <p>If you cannot sign in, use the operator support contact in the app’s store listing to request help with account deletion.</p>
      <Button asChild><Link to="/auth">Sign in</Link></Button>
      <p><Link className="underline" to="/privacy-policy">Privacy policy</Link></p>
    </div>
  </main>;
}
