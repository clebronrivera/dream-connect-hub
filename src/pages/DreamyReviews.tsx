import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/components/seo/Seo';
import {
  fetchApprovedTestimonials,
  submitTestimonial,
  getTestimonialPhotoUrl,
  type Testimonial,
  type SubmitTestimonialInput,
} from '@/lib/testimonials-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Camera, Send, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { MAIN_BREEDS, OTHER_BREED_OPTION } from '@/lib/breed-utils';
import { US_STATES, resolveStateLabel } from '@/data/statesData';
import { DreamTag } from '@/components/redesign/PublicDesignPrimitives';
import { TurnstileWidget } from '@/components/turnstile/TurnstileWidget';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as
  | string
  | undefined;
const captchaRequired = Boolean(TURNSTILE_SITE_KEY);

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const hasPhoto = !!testimonial.photo_path;

  return (
    <div className="break-inside-avoid mb-5">
      <Card
        className={`overflow-hidden transition-shadow hover:shadow-lg ${
          testimonial.is_featured ? 'ring-2 ring-primary/30' : ''
        }`}
      >
        {hasPhoto && (
          <div className="relative">
            <img
              src={getTestimonialPhotoUrl(testimonial.photo_path!)}
              alt={`${testimonial.puppy_name ?? 'Puppy'} from ${testimonial.customer_name}`}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
            {testimonial.is_featured && (
              <Badge className="absolute top-3 right-3 bg-primaryDeep text-primary-foreground">
                <Heart className="h-3 w-3 mr-1 fill-current" />
                Featured
              </Badge>
            )}
          </div>
        )}
        <CardContent className={`${hasPhoto ? 'pt-4' : 'pt-6'} pb-5 px-5`}>
          {!hasPhoto && testimonial.is_featured && (
            <Badge className="mb-3 bg-primaryDeep text-primary-foreground">
              <Heart className="h-3 w-3 mr-1 fill-current" />
              Featured
            </Badge>
          )}
          <p className="text-foreground leading-relaxed mb-4 italic">
            &ldquo;{testimonial.message}&rdquo;
          </p>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-8 w-8 rounded-full bg-primaryDeep/15 flex items-center justify-center text-primaryDeep font-semibold text-xs">
              {testimonial.customer_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-foreground">{testimonial.customer_name}</p>
              <p className="text-muted-foreground text-xs">
                {[testimonial.puppy_name, testimonial.breed, testimonial.city && testimonial.state ? `${testimonial.city}, ${resolveStateLabel(testimonial.state)}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SubmitDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    puppy_name: '',
    breed: '',
    message: '',
    city: '',
    state: '',
  });
  const [customBreed, setCustomBreed] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: SubmitTestimonialInput) => submitTestimonial(input),
    onSuccess: () => {
      toast.success('Thank you! Your review has been submitted and is pending approval.');
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      setOpen(false);
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function resetForm() {
    setForm({ customer_name: '', puppy_name: '', breed: '', message: '', city: '', state: '' });
    setCustomBreed('');
    setPhoto(null);
    setPhotoPreview(null);
    setTurnstileToken(null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const resolvedBreed = form.breed === OTHER_BREED_OPTION ? customBreed.trim() : form.breed;
    mutation.mutate({
      ...form,
      breed: resolvedBreed || undefined,
      photo: photo ?? undefined,
      turnstile_token: turnstileToken,
    });
  }

  const isOtherBreed = form.breed === OTHER_BREED_OPTION;
  const breedValid = !isOtherBreed || customBreed.trim().length > 0;
  const captchaSatisfied = !captchaRequired || Boolean(turnstileToken);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 rounded-pill font-bold uppercase tracking-[0.06em]">
          <Star className="h-4 w-4" />
          Share Your Story
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Your Dreamy Review</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Tell us how your Dream Puppies pup is doing! Your review will appear after approval.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Your Name *</label>
            <Input
              required
              value={form.customer_name}
              onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
              placeholder="Your name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Puppy's Name</label>
              <Input
                value={form.puppy_name}
                onChange={(e) => setForm((f) => ({ ...f, puppy_name: e.target.value }))}
                placeholder="e.g. Luna"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Breed</label>
              <Select value={form.breed} onValueChange={(v) => { setForm((f) => ({ ...f, breed: v })); if (v !== OTHER_BREED_OPTION) setCustomBreed(''); }}>
                <SelectTrigger><SelectValue placeholder="Select breed..." /></SelectTrigger>
                <SelectContent>
                  {MAIN_BREEDS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                  <SelectItem value={OTHER_BREED_OPTION}>{OTHER_BREED_OPTION}</SelectItem>
                </SelectContent>
              </Select>
              {isOtherBreed && (
                <Input
                  className="mt-2"
                  value={customBreed}
                  onChange={(e) => setCustomBreed(e.target.value)}
                  placeholder="Enter breed name"
                  required
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">City</label>
              <Input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="e.g. Orlando"
              />
            </div>
            <div>
              <label className="text-sm font-medium">State</label>
              <Select value={form.state} onValueChange={(v) => setForm((f) => ({ ...f, state: v }))}>
                <SelectTrigger><SelectValue placeholder="Select state..." /></SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Your Message *</label>
            <Textarea
              required
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="How is your puppy doing? We'd love to hear!"
              rows={4}
            />
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Camera className="h-4 w-4" />
              Add a Photo (optional)
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="cursor-pointer"
            />
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Preview"
                className="mt-2 rounded-lg max-h-40 object-cover"
              />
            )}
          </div>
          {captchaRequired && (
            <div className="flex justify-center">
              <TurnstileWidget
                onVerify={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              type="submit"
              disabled={mutation.isPending || !breedValid || !captchaSatisfied}
              className="gap-2 rounded-pill font-bold uppercase tracking-[0.06em]"
            >
              <Send className="h-4 w-4" />
              {mutation.isPending ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DreamyReviews() {
  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ['testimonials'],
    queryFn: fetchApprovedTestimonials,
  });

  return (
    <Layout>
      <Seo
        title="Dreamy Reviews — Dream Puppies"
        description="See what our happy puppy families are saying! Real stories and photos from Dream Puppies owners across Florida and North Carolina."
        canonicalPath="/dreamy-reviews"
      />

      {/* Hero */}
      <section className="bg-bg py-14 text-white md:py-20">
        <div className="container text-center">
          <DreamTag className="mb-3 bg-sun">Real stories from real homes</DreamTag>
          <h1 className="mb-3 font-display text-4xl uppercase tracking-tight md:text-6xl">
            Dreamy Reviews
          </h1>
          <p className="mx-auto mb-6 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
            Real stories from real families. See how our puppies are doing in their
            forever homes — and share your own!
          </p>
          <SubmitDialog />
        </div>
      </section>

      {/* Masonry Grid */}
      <section className="container py-12 md:py-16">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading reviews...</div>
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-16">
            <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No reviews yet — be the first!</p>
            <SubmitDialog />
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} />
            ))}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="bg-muted/30 py-10">
        <div className="container text-center">
          <p className="mb-3 text-muted-foreground">
            Got a Dream Puppies pup? We'd love to hear from you!
          </p>
          <SubmitDialog />
        </div>
      </section>
    </Layout>
  );
}
