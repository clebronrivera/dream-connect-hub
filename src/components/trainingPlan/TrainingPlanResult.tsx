import type { TrainingPlanResult as PlanType } from './TrainingPlanForm';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BUSINESS } from '@/lib/constants/business';
import { Clock, Target, AlertTriangle, Heart, Dog, RotateCcw } from 'lucide-react';

interface Props {
  plan: PlanType;
  onReset: () => void;
}

export function TrainingPlanResult({ plan, onReset }: Props) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6 text-center">
          <Dog className="h-10 w-10 text-primary mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-foreground">
            {plan.dog_name}'s Training Plan
          </h2>
          <p className="text-muted-foreground">{plan.problem_label} · {plan.breed}</p>
          <div className="flex justify-center gap-3 mt-3">
            <Badge variant="secondary">
              <Target className="h-3 w-3 mr-1" /> {plan.difficulty}
            </Badge>
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" /> {plan.timeline}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Training Steps */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          <h3 className="text-lg font-semibold">Training Steps</h3>
          {plan.steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{step.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                <p className="text-xs text-primary mt-2 italic">Pro tip: {step.pro_tip}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Daily Schedule */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-3">Daily Schedule</h3>
          <div className="space-y-2">
            {plan.daily_schedule.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Badge variant="outline" className="min-w-[80px] justify-center">{item.time}</Badge>
                <span className="text-muted-foreground">{item.activity}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mistakes to Avoid */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Mistakes to Avoid
          </h3>
          <ul className="space-y-2">
            {plan.mistakes_to_avoid.map((mistake, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-amber-500 mt-1">•</span>
                {mistake}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Breed Note */}
      {plan.breed_note && (
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-2">Breed-Specific Note</h3>
            <p className="text-sm text-muted-foreground">{plan.breed_note}</p>
          </CardContent>
        </Card>
      )}

      {/* Encouragement */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6 text-center">
          <Heart className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-medium">{plan.encouragement}</p>
        </CardContent>
      </Card>

      {/* CTA + Reset */}
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Love raising a {plan.breed}? {BUSINESS.primaryBrand} raises puppies the same way — at home, with care from day one.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={onReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Generate Another Plan
          </Button>
          <Button asChild>
            <a href={`https://${BUSINESS.website}`}>See Available Puppies</a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {BUSINESS.phone} · {BUSINESS.website} · {BUSINESS.tagline}
        </p>
      </div>
    </div>
  );
}
