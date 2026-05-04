// Direction C — "Bold Editorial"
// A confident, fashion-magazine take. Big serif numerals. Generous whitespace.
// Lavender used as a single accent against ivory & deep ink.

const C_THEME = {
  bg: "#F4EFE6",          // warm ivory
  paper: "#FFFFFF",
  ink: "#1A1530",
  inkSoft: "#6A6485",
  primary: "#7C5CFF",
  primarySoft: "#E4DBFF",
  accent: "#FF5C8A",
  line: "#E2DBCB",
  serif: "'Fraunces', 'Recoleta', Georgia, serif",
  sans: "'Inter Tight', 'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

function C_PageFrame({ children }) {
  return (
    <div style={{ width: 1280, background: C_THEME.bg, color: C_THEME.ink, fontFamily: C_THEME.sans, position: "relative" }}>
      {children}
    </div>
  );
}

function C_Nav() {
  return (
    <nav style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "24px 56px", borderBottom: `1px solid ${C_THEME.line}` }}>
      <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: C_THEME.inkSoft, fontWeight: 600 }}>
        Vol. 008 · Spring 2026 · Orlando, FL · Charlotte, NC
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: C_THEME.serif, fontSize: 28, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1 }}>Dream Puppies</div>
        <div style={{ fontSize: 9, letterSpacing: 4, textTransform: "uppercase", marginTop: 4, color: C_THEME.inkSoft }}>— Lebron-Rivera Family —</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <button style={{ background: C_THEME.ink, color: "white", border: "none", padding: "10px 20px", borderRadius: 999, fontWeight: 600, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>Reserve →</button>
      </div>
    </nav>
  );
}

function C_SubNav() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 36, padding: "14px 56px", borderBottom: `1px solid ${C_THEME.line}`, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
      {["Home", "Available", "Upcoming", "Breeds", "Training", "Essentials", "Reviews", "FAQ", "Contact"].map((l, i) => (
        <a key={l} style={{ color: i === 1 ? C_THEME.primary : C_THEME.ink, borderBottom: i === 1 ? `2px solid ${C_THEME.primary}` : "none", paddingBottom: 4 }}>{l}</a>
      ))}
    </div>
  );
}

