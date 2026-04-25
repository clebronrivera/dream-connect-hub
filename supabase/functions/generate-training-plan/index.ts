import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyTurnstileToken } from "../_shared/turnstile.ts";
import { getAdminRecipients, sendEmail } from "../_shared/email/send.ts";
import {
  escape as escHtml,
  heading as hEl,
} from "../_shared/email/components.ts";
import {
  adminNewTrainingLead,
  trainingPlanDelivery,
} from "../_shared/email/templates.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface TrainingPlanRequest {
  email: string;
  dog_name: string;
  breed?: string;
  age?: string;
  weight?: string;
  living_situation?: string;
  has_kids?: boolean;
  has_other_pets?: boolean;
  experience_level?: string;
  time_per_day?: string;
  dog_location?: string;
  uses_crate?: string;
  uses_pee_pads?: string;
  leash_trained?: string;
  problem_type: string;
  problem_description?: string;
  frequency?: string;
  whats_been_tried?: string;
  turnstile_token?: string;
}

const PROBLEM_LABELS: Record<string, string> = {
  potty_training: "Potty Training",
  biting_nipping: "Biting & Nipping",
  crate_training: "Crate Training",
  excessive_barking: "Excessive Barking",
  separation_anxiety: "Separation Anxiety",
  leash_pulling: "Leash Pulling",
  jumping_on_people: "Jumping on People",
  not_coming_when_called: "Recall Training",
};

