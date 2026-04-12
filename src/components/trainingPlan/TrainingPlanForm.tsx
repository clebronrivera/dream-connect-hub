import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Send, Dog } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';
import {
  PROBLEM_TYPES,
  LIVING_SITUATIONS,
  EXPERIENCE_LEVELS,
  TIME_OPTIONS,
  FREQUENCY_OPTIONS,
  WEIGHT_RANGES,
  DOG_LOCATION_OPTIONS,
  YES_NO_UNSURE,
  type ProblemTypeKey,
} from '@/lib/constants/trainingPlan';
import { MAIN_BREEDS, OTHER_BREED_OPTION } from '@/lib/breed-utils';

type FormData = {
  // Step 1 - Dog info
  dog_name: string;
  breed: string;
  age: string;
  weight: string;
  // Step 2 - Home info
  living_situation: string;
  has_kids: boolean | null;
  has_other_pets: boolean | null;
  experience_level: string;
  time_per_day: string;
  dog_location: string;
  uses_crate: string;
  uses_pee_pads: string;
  leash_trained: string;
  // Step 3 - Challenge + email
  problem_type: string;
  problem_description: string;
  frequency: string;
  whats_been_tried: string;
  email: string;
};

const initialForm: FormData = {
  dog_name: '',
  breed: '',
  age: '',
  weight: '',
  living_situation: '',
  has_kids: null,
  has_other_pets: null,
  experience_level: '',
  time_per_day: '',
  dog_location: '',
  uses_crate: '',
  uses_pee_pads: '',
  leash_trained: '',
  problem_type: '',
  problem_description: '',
  frequency: '',
  whats_been_tried: '',
  email: '',
};

interface TrainingPlanFormProps {
  defaultProblemType?: ProblemTypeKey;
  onPlanGenerated?: (plan: TrainingPlanResult) => void;
}

export type TrainingPlanResult = {
  dog_name: string;
  breed: string;
  problem_label: string;
  steps: Array<{ title: string; description: string; pro_tip: string }>;
  daily_schedule: Array<{ time: string; activity: string }>;
  mistakes_to_avoid: string[];
  breed_note: string;
  encouragement: string;
  difficulty: string;
  timeline: string;
  commands_to_use?: Array<{ command: string; when_to_use: string; how_to_teach: string }>;
};

