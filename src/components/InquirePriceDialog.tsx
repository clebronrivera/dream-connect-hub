// "Inquire about price" / budget-match dialog.
//
// Public puppy prices are not shown on the site. Instead, buyers tell us
// their budget and we send options that fit (or reach out when a match
// becomes available). The submission is funneled through the same
// captcha-gated `submit-contact-message` path the Contact page uses, so it
// lands in `contact_messages` and triggers the existing admin email
// notification — no new backend.

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TurnstileWidget } from "@/components/turnstile/TurnstileWidget";
import { useToast } from "@/hooks/use-toast";
import { insertContactMessage } from "@/lib/contact-messages";
import { formatUSPhone } from "@/lib/puppy-interest-form-schema";

// Budget bands. Per the breeder: minimum $650, maximum $2,500 — never offer
// a band below $650. The last option keeps it open for "send me anything in
// range" buyers.
const BUDGET_OPTIONS = [
  "$650 – $1,000",
  "$1,000 – $1,500",
  "$1,500 – $2,000",
  "$2,000 – $2,500",
  "Flexible — show me options in my range",
] as const;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneDigits = (v: string) => v.replace(/\D/g, "");

const schema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z
    .string()
    .min(1, "Email is required")
    .regex(emailRegex, "Please enter a valid email address"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .refine((v) => phoneDigits(v).length === 10, "Enter a valid 10-digit US phone"),
  budgetRange: z.string().min(1, "Please choose a budget range"),
  contactWhenAvailable: z.boolean().optional(),
  message: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

interface InquirePriceDialogProps {
  /** Optional puppy context — pre-fills the subject and gives us a reference. */
  puppy?: { id?: string; name?: string | null; breed?: string | null } | null;
  /** The trigger element (button) rendered by the caller. */
  children: React.ReactNode;
}

export function InquirePriceDialog({ puppy, children }: InquirePriceDialogProps) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      budgetRange: "",
      contactWhenAvailable: true,
      message: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (SITE_KEY && !token) {
      toast({
        title: "Please complete the verification",
        description: "Check the box to confirm you're human, then try again.",
        variant: "destructive",
      });
      return;
    }

    const puppyLine = puppy?.name
      ? `Puppy of interest: ${puppy.name}${puppy.breed ? ` (${puppy.breed})` : ""}\n`
      : "";
    const message =
      `Budget range: ${values.budgetRange}\n` +
      `Wants to be contacted when a match is available: ${
        values.contactWhenAvailable ? "Yes" : "No"
      }\n` +
      puppyLine +
      (values.message ? `\nMessage: ${values.message}` : "");

    const interestOptions = [
      "Budget inquiry",
      values.contactWhenAvailable ? "Notify when available" : null,
    ].filter((v): v is string => !!v);

    const { error } = await insertContactMessage(
      {
        name: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email,
        phone: phoneDigits(values.phone),
        subject: `Budget inquiry${puppy?.name ? ` — ${puppy.name}` : ""}`,
        message,
        interest_options: interestOptions,
      },
      token
    );

    if (error) {
      toast({
        title: "Something went wrong",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Thanks — we got your budget!",
      description:
        "We'll send you options that fit and reach out when a match becomes available.",
    });
    reset();
    setToken(null);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          reset();
          setToken(null);
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {puppy?.name ? `Inquire about ${puppy.name}` : "Tell us your budget"}
          </DialogTitle>
          <DialogDescription>
            Some pups may fall outside a given budget. Share your range and we'll
            send you options that fit — or reach out when a match becomes
            available.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bi-firstName">First name</Label>
              <Input id="bi-firstName" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bi-lastName">Last name</Label>
              <Input id="bi-lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bi-email">Email</Label>
            <Input id="bi-email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bi-phone">Phone</Label>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Input
                  id="bi-phone"
                  inputMode="tel"
                  placeholder="(123) 456-7890"
                  value={field.value}
                  onChange={(e) => field.onChange(formatUSPhone(e.target.value))}
                />
              )}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bi-budget">Your budget range</Label>
            <Controller
              control={control}
              name="budgetRange"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="bi-budget">
                    <SelectValue placeholder="Select a range" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              A suggestion is fine — it just helps us match you with the right
              pups.
            </p>
            {errors.budgetRange && (
              <p className="text-xs text-destructive">{errors.budgetRange.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bi-message">Anything else? (optional)</Label>
            <Textarea
              id="bi-message"
              rows={3}
              placeholder="Breed, size, timing, or anything that helps us find your match."
              {...register("message")}
            />
          </div>

          <Controller
            control={control}
            name="contactWhenAvailable"
            render={({ field }) => (
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(c) => field.onChange(c === true)}
                  className="mt-0.5"
                />
                <span>Contact me when a puppy in my budget becomes available.</span>
              </label>
            )}
          />

          <TurnstileWidget onVerify={setToken} onExpire={() => setToken(null)} />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send my budget"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