function buildPrompt(data: TrainingPlanRequest): string {
  const problemLabel = PROBLEM_LABELS[data.problem_type] ?? data.problem_type;
  const parts: string[] = [
    `You are a certified professional dog trainer creating a personalized, actionable training plan.`,
    ``,
    `## Dog Profile`,
    `- Name: ${data.dog_name}`,
    `- Breed: ${data.breed || "Unknown/Mixed"}`,
    `- Age: ${data.age || "Not specified"}`,
    `- Weight: ${data.weight || "Not specified"}`,
    ``,
    `## Owner & Home`,
    `- Living situation: ${data.living_situation || "Not specified"}`,
    `- Kids in home: ${data.has_kids === true ? "Yes" : data.has_kids === false ? "No" : "Not specified"}`,
    `- Other pets: ${data.has_other_pets === true ? "Yes" : data.has_other_pets === false ? "No" : "Not specified"}`,
    `- Experience level: ${data.experience_level || "Not specified"}`,
    `- Training time per day: ${data.time_per_day || "Not specified"}`,
    `- Dog stays: ${data.dog_location || "Not specified"}`,
    `- Uses a crate: ${data.uses_crate || "Not specified"}`,
    `- Uses pee pads: ${data.uses_pee_pads || "Not specified"}`,
    `- Leash trained: ${data.leash_trained || "Not specified"}`,
    ``,
    `## Challenge: ${problemLabel}`,
    `- Frequency: ${data.frequency || "Not specified"}`,
  ];

  if (data.problem_description) {
    parts.push(`- Description: ${data.problem_description}`);
  }
  if (data.whats_been_tried) {
    parts.push(`- Already tried: ${data.whats_been_tried}`);
  }

  parts.push(
    ``,
    `## Instructions`,
    `Create a detailed, personalized training plan. Requirements:`,
    `- Be SPECIFIC to this breed, age, weight, and living situation — no generic advice.`,
    `- Use positive reinforcement only.`,
    `- Include exact verbal commands the owner should use (e.g. "Sit", "Place", "Leave it") with the exact tone and timing.`,
    `- Describe specific socialization activities appropriate for the dog's breed and age.`,
    `- Structure steps as week-by-week progressions with clear behavior chains (step-by-step sequences).`,
    `- Each step description should be 4-6 sentences with actionable detail.`,
    `- Address the owner in second person.`,
    ``,
    `Return ONLY valid JSON matching this exact schema (no markdown, no code fences):`,
    `{`,
    `  "steps": [{ "title": "string", "description": "string (4-6 sentences, specific and actionable)", "pro_tip": "string" }],`,
    `  "daily_schedule": [{ "time": "string (Morning/Midday/Afternoon/Evening/Bedtime)", "activity": "string" }],`,
    `  "commands_to_use": [{ "command": "string (exact verbal command)", "when_to_use": "string", "how_to_teach": "string (step-by-step)" }],`,
    `  "mistakes_to_avoid": ["string"],`,
    `  "breed_note": "string (breed-specific insight, 2-3 sentences)",`,
    `  "encouragement": "string (motivating closing message mentioning the dog by name)",`,
    `  "difficulty": "string (Easy/Moderate/Challenging)",`,
    `  "timeline": "string (e.g. '1-2 weeks', '2-4 weeks')"`,
    `}`,
    ``,
    `Provide 5-7 steps (with week-by-week progression), 4-5 schedule entries, 3-5 commands, and 4-5 mistakes. Tailor everything to ${data.dog_name}.`
  );

  return parts.join("\n");
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }

  let body: TrainingPlanRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!body.email || !body.dog_name || !body.problem_type) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: email, dog_name, problem_type" }),
      {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }

  // --- Turnstile verification ---
  const remoteIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const turnstileResult = await verifyTurnstileToken(
    body.turnstile_token,
    remoteIp
  );
  if (!turnstileResult.ok) {
    return new Response(
      JSON.stringify({
        error: "Captcha verification failed",
        codes: turnstileResult.errorCodes ?? [],
      }),
      {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Save submission for lead capture
  const { error: insertError } = await supabase
    .from("training_plan_submissions")
    .insert({
      email: body.email,
      dog_name: body.dog_name,
      breed: body.breed || null,
      age: body.age || null,
      weight: body.weight || null,
      living_situation: body.living_situation || null,
      has_kids: body.has_kids ?? null,
      has_other_pets: body.has_other_pets ?? null,
      experience_level: body.experience_level || null,
      time_per_day: body.time_per_day || null,
      problem_type: body.problem_type,
      problem_description: body.problem_description || null,
      frequency: body.frequency || null,
      whats_been_tried: body.whats_been_tried || null,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: req.headers.get("user-agent") || null,
    });

  if (insertError) {
    console.error("Failed to save submission:", insertError);
  }

  // Call Anthropic Claude API
  const prompt = buildPrompt(body);
  let claudeResponse: Response;

  try {
    claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    console.error("Anthropic API request failed:", err);
    return new Response(
      JSON.stringify({ error: "Failed to reach AI service" }),
      {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }

  if (!claudeResponse.ok) {
    const errBody = await claudeResponse.text();
    console.error("Anthropic API error:", claudeResponse.status, errBody);
    return new Response(
      JSON.stringify({ error: "AI service returned an error", status: claudeResponse.status }),
      {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      }
    );
  }

  const claudeData = await claudeResponse.json();
  const rawText = claudeData?.content?.[0]?.text ?? "";

  // Parse the JSON from Claude's response
  let plan: Record<string, unknown>;
  try {
    plan = JSON.parse(rawText);
  } catch {
    // Try extracting JSON from potential markdown wrapping
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        plan = JSON.parse(jsonMatch[0]);
      } catch {
        console.error("Failed to parse extracted JSON:", rawText.slice(0, 500));
        return new Response(
          JSON.stringify({ error: "Failed to parse AI response" }),
          {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      console.error("No JSON found in response:", rawText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "AI response did not contain valid plan data" }),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }
  }

  const problemLabel = PROBLEM_LABELS[body.problem_type] ?? body.problem_type;
  const result = {
    dog_name: body.dog_name,
    breed: body.breed || "Mixed Breed",
    problem_label: problemLabel,
    ...plan,
  };

  // Mark submission as generated
  await supabase
    .from("training_plan_submissions")
    .update({ plan_generated_at: new Date().toISOString() })
    .eq("email", body.email)
    .eq("dog_name", body.dog_name)
    .is("plan_generated_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  // --- O3: Email plan to customer (fire-and-log; don't block response on failure) ---
  try {
    const planHtml = renderPlanHtml(plan, problemLabel);
    const tpl = trainingPlanDelivery({
      customerName: body.dog_name, // greet with dog's name fallback — we don't collect owner name
      dogName: body.dog_name,
      planHtml,
    });
    const r = await sendEmail({
      to: body.email,
      subject: tpl.subject,
      html: tpl.html,
    });
    if (!r.ok) console.error("Customer plan email failed:", r.error);
  } catch (err) {
    console.error("Customer plan email threw:", err);
  }

  // --- G12: Notify admin of new lead ---
  try {
    const admins = getAdminRecipients();
    if (admins.length > 0) {
      const tpl = adminNewTrainingLead({
        customerEmail: body.email,
        dogName: body.dog_name,
        breed: body.breed || "Unknown",
        problemType: problemLabel,
      });
      const r = await sendEmail({
        to: admins,
        subject: tpl.subject,
        html: tpl.html,
      });
      if (!r.ok) console.error("Admin lead email failed:", r.error);
    }
  } catch (err) {
    console.error("Admin lead email threw:", err);
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

// Render the Claude plan JSON as inline HTML for the email body.
// Safe: every user-derived string is escaped via escHtml() before injection.
function renderPlanHtml(
  plan: Record<string, unknown>,
  problemLabel: string
): string {
  const steps = Array.isArray(plan.steps) ? plan.steps : [];
  const schedule = Array.isArray(plan.daily_schedule)
    ? plan.daily_schedule
    : [];
  const commands = Array.isArray(plan.commands_to_use)
    ? plan.commands_to_use
    : [];
  const mistakes = Array.isArray(plan.mistakes_to_avoid)
    ? plan.mistakes_to_avoid
    : [];
  const breedNote = typeof plan.breed_note === "string" ? plan.breed_note : "";
  const encouragement =
    typeof plan.encouragement === "string" ? plan.encouragement : "";
  const difficulty =
    typeof plan.difficulty === "string" ? plan.difficulty : "";
  const timeline = typeof plan.timeline === "string" ? plan.timeline : "";

  const parts: string[] = [];
  parts.push(hEl(`Focus: ${problemLabel}`, 3));
  if (difficulty || timeline) {
    parts.push(
      `<p style="margin:0 0 14px 0;color:#6B7280;font-size:14px;">${
        difficulty ? `Difficulty: <strong>${escHtml(difficulty)}</strong>` : ""
      }${difficulty && timeline ? " · " : ""}${
        timeline ? `Timeline: <strong>${escHtml(timeline)}</strong>` : ""
      }</p>`
    );
  }

  if (steps.length > 0) {
    parts.push(hEl("Step-by-step plan", 3));
    for (const step of steps) {
      if (!step || typeof step !== "object") continue;
      const s = step as Record<string, unknown>;
      const title = typeof s.title === "string" ? s.title : "";
      const desc = typeof s.description === "string" ? s.description : "";
      const tip = typeof s.pro_tip === "string" ? s.pro_tip : "";
      parts.push(
        `<div style="margin:0 0 14px 0;padding:12px 14px;background:#FAFAFA;border-left:3px solid #E94B3C;border-radius:4px;">` +
          `<div style="font-weight:700;color:#1A1A1A;margin-bottom:4px;">${escHtml(title)}</div>` +
          `<div style="color:#1A1A1A;font-size:14px;line-height:1.55;">${escHtml(desc)}</div>` +
          (tip
            ? `<div style="margin-top:8px;color:#6B7280;font-size:13px;font-style:italic;">Pro tip: ${escHtml(tip)}</div>`
            : "") +
          `</div>`
      );
    }
  }

  if (commands.length > 0) {
    parts.push(hEl("Commands to use", 3));
    for (const cmd of commands) {
      if (!cmd || typeof cmd !== "object") continue;
      const c = cmd as Record<string, unknown>;
      parts.push(
        `<div style="margin:0 0 10px 0;">` +
          `<strong>"${escHtml(String(c.command ?? ""))}"</strong> — ${escHtml(String(c.when_to_use ?? ""))}` +
          (c.how_to_teach
            ? `<div style="font-size:13px;color:#6B7280;margin-top:2px;">${escHtml(String(c.how_to_teach))}</div>`
            : "") +
          `</div>`
      );
    }
  }

  if (schedule.length > 0) {
    parts.push(hEl("Daily schedule", 3));
    const rows = schedule
      .map((s) => {
        if (!s || typeof s !== "object") return "";
        const r = s as Record<string, unknown>;
        return `<tr><td style="padding:6px 10px;border:1px solid #E8E3E3;font-weight:600;">${escHtml(String(r.time ?? ""))}</td><td style="padding:6px 10px;border:1px solid #E8E3E3;">${escHtml(String(r.activity ?? ""))}</td></tr>`;
      })
      .join("");
    parts.push(
      `<table style="border-collapse:collapse;width:100%;margin:8px 0 14px 0;font-size:14px;">${rows}</table>`
    );
  }

  if (mistakes.length > 0) {
    parts.push(hEl("Mistakes to avoid", 3));
    const items = mistakes
      .map(
        (m) =>
          `<li style="margin-bottom:6px;">${escHtml(String(m ?? ""))}</li>`
      )
      .join("");
    parts.push(
      `<ul style="margin:0 0 14px 18px;padding:0;color:#1A1A1A;font-size:14px;line-height:1.55;">${items}</ul>`
    );
  }

  if (breedNote) {
    parts.push(
      `<div style="margin:16px 0;padding:12px 14px;background:#FDF5F4;border-left:3px solid #E94B3C;border-radius:4px;"><strong>Breed note:</strong> ${escHtml(breedNote)}</div>`
    );
  }
  if (encouragement) {
    parts.push(
      `<p style="margin:16px 0 0 0;font-size:15px;line-height:1.55;color:#1A1A1A;font-style:italic;">${escHtml(encouragement)}</p>`
    );
  }

  return parts.join("\n");
}
