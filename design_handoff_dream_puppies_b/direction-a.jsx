// Direction A — "Warm Storytelling"
// Family voice. Hand-written touches. Earthy lavender-tinted palette.
// Editorial layouts that feel like a Sunday magazine spread.

const A_THEME = {
  bg: "#FAF6FF",
  paper: "#FFFFFF",
  ink: "#2D2A4A",
  inkSoft: "#5A5478",
  primary: "#7C5CFF",
  primarySoft: "#E4DBFF",
  accent: "#FBCFE8",
  accentDeep: "#EC4899",
  sun: "#FFD66B",
  leaf: "#86E6B7",
  line: "#E8E0F5",
  paperShadow: "0 1px 0 rgba(45,42,74,0.04), 0 12px 28px rgba(124,92,255,0.10)",
  serifDisplay: "'Fraunces', 'Recoleta', 'Playfair Display', Georgia, serif",
  // Per Q4: option 4 = Strong all-caps display via serif. We'll combine: serif italic display
  // alongside a chunky uppercase wordmark. Body sans for readability.
  sansBody: "'Inter Tight', 'Inter', system-ui, sans-serif",
  hand: "'Caveat', 'Kalam', cursive",
};

function A_Stamp({ children, color = A_THEME.primary, rotate = -3 }) {
  return (
    <span style={{
      display: "inline-block",
      transform: `rotate(${rotate}deg)`,
      border: `2px dashed ${color}`,
      color,
      padding: "4px 12px",
      borderRadius: 999,
      fontFamily: A_THEME.hand,
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: 0.5,
      background: "rgba(255,255,255,0.6)",
    }}>{children}</span>
  );
}

function A_PageFrame({ children, label }) {
  return (
    <div style={{
      width: 1280, background: A_THEME.bg, color: A_THEME.ink,
      fontFamily: A_THEME.sansBody, padding: 0, position: "relative", overflow: "hidden",
    }}>
      {/* Subtle grain */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle at 1px 1px, rgba(45,42,74,0.04) 1px, transparent 0)",
        backgroundSize: "4px 4px", mixBlendMode: "multiply", opacity: 0.6,
      }}/>
      {children}
    </div>
  );
}

function A_Nav() {
  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "20px 56px", borderBottom: `1px solid ${A_THEME.line}`,
      background: A_THEME.paper, position: "relative", zIndex: 2,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: `linear-gradient(135deg, ${A_THEME.primary}, ${A_THEME.accentDeep})`,
          display: "grid", placeItems: "center", color: "white",
        }}>
          <PawIcon size={22} fill="#fff"/>
        </div>
        <div>
          <div style={{ fontFamily: A_THEME.serifDisplay, fontStyle: "italic", fontSize: 22, fontWeight: 700, lineHeight: 1, color: A_THEME.ink }}>
            Dream Puppies
          </div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: A_THEME.inkSoft, marginTop: 2 }}>
            Lebron-Rivera Family · est. 2018
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 28, fontSize: 14, color: A_THEME.ink, fontWeight: 500 }}>
        {["Available", "Upcoming Litters", "Breeds", "Training", "Essentials", "Reviews", "FAQ", "Contact"].map((l, i) => (
          <a key={l} style={{ color: i === 0 ? A_THEME.primary : A_THEME.ink, textDecoration: i === 0 ? "underline" : "none", textDecorationThickness: 2, textUnderlineOffset: 6 }}>{l}</a>
        ))}
      </div>
      <button style={{
        background: A_THEME.ink, color: "white", border: "none",
        padding: "10px 20px", borderRadius: 999, fontWeight: 600, fontSize: 13, cursor: "pointer",
      }}>Reserve a puppy</button>
    </nav>
  );
}

