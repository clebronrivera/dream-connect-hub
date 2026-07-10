import { useQuery } from '@tanstack/react-query';
import { Seo } from '@/components/seo/Seo';
import { fetchWaitlistSignups } from '@/lib/waitlist-api';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone } from 'lucide-react';

export default function WaitlistSignups() {
  const { data: signups = [], isLoading } = useQuery({
    queryKey: ['admin-waitlist-signups'],
    queryFn: fetchWaitlistSignups,
  });

  return (
    <>
      <Seo pageId="admin" canonicalPath="/admin/waitlist" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Waitlist</h1>
          <p className="text-sm text-muted-foreground">
            {signups.length} total signups from the "no matching puppies" empty state
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : signups.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">No waitlist signups yet.</p>
        ) : (
          <div className="space-y-3">
            {signups.map((s) => (
              <div key={s.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {s.email}
                  </span>
                  {s.phone && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {s.phone}
                    </span>
                  )}
                  {s.breed_interest && <Badge variant="secondary">{s.breed_interest}</Badge>}
                  {s.size_interest && <Badge variant="outline">{s.size_interest}</Badge>}
                  {s.timeframe && <Badge variant="outline">{s.timeframe}</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
