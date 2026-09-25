'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, CreditCard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PaymentLinkDialogProps {
  conversationId: string;
  onLinkCreated: (url: string) => void;
  children: React.ReactNode;
}

export function PaymentLinkDialog({ conversationId, onLinkCreated, children }: PaymentLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  async function handleCreate() {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          description: description.trim(),
          conversation_id: conversationId,
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || 'Failed to create payment link');
        return;
      }

      if (data.link && data.link.payment_url) {
        onLinkCreated(`Here is your payment link for ${description || 'the order'}:\n${data.link.payment_url}`);
        setOpen(false);
        setAmount('');
        setDescription('');
      } else {
        toast.error('Unexpected response from server');
      }
    } catch {
      toast.error('Network error creating payment link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CreditCard className="size-4" />
            Create Payment Link
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Generate a Stripe payment link to send in this chat.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount (INR)</Label>
            <Input
              id="payment-amount"
              type="number"
              min="1"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-desc">Description</Label>
            <Input
              id="payment-desc"
              placeholder="e.g., Invoice #1024"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background/50"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !amount} className="gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Generate Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
