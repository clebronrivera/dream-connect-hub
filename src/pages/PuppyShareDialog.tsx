import { useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Facebook, Copy, Download, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPuppyImage } from '@/lib/puppy-display-utils';
import type { Puppy } from '@/lib/supabase';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  puppy: Puppy | null;
}

function getShareUrl(puppy: Puppy): string {
  const id = puppy.id ?? puppy.puppy_id;
  if (!id) return `${window.location.origin}/puppies`;
  return `${window.location.origin}/puppies/${encodeURIComponent(String(id))}`;
}

export function PuppyShareDialog({ open, onOpenChange, puppy }: Props) {
  const { toast } = useToast();

  const handleShareToFacebook = useCallback((p: Puppy) => {
    const url = getShareUrl(p);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      'facebook-share',
      'width=580,height=400,menubar=no,toolbar=no'
    );
  }, []);

  const handleCopyLink = useCallback(
    async (p: Puppy) => {
      const url = getShareUrl(p);
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: 'Link copied',
          description: 'Paste it in Instagram, Facebook, or anywhere to share.',
        });
      } catch {
        window.prompt('Copy this link:', url);
      }
    },
    [toast]
  );

  const handleDownloadImage = useCallback((p: Puppy) => {
    const imgUrl = getPuppyImage(p);
    if (!imgUrl) return;
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `${(p.name || 'puppy').replace(/\s+/g, '-')}-puppy-heaven.jpg`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleNativeShare = useCallback(async (p: Puppy) => {
    const url = getShareUrl(p);
    const text = `Check out ${p.name || 'this puppy'} — ${p.breed} at Puppy Heaven!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${p.name} - Puppy Heaven`, text, url });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard?.writeText(url);
        }
      }
    } else {
      navigator.clipboard?.writeText(url);
    }
  }, []);

  const close = () => onOpenChange(false);

  return (
    <Dialog open={open && !!puppy} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this puppy</DialogTitle>
          <DialogDescription>
            Share {puppy?.name ?? 'this puppy'} on Facebook, copy the link for Instagram or
            stories, or download the photo to post.
          </DialogDescription>
        </DialogHeader>
        {puppy && (
          <div className="grid gap-3 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => {
                handleShareToFacebook(puppy);
                close();
              }}
            >
              <Facebook className="h-5 w-5" />
              Share on Facebook
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={async () => {
                await handleCopyLink(puppy);
                close();
              }}
            >
              <Copy className="h-5 w-5" />
              Copy link (paste in Instagram story or bio)
            </Button>
            {getPuppyImage(puppy) && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => {
                  handleDownloadImage(puppy);
                  close();
                }}
              >
                <Download className="h-5 w-5" />
                Download photo (post to Instagram manually)
              </Button>
            )}
            {typeof navigator !== 'undefined' && navigator.share && (
              <Button
                variant="default"
                className="w-full justify-start gap-3"
                onClick={async () => {
                  await handleNativeShare(puppy);
                  close();
                }}
              >
                <Share2 className="h-5 w-5" />
                Share with your app
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
