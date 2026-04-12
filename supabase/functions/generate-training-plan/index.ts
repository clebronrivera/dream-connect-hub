import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  let body: TrainingPlanRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!body.email || !body.dog_name || !body.problem_type) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: email, dog_name, problem_type" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      console.error("No JSON found in response:", rawText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "AI response did not contain valid plan data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
