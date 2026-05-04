// src/pages/admin/Newsletter.tsx
// Admin newsletter composer — write and send to opted-in subscribers from puppy inquiries.

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Newspaper, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase-client';
import { fetchNewsletterSubscribers } from '@/lib/admin/agreements-service';

export default function Newsletter() {
  const [subject, setSubject] = useState('');
  const [headline, setHeadline] = useState('');
  const [para1, setPara1] = useState('');
  const [para2, setPara2] = useState('');
  const [para3, setPara3] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [closingNote, setClosingNote] = useState('');

  const { data: subscribers = [], isLoading: subsLoading } = useQuery({
    queryKey: ['newsletter-subscribers'],
    queryFn: fetchNewsletterSubscribers,
  });

  const isValid =
    subject.trim().length > 0 &&
    headline.trim().length > 0 &&
    para1.trim().length > 0 &&
    subscribers.length > 0;

  const sendMut = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('No active session');

      const bodyParagraphs = [para1, para2, para3].filter((p) => p.trim().length > 0);

      const { error, data } = await supabase.functions.invoke('send-newsletter', {
        body: {
          subject: subject.trim(),
          headline: headline.trim(),
          bodyParagraphs,
          ctaText: ctaText.trim() || undefined,
          ctaUrl: ctaUrl.trim() || undefined,
          closingNote: closingNote.trim() || undefined,
          recipientEmails: subscribers.map((s) => s.email),
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;
      return data as { sent: number; failed: number; total: number };
    },
    onSuccess: (data) => {
      const msg =
        data.failed > 0
          ? `Sent to ${data.sent} of ${data.total} subscribers (${data.failed} failed)`
          : `Newsletter sent to ${data.sent} subscriber${data.sent !== 1 ? 's' : ''}`;
      toast.success(msg);
    },
    onError: (err: Error) => toast.error('Send failed: ' + err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Newsletter</h1>
            <p className="text-sm text-muted-foreground">
              Compose and send to opted-in subscribers
            </p>
          </div>
        </div>
        <Card className="py-2 px-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            {subsLoading ? (
              <span className="text-muted-foreground">Loading…</span>
            ) : (
              <>
                <span className="font-semibold">{subscribers.length}</span>
                <span className="text-muted-foreground">opted-in subscriber{subscribers.length !== 1 ? 's' : ''}</span>
              </>
            )}
          </div>
        </Card>
      </div>

      {subscribers.length === 0 && !subsLoading && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          No opted-in subscribers found. Subscribers are customers who checked "Stay connected" when submitting a puppy inquiry.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Composer */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Email Header</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="subject">
                  Subject line <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="subject"
                  placeholder="e.g. Summer 2026 update from Dream Puppies"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="headline">
                  Headline (shown in email body) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="headline"
                  placeholder="e.g. A quick update from our family to yours"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  maxLength={200}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Body</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="para1">
                  Paragraph 1 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="para1"
                  rows={4}
                  placeholder="Write your opening paragraph here…"
                  value={para1}
                  onChange={(e) => setPara1(e.target.value)}
                  maxLength={2000}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="para2">
                  Paragraph 2 <Badge variant="outline" className="ml-2 text-xs font-normal">optional</Badge>
                </Label>
                <Textarea
                  id="para2"
                  rows={3}
                  placeholder="Additional paragraph…"
                  value={para2}
                  onChange={(e) => setPara2(e.target.value)}
                  maxLength={2000}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="para3">
                  Paragraph 3 <Badge variant="outline" className="ml-2 text-xs font-normal">optional</Badge>
                </Label>
                <Textarea
                  id="para3"
                  rows={3}
                  placeholder="Optional closing paragraph…"
                  value={para3}
                  onChange={(e) => setPara3(e.target.value)}
                  maxLength={2000}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Call to Action <Badge variant="outline" className="ml-2 text-xs font-normal">optional</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ctaText">Button label</Label>
                  <Input
                    id="ctaText"
                    placeholder="e.g. See Available Puppies"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ctaUrl">Button URL</Label>
                  <Input
                    id="ctaUrl"
                    type="url"
                    placeholder="https://puppyheavenllc.com/puppies"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    maxLength={500}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Both fields are required for the button to appear. Leave blank to omit.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Closing Note <Badge variant="outline" className="ml-2 text-xs font-normal">optional</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="closingNote"
                rows={2}
                placeholder="e.g. Wishing you and your pups a wonderful summer — The Dream Puppies family"
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                maxLength={500}
              />
            </CardContent>
          </Card>
        </div>

        {/* Send panel */}
        <div className="space-y-5">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ready to send?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipients</span>
                  <span className="font-semibold">{subscribers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subject</span>
                  <span className="font-medium truncate max-w-[140px] text-right">
                    {subject.trim() || <span className="text-muted-foreground italic">not set</span>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paragraphs</span>
                  <span className="font-semibold">
                    {[para1, para2, para3].filter((p) => p.trim()).length}
                  </span>
                </div>
              </div>

              {!isValid && (
                <p className="text-xs text-muted-foreground">
                  Fill in subject, headline, and at least one paragraph to enable sending.
                </p>
              )}

              <Button
                className="w-full"
                onClick={() => sendMut.mutate()}
                disabled={!isValid || sendMut.isPending || subsLoading}
              >
                {sendMut.isPending
                  ? 'Sending…'
                  : `Send to ${subscribers.length} subscriber${subscribers.length !== 1 ? 's' : ''}`}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Each recipient receives an individual email — addresses are not visible to each other.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
