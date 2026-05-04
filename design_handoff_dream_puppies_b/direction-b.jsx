// Direction B — "Lively Interactive"
// High-energy. Bold geometry. Marquees, motion cues, sticker badges.
// Same lavender palette, but turned up to a candy-coated playground.

const B_THEME = {
  bg: "#1A1438",         // dark canvas to make accents pop
  bgSoft: "#2A2152",
  paper: "#FAF6FF",
  ink: "#0F0A24",
  inkSoft: "#5A5478",
  primary: "#A78BFA",
  primaryDeep: "#7C5CFF",
  accent: "#FF6FBE",
  sun: "#FFD66B",
  leaf: "#5BE5A4",
  cyan: "#5BC8FF",
  display: "'Archivo', 'Inter Tight', system-ui, sans-serif",
  body: "'Inter Tight', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

function B_Tag({ children, color = B_THEME.accent }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
      letterSpacing: 1.5, textTransform: "uppercase",
      background: color, color: "#0F0A24",
    }}>{children}</span>
  );
}

function B_PageFrame({ children, dark = true }) {
  return (
    <div style={{
      width: 1280, background: dark ? B_THEME.bg : B_THEME.paper,
      color: dark ? "white" : B_THEME.ink, fontFamily: B_THEME.body, position: "relative", overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

function B_Nav({ dark = true }) {
  const fg = dark ? "white" : B_THEME.ink;
  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "20px 48px", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
      position: "relative", zIndex: 5,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 14,
          background: `conic-gradient(from 45deg, ${B_THEME.accent}, ${B_THEME.primary}, ${B_THEME.cyan}, ${B_THEME.sun}, ${B_THEME.accent})`,
          display: "grid", placeItems: "center",
        }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: dark ? B_THEME.bg : "white", display: "grid", placeItems: "center" }}>
            <PawIcon size={18} fill={B_THEME.accent}/>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: B_THEME.display, fontSize: 18, fontWeight: 800, letterSpacing: -0.5, color: fg }}>DREAM PUPPIES</div>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: dark ? "rgba(255,255,255,0.5)" : B_THEME.inkSoft, marginTop: 1 }}>a Dream Enterprises LLC company · FL · NC</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, fontSize: 13, color: fg, fontWeight: 600,
        background: dark ? "rgba(255,255,255,0.06)" : "rgba(15,10,36,0.04)", padding: 4, borderRadius: 999 }}>
        {["Available", "Upcoming", "Breeds", "Training", "Shop", "Reviews", "FAQ", "Contact"].map((l, i) => (
          <a key={l} style={{
            padding: "8px 14px", borderRadius: 999,
            background: i === 0 ? B_THEME.accent : "transparent",
            color: i === 0 ? B_THEME.ink : fg,
          }}>{l}</a>
        ))}
      </div>
      <button style={{
        background: B_THEME.accent, color: B_THEME.ink, border: "none",
        padding: "12px 22px", borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: "pointer",
        boxShadow: `0 8px 0 ${B_THEME.primaryDeep}`,
      }}>RESERVE NOW ✨</button>
    </nav>
  );
}