// ---------- HOME ----------
function A_Home() {
  return (
    <A_PageFrame label="Home — Warm Storytelling">
      <A_Nav/>
      {/* Editorial hero: photo + family story */}
      <section style={{ padding: "72px 56px 48px", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 48, alignItems: "center", position: "relative" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <Squiggle width={60} color={A_THEME.accentDeep}/>
            <span style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: A_THEME.inkSoft, fontWeight: 600 }}>
              Issue Nº 014 · Spring 2026
            </span>
          </div>
          <h1 style={{
            fontFamily: A_THEME.serifDisplay, fontWeight: 600,
            fontSize: 96, lineHeight: 0.95, margin: 0, letterSpacing: -2, color: A_THEME.ink,
          }}>
            The puppy that<br/>
            <span style={{ fontStyle: "italic", color: A_THEME.primary }}>chooses</span> your<br/>
            family back.
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.55, color: A_THEME.inkSoft, marginTop: 28, maxWidth: 520 }}>
            We're the Lebron-Rivera family. For eight years we've raised mini doodles and toy
            companions in our home — never a kennel, never a barn — across Florida and North Carolina.
            Two are looking for theirs right now.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 36, alignItems: "center" }}>
            <button style={{
              background: A_THEME.ink, color: "white", border: "none",
              padding: "16px 28px", borderRadius: 999, fontWeight: 600, fontSize: 15, cursor: "pointer",
            }}>Meet our two available →</button>
            <button style={{
              background: "transparent", color: A_THEME.ink, border: `2px solid ${A_THEME.ink}`,
              padding: "14px 26px", borderRadius: 999, fontWeight: 600, fontSize: 15, cursor: "pointer",
            }}>Reserve from a litter</button>
          </div>
          <div style={{ marginTop: 40, display: "flex", gap: 32, alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: A_THEME.serifDisplay, fontSize: 36, fontWeight: 700, color: A_THEME.ink }}>2</div>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: A_THEME.inkSoft }}>Available now</div>
            </div>
            <div style={{ width: 1, height: 36, background: A_THEME.line }}/>
            <div>
              <div style={{ fontFamily: A_THEME.serifDisplay, fontSize: 36, fontWeight: 700, color: A_THEME.ink }}>32</div>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: A_THEME.inkSoft }}>Coming this summer</div>
            </div>
            <div style={{ width: 1, height: 36, background: A_THEME.line }}/>
            <div>
              <div style={{ fontFamily: A_THEME.serifDisplay, fontSize: 36, fontWeight: 700, color: A_THEME.ink }}>614</div>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: A_THEME.inkSoft }}>Forever families</div>
            </div>
          </div>
        </div>
        {/* Hero portrait collage */}
        <div style={{ position: "relative", height: 560 }}>
          <div style={{
            position: "absolute", top: 0, right: 0, width: 360, height: 460,
            borderRadius: 200, overflow: "hidden",
            background: `linear-gradient(160deg, ${A_THEME.primarySoft}, ${A_THEME.accent})`,
            boxShadow: A_THEME.paperShadow,
          }}>
            <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
              <PuppyPlaceholder hue={28} size={300} accent={A_THEME.primary} ear={0}/>
            </div>
          </div>
          <div style={{
            position: "absolute", bottom: 30, left: 10, width: 200, height: 240,
            borderRadius: 24, overflow: "hidden", background: A_THEME.sun,
            boxShadow: A_THEME.paperShadow, transform: "rotate(-6deg)",
            display: "grid", placeItems: "center",
          }}>
            <PuppyPlaceholder hue={12} size={160} accent={A_THEME.accentDeep} ear={1}/>
          </div>
          <div style={{
            position: "absolute", top: 120, left: -10,
            transform: "rotate(-8deg)",
          }}>
            <A_Stamp color={A_THEME.accentDeep} rotate={-6}>raised on the porch ✿</A_Stamp>
          </div>
          <div style={{ position: "absolute", top: 30, right: 20 }}>
            <Sparkle size={22} fill={A_THEME.sun}/>
          </div>
        </div>
      </section>

      {/* Available strip — only two */}
      <section style={{ padding: "36px 56px 60px", borderTop: `1px dashed ${A_THEME.line}` }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 28 }}>
          <h2 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 44, fontWeight: 600, margin: 0, letterSpacing: -0.5 }}>
            Available <span style={{ fontStyle: "italic", color: A_THEME.primary }}>this week</span>
          </h2>
          <div style={{ fontSize: 13, color: A_THEME.inkSoft }}>
            Just two. <span style={{ color: A_THEME.ink, fontWeight: 600 }}>Thirty more arriving this summer →</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 24 }}>
          {PUPPIES_AVAILABLE.map((p, i) => (
            <div key={p.id} style={{
              background: A_THEME.paper, borderRadius: 28, padding: 24,
              boxShadow: A_THEME.paperShadow, position: "relative",
            }}>
              <div style={{
                aspectRatio: "1", borderRadius: 20,
                background: `linear-gradient(160deg, hsl(${p.hue} 80% 92%), hsl(${p.hue} 60% 82%))`,
                display: "grid", placeItems: "center", marginBottom: 16,
              }}>
                <PuppyPlaceholder hue={p.hue} size={200} accent={A_THEME.primary} ear={i % 2}/>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <h3 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 30, margin: 0, fontWeight: 600 }}>{p.name}</h3>
                <span style={{ fontSize: 13, color: A_THEME.inkSoft }}>{p.weeks} wks · {p.sex}</span>
              </div>
              <div style={{ fontSize: 14, color: A_THEME.primary, fontWeight: 600, marginTop: 4 }}>{p.breed}</div>
              <p style={{ fontFamily: A_THEME.hand, fontSize: 18, lineHeight: 1.3, color: A_THEME.ink, margin: "12px 0 16px" }}>
                "{p.personality}"
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: `1px solid ${A_THEME.line}` }}>
                <span style={{ fontFamily: A_THEME.serifDisplay, fontSize: 24, fontWeight: 600 }}>${p.price.toLocaleString()}</span>
                <button style={{ background: A_THEME.primary, color: "white", border: "none", padding: "10px 18px", borderRadius: 999, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  Meet {p.name} →
                </button>
              </div>
            </div>
          ))}
          {/* Editorial card — letter from the family */}
          <div style={{
            background: A_THEME.ink, color: "white", borderRadius: 28, padding: 36,
            display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden",
          }}>
            <div aria-hidden style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: A_THEME.primary, opacity: 0.4 }}/>
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", opacity: 0.7, marginBottom: 14 }}>A note from us</div>
              <p style={{ fontFamily: A_THEME.serifDisplay, fontSize: 26, lineHeight: 1.25, margin: 0, fontStyle: "italic", fontWeight: 400 }}>
                "We don't move puppies. We move families. Every dog you meet here was named by one of our kids and slept on our couch the night before we listed them."
              </p>
              <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: A_THEME.accent }}/>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Cheryl & Pedro Lebron-Rivera</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Founders, dog parents, grandparents to 614</div>
                </div>
              </div>
            </div>
            <button style={{
              alignSelf: "flex-start", marginTop: 24,
              background: "transparent", color: "white", border: "1.5px solid rgba(255,255,255,0.4)",
              padding: "10px 18px", borderRadius: 999, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>Read our story →</button>
          </div>
        </div>
      </section>

      {/* Trust trio — editorial */}
      <section style={{ padding: "60px 56px", background: A_THEME.paper, borderTop: `1px solid ${A_THEME.line}`, borderBottom: `1px solid ${A_THEME.line}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 48 }}>
          {[
            { num: "01", title: "Raised in our home", body: "Underfoot. On the rug. Pre-socialized to the vacuum, the doorbell, and three grandkids." },
            { num: "02", title: "Two-year health guarantee", body: "Genetic + structural. Every puppy leaves with vet records, microchip, and our cell number." },
            { num: "03", title: "Pickup or transport", body: "Meet us in Orlando, FL or Charlotte, NC. Or we'll arrange certified pet courier." },
          ].map(t => (
            <div key={t.num}>
              <div style={{ fontFamily: A_THEME.serifDisplay, fontSize: 14, color: A_THEME.primary, fontWeight: 600, letterSpacing: 2 }}>{t.num} —</div>
              <h3 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 30, margin: "8px 0 12px", fontWeight: 600 }}>{t.title}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: A_THEME.inkSoft, margin: 0 }}>{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer-ish CTA */}
      <section style={{ padding: "60px 56px", background: A_THEME.bg, textAlign: "center" }}>
        <Squiggle width={120} color={A_THEME.accentDeep}/>
        <h2 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 56, margin: "16px 0 20px", fontWeight: 600, letterSpacing: -1 }}>
          Come <span style={{ fontStyle: "italic", color: A_THEME.primary }}>say hi</span>.
        </h2>
        <p style={{ fontSize: 17, color: A_THEME.inkSoft, maxWidth: 540, margin: "0 auto 28px" }}>
          Text the family directly. We answer most messages within an hour, even on Sundays.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <button style={{ background: A_THEME.ink, color: "white", border: "none", padding: "14px 26px", borderRadius: 999, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            (321) 697-8864
          </button>
          <button style={{ background: A_THEME.primary, color: "white", border: "none", padding: "14px 26px", borderRadius: 999, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            Send us a note →
          </button>
        </div>
      </section>
    </A_PageFrame>
  );
}

// ---------- AVAILABLE PUPPIES ----------
function A_Available() {
  const all = [...PUPPIES_AVAILABLE, ...PUPPIES_PAST];
  return (
    <A_PageFrame label="Available — Warm Storytelling">
      <A_Nav/>
      <section style={{ padding: "48px 56px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "end", gap: 24 }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: A_THEME.inkSoft, fontWeight: 600, marginBottom: 12 }}>
            Available · Updated 4 hours ago
          </div>
          <h1 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 80, lineHeight: 0.95, margin: 0, fontWeight: 600, letterSpacing: -2 }}>
            Looking for<br/><span style={{ fontStyle: "italic", color: A_THEME.primary }}>their humans.</span>
          </h1>
        </div>
        <div style={{ background: A_THEME.paper, border: `1px solid ${A_THEME.line}`, borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 13, color: A_THEME.inkSoft, marginBottom: 12 }}>
            Showing <strong style={{ color: A_THEME.ink }}>2 available</strong> · 4 recently placed.
            Reserve early from upcoming litters to skip the wait.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["All breeds", "Mini Goldendoodle", "Toy Poodle", "Cavapoo", "FL only", "NC only", "Under $3,500"].map((c,i) => (
              <span key={c} style={{
                padding: "6px 12px", borderRadius: 999,
                background: i === 0 ? A_THEME.ink : "transparent",
                color: i === 0 ? "white" : A_THEME.ink,
                border: i === 0 ? "none" : `1px solid ${A_THEME.line}`,
                fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "32px 56px 72px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {all.map((p, i) => {
            const sold = p.status !== "Available";
            return (
              <div key={p.id} style={{
                background: A_THEME.paper, borderRadius: 22, padding: 16,
                boxShadow: A_THEME.paperShadow, position: "relative",
                opacity: sold ? 0.7 : 1,
              }}>
                <div style={{
                  aspectRatio: "1", borderRadius: 16,
                  background: `linear-gradient(160deg, hsl(${p.hue} 70% 92%), hsl(${p.hue} 50% 80%))`,
                  display: "grid", placeItems: "center", marginBottom: 12, position: "relative",
                  filter: sold ? "saturate(0.4)" : "none",
                }}>
                  <PuppyPlaceholder hue={p.hue} size={150} accent={A_THEME.primary} ear={i % 2}/>
                  {sold && (
                    <div style={{
                      position: "absolute", top: 12, right: 12, padding: "4px 10px", borderRadius: 999,
                      background: A_THEME.ink, color: "white", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase",
                    }}>{p.status}</div>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <h3 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 22, margin: 0, fontWeight: 600 }}>{p.name}</h3>
                  <span style={{ fontSize: 11, color: A_THEME.inkSoft }}>{p.weeks}w · {p.sex[0]}</span>
                </div>
                <div style={{ fontSize: 12, color: A_THEME.primary, fontWeight: 600, marginTop: 2 }}>{p.breed}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${A_THEME.line}` }}>
                  <span style={{ fontFamily: A_THEME.serifDisplay, fontSize: 17, fontWeight: 600 }}>{p.price ? `$${p.price.toLocaleString()}` : "—"}</span>
                  <span style={{ fontSize: 11, color: A_THEME.inkSoft }}>{p.color}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </A_PageFrame>
  );
}

