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
import { StickerButton } from '@/components/redesign/PublicDesignPrimitives';
import { TurnstileWidget } from '@/components/turnstile/TurnstileWidget';
import { GalacticHomeMiniFooter } from '@/components/home/GalacticHomeMiniFooter';
import { GalacticHomeNav, GALACTIC_HOME_SMS_HREF, GALACTIC_HOME_TEL_HREF } from '@/components/home/GalacticHomeNav';
import { GalacticPawCanvas } from '@/components/GalacticPawCanvas';
import { MessageCircle, Phone } from 'lucide-react';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as
  | string
  | undefined;
const captchaRequired = Boolean(TURNSTILE_SITE_KEY);
const pageShellClass = 'min-h-screen bg-[#0f041b] text-white';
const containerClass = 'mx-auto max-w-screen-2xl px-6 md:px-8';
const sectionCardClass = 'rounded-3xl border border-white/10 bg-[#12051f]/90 backdrop-blur-xl';
const glossyStickerBaseClass =
  'group relative overflow-hidden rounded-3xl px-8 py-3 text-sm font-bold normal-case tracking-normal before:pointer-events-none before:absolute before:inset-x-3 before:top-1.5 before:h-[48%] before:rounded-full before:bg-white/25 before:blur-md before:content-[\'\']';
const pinkStickerClass =
  `${glossyStickerBaseClass} bg-[#ff3399] text-white shadow-[0_6px_0_#ff66b3,0_14px_30px_rgba(255,102,179,0.45)] hover:bg-[#ff1a8c] hover:shadow-[0_6px_0_#ff85c2,0_16px_34px_rgba(255,133,194,0.5)]`;
const violetStickerClass =
  `${glossyStickerBaseClass} bg-[#5b21b6] text-white shadow-[0_6px_0_#7c3aed,0_14px_30px_rgba(124,58,237,0.45)] hover:bg-[#7c3aed] hover:shadow-[0_6px_0_#a78bfa,0_16px_34px_rgba(167,139,250,0.5)]`;

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const hasPhoto = !!testimonial.photo_path;

  return (
    <div className="break-inside-avoid mb-5">
      <Card
        className={`overflow-hidden border-white/10 bg-[#12051f]/90 text-white transition-shadow hover:shadow-lg ${
          testimonial.is_featured ? 'ring-2 ring-[#ff3399]/40' : ''
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
              <Badge className="absolute top-3 right-3 bg-[#ff3399] text-white">
                <Heart className="h-3 w-3 mr-1 fill-current" />
                Featured
              </Badge>
            )}
          </div>
        )}
        <CardContent className={`${hasPhoto ? 'pt-4' : 'pt-6'} pb-5 px-5`}>
          {!hasPhoto && testimonial.is_featured && (
            <Badge className="mb-3 bg-[#ff3399] text-white">
              <Heart className="h-3 w-3 mr-1 fill-current" />
              Featured
            </Badge>
          )}
          <p className="text-white leading-relaxed mb-4 italic">
            &ldquo;{testimonial.message}&rdquo;
          </p>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white font-semibold text-xs">
              {testimonial.customer_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-white">{testimonial.customer_name}</p>
              <p className="text-white/70 text-xs">
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
    <Layout bare>
      <Seo pageId="dreamyReviews" />
      <div className={pageShellClass}>
        <GalacticHomeNav />

      {/* Hero */}
      <section
        className="relative overflow-hidden border-b border-white/10 py-14 text-white md:py-20"
        style={{
          background: 'radial-gradient(circle at 50% 25%, #2a0f3a 0%, #1a0a2e 40%, #0f041b 80%)',
        }}
      >
        <GalacticPawCanvas className="absolute inset-0 z-0 opacity-80" />
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0f041b]/60 via-transparent to-[#0f041b]/80" />
        <div className={`relative z-20 text-center ${containerClass}`}>
          <h1 className="mb-3 font-display text-4xl uppercase tracking-tight md:text-6xl">
            Dreamy Reviews
          </h1>
          <p className="mx-auto mb-6 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
            Real stories from real families. See how our puppies are doing in their
            forever homes - and share your own.
          </p>
          <SubmitDialog />
        </div>
      </section>

      {/* Masonry Grid */}
      <section className="border-b border-white/10 bg-[#0a0214] py-12 md:py-16">
        <div className={containerClass}>
        {isLoading ? (
          <div className={`${sectionCardClass} flex justify-center py-12`}>
            <div className="animate-pulse text-white/70">Loading reviews...</div>
          </div>
        ) : testimonials.length === 0 ? (
          <div className={`${sectionCardClass} text-center py-16`}>
            <Star className="h-12 w-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/70 mb-2">No reviews yet - be the first!</p>
            <SubmitDialog />
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} />
            ))}
          </div>
        )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-10">
        <div className={`${containerClass} text-center`}>
          <p className="mb-3 text-white/75">
            Got a Dream Puppies pup? We'd love to hear from you!
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <SubmitDialog />
            <StickerButton size="lg" className={pinkStickerClass} asChild>
              <a href={GALACTIC_HOME_SMS_HREF} className="inline-flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Text us now
              </a>
            </StickerButton>
            <StickerButton size="lg" className={violetStickerClass} asChild>
              <a href={GALACTIC_HOME_TEL_HREF} className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Call
              </a>
            </StickerButton>
          </div>
        </div>
      </section>
      <GalacticHomeMiniFooter />
      </div>
    </Layout>
  );
}
