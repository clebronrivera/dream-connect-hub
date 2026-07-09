import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { submitWaitlistSignup } from "@/lib/waitlist-api";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const schema = z.object({
  email: z.string().min(1, "Email is required").regex(emailRegex, "Enter a valid email address"),
  phone: z.string().max(20).optional(),
  sizeInterest: z.string().optional(),
  timeframe: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  /** Pre-fills breed_interest when the surrounding page already knows the breed (e.g. BreedLocation). */
  breedInterest?: string;
  className?: string;
}

export function WaitlistForm({ breedInterest, className }: Props) {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", phone: "", sizeInterest: "", timeframe: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await submitWaitlistSignup({
        email: values.email,
        phone: values.phone || undefined,
        breed_interest: breedInterest || undefined,
        size_interest: values.sizeInterest || undefined,
        timeframe: values.timeframe || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  if (submitted) {
    return (
      <div className={`flex items-center gap-2 text-emerald-400 ${className ?? ""}`}>
        <CheckCircle2 className="h-5 w-5" />
        <span>You're on the list — we'll reach out the moment a matching puppy is ready.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-3 ${className ?? ""}`}>
      <div>
        <Label htmlFor="waitlist-email" className="sr-only">Email</Label>
        <Input
          id="waitlist-email"
          type="email"
          placeholder="you@example.com"
          {...register("email")}
        />
        {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input placeholder="Phone (optional)" {...register("phone")} />
        <Controller
          control={control}
          name="sizeInterest"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Size preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (under 25 lb)</SelectItem>
                <SelectItem value="medium">Medium (25-45 lb)</SelectItem>
                <SelectItem value="large">Large (45+ lb)</SelectItem>
                <SelectItem value="no-preference">No preference</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <Controller
          control={control}
          name="timeframe"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asap">As soon as possible</SelectItem>
                <SelectItem value="1-3-months">1-3 months</SelectItem>
                <SelectItem value="3-6-months">3-6 months</SelectItem>
                <SelectItem value="just-browsing">Just browsing</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <Button type="submit" disabled={isSubmitting} className="bg-[#ff3399] hover:bg-[#ff1a8c]">
        {isSubmitting ? "Joining..." : "Join the waitlist"}
      </Button>
    </form>
  );
}