// Marquee row of puppy avatars
function B_Marquee({ items, height = 80 }) {
  return (
    <div style={{ overflow: "hidden", borderTop: `1px solid rgba(255,255,255,0.1)`, borderBottom: `1px solid rgba(255,255,255,0.1)`, padding: "16px 0", background: B_THEME.bgSoft }}>
      <div style={{ display: "flex", gap: 32, alignItems: "center", whiteSpace: "nowrap" }}>
        {[...items, ...items].map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, color: "white" }}>
            <span style={{ fontFamily: B_THEME.display, fontSize: 18, fontWeight: 800, letterSpacing: -0.5, textTransform: "uppercase" }}>{it}</span>
            <Sparkle size={14} fill={B_THEME.sun}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- HOME ----------
function B_Home() {
  return (
    <B_PageFrame dark>
      <B_Nav dark/>
      {/* Big animated-feeling hero with grid of "currently available" tiles */}
      <section style={{ padding: "56px 48px 0", position: "relative" }}>
        {/* Decorative blobs */}
        <div aria-hidden style={{ position: "absolute", top: 80, left: -120, width: 320, height: 320, borderRadius: "50%", background: B_THEME.primary, filter: "blur(80px)", opacity: 0.5 }}/>
        <div aria-hidden style={{ position: "absolute", top: 280, right: -80, width: 240, height: 240, borderRadius: "50%", background: B_THEME.accent, filter: "blur(60px)", opacity: 0.5 }}/>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", position: "relative" }}>
          <div>
            <B_Tag color={B_THEME.sun}>● live · 2 available now</B_Tag>
            <h1 style={{
              fontFamily: B_THEME.display, fontWeight: 900,
              fontSize: 124, lineHeight: 0.85, margin: "20px 0 0", letterSpacing: -4, color: "white",
              textTransform: "uppercase",
            }}>
              FIND YOUR<br/>
              <span style={{
                background: `linear-gradient(90deg, ${B_THEME.accent}, ${B_THEME.sun}, ${B_THEME.cyan})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>FUR-EVER</span><br/>
              SOMEBODY.
            </h1>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", maxWidth: 480, lineHeight: 1.5, marginTop: 28 }}>
              Mini Goldendoodles, Labradoodles, Mini Poodles & Shih Tzus — raised on our porch, hand-picked for their humans. Reserve a puppy or a future litter spot.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <button style={{ background: B_THEME.accent, color: B_THEME.ink, border: "none", padding: "16px 28px", borderRadius: 999, fontWeight: 800, fontSize: 14, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", boxShadow: `0 8px 0 ${B_THEME.primaryDeep}` }}>BROWSE PUPPIES →</button>
              <button style={{ background: "transparent", color: "white", border: "2px solid rgba(255,255,255,0.4)", padding: "14px 26px", borderRadius: 999, fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>Our story</button>
            </div>
          </div>

          {/* Right: rotating "available cards" stack */}
          <div style={{ position: "relative", height: 540 }}>
            {[
              { p: PUPPIES_AVAILABLE[0], rot: -6, x: 0, y: 0, z: 3 },
              { p: PUPPIES_AVAILABLE[1], rot: 8, x: 100, y: 80, z: 2 },
              { p: PUPPIES_PAST[0], rot: -3, x: 200, y: 200, z: 1 },
            ].map(({ p, rot, x, y, z }, i) => (
              <div key={p.id} style={{
                position: "absolute", top: y, left: x, zIndex: z,
                width: 280, background: "white", borderRadius: 28, padding: 16, color: B_THEME.ink,
                transform: `rotate(${rot}deg)`,
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              }}>
                <div style={{
                  aspectRatio: "1", borderRadius: 18,
                  background: `linear-gradient(160deg, hsl(${p.hue} 80% 88%), hsl(${p.hue} 60% 75%))`,
                  display: "grid", placeItems: "center", marginBottom: 12, position: "relative",
                }}>
                  <PuppyPlaceholder hue={p.hue} size={180} accent={B_THEME.primaryDeep} ear={i % 2}/>
                  <div style={{ position: "absolute", top: 12, right: 12 }}>
                    <B_Tag color={p.status === "Available" ? B_THEME.leaf : B_THEME.sun}>{p.status || "Available"}</B_Tag>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <h3 style={{ fontFamily: B_THEME.display, fontSize: 24, margin: 0, fontWeight: 900, letterSpacing: -0.5, textTransform: "uppercase" }}>{p.name}</h3>
                  <span style={{ fontFamily: B_THEME.mono, fontSize: 12, color: B_THEME.inkSoft }}>{p.weeks}w</span>
                </div>
                <div style={{ fontSize: 13, color: B_THEME.primaryDeep, fontWeight: 700, marginTop: 2 }}>{p.breed}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24 }}>
          {[
            { n: "8 yrs", l: "Family operated" },
            { n: "614", l: "Forever homes" },
            { n: "2 yr", l: "Health guarantee" },
            { n: "<1 hr", l: "Avg reply time" },
          ].map(s => (
            <div key={s.l}>
              <div style={{ fontFamily: B_THEME.display, fontSize: 36, fontWeight: 900, color: "white", letterSpacing: -1 }}>{s.n}</div>
              <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ marginTop: 56 }}>
        <B_Marquee items={["Mini Goldendoodle", "Labradoodle", "Mini Poodle", "Shih Tzu", "Family-raised", "Health guaranteed", "FL · NC"]}/>
      </div>

      {/* Family story — replaces "How it works" */}
      <section style={{ padding: "80px 48px", background: B_THEME.paper, color: B_THEME.ink, borderRadius: "48px 48px 0 0", marginTop: 0, position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 56, alignItems: "center" }}>
          <div>
            <B_Tag color={B_THEME.accent}>● our family</B_Tag>
            <h2 style={{ fontFamily: B_THEME.display, fontSize: 72, margin: "16px 0 0", fontWeight: 900, letterSpacing: -2, textTransform: "uppercase", lineHeight: 0.92 }}>
              RAISED ON THE <span style={{ fontStyle: "italic", color: B_THEME.primaryDeep }}>PORCH</span>, NOT IN A KENNEL.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: B_THEME.inkSoft, marginTop: 24, maxWidth: 520 }}>
              We're the Lebron-Rivera family — and every puppy that leaves our home was hand-fed, hand-held,
              and hand-picked for the family it joins. Mama dogs sleep in our bedroom. Puppies wake up to
              kids' footsteps and country mornings. By the time they meet you, they already know what
              "home" sounds like.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <button style={{ background: B_THEME.ink, color: "white", border: "none", padding: "14px 24px", borderRadius: 999, fontWeight: 800, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>Read our story →</button>
              <button style={{ background: "transparent", color: B_THEME.ink, border: `2px solid ${B_THEME.ink}`, padding: "12px 22px", borderRadius: 999, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>Visit by appt</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { c: B_THEME.accent, n: "Mama-raised", t: "Pups stay with mom 8+ weeks, always." },
              { c: B_THEME.sun, n: "Underfoot", t: "Crate-curious, kid-tested, kitchen-hardened." },
              { c: B_THEME.leaf, n: "Vet-true", t: "Real records. Real microchip. Real warranty." },
              { c: B_THEME.cyan, n: "Always on call", t: "Free puppy guide + check-ins through the formative years." },
            ].map((s, i) => (
              <div key={s.n} style={{ background: s.c, borderRadius: 24, padding: 22, color: B_THEME.ink, transform: `rotate(${(i % 2 ? 1 : -1) * 1.2}deg)` }}>
                <div style={{ fontFamily: B_THEME.display, fontSize: 22, fontWeight: 900, letterSpacing: -0.5, textTransform: "uppercase" }}>{s.n}</div>
                <p style={{ fontSize: 13, lineHeight: 1.45, margin: "8px 0 0", fontWeight: 500 }}>{s.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews ribbon */}
      <section style={{ padding: "60px 48px 80px", background: B_THEME.paper, color: B_THEME.ink }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32, alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: B_THEME.display, fontSize: 48, margin: 0, fontWeight: 900, letterSpacing: -1, textTransform: "uppercase", lineHeight: 0.95 }}>
              614<br/><span style={{ color: B_THEME.primaryDeep }}>HAPPY</span><br/>HOMES.
            </h2>
            <p style={{ fontSize: 15, color: B_THEME.inkSoft, marginTop: 16, maxWidth: 320 }}>Family-raised by the Lebron-Rivera household. Zero kennels.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
            {REVIEWS.slice(0,2).map((r, i) => (
              <div key={i} style={{ background: i === 0 ? B_THEME.bg : B_THEME.primaryDeep, color: "white", borderRadius: 24, padding: 26, position: "relative" }}>
                <div style={{ fontSize: 20, color: B_THEME.sun, letterSpacing: 3, marginBottom: 8 }}>{"★".repeat(r.stars)}</div>
                <p style={{ fontFamily: B_THEME.display, fontSize: 18, lineHeight: 1.3, margin: "0 0 16px", fontWeight: 700 }}>"{r.quote}"</p>
                <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600 }}>— {r.name} · {r.city}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </B_PageFrame>
  );
}

// ---------- AVAILABLE ----------
function B_Available() {
  const all = [...PUPPIES_AVAILABLE, ...PUPPIES_PAST];
  return (
    <B_PageFrame dark={false}>
      <B_Nav dark={false}/>
      <section style={{ padding: "48px 48px 24px" }}>
        <B_Tag color={B_THEME.sun}>● updated 4 hours ago</B_Tag>
        <h1 style={{ fontFamily: B_THEME.display, fontSize: 96, lineHeight: 0.85, margin: "16px 0 0", fontWeight: 900, letterSpacing: -3, textTransform: "uppercase", color: B_THEME.ink }}>
          AVAILABLE <span style={{ color: B_THEME.primaryDeep }}>PUPPIES</span>
        </h1>
        <p style={{ fontSize: 16, color: B_THEME.inkSoft, marginTop: 16, maxWidth: 540, lineHeight: 1.5 }}>
          The puppies in our home right now, hand-picked from the breeds we raise. Inventory changes weekly — check back often or reserve a spot in an upcoming litter.
        </p>
        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["All breeds", "Mini Goldendoodle", "Labradoodle", "Mini Poodle", "Shih Tzu", "FL", "NC"].map((c,i) => (
              <button key={c} style={{
                padding: "10px 18px", borderRadius: 999,
                background: i === 0 ? B_THEME.ink : "white",
                color: i === 0 ? "white" : B_THEME.ink,
                border: i === 0 ? "none" : `1.5px solid ${B_THEME.ink}`,
                fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
              }}>{c}</button>
            ))}
          </div>
          <div style={{ fontFamily: B_THEME.mono, fontSize: 12, color: B_THEME.inkSoft }}>SORT: NEWEST ↓</div>
        </div>
      </section>

      <section style={{ padding: "32px 48px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {all.map((p, i) => {
            const sold = p.status && p.status !== "Available";
            return (
              <div key={p.id} style={{
                background: "white", borderRadius: 28, overflow: "hidden",
                border: sold ? `2px solid ${B_THEME.line}` : `2px solid ${B_THEME.ink}`,
                position: "relative", color: B_THEME.ink,
              }}>
                <div style={{
                  aspectRatio: "5/4",
                  background: `linear-gradient(160deg, hsl(${p.hue} 80% 90%), hsl(${p.hue} 60% 75%))`,
                  display: "grid", placeItems: "center", position: "relative",
                  filter: sold ? "saturate(0.4)" : "none",
                }}>
                  <PuppyPlaceholder hue={p.hue} size={220} accent={B_THEME.primaryDeep} ear={i % 2}/>
                  <div style={{ position: "absolute", top: 16, left: 16 }}>
                    <B_Tag color={sold ? "#E0DCEB" : B_THEME.leaf}>{p.status || "Available"}</B_Tag>
                  </div>
                  <div style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: "50%", background: "white", display: "grid", placeItems: "center", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                    <span style={{ fontSize: 18 }}>♡</span>
                  </div>
                </div>
                <div style={{ padding: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <h3 style={{ fontFamily: B_THEME.display, fontSize: 30, margin: 0, fontWeight: 900, letterSpacing: -0.8, textTransform: "uppercase" }}>{p.name}</h3>
                    <span style={{ fontFamily: B_THEME.mono, fontSize: 12, color: B_THEME.inkSoft }}>#{p.id.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: B_THEME.primaryDeep }}>{p.breed}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: B_THEME.paper, fontSize: 11, fontWeight: 600 }}>{p.weeks} weeks</span>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: B_THEME.paper, fontSize: 11, fontWeight: 600 }}>{p.sex}</span>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: B_THEME.paper, fontSize: 11, fontWeight: 600 }}>{p.color}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, paddingTop: 16, borderTop: `1px solid ${B_THEME.line}` }}>
                    <div>
                      <div style={{ fontFamily: B_THEME.display, fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>{p.price ? `$${p.price.toLocaleString()}` : "—"}</div>
                      <div style={{ fontSize: 10, color: B_THEME.inkSoft, letterSpacing: 1.5, textTransform: "uppercase" }}>{p.location || "FL · NC"}</div>
                    </div>
                    {!sold && (
                      <button style={{ background: B_THEME.ink, color: "white", border: "none", padding: "10px 18px", borderRadius: 999, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>Meet me →</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </B_PageFrame>
  );
}

// ---------- UPCOMING LITTERS ----------
function B_Upcoming() {
  return (
    <B_PageFrame dark>
      <B_Nav dark/>
      <section style={{ padding: "60px 48px 32px", textAlign: "center", position: "relative" }}>
        <div aria-hidden style={{ position: "absolute", top: 60, left: 80, width: 200, height: 200, borderRadius: "50%", background: B_THEME.accent, filter: "blur(80px)", opacity: 0.4 }}/>
        <div aria-hidden style={{ position: "absolute", top: 100, right: 80, width: 200, height: 200, borderRadius: "50%", background: B_THEME.cyan, filter: "blur(80px)", opacity: 0.4 }}/>
        <B_Tag color={B_THEME.sun}>● upcoming litters · reserve early</B_Tag>
        <h1 style={{ fontFamily: B_THEME.display, fontSize: 96, lineHeight: 0.85, margin: "20px 0 0", fontWeight: 900, letterSpacing: -3, textTransform: "uppercase", color: "white", position: "relative" }}>
          RESERVE BEFORE<br/>
          <span style={{ background: `linear-gradient(90deg, ${B_THEME.accent}, ${B_THEME.sun})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>THEY'RE BORN.</span>
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", maxWidth: 620, margin: "20px auto 0", lineHeight: 1.55 }}>
          Reserve a spot in an upcoming litter and pick your puppy in deposit order — first in, first pick.
          Deposit is <strong style={{ color: "white" }}>1/4 of the total</strong> if reserved before the puppies are born,
          <strong style={{ color: "white" }}> 1/3 of the total</strong> after they're born.
          Slot images are renderings of likely color outcomes; real coats may vary due to genetics.
        </p>
      </section>

      <section style={{ padding: "32px 48px 80px", display: "grid", gap: 20 }}>
        {UPCOMING_LITTERS.map((litter, idx) => (
          <B_LitterCard key={litter.id} litter={litter} idx={idx}/>
        ))}
      </section>
    </B_PageFrame>
  );
}

function B_LitterCard({ litter, idx }) {
  const slots = Array.from({ length: litter.spots }, (_, i) => i < litter.reserved ? "reserved" : "open");
  const available = litter.spots - litter.reserved;
  const accentColor = [B_THEME.accent, B_THEME.sun, B_THEME.leaf, B_THEME.cyan, B_THEME.primary][idx % 5];
  return (
    <div style={{
      background: B_THEME.bgSoft, borderRadius: 32, padding: 32,
      border: `1px solid rgba(255,255,255,0.08)`, color: "white",
      display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32, alignItems: "stretch",
    }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontFamily: B_THEME.mono, fontSize: 11, padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.1)", letterSpacing: 1 }}>LITTER {litter.id}</span>
            <B_Tag color={accentColor}>{available > 0 ? `${available} OPEN` : "WAITLIST"}</B_Tag>
          </div>
          <h2 style={{ fontFamily: B_THEME.display, fontSize: 42, margin: 0, fontWeight: 900, letterSpacing: -1, textTransform: "uppercase", lineHeight: 0.95 }}>{litter.title}</h2>
          <div style={{ fontSize: 16, color: accentColor, fontWeight: 700, marginTop: 6 }}>{litter.breed}</div>
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 12 }}>
            <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.6 }}>Due</div>
            <div style={{ fontFamily: B_THEME.display, fontSize: 16, fontWeight: 800, marginTop: 2 }}>{litter.dueDate}</div>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 12 }}>
            <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.6 }}>Pickup</div>
            <div style={{ fontFamily: B_THEME.display, fontSize: 16, fontWeight: 800, marginTop: 2 }}>{litter.readyDate.replace("Ready home ", "")}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
          <strong style={{ color: "white" }}>Likely coat:</strong> {litter.expectedColor}<br/>
          <em style={{ opacity: 0.7 }}>{litter.sizeNote}</em>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: B_THEME.display, fontSize: 18, margin: 0, fontWeight: 800, letterSpacing: -0.3, textTransform: "uppercase" }}>Pick your spot</h3>
          <span style={{ fontFamily: B_THEME.mono, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{litter.reserved} / {litter.spots} reserved</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8 }}>
          {slots.map((s, i) => (
            <div key={i} style={{
              aspectRatio: "1", borderRadius: 14, padding: 6,
              background: s === "reserved" ? "rgba(255,255,255,0.04)" : `linear-gradient(160deg, hsl(${litter.parentsHue[i % 2]} 70% 22%), hsl(${litter.parentsHue[i % 2]} 60% 38%))`,
              border: s === "open" ? `1.5px dashed ${accentColor}` : `1px solid rgba(255,255,255,0.06)`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              opacity: s === "reserved" ? 0.4 : 1, cursor: s === "open" ? "pointer" : "default", position: "relative",
            }}>
              {s === "reserved" ? (
                <>
                  <div style={{ fontSize: 22, opacity: 0.5 }}>🔒</div>
                  <div style={{ fontFamily: B_THEME.mono, fontSize: 8, opacity: 0.5, marginTop: 2 }}>#{i + 1}</div>
                </>
              ) : (
                <>
                  <PuppyPlaceholder hue={litter.parentsHue[i % 2]} size={48} accent={accentColor} ear={i % 2}/>
                  <div style={{ fontFamily: B_THEME.mono, fontSize: 8, marginTop: 2, color: accentColor, fontWeight: 700 }}>PICK #{i + 1}</div>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button style={{ flex: 1, background: accentColor, color: B_THEME.ink, border: "none", padding: "14px 20px", borderRadius: 999, fontWeight: 800, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer", boxShadow: `0 6px 0 rgba(0,0,0,0.4)` }}>RESERVE A SPOT →</button>
          <button style={{ background: "transparent", color: "white", border: `1.5px solid rgba(255,255,255,0.3)`, padding: "12px 18px", borderRadius: 999, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>More info</button>
        </div>
      </div>
    </div>
  );
}

// ---------- BREEDS ----------
function B_Breeds() {
  return (
    <B_PageFrame dark={false}>
      <B_Nav dark={false}/>
      <section style={{ padding: "56px 48px 32px" }}>
        <B_Tag color={B_THEME.sun}>● the breeds we raise + family favorites</B_Tag>
        <h1 style={{ fontFamily: B_THEME.display, fontSize: 110, lineHeight: 0.85, margin: "16px 0 0", fontWeight: 900, letterSpacing: -3, textTransform: "uppercase", color: B_THEME.ink }}>
          GET TO KNOW<br/><span style={{ color: B_THEME.primaryDeep }}>THE BREEDS.</span>
        </h1>
        <p style={{ fontSize: 16, color: B_THEME.inkSoft, marginTop: 16, maxWidth: 620, lineHeight: 1.5 }}>
          The eight most popular breeds in the Lebron-Rivera home. We focus on Mini Goldendoodles, Labradoodles, Mini Poodles and Shih Tzus — plus a few favorites the family has loved over the years.
        </p>
      </section>
      <section style={{ padding: "32px 48px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {BREEDS.map((b, i) => {
            const colors = [B_THEME.accent, B_THEME.sun, B_THEME.leaf, B_THEME.cyan];
            const c = colors[i % colors.length];
            return (
              <div key={b.name} style={{
                background: c, borderRadius: 28, padding: 22, color: B_THEME.ink,
                position: "relative", overflow: "hidden",
                transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 0.8}deg)`,
              }}>
                <div style={{
                  aspectRatio: "1", borderRadius: 18, background: "white",
                  display: "grid", placeItems: "center", marginBottom: 14,
                }}>
                  <PuppyPlaceholder hue={b.hue} size={150} accent={B_THEME.primaryDeep} ear={i % 2}/>
                </div>
                <h3 style={{ fontFamily: B_THEME.display, fontSize: 22, margin: 0, fontWeight: 900, letterSpacing: -0.5, textTransform: "uppercase", lineHeight: 1 }}>{b.name}</h3>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6, letterSpacing: 1 }}>{b.weight} · {b.coat}</div>
                <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.4, fontWeight: 500 }}>{b.blurb}</div>
              </div>
            );
          })}
        </div>
      </section>
    </B_PageFrame>
  );
}

// ---------- TRAINING / ESSENTIALS / REVIEWS / CONTACT ----------
function B_Training() {
  return (
    <B_PageFrame dark>
      <B_Nav dark/>
      <section style={{ padding: "56px 48px 0" }}>
        <B_Tag color={B_THEME.leaf}>● free support — for everyone</B_Tag>
        <h1 style={{ fontFamily: B_THEME.display, fontSize: 110, lineHeight: 0.85, margin: "16px 0 0", fontWeight: 900, letterSpacing: -3, textTransform: "uppercase", color: "white" }}>
          PICK A PROBLEM.<br/><span style={{ color: B_THEME.accent }}>WE'LL FIX IT.</span>
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", maxWidth: 600, lineHeight: 1.55, marginTop: 24 }}>
          Pick a behavior. We'll send a step-by-step plan tailored to your puppy and your home. Free for everyone — not just our pup parents.
        </p>
      </section>
      <section style={{ padding: "48px 48px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { t: "Crate Training", d: "4 weeks", c: B_THEME.accent, e: "🛏️" },
            { t: "House Breaking", d: "3 weeks", c: B_THEME.sun, e: "🚽" },
            { t: "Leash Manners", d: "2 weeks", c: B_THEME.leaf, e: "🦮" },
            { t: "Separation Anxiety", d: "6 weeks", c: B_THEME.cyan, e: "💔" },
            { t: "Recall (Come)", d: "3 weeks", c: B_THEME.primary, e: "📣" },
            { t: "Counter Surfing", d: "2 weeks", c: B_THEME.accent, e: "🍞" },
          ].map(p => (
            <div key={p.t} style={{
              background: B_THEME.bgSoft, borderRadius: 24, padding: 24, color: "white",
              border: `1px solid rgba(255,255,255,0.08)`, position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -10, right: -10, width: 80, height: 80, borderRadius: "50%", background: p.c, filter: "blur(30px)", opacity: 0.5 }}/>
              <div style={{ fontSize: 40, marginBottom: 12, position: "relative" }}>{p.e}</div>
              <h3 style={{ fontFamily: B_THEME.display, fontSize: 24, margin: 0, fontWeight: 900, letterSpacing: -0.5, textTransform: "uppercase", position: "relative" }}>{p.t}</h3>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, position: "relative" }}>
                <span style={{ fontFamily: B_THEME.mono, fontSize: 11, color: p.c, letterSpacing: 1 }}>{p.d.toUpperCase()} PLAN</span>
                <span style={{ fontSize: 18, color: p.c }}>→</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </B_PageFrame>
  );
}

function B_Essentials() {
  return (
    <B_PageFrame dark={false}>
      <B_Nav dark={false}/>
      <section style={{ padding: "56px 48px 32px" }}>
        <h1 style={{ fontFamily: B_THEME.display, fontSize: 110, lineHeight: 0.85, margin: 0, fontWeight: 900, letterSpacing: -3, textTransform: "uppercase", color: B_THEME.ink }}>
          THE SHOP.
        </h1>
        <p style={{ fontSize: 16, color: B_THEME.inkSoft, maxWidth: 480, lineHeight: 1.55, marginTop: 16 }}>Four kits. Field-tested by us before we ever ship them to you.</p>
      </section>
      <section style={{ padding: "32px 48px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {ESSENTIALS_KITS.map((k, i) => {
            const colors = [B_THEME.accent, B_THEME.sun, B_THEME.leaf, B_THEME.cyan];
            return (
              <div key={k.name} style={{
                background: colors[i], borderRadius: 28, overflow: "hidden",
                color: B_THEME.ink, display: "flex", flexDirection: "column",
                transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 1.2}deg)`,
              }}>
                <div style={{ aspectRatio: "1", padding: 28, display: "grid", placeItems: "center" }}>
                  <div style={{ width: "85%", height: "85%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[0,1,2,3].map(n => (<div key={n} style={{ background: "white", borderRadius: 12 }}/>))}
                  </div>
                </div>
                <div style={{ background: "white", padding: 20 }}>
                  <h3 style={{ fontFamily: B_THEME.display, fontSize: 22, margin: 0, fontWeight: 900, letterSpacing: -0.5, textTransform: "uppercase" }}>{k.name}</h3>
                  <div style={{ fontFamily: B_THEME.display, fontSize: 36, fontWeight: 900, color: B_THEME.primaryDeep, letterSpacing: -1, marginTop: 4 }}>${k.price}</div>
                  <button style={{ width: "100%", marginTop: 14, background: B_THEME.ink, color: "white", border: "none", padding: "12px", borderRadius: 999, fontWeight: 800, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" }}>ADD TO CART →</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </B_PageFrame>
  );
}

function B_Reviews() {
  return (
    <B_PageFrame dark>
      <B_Nav dark/>
      <section style={{ padding: "60px 48px" }}>
        <B_Tag color={B_THEME.sun}>★★★★★ 4.97 / 5 · 614 homes</B_Tag>
        <h1 style={{ fontFamily: B_THEME.display, fontSize: 110, lineHeight: 0.85, margin: "16px 0 0", fontWeight: 900, letterSpacing: -3, textTransform: "uppercase", color: "white" }}>
          DREAMY <span style={{ color: B_THEME.accent }}>REVIEWS.</span>
        </h1>
      </section>
      <section style={{ padding: "20px 48px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {[...REVIEWS, ...REVIEWS].slice(0, 6).map((r, i) => {
            const c = [B_THEME.accent, B_THEME.sun, B_THEME.leaf, B_THEME.cyan, B_THEME.primary, B_THEME.accent][i];
            return (
              <div key={i} style={{ background: c, borderRadius: 24, padding: 28, color: B_THEME.ink, transform: `rotate(${(i % 2 === 0 ? -0.6 : 0.6)}deg)` }}>
                <div style={{ fontSize: 22, letterSpacing: 4 }}>{"★".repeat(r.stars)}</div>
                <p style={{ fontFamily: B_THEME.display, fontSize: 22, fontWeight: 700, lineHeight: 1.25, margin: "12px 0 16px" }}>"{r.quote}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: B_THEME.ink, color: "white", display: "grid", placeItems: "center", fontWeight: 800 }}>{r.name[0]}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>{r.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{r.city} · {r.breed}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </B_PageFrame>
  );
}

function B_Contact() {
  return (
    <B_PageFrame dark={false}>
      <B_Nav dark={false}/>
      <section style={{ padding: "60px 48px", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 48 }}>
        <div>
          <B_Tag color={B_THEME.leaf}>● avg reply: 47 minutes</B_Tag>
          <h1 style={{ fontFamily: B_THEME.display, fontSize: 88, lineHeight: 0.85, margin: "16px 0 24px", fontWeight: 900, letterSpacing: -3, textTransform: "uppercase", color: B_THEME.ink }}>
            SAY <span style={{ color: B_THEME.primaryDeep }}>HI.</span>
          </h1>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { l: "TEXT/CALL", v: "(321) 697-8864", c: B_THEME.accent },
              { l: "EMAIL", v: "Dreampuppies22@gmail.com", c: B_THEME.sun },
              { l: "FLORIDA", v: "Orlando · by appt", c: B_THEME.leaf },
              { l: "NORTH CAROLINA", v: "Raeford · by appt", c: B_THEME.cyan },
            ].map(c => (
              <div key={c.l} style={{ background: c.c, borderRadius: 18, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: B_THEME.mono, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{c.l}</span>
                <span style={{ fontFamily: B_THEME.display, fontSize: 18, fontWeight: 800 }}>{c.v}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 style={{ fontFamily: B_THEME.display, fontSize: 32, margin: 0, fontWeight: 900, letterSpacing: -0.5, textTransform: "uppercase" }}>FAQ</h2>
          <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{ background: "white", borderRadius: 18, border: `2px solid ${B_THEME.ink}`, padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontFamily: B_THEME.display, fontSize: 16, margin: 0, fontWeight: 800, letterSpacing: -0.3, textTransform: "uppercase" }}>{f.q}</h3>
                  <span style={{ fontSize: 22, color: B_THEME.primaryDeep, fontWeight: 800 }}>{i === 0 ? "−" : "+"}</span>
                </div>
                {i === 0 && <p style={{ fontSize: 14, color: B_THEME.inkSoft, lineHeight: 1.55, margin: "12px 0 0" }}>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </B_PageFrame>
  );
}

Object.assign(window, {
  B_Home, B_Available, B_Upcoming, B_Breeds, B_Training, B_Essentials, B_Reviews, B_Contact,
});