// ---------- UPCOMING LITTERS ----------
function A_Upcoming() {
  return (
    <A_PageFrame label="Upcoming Litters — Warm Storytelling">
      <A_Nav/>
      <section style={{ padding: "56px 56px 32px", textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
        <A_Stamp color={A_THEME.accentDeep} rotate={-2}>reserve before they're born ✿</A_Stamp>
        <h1 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 80, lineHeight: 0.95, margin: "20px 0 16px", fontWeight: 600, letterSpacing: -2 }}>
          Five litters,<br/><span style={{ fontStyle: "italic", color: A_THEME.primary }}>thirty-two pups</span>,<br/>arriving this summer.
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.55, color: A_THEME.inkSoft, margin: "0 auto" }}>
          Each litter has a fixed number of reservation spots. A $500 deposit holds your pick order —
          first deposit picks first. Refundable up to two weeks before pickup if a health issue is found.
        </p>
      </section>

      <section style={{ padding: "24px 56px 80px", display: "grid", gap: 32 }}>
        {UPCOMING_LITTERS.map((litter, i) => (
          <A_LitterCard key={litter.id} litter={litter} side={i % 2 === 0 ? "left" : "right"}/>
        ))}
      </section>
    </A_PageFrame>
  );
}

function A_LitterCard({ litter, side }) {
  const available = litter.spots - litter.reserved;
  const slots = Array.from({ length: litter.spots }, (_, i) => i < litter.reserved ? "reserved" : "open");
  return (
    <div style={{
      background: A_THEME.paper, borderRadius: 32, overflow: "hidden",
      boxShadow: A_THEME.paperShadow, display: "grid",
      gridTemplateColumns: side === "left" ? "1fr 1.4fr" : "1.4fr 1fr",
      direction: side === "left" ? "ltr" : "rtl",
    }}>
      {/* Left: parent illustration + meta */}
      <div style={{
        direction: "ltr",
        background: `linear-gradient(160deg, hsl(${litter.parentsHue[0]} 80% 92%), hsl(${litter.parentsHue[1]} 60% 80%))`,
        padding: 36, display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: A_THEME.inkSoft, fontWeight: 600 }}>
            Litter {litter.id}
          </div>
          <h2 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 48, fontWeight: 600, margin: "4px 0 8px", letterSpacing: -1, lineHeight: 1 }}>
            {litter.title}
          </h2>
          <div style={{ fontSize: 16, color: A_THEME.primary, fontWeight: 600 }}>{litter.breed}</div>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <PuppyPlaceholder hue={litter.parentsHue[0]} size={130} accent={A_THEME.primary} ear={0}/>
          <PuppyPlaceholder hue={litter.parentsHue[1]} size={130} accent={A_THEME.accentDeep} ear={1}/>
        </div>
        <div style={{ marginTop: 24, fontSize: 13, color: A_THEME.inkSoft }}>
          <div><strong style={{ color: A_THEME.ink }}>Due:</strong> {litter.dueDate}</div>
          <div><strong style={{ color: A_THEME.ink }}>{litter.readyDate}</strong></div>
        </div>
      </div>

      {/* Right: reservation grid */}
      <div style={{ direction: "ltr", padding: 36 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <h3 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 26, margin: 0, fontWeight: 600 }}>Reserve your spot</h3>
          <span style={{ fontSize: 13, color: A_THEME.inkSoft }}>
            <strong style={{ color: available > 0 ? A_THEME.primary : A_THEME.inkSoft }}>{available}</strong> of {litter.spots} open
          </span>
        </div>
        <p style={{ fontSize: 14, color: A_THEME.inkSoft, marginBottom: 8, lineHeight: 1.5 }}>
          <strong style={{ color: A_THEME.ink }}>Expected color:</strong> {litter.expectedColor}
        </p>
        <p style={{ fontSize: 12, color: A_THEME.inkSoft, fontStyle: "italic", marginBottom: 20 }}>
          ✿ {litter.sizeNote}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {slots.map((s, i) => (
            <div key={i} style={{
              aspectRatio: "1", borderRadius: 16, padding: 8,
              background: s === "reserved" ? "#F3F0FA" : `linear-gradient(160deg, hsl(${litter.parentsHue[i % 2]} 75% 92%), hsl(${litter.parentsHue[i % 2]} 55% 82%))`,
              border: s === "open" ? `2px dashed ${A_THEME.primary}` : `2px solid ${A_THEME.line}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              opacity: s === "reserved" ? 0.55 : 1, cursor: s === "open" ? "pointer" : "default",
              position: "relative",
            }}>
              <PuppyPlaceholder hue={litter.parentsHue[i % 2]} size={62} accent={A_THEME.primary} ear={i % 2}/>
              <div style={{ fontSize: 10, fontWeight: 600, color: s === "reserved" ? A_THEME.inkSoft : A_THEME.primary, marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>
                {s === "reserved" ? `Pick #${i + 1} taken` : `Spot ${i + 1} open`}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button style={{ flex: 1, background: A_THEME.ink, color: "white", border: "none", padding: "14px 20px", borderRadius: 999, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            Reserve a spot — $500 deposit
          </button>
          <button style={{ background: "transparent", color: A_THEME.ink, border: `1.5px solid ${A_THEME.ink}`, padding: "12px 20px", borderRadius: 999, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            Ask a question
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- BREEDS ----------
function A_Breeds() {
  return (
    <A_PageFrame label="Breeds — Warm Storytelling">
      <A_Nav/>
      <section style={{ padding: "56px 56px 32px", textAlign: "center" }}>
        <h1 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 80, lineHeight: 0.95, margin: 0, fontWeight: 600, letterSpacing: -2 }}>
          Eight breeds we<br/><span style={{ fontStyle: "italic", color: A_THEME.primary }}>actually know</span>.
        </h1>
        <p style={{ fontSize: 17, color: A_THEME.inkSoft, maxWidth: 600, margin: "20px auto 0" }}>
          We don't list a breed unless we've raised one. These are the small, low-shed companions our family has lived with for years.
        </p>
      </section>
      <section style={{ padding: "32px 56px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {BREEDS.map((b, i) => (
            <div key={b.name} style={{ background: A_THEME.paper, borderRadius: 24, padding: 20, boxShadow: A_THEME.paperShadow }}>
              <div style={{
                aspectRatio: "1", borderRadius: 18,
                background: `linear-gradient(160deg, hsl(${b.hue} 75% 92%), hsl(${b.hue} 55% 80%))`,
                display: "grid", placeItems: "center", marginBottom: 14, position: "relative",
              }}>
                <PuppyPlaceholder hue={b.hue} size={150} accent={A_THEME.primary} ear={i % 2}/>
                {b.hypo && (
                  <div style={{
                    position: "absolute", top: 10, left: 10, padding: "4px 10px", borderRadius: 999,
                    background: A_THEME.leaf, color: A_THEME.ink, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                  }}>Hypoallergenic</div>
                )}
              </div>
              <h3 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 24, margin: 0, fontWeight: 600 }}>{b.name}</h3>
              <div style={{ fontSize: 12, color: A_THEME.inkSoft, marginTop: 4 }}>{b.weight} · {b.coat}</div>
              <p style={{ fontFamily: A_THEME.hand, fontSize: 17, lineHeight: 1.3, color: A_THEME.ink, margin: "12px 0 12px" }}>"{b.blurb}"</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                {[["Energy", b.energy], ["Groom", b.grooming], ["Family", b.family]].map(([k,v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: A_THEME.inkSoft, fontWeight: 600 }}>{k}</div>
                    <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
                      {[1,2,3,4,5].map(n => (
                        <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= v ? A_THEME.primary : A_THEME.line }}/>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </A_PageFrame>
  );
}

// ---------- CONSULTATION / TRAINING ----------
function A_Consultation() {
  return (
    <A_PageFrame label="Consultation — Warm Storytelling">
      <A_Nav/>
      <section style={{ padding: "72px 56px", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 56, alignItems: "center" }}>
        <div>
          <A_Stamp color={A_THEME.primary} rotate={-3}>included with every puppy ✿</A_Stamp>
          <h1 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 76, lineHeight: 0.95, margin: "16px 0 20px", fontWeight: 600, letterSpacing: -2 }}>
            We'll <span style={{ fontStyle: "italic", color: A_THEME.primary }}>stay on the line</span><br/>for the first year.
          </h1>
          <p style={{ fontSize: 17, color: A_THEME.inkSoft, lineHeight: 1.6, marginBottom: 32, maxWidth: 540 }}>
            Crate panic at 2am? Refusing kibble? Counter-surfing? Text us. We answer. We've raised hundreds of puppies and we keep raising yours after pickup.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { t: "Week 1 onboarding", b: "Daily check-ins. Sleep, food, potty milestones." },
              { t: "12-week curriculum", b: "Crate, leash, sit-stay-come. Email + video, weekly." },
              { t: "Bad-habit hotline", b: "Specific problems, specific fixes. Reply within a day." },
              { t: "Vet network access", b: "Our trusted vets in FL & NC. We'll make the intro." },
            ].map(c => (
              <div key={c.t} style={{ background: A_THEME.paper, borderRadius: 18, padding: 18, border: `1px solid ${A_THEME.line}` }}>
                <div style={{ fontFamily: A_THEME.serifDisplay, fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{c.t}</div>
                <div style={{ fontSize: 13, color: A_THEME.inkSoft, lineHeight: 1.5 }}>{c.b}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{
            background: A_THEME.ink, color: "white", borderRadius: 32, padding: 36,
            boxShadow: A_THEME.paperShadow, position: "relative", overflow: "hidden",
          }}>
            <div aria-hidden style={{ position: "absolute", bottom: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: A_THEME.primary, opacity: 0.4 }}/>
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", opacity: 0.7, marginBottom: 8 }}>Custom plan</div>
              <h3 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 36, margin: 0, fontWeight: 600, lineHeight: 1.05 }}>One-on-one training plans</h3>
              <p style={{ fontSize: 15, opacity: 0.85, marginTop: 14, lineHeight: 1.5 }}>
                Pick a problem. We'll send a step-by-step plan tailored to your puppy and your home.
              </p>
              <div style={{ display: "grid", gap: 10, marginTop: 24 }}>
                {["Crate training", "House breaking", "Leash pulling", "Separation", "Recall"].map((p, i) => (
                  <div key={p} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 14, background: "rgba(255,255,255,0.08)" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{p}</span>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>{["4 wks", "3 wks", "2 wks", "6 wks", "3 wks"][i]} →</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </A_PageFrame>
  );
}

// ---------- ESSENTIALS ----------
function A_Essentials() {
  return (
    <A_PageFrame label="Essentials — Warm Storytelling">
      <A_Nav/>
      <section style={{ padding: "56px 56px 32px", textAlign: "center" }}>
        <h1 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 80, lineHeight: 0.95, margin: 0, fontWeight: 600, letterSpacing: -2 }}>
          The <span style={{ fontStyle: "italic", color: A_THEME.primary }}>only four kits</span><br/>you actually need.
        </h1>
        <p style={{ fontSize: 17, color: A_THEME.inkSoft, maxWidth: 600, margin: "20px auto 0" }}>
          We've tested every harness and crate so you don't have to. These are what we send our own puppies home with.
        </p>
      </section>
      <section style={{ padding: "40px 56px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {ESSENTIALS_KITS.map((k, i) => (
            <div key={k.name} style={{
              background: A_THEME.paper, borderRadius: 26, overflow: "hidden", boxShadow: A_THEME.paperShadow, position: "relative",
            }}>
              <div style={{
                aspectRatio: "5/4",
                background: `linear-gradient(160deg, hsl(${k.hue} 80% 92%), hsl(${k.hue} 55% 78%))`,
                display: "grid", placeItems: "center", padding: 20, position: "relative",
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, width: "85%", height: "85%" }}>
                  {[0,1,2,3].map(n => (
                    <div key={n} style={{ background: "white", borderRadius: 10, opacity: 0.85 + (n*0.04) }}/>
                  ))}
                </div>
                {i === 3 && (
                  <div style={{
                    position: "absolute", top: 14, right: 14, padding: "4px 10px", borderRadius: 999,
                    background: A_THEME.ink, color: "white", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                  }}>Best value</div>
                )}
              </div>
              <div style={{ padding: 22 }}>
                <h3 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 24, margin: 0, fontWeight: 600 }}>{k.name}</h3>
                <div style={{ fontFamily: A_THEME.serifDisplay, fontSize: 32, fontWeight: 600, marginTop: 4, color: A_THEME.primary }}>${k.price}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 18px", fontSize: 13, color: A_THEME.inkSoft, lineHeight: 1.7 }}>
                  {k.includes.map(item => (
                    <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ color: A_THEME.primary, marginTop: 2 }}>✿</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button style={{ width: "100%", background: A_THEME.ink, color: "white", border: "none", padding: "12px", borderRadius: 999, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Add to cart</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </A_PageFrame>
  );
}

// ---------- DREAMY REVIEWS ----------
function A_Reviews() {
  return (
    <A_PageFrame label="Dreamy Reviews — Warm Storytelling">
      <A_Nav/>
      <section style={{ padding: "56px 56px 32px", textAlign: "center" }}>
        <h1 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 80, lineHeight: 0.95, margin: 0, fontWeight: 600, letterSpacing: -2 }}>
          614 families.<br/><span style={{ fontStyle: "italic", color: A_THEME.primary }}>Eight years.</span>
        </h1>
      </section>
      <section style={{ padding: "32px 56px 80px", columnCount: 3, columnGap: 24 }}>
        {[...REVIEWS, ...REVIEWS].map((r, i) => (
          <div key={i} style={{
            breakInside: "avoid", marginBottom: 24,
            background: i % 3 === 1 ? A_THEME.primarySoft : A_THEME.paper,
            borderRadius: 24, padding: 26, boxShadow: A_THEME.paperShadow,
          }}>
            <div style={{ fontSize: 14, color: A_THEME.sun, letterSpacing: 2 }}>{"★".repeat(r.stars)}</div>
            <p style={{ fontFamily: A_THEME.serifDisplay, fontSize: 20, fontStyle: "italic", lineHeight: 1.35, margin: "12px 0 18px", fontWeight: 400 }}>
              "{r.quote}"
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: A_THEME.accent, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, color: A_THEME.ink }}>
                {r.name[0]}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: A_THEME.ink }}>{r.name}</div>
                <div style={{ fontSize: 11, color: A_THEME.inkSoft }}>{r.city} · {r.breed}</div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </A_PageFrame>
  );
}

// ---------- CONTACT / FAQ ----------
function A_Contact() {
  return (
    <A_PageFrame label="Contact & FAQ — Warm Storytelling">
      <A_Nav/>
      <section style={{ padding: "72px 56px", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 56 }}>
        <div>
          <h1 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 76, lineHeight: 0.95, margin: 0, fontWeight: 600, letterSpacing: -2 }}>
            Talk to a<br/><span style={{ fontStyle: "italic", color: A_THEME.primary }}>real person</span>.
          </h1>
          <p style={{ fontSize: 17, color: A_THEME.inkSoft, lineHeight: 1.6, marginTop: 24 }}>
            Cheryl reads every message. We answer most within an hour, even on Sundays.
          </p>
          <div style={{ marginTop: 32, display: "grid", gap: 14 }}>
            {[
              { l: "Text or call", v: "(321) 697-8864" },
              { l: "Email", v: "Dreampuppies22@gmail.com" },
              { l: "Florida", v: "Orlando, FL · by appointment" },
              { l: "North Carolina", v: "Charlotte, NC · by appointment" },
            ].map(c => (
              <div key={c.l} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: `1px dashed ${A_THEME.line}` }}>
                <span style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: A_THEME.inkSoft, fontWeight: 600 }}>{c.l}</span>
                <span style={{ fontFamily: A_THEME.serifDisplay, fontSize: 18, fontWeight: 600, color: A_THEME.ink }}>{c.v}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 36, margin: 0, fontWeight: 600 }}>The questions we hear most</h2>
          <div style={{ marginTop: 24, display: "grid", gap: 12 }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{ background: A_THEME.paper, borderRadius: 18, padding: 22, border: `1px solid ${A_THEME.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontFamily: A_THEME.serifDisplay, fontSize: 18, margin: 0, fontWeight: 600 }}>{f.q}</h3>
                  <span style={{ color: A_THEME.primary, fontSize: 18, fontWeight: 700 }}>{i === 0 ? "−" : "+"}</span>
                </div>
                {i === 0 && <p style={{ fontSize: 14, color: A_THEME.inkSoft, lineHeight: 1.6, margin: "12px 0 0" }}>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </A_PageFrame>
  );
}

Object.assign(window, {
  A_Home, A_Available, A_Upcoming, A_Breeds, A_Consultation, A_Essentials, A_Reviews, A_Contact,
});