export function TrainingPlanForm({ defaultProblemType, onPlanGenerated }: TrainingPlanFormProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    ...initialForm,
    problem_type: defaultProblemType ?? '',
  });
  const [customBreed, setCustomBreed] = useState('');

  const isOtherBreed = form.breed === OTHER_BREED_OPTION;
  const resolvedBreed = isOtherBreed ? customBreed.trim() : form.breed;
  const breedValid = !isOtherBreed || customBreed.trim().length > 0;

  const update = (key: keyof FormData, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        email: form.email,
        dog_name: form.dog_name,
        breed: resolvedBreed || null,
        age: form.age || null,
        weight: form.weight || null,
        living_situation: form.living_situation || null,
        has_kids: form.has_kids,
        has_other_pets: form.has_other_pets,
        experience_level: form.experience_level || null,
        time_per_day: form.time_per_day || null,
        dog_location: form.dog_location || null,
        uses_crate: form.uses_crate || null,
        uses_pee_pads: form.uses_pee_pads || null,
        leash_trained: form.leash_trained || null,
        problem_type: form.problem_type,
        problem_description: form.problem_description || null,
        frequency: form.frequency || null,
        whats_been_tried: form.whats_been_tried || null,
      };

      // Call edge function (handles lead capture + Claude API)
      const { data, error } = await supabase.functions.invoke('generate-training-plan', {
        body: payload,
      });

      if (error || !data) {
        // Fallback: save lead capture directly, return a static plan
        // Only insert columns that exist in the DB table (exclude prompt-only fields)
        const { dog_location: _dl, uses_crate: _uc, uses_pee_pads: _up, leash_trained: _lt, ...dbPayload } = payload;
        await supabase.from('training_plan_submissions').insert(dbPayload);

        const problemInfo = PROBLEM_TYPES.find((p) => p.key === form.problem_type);
        return {
          dog_name: form.dog_name,
          breed: resolvedBreed || 'Mixed Breed',
          problem_label: problemInfo?.label ?? form.problem_type,
          difficulty: 'Moderate',
          timeline: '2-4 weeks',
          steps: [
            { title: 'Establish a Routine', description: `Create a consistent daily schedule for ${form.dog_name}. Dogs thrive on predictability.`, pro_tip: 'Set alarms on your phone for key training times to build consistency.' },
            { title: 'Positive Reinforcement', description: 'Reward desired behaviors immediately with treats, praise, or play.', pro_tip: 'Use high-value treats (small, soft, smelly) for training sessions.' },
            { title: 'Short Training Sessions', description: 'Keep sessions to 5-10 minutes to maintain focus and enthusiasm.', pro_tip: 'End on a positive note — always finish with something your dog does well.' },
            { title: 'Gradual Progression', description: 'Slowly increase difficulty as your dog masters each step.', pro_tip: 'If your dog struggles, go back to the previous step and build confidence.' },
            { title: 'Patience & Consistency', description: 'Every family member should use the same commands and rules.', pro_tip: 'Keep a training log to track progress and identify patterns.' },
          ],
          daily_schedule: [
            { time: 'Morning', activity: 'Quick training session (5 min) + exercise' },
            { time: 'Midday', activity: 'Practice commands during meal time' },
            { time: 'Afternoon', activity: 'Socialization or new environment exposure' },
            { time: 'Evening', activity: 'Training session (5-10 min) + calm bonding' },
          ],
          mistakes_to_avoid: [
            'Punishing unwanted behavior instead of redirecting',
            'Inconsistent rules between family members',
            'Training sessions that are too long',
            'Expecting results too quickly',
          ],
          breed_note: resolvedBreed
            ? `${resolvedBreed}s are known for their intelligence and may pick up training quickly, but they can also be stubborn. Stay patient and keep sessions fun.`
            : 'Every dog learns at their own pace. Focus on building a positive relationship.',
          encouragement: `You're already taking a great step by seeking guidance for ${form.dog_name}! With consistency and patience, you'll see real progress.`,
        } satisfies TrainingPlanResult;
      }

      return data as TrainingPlanResult;
    },
    onSuccess: (plan) => {
      toast.success('Your training plan is ready!');
      onPlanGenerated?.(plan);
    },
    onError: (err: Error) => {
      toast.error(`Failed to generate plan: ${err.message}`);
    },
  });

  const canAdvanceStep1 = form.dog_name.trim().length > 0 && breedValid;
  const canAdvanceStep2 = true; // All step 2 fields are optional
  const canSubmitStep3 = form.problem_type && form.email.includes('@');

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="pt-6 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s === step ? 'bg-primary text-primary-foreground' : s < step ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-green-300' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Dog Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Dog className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">About Your Dog</h2>
            </div>
            <div>
              <Label>Dog's Name *</Label>
              <Input
                value={form.dog_name}
                onChange={(e) => update('dog_name', e.target.value)}
                placeholder="e.g. Bella"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Breed</Label>
                <Select value={form.breed} onValueChange={(v) => { update('breed', v); if (v !== OTHER_BREED_OPTION) setCustomBreed(''); }}>
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
                  />
                )}
              </div>
              <div>
                <Label>Age</Label>
                <Input
                  value={form.age}
                  onChange={(e) => update('age', e.target.value)}
                  placeholder="e.g. 4 months"
                />
              </div>
            </div>
            <div>
              <Label>Weight (optional)</Label>
              <Select value={form.weight} onValueChange={(v) => update('weight', v)}>
                <SelectTrigger><SelectValue placeholder="Select weight range..." /></SelectTrigger>
                <SelectContent>
                  {WEIGHT_RANGES.map((w) => (
                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canAdvanceStep1}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Home Info */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your Home Environment</h2>
            <div>
              <Label>Living Situation</Label>
              <Select value={form.living_situation} onValueChange={(v) => update('living_situation', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {LIVING_SITUATIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kids in household?</Label>
                <div className="flex gap-2 mt-1">
                  {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(({ val, label }) => (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={form.has_kids === val ? 'default' : 'outline'}
                      onClick={() => update('has_kids', val)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Other pets?</Label>
                <div className="flex gap-2 mt-1">
                  {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(({ val, label }) => (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={form.has_other_pets === val ? 'default' : 'outline'}
                      onClick={() => update('has_other_pets', val)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Experience Level</Label>
                <Select value={form.experience_level} onValueChange={(v) => update('experience_level', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Time Available Daily</Label>
                <Select value={form.time_per_day} onValueChange={(v) => update('time_per_day', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Where does your dog stay?</Label>
              <Select value={form.dog_location} onValueChange={(v) => update('dog_location', v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {DOG_LOCATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Using a crate?</Label>
                <Select value={form.uses_crate} onValueChange={(v) => update('uses_crate', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {YES_NO_UNSURE.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Using pee pads?</Label>
                <Select value={form.uses_pee_pads} onValueChange={(v) => update('uses_pee_pads', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {YES_NO_UNSURE.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Leash trained?</Label>
                <Select value={form.leash_trained} onValueChange={(v) => update('leash_trained', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {YES_NO_UNSURE.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canAdvanceStep2}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Challenge + Email */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">The Challenge</h2>
            <div>
              <Label>What are you working on? *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {PROBLEM_TYPES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => update('problem_type', p.key)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-colors ${
                      form.problem_type === p.key
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <span className="text-lg">{p.icon}</span>
                    <span className="font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Describe the behavior (optional)</Label>
              <Textarea
                value={form.problem_description}
                onChange={(e) => update('problem_description', e.target.value)}
                placeholder="When does it happen? Any specific triggers?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>How often?</Label>
                <Select value={form.frequency} onValueChange={(v) => update('frequency', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>What have you tried?</Label>
                <Input
                  value={form.whats_been_tried}
                  onChange={(e) => update('whats_been_tried', e.target.value)}
                  placeholder="e.g. treats, timeouts..."
                />
              </div>
            </div>

            {/* Email - Required */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
              <Label className="font-medium">Where should we send your plan? *</Label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="your@email.com"
              />
              <p className="text-xs text-muted-foreground">
                We'll email you a copy of your PDF. We don't spam — just your plan.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!canSubmitStep3 || submitMutation.isPending}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {submitMutation.isPending ? 'Generating...' : 'Generate My Plan'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