// ---------- HOME ----------
function C_Home() {
  return (
    <C_PageFrame>
      <C_Nav/><C_SubNav/>
      {/* Cover-style hero */}
      <section style={{ padding: "64px 56px 40px", display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: 36, alignItems: "center" }}>
        <div style={{ borderRight: `1px solid ${C_THEME.line}`, paddingRight: 36 }}>
          <div style={{ fontFamily: C_THEME.serif, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>The Cover Story</div>
          <p style={{ fontFamily: C_THEME.serif, fontSize: 18, lineHeight: 1.4, fontStyle: "italic", color: C_THEME.inkSoft, margin: 0 }}>
            "We don't move puppies. We move families."
          </p>
          <div style={{ marginTop: 24, fontSize: 12, color: C_THEME.inkSoft, lineHeight: 1.6 }}>
            <strong style={{ color: C_THEME.ink }}>Inside this issue —</strong><br/>
            Two pups looking for their humans · Five litters arriving by August · Eight breeds we know inside out · 614 happy homes
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: C_THEME.serif, fontSize: 220, fontWeight: 600, lineHeight: 0.8, letterSpacing: -8, color: C_THEME.ink }}>
            6<span style={{ color: C_THEME.primary, fontStyle: "italic" }}>1</span>4
          </div>
          <div style={{ fontFamily: C_THEME.serif, fontSize: 28, fontStyle: "italic", marginTop: 16, color: C_THEME.inkSoft }}>
            forever families.
          </div>
          <div style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: C_THEME.inkSoft, marginTop: 6 }}>And counting since 2018.</div>
        </div>
        <div style={{ borderLeft: `1px solid ${C_THEME.line}`, paddingLeft: 36 }}>
          <div style={{
            aspectRatio: "3/4", borderRadius: 0, overflow: "hidden",
            background: `linear-gradient(160deg, ${C_THEME.primarySoft}, ${C_THEME.accent}66)`,
            display: "grid", placeItems: "center",
          }}>
            <PuppyPlaceholder hue={28} size={220} accent={C_THEME.primary} ear={0}/>
          </div>
          <div style={{ marginTop: 14, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: C_THEME.inkSoft }}>
            On the cover · <strong style={{ color: C_THEME.ink }}>Biscuit</strong>, 9 wks · Mini Goldendoodle
          </div>
        </div>
      </section>

      {/* Headline */}
      <section style={{ padding: "0 56px 60px", textAlign: "center" }}>
        <h1 style={{ fontFamily: C_THEME.serif, fontSize: 152, lineHeight: 0.9, margin: 0, fontWeight: 500, letterSpacing: -5 }}>
          Raised in our home.<br/>
          <span style={{ fontStyle: "italic", color: C_THEME.primary }}>Chosen by yours.</span>
        </h1>
      </section>

      {/* Three columns of editorial */}
      <section style={{ padding: "40px 56px 80px", borderTop: `1px solid ${C_THEME.line}`, borderBottom: `1px solid ${C_THEME.line}`, background: C_THEME.paper }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 48 }}>
          {[
            { n: "Nº 01", t: "Available now", b: "Two puppies are looking for their humans this week — Biscuit, 9 weeks, and Juniper, 11 weeks.", l: "Meet them →" },
            { n: "Nº 02", t: "Reserve a litter", b: "Thirty-two puppies are on the way. Fixed reservation spots, $500 holds your pick order.", l: "See litters →" },
            { n: "Nº 03", t: "Stay on the line", b: "Crate panic at 2am? Counter surfing? We answer real texts for the first year. Free.", l: "Training plans →" },
          ].map(c => (
            <article key={c.n} style={{ borderTop: `2px solid ${C_THEME.ink}`, paddingTop: 20 }}>
              <div style={{ fontFamily: C_THEME.serif, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: C_THEME.primary, fontWeight: 600 }}>{c.n}</div>
              <h3 style={{ fontFamily: C_THEME.serif, fontSize: 36, margin: "10px 0 14px", fontWeight: 600, letterSpacing: -0.5, lineHeight: 1.05 }}>{c.t}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: C_THEME.inkSoft, margin: 0 }}>{c.b}</p>
              <a style={{ display: "inline-block", marginTop: 16, fontFamily: C_THEME.serif, fontSize: 14, fontStyle: "italic", color: C_THEME.ink, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 4 }}>{c.l}</a>
            </article>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section style={{ padding: "80px 56px", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 56, alignItems: "center" }}>
        <div style={{ aspectRatio: "4/5", background: `linear-gradient(160deg, ${C_THEME.primarySoft}, #FFE4F1)`, display: "grid", placeItems: "center" }}>
          <PuppyPlaceholder hue={12} size={360} accent={C_THEME.accent} ear={1}/>
        </div>
        <div>
          <div style={{ fontFamily: C_THEME.serif, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: C_THEME.primary, fontWeight: 600 }}>Feature</div>
          <h2 style={{ fontFamily: C_THEME.serif, fontSize: 72, margin: "12px 0 20px", fontWeight: 600, letterSpacing: -2, lineHeight: 0.95 }}>
            On the porch with <span style={{ fontStyle: "italic", color: C_THEME.primary }}>Juniper</span>.
          </h2>
          <p style={{ fontFamily: C_THEME.serif, fontSize: 19, lineHeight: 1.5, color: C_THEME.inkSoft, fontStyle: "italic", margin: 0 }}>
            "Tiny diva who thinks she runs the house." A red toy poodle with strong opinions about the couch corner. Available in Charlotte, NC. $3,800.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <button style={{ background: C_THEME.ink, color: "white", border: "none", padding: "14px 24px", borderRadius: 0, fontWeight: 600, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>Send interest</button>
            <button style={{ background: "transparent", color: C_THEME.ink, border: `1.5px solid ${C_THEME.ink}`, padding: "12px 22px", borderRadius: 0, fontWeight: 600, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>See full profile</button>
          </div>
        </div>
      </section>
    </C_PageFrame>
  );
}

// ---------- AVAILABLE ----------
function C_Available() {
  const all = [...PUPPIES_AVAILABLE, ...PUPPIES_PAST];
  return (
    <C_PageFrame>
      <C_Nav/><C_SubNav/>
      <section style={{ padding: "56px 56px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "end", borderBottom: `1px solid ${C_THEME.line}`, paddingBottom: 24 }}>
          <div>
            <div style={{ fontFamily: C_THEME.serif, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: C_THEME.primary, fontWeight: 600 }}>Section II</div>
            <h1 style={{ fontFamily: C_THEME.serif, fontSize: 100, lineHeight: 0.9, margin: "8px 0 0", fontWeight: 500, letterSpacing: -3 }}>
              <span style={{ fontStyle: "italic" }}>Available</span> Puppies.
            </h1>
          </div>
          <div style={{ fontSize: 14, color: C_THEME.inkSoft, lineHeight: 1.6 }}>
            <strong style={{ color: C_THEME.ink }}>2 looking for homes · 4 recently placed.</strong> Reserve from a litter to skip the wait.
          </div>
        </div>
      </section>
      <section style={{ padding: "32px 56px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          {all.map((p, i) => {
            const sold = p.status && p.status !== "Available";
            return (
              <article key={p.id}>
                <div style={{
                  aspectRatio: "4/5", background: `linear-gradient(160deg, hsl(${p.hue} 65% 88%), hsl(${p.hue} 50% 75%))`,
                  display: "grid", placeItems: "center", filter: sold ? "saturate(0.4)" : "none", position: "relative",
                }}>
                  <PuppyPlaceholder hue={p.hue} size={200} accent={C_THEME.primary} ear={i % 2}/>
                  {sold && (
                    <div style={{ position: "absolute", top: 14, left: 14, padding: "5px 12px", background: C_THEME.ink, color: "white", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{p.status}</div>
                  )}
                </div>
                <div style={{ paddingTop: 16, borderTop: `2px solid ${C_THEME.ink}`, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <h3 style={{ fontFamily: C_THEME.serif, fontSize: 32, margin: 0, fontWeight: 600, letterSpacing: -0.5 }}>{p.name}</h3>
                    <span style={{ fontFamily: C_THEME.mono, fontSize: 11, color: C_THEME.inkSoft }}>Nº {String(i+1).padStart(2,"0")}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C_THEME.primary, fontWeight: 600, marginTop: 2 }}>{p.breed}</div>
                  <div style={{ fontSize: 13, color: C_THEME.inkSoft, marginTop: 8, lineHeight: 1.5 }}>
                    {p.weeks} weeks · {p.sex} · {p.color}{p.location ? ` · ${p.location}` : ""}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                    <span style={{ fontFamily: C_THEME.serif, fontSize: 22, fontWeight: 600 }}>{p.price ? `$${p.price.toLocaleString()}` : "—"}</span>
                    {!sold && <a style={{ fontFamily: C_THEME.serif, fontSize: 14, fontStyle: "italic", color: C_THEME.ink, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 4 }}>Inquire →</a>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </C_PageFrame>
  );
}

// ---------- UPCOMING ----------
function C_Upcoming() {
  return (
    <C_PageFrame>
      <C_Nav/><C_SubNav/>
      <section style={{ padding: "60px 56px 40px", textAlign: "center", borderBottom: `1px solid ${C_THEME.line}` }}>
        <div style={{ fontFamily: C_THEME.serif, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: C_THEME.primary, fontWeight: 600 }}>Section III · Reservations</div>
        <h1 style={{ fontFamily: C_THEME.serif, fontSize: 120, lineHeight: 0.9, margin: "16px 0 12px", fontWeight: 500, letterSpacing: -4 }}>
          The <span style={{ fontStyle: "italic", color: C_THEME.primary }}>summer</span> calendar.
        </h1>
        <p style={{ fontFamily: C_THEME.serif, fontSize: 19, lineHeight: 1.4, color: C_THEME.inkSoft, fontStyle: "italic", maxWidth: 680, margin: "0 auto" }}>
          Five litters. Thirty-two puppies. Every spot is a reservation — first deposit picks first.
        </p>
        <div style={{ marginTop: 24, fontSize: 12, color: C_THEME.inkSoft, letterSpacing: 1.5, textTransform: "uppercase" }}>
          Slot illustrations are renderings of likely color outcomes. Real coats and sizes may vary due to genetics.
        </div>
      </section>

      <section style={{ padding: "48px 56px 80px", display: "grid", gap: 48 }}>
        {UPCOMING_LITTERS.map((litter, idx) => (
          <C_LitterCard key={litter.id} litter={litter} idx={idx}/>
        ))}
      </section>
    </C_PageFrame>
  );
}

function C_LitterCard({ litter, idx }) {
  const slots = Array.from({ length: litter.spots }, (_, i) => i < litter.reserved ? "reserved" : "open");
  const available = litter.spots - litter.reserved;
  return (
    <article style={{ borderTop: `2px solid ${C_THEME.ink}`, paddingTop: 32, display: "grid", gridTemplateColumns: "auto 1fr 1.5fr", gap: 32, alignItems: "start" }}>
      <div style={{ fontFamily: C_THEME.serif, fontSize: 96, fontWeight: 500, lineHeight: 0.9, color: C_THEME.primary, letterSpacing: -3, fontStyle: "italic" }}>
        0{idx + 1}
      </div>
      <div>
        <div style={{ fontFamily: C_THEME.mono, fontSize: 11, letterSpacing: 1.5, color: C_THEME.inkSoft, textTransform: "uppercase" }}>Litter {litter.id}</div>
        <h2 style={{ fontFamily: C_THEME.serif, fontSize: 44, margin: "4px 0 4px", fontWeight: 600, letterSpacing: -1, lineHeight: 1 }}>{litter.title}</h2>
        <div style={{ fontSize: 15, color: C_THEME.primary, fontWeight: 600 }}>{litter.breed}</div>
        <div style={{ marginTop: 16, fontSize: 14, color: C_THEME.inkSoft, lineHeight: 1.7 }}>
          <div><strong style={{ color: C_THEME.ink }}>Due —</strong> {litter.dueDate}</div>
          <div><strong style={{ color: C_THEME.ink }}>{litter.readyDate}</strong></div>
          <div style={{ marginTop: 10 }}><strong style={{ color: C_THEME.ink }}>Likely coat —</strong> {litter.expectedColor}</div>
          <div style={{ marginTop: 6, fontStyle: "italic", fontSize: 13 }}>{litter.sizeNote}</div>
        </div>
        <button style={{ marginTop: 20, background: C_THEME.ink, color: "white", border: "none", padding: "12px 22px", borderRadius: 0, fontWeight: 600, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer" }}>Reserve — $500 deposit</button>
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <h3 style={{ fontFamily: C_THEME.serif, fontSize: 18, margin: 0, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Reservation Spots</h3>
          <span style={{ fontFamily: C_THEME.mono, fontSize: 11, color: C_THEME.inkSoft }}>{available}/{litter.spots} OPEN</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {slots.map((s, i) => (
            <div key={i} style={{
              aspectRatio: "1", padding: 8,
              background: s === "reserved" ? C_THEME.paper : `linear-gradient(160deg, hsl(${litter.parentsHue[i % 2]} 70% 90%), hsl(${litter.parentsHue[i % 2]} 50% 78%))`,
              border: s === "open" ? `1.5px solid ${C_THEME.ink}` : `1px solid ${C_THEME.line}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              opacity: s === "reserved" ? 0.55 : 1, cursor: s === "open" ? "pointer" : "default", position: "relative",
            }}>
              {s === "reserved" ? (
                <>
                  <div style={{ fontFamily: C_THEME.serif, fontSize: 36, fontStyle: "italic", color: C_THEME.inkSoft, lineHeight: 1 }}>—</div>
                  <div style={{ fontFamily: C_THEME.mono, fontSize: 9, color: C_THEME.inkSoft, marginTop: 4, letterSpacing: 1 }}>RESERVED · #{i+1}</div>
                </>
              ) : (
                <>
                  <PuppyPlaceholder hue={litter.parentsHue[i % 2]} size={66} accent={C_THEME.primary} ear={i % 2}/>
                  <div style={{ fontFamily: C_THEME.mono, fontSize: 9, color: C_THEME.ink, marginTop: 4, letterSpacing: 1, fontWeight: 600 }}>PICK #{i + 1}</div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

// ---------- BREEDS ----------
function C_Breeds() {
  return (
    <C_PageFrame>
      <C_Nav/><C_SubNav/>
      <section style={{ padding: "56px 56px 32px", textAlign: "center", borderBottom: `1px solid ${C_THEME.line}` }}>
        <div style={{ fontFamily: C_THEME.serif, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: C_THEME.primary, fontWeight: 600 }}>Section IV · The Breeds</div>
        <h1 style={{ fontFamily: C_THEME.serif, fontSize: 120, lineHeight: 0.9, margin: "16px 0 0", fontWeight: 500, letterSpacing: -4 }}>
          Eight breeds.<br/><span style={{ fontStyle: "italic", color: C_THEME.primary }}>One philosophy.</span>
        </h1>
      </section>
      <section style={{ padding: "32px 56px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 48 }}>
          {BREEDS.map((b, i) => (
            <article key={b.name} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 24, paddingBottom: 32, borderBottom: `1px solid ${C_THEME.line}` }}>
              <div style={{ aspectRatio: "1", background: `linear-gradient(160deg, hsl(${b.hue} 65% 88%), hsl(${b.hue} 45% 75%))`, display: "grid", placeItems: "center" }}>
                <PuppyPlaceholder hue={b.hue} size={170} accent={C_THEME.primary} ear={i % 2}/>
              </div>
              <div>
                <div style={{ fontFamily: C_THEME.mono, fontSize: 11, letterSpacing: 1.5, color: C_THEME.inkSoft, textTransform: "uppercase" }}>Nº 0{i + 1}</div>
                <h3 style={{ fontFamily: C_THEME.serif, fontSize: 30, margin: "4px 0 6px", fontWeight: 600, letterSpacing: -0.5 }}>{b.name}</h3>
                <div style={{ fontSize: 12, color: C_THEME.inkSoft, letterSpacing: 1, textTransform: "uppercase" }}>{b.weight} · {b.coat} {b.hypo && "· Hypoallergenic"}</div>
                <p style={{ fontFamily: C_THEME.serif, fontSize: 17, fontStyle: "italic", lineHeight: 1.4, margin: "12px 0 14px", color: C_THEME.ink }}>"{b.blurb}"</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[["Energy", b.energy], ["Groom", b.grooming], ["Family", b.family]].map(([k,v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: C_THEME.inkSoft, fontWeight: 600 }}>{k}</div>
                      <div style={{ fontFamily: C_THEME.serif, fontSize: 22, fontWeight: 600, marginTop: 2 }}>{v}<span style={{ fontSize: 12, color: C_THEME.inkSoft }}>/5</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </C_PageFrame>
  );
}

// ---------- TRAINING ----------
function C_Training() {
  return (
    <C_PageFrame>
      <C_Nav/><C_SubNav/>
      <section style={{ padding: "60px 56px", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 56 }}>
        <div>
          <div style={{ fontFamily: C_THEME.serif, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: C_THEME.primary, fontWeight: 600 }}>Section V · Aftercare</div>
          <h1 style={{ fontFamily: C_THEME.serif, fontSize: 84, lineHeight: 0.9, margin: "16px 0 0", fontWeight: 500, letterSpacing: -3 }}>
            We don't <span style={{ fontStyle: "italic", color: C_THEME.primary }}>disappear</span> at pickup.
          </h1>
          <p style={{ fontFamily: C_THEME.serif, fontSize: 18, lineHeight: 1.5, color: C_THEME.inkSoft, fontStyle: "italic", marginTop: 24 }}>
            Real text replies for the first year. Custom plans for whatever your puppy throws at you. Free for our pup parents.
          </p>
        </div>
        <div>
          <div style={{ borderTop: `2px solid ${C_THEME.ink}` }}>
            {[
              { t: "Crate Training", d: "4 wks", b: "Build the crate as a den, not a punishment." },
              { t: "House Breaking", d: "3 wks", b: "Pee chart, schedule, and the only rule that matters." },
              { t: "Leash Manners", d: "2 wks", b: "From sled-dog to side-by-side without yanking." },
              { t: "Separation", d: "6 wks", b: "Graduated departures. Survives the work-from-office return." },
              { t: "Recall", d: "3 wks", b: "Comes back even when there's a squirrel." },
            ].map((p, i) => (
              <div key={p.t} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 20, alignItems: "center", padding: "20px 0", borderBottom: `1px solid ${C_THEME.line}` }}>
                <div style={{ fontFamily: C_THEME.serif, fontSize: 28, fontWeight: 500, color: C_THEME.primary, fontStyle: "italic", width: 36 }}>0{i + 1}</div>
                <div>
                  <div style={{ fontFamily: C_THEME.serif, fontSize: 22, fontWeight: 600 }}>{p.t}</div>
                  <div style={{ fontSize: 13, color: C_THEME.inkSoft, marginTop: 2 }}>{p.b}</div>
                </div>
                <div style={{ fontFamily: C_THEME.mono, fontSize: 12, color: C_THEME.inkSoft, letterSpacing: 1.5 }}>{p.d.toUpperCase()}</div>
                <span style={{ fontSize: 22, color: C_THEME.ink }}>→</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </C_PageFrame>
  );
}

// ---------- ESSENTIALS ----------
function C_Essentials() {
  return (
    <C_PageFrame>
      <C_Nav/><C_SubNav/>
      <section style={{ padding: "56px 56px 32px", borderBottom: `1px solid ${C_THEME.line}` }}>
        <div style={{ fontFamily: C_THEME.serif, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: C_THEME.primary, fontWeight: 600 }}>Section VI · The Shop</div>
        <h1 style={{ fontFamily: C_THEME.serif, fontSize: 100, lineHeight: 0.9, margin: "12px 0 0", fontWeight: 500, letterSpacing: -3 }}>
          Field-tested <span style={{ fontStyle: "italic", color: C_THEME.primary }}>essentials</span>.
        </h1>
      </section>
      <section style={{ padding: "32px 56px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 32 }}>
          {ESSENTIALS_KITS.map((k, i) => (
            <article key={k.name} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24, paddingBottom: 28, borderBottom: `1px solid ${C_THEME.line}` }}>
              <div style={{
                aspectRatio: "1", background: `linear-gradient(160deg, hsl(${k.hue} 70% 90%), hsl(${k.hue} 45% 75%))`,
                display: "grid", placeItems: "center", padding: 20,
              }}>
                <div style={{ width: "75%", height: "75%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[0,1,2,3].map(n => (<div key={n} style={{ background: "white", opacity: 0.85 + n*0.04 }}/>))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: C_THEME.mono, fontSize: 11, letterSpacing: 1.5, color: C_THEME.inkSoft, textTransform: "uppercase" }}>Kit Nº 0{i + 1}</div>
                <h3 style={{ fontFamily: C_THEME.serif, fontSize: 32, margin: "4px 0 4px", fontWeight: 600, letterSpacing: -0.5 }}>{k.name}</h3>
                <div style={{ fontFamily: C_THEME.serif, fontSize: 36, fontWeight: 600, color: C_THEME.primary, fontStyle: "italic" }}>${k.price}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 16px", fontSize: 13, color: C_THEME.inkSoft, lineHeight: 1.7 }}>
                  {k.includes.map(item => (
                    <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ color: C_THEME.primary }}>—</span><span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button style={{ background: C_THEME.ink, color: "white", border: "none", padding: "11px 22px", borderRadius: 0, fontWeight: 600, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer" }}>Add to cart →</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </C_PageFrame>
  );
}

// ---------- REVIEWS ----------
function C_Reviews() {
  return (
    <C_PageFrame>
      <C_Nav/><C_SubNav/>
      <section style={{ padding: "60px 56px", textAlign: "center", borderBottom: `1px solid ${C_THEME.line}` }}>
        <div style={{ fontFamily: C_THEME.serif, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: C_THEME.primary, fontWeight: 600 }}>Section VII · Letters</div>
        <h1 style={{ fontFamily: C_THEME.serif, fontSize: 120, lineHeight: 0.9, margin: "16px 0 0", fontWeight: 500, letterSpacing: -4 }}>
          From the <span style={{ fontStyle: "italic", color: C_THEME.primary }}>614</span>.
        </h1>
      </section>
      <section style={{ padding: "48px 56px 80px" }}>
        {[...REVIEWS, ...REVIEWS].slice(0, 6).map((r, i) => (
          <article key={i} style={{
            display: "grid", gridTemplateColumns: i % 2 === 0 ? "1fr 2fr" : "2fr 1fr", gap: 32,
            padding: "32px 0", borderBottom: `1px solid ${C_THEME.line}`, alignItems: "center",
          }}>
            <div style={{ order: i % 2 === 0 ? 0 : 1 }}>
              <div style={{ fontFamily: C_THEME.serif, fontSize: 84, fontWeight: 500, color: C_THEME.primary, fontStyle: "italic", lineHeight: 0.9 }}>"</div>
              <div style={{ fontFamily: C_THEME.mono, fontSize: 11, letterSpacing: 1.5, color: C_THEME.inkSoft, textTransform: "uppercase" }}>
                {r.name} · {r.city} · {r.breed}
              </div>
            </div>
            <p style={{ fontFamily: C_THEME.serif, fontSize: 28, fontStyle: "italic", lineHeight: 1.35, color: C_THEME.ink, margin: 0, fontWeight: 500 }}>
              {r.quote}
            </p>
          </article>
        ))}
      </section>
    </C_PageFrame>
  );
}

// ---------- CONTACT/FAQ ----------
function C_Contact() {
  return (
    <C_PageFrame>
      <C_Nav/><C_SubNav/>
      <section style={{ padding: "60px 56px", display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 56 }}>
        <div>
          <div style={{ fontFamily: C_THEME.serif, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: C_THEME.primary, fontWeight: 600 }}>Section VIII</div>
          <h1 style={{ fontFamily: C_THEME.serif, fontSize: 84, lineHeight: 0.9, margin: "16px 0 0", fontWeight: 500, letterSpacing: -3 }}>
            <span style={{ fontStyle: "italic" }}>Write</span> to us.
          </h1>
          <p style={{ fontFamily: C_THEME.serif, fontSize: 17, fontStyle: "italic", color: C_THEME.inkSoft, lineHeight: 1.5, marginTop: 20 }}>
            Cheryl reads every message. Average reply time: 47 minutes. Even Sundays.
          </p>
          <div style={{ marginTop: 32, borderTop: `2px solid ${C_THEME.ink}` }}>
            {[
              { l: "Text/Call", v: "(321) 697-8864" },
              { l: "Email", v: "Dreampuppies22@gmail.com" },
              { l: "Florida", v: "Orlando · by appointment" },
              { l: "North Carolina", v: "Charlotte · by appointment" },
            ].map(c => (
              <div key={c.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "16px 0", borderBottom: `1px solid ${C_THEME.line}` }}>
                <span style={{ fontFamily: C_THEME.mono, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C_THEME.inkSoft }}>{c.l}</span>
                <span style={{ fontFamily: C_THEME.serif, fontSize: 18, fontWeight: 600 }}>{c.v}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 style={{ fontFamily: C_THEME.serif, fontSize: 36, margin: 0, fontWeight: 600, letterSpacing: -0.5 }}>Frequently asked.</h2>
          <div style={{ marginTop: 20, borderTop: `2px solid ${C_THEME.ink}` }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{ padding: "20px 0", borderBottom: `1px solid ${C_THEME.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24 }}>
                  <h3 style={{ fontFamily: C_THEME.serif, fontSize: 19, margin: 0, fontWeight: 600 }}>{f.q}</h3>
                  <span style={{ fontFamily: C_THEME.serif, fontSize: 28, fontWeight: 500, color: C_THEME.primary, fontStyle: "italic", lineHeight: 0.8 }}>{i === 0 ? "—" : "+"}</span>
                </div>
                {i === 0 && <p style={{ fontSize: 14, color: C_THEME.inkSoft, lineHeight: 1.6, margin: "10px 0 0", maxWidth: 540 }}>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </C_PageFrame>
  );
}

Object.assign(window, {
  C_Home, C_Available, C_Upcoming, C_Breeds, C_Training, C_Essentials, C_Reviews, C_Contact,
});
