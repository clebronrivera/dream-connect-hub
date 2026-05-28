import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const { signIn, signOut, user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (user && isAdmin) {
      navigate('/admin', { replace: true });
    } else if (user && !isAdmin && formLoading) {
      // Auth succeeded but this account has no admin profile — don't just spin forever
      toast({
        title: 'Access denied',
        description: 'This account does not have admin access. Use an authorised admin email.',
        variant: 'destructive',
      });
      signOut();
      setFormLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Sign-in failed',
        description: error.message,
        variant: 'destructive',
      });
      // Only re-enable the button on failure.
      // On success the onAuthStateChange → checkAdminStatus cycle will trigger
      // the useEffect redirect above, which unmounts this component — no need
      // to reset formLoading and risk the user clicking Sign In a second time
      // before navigation fires.
      setFormLoading(false);
    }
    // success: stay in "Signing in…" state until navigation unmounts
  };

  return (
    <>
      <Seo pageId="adminLogin" />
      <div className="flex items-center justify-center min-h-screen bg-bg px-4">
        <Card className="w-full max-w-md border-line shadow-sticker">
          <CardHeader>
            <CardTitle className="font-display text-2xl text-ink">Dream Puppies — Admin</CardTitle>
            <CardDescription>Sign in to manage the site</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={formLoading}>
                {formLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center">
                <Link
                  to="/admin/forgot-password"
                  className="text-sm text-muted-foreground hover:text-ink underline"
                >
                  Forgot password?
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
