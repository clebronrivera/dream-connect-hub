import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Seo } from '@/components/seo/Seo';
import {
  fetchAllTestimonials,
  approveTestimonial,
  featureTestimonial,
  deleteTestimonial,
} from '@/lib/admin/testimonials-service';
import { getTestimonialPhotoUrl } from '@/lib/testimonials-api';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Star, CheckCircle, XCircle, Image } from 'lucide-react';
import { toast } from 'sonner';

type FilterTab = 'all' | 'pending' | 'approved';

export default function TestimonialsList() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterTab>('all');

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: fetchAllTestimonials,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });

  const approveMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) => approveTestimonial(id, approved),
    onSuccess: () => { toast.success('Updated'); invalidate(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const featureMutation = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => featureTestimonial(id, featured),
    onSuccess: () => { toast.success('Updated'); invalidate(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTestimonial,
    onSuccess: () => { toast.success('Deleted'); invalidate(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = testimonials.filter((t) => {
    if (filter === 'pending') return !t.is_approved;
    if (filter === 'approved') return t.is_approved;
    return true;
  });

  const pendingCount = testimonials.filter((t) => !t.is_approved).length;

  return (
    <>
      <Seo pageId="admin" canonicalPath="/admin/testimonials" />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dreamy Reviews</h1>
            <p className="text-sm text-muted-foreground">
              {testimonials.length} total · {pendingCount} pending approval
            </p>
          </div>
          <div className="flex gap-1">
            {([
              { key: 'all', label: 'All' },
              { key: 'pending', label: `Pending (${pendingCount})` },
              { key: 'approved', label: 'Approved' },
            ] as const).map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? 'default' : 'outline'}
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">No testimonials found.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <div
                key={t.id}
                className={`rounded-lg border p-4 ${
                  !t.is_approved ? 'bg-yellow-50/50 border-yellow-200' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Photo thumbnail */}
                  {t.photo_path ? (
                    <img
                      src={getTestimonialPhotoUrl(t.photo_path)}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Image className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{t.customer_name}</span>
                      {t.puppy_name && (
                        <Badge variant="secondary" className="text-xs">{t.puppy_name}</Badge>
                      )}
                      {t.breed && (
                        <Badge variant="outline" className="text-xs">{t.breed}</Badge>
                      )}
                      {!t.is_approved && (
                        <Badge variant="destructive" className="text-xs">Pending</Badge>
                      )}
                      {t.is_featured && (
                        <Badge className="text-xs bg-primary/80">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{t.message}</p>
                    {(t.city || t.state) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {[t.city, t.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {t.is_approved ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-yellow-600" />
                      )}
                      <Switch
                        checked={t.is_approved}
                        onCheckedChange={(checked) =>
                          approveMutation.mutate({ id: t.id, approved: checked })
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      variant={t.is_featured ? 'default' : 'outline'}
                      className="gap-1"
                      onClick={() => featureMutation.mutate({ id: t.id, featured: !t.is_featured })}
                    >
                      <Star className={`h-3 w-3 ${t.is_featured ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm('Delete this testimonial?')) {
                          deleteMutation.mutate(t.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
