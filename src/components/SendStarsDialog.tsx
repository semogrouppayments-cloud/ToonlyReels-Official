import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Star, Sparkles } from 'lucide-react';
import StarGiftAnimation from './StarGiftAnimation';

interface SendStarsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorUsername: string;
  videoId: string;
  currentUserId: string;
}

const STAR_AMOUNTS = [1, 5, 10, 50, 100, 500];

const SendStarsDialog = ({ open, onOpenChange, creatorId, creatorUsername, videoId, currentUserId }: SendStarsDialogProps) => {
  const requestRef = useRef<{ id: string; amount: number } | null>(null);
  const sendingRef = useRef(false);
  const [balance, setBalance] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [sending, setSending] = useState(false);
  const [showBuySection, setShowBuySection] = useState(false);
  const [showGiftAnimation, setShowGiftAnimation] = useState(false);
  const [giftAnimationAmount, setGiftAnimationAmount] = useState(0);
  const [starPacks, setStarPacks] = useState<Array<{ id: string; name: string; stars_amount: number; price_cents: number }>>([]);

  useEffect(() => {
    if (open) {
      fetchBalance();
      fetchPacks();
    }
  }, [open]);

  const fetchBalance = async () => {
    const { data } = await supabase
      .from('star_balances')
      .select('balance')
      .eq('user_id', currentUserId)
      .maybeSingle();
    setBalance(data?.balance || 0);
  };

  const fetchPacks = async () => {
    const { data } = await supabase
      .from('star_packs')
      .select('*')
      .eq('is_active', true)
      .order('stars_amount');
    setStarPacks(data || []);
  };

  const handleSendStars = async () => {
    if (sendingRef.current) return;
    if (selectedAmount > balance) {
      setShowBuySection(true);
      return;
    }
    if (!requestRef.current || requestRef.current.amount !== selectedAmount) {
      requestRef.current = { id: crypto.randomUUID(), amount: selectedAmount };
    }
    sendingRef.current = true;
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_stars', {
        _creator_id: creatorId,
        _video_id: videoId,
        _amount: selectedAmount,
        _request_id: requestRef.current.id,
      });
      if (error) throw error;
      setBalance(data);
      requestRef.current = null;
      setGiftAnimationAmount(selectedAmount);
      setShowGiftAnimation(true);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send stars. Your request can be retried.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <>
      {showGiftAnimation && (
        <StarGiftAnimation
          amount={giftAnimationAmount}
          onComplete={() => {
            setShowGiftAnimation(false);
            toast.success(`Sent ${giftAnimationAmount} ⭐ to @${creatorUsername}!`);
          }}
        />
      )}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Send Stars to @{creatorUsername}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Balance */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <span className="text-sm text-muted-foreground">Your Stars</span>
              <span className="font-bold text-lg flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                {balance}
              </span>
            </div>

            {!showBuySection ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {STAR_AMOUNTS.map(amount => (
                    <button
                      key={amount}
                      onClick={() => setSelectedAmount(amount)}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        selectedAmount === amount
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mx-auto mb-0.5" />
                      <span className="text-sm font-medium">{amount}</span>
                    </button>
                  ))}
                </div>

                <Button onClick={handleSendStars} disabled={sending} className="w-full">
                  {sending ? 'Sending...' : `Send ${selectedAmount} ⭐ Stars`}
                </Button>

                <button onClick={() => setShowBuySection(true)} className="w-full text-xs text-primary hover:underline">
                  Star purchase availability
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Star purchases are not available yet.</p>
                <p className="text-xs text-muted-foreground">Existing stars can be gifted. Purchases will become available after payment verification is connected.</p>
                <div className="space-y-2">
                  {starPacks.map(pack => (
                    <button
                      key={pack.id}
                      disabled
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        <div className="text-left">
                          <p className="text-sm font-medium">{pack.name}</p>
                          <p className="text-xs text-muted-foreground">{pack.stars_amount} stars</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary">
                        ${(pack.price_cents / 100).toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
                <Button variant="outline" onClick={() => setShowBuySection(false)} className="w-full">
                  Back
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SendStarsDialog;
