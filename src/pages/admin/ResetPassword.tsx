import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle } from 'lucide-react';

type PageState = 'loading' | 'ready' | 'success' | 'invalid';

export default function ResetPassword() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash as
    // #access_token=...&type=recovery  (or as query params in PKCE flow).
    // onAuthStateChange fires a PASSWORD_RECOVERY event when it detects this.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPageState('ready');
        }
      }
    );

    // Also handle the case where the session was already restored before
    // this component mounted (e.g. hard refresh on the reset URL).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPageState('ready');
      } else {
        // Give the hash-based token a moment to be picked up by the listener
        const timer = setTimeout(() => {
          setPageState((prev) => (prev === 'loading' ? 'invalid' : prev));
        }, 2000);
        return () => clearTimeout(timer);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both fields are identical.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Choose a password with at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setSubmitting(false);
    } else {
      setPageState('success');
      setTimeout(() => navigate('/admin', { replace: true }), 2500);
    }
  };

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg px-4">
        <p className="text-muted-foreground text-sm">Verifying reset link…</p>
      </div>
    );
  }

  if (pageState === 'invalid') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg px-4">
        <Card className="w-full max-w-md border-line shadow-sticker">
          <CardHeader>
            <CardTitle className="font-display text-2xl text-ink flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              Link expired or invalid
            </CardTitle>
            <CardDescription>
              This reset link is no longer valid. Request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/admin/forgot-password">
              <Button className="w-full">Request a new reset link</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg px-4">
        <Card className="w-full max-w-md border-line shadow-sticker">
          <CardContent className="pt-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="font-display text-xl text-ink">Password updated!</p>
            <p className="text-sm text-muted-foreground">
              Signing you in to the admin dashboard…
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg px-4">
      <Card className="w-full max-w-md border-line shadow-sticker">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-ink">
            Set a new password
          </CardTitle>
          <CardDescription>
            Choose a strong password for your admin account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Saving…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
