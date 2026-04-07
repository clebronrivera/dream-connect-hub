import { useState, useRef, useEffect } from "react";

// ── Brand Colors ──
const C = {
  primary: "#2E5A3C",
  primaryLight: "#3A7A50",
  secondary: "#C68B3F",
  secondaryLight: "#D4A05A",
  cream: "#F5F0E8",
  creamDark: "#EDE5D8",
  dark: "#1A1A1A",
  medium: "#555555",
  light: "#999999",
  lightBg: "#F9F7F3",
  white: "#FFFFFF",
  success: "#2E7D32",
  successBg: "#E8F5E9",
  warning: "#F57F17",
  warningBg: "#FFF8E1",
  danger: "#C62828",
  border: "#E0DCD4",
};

// ── Shared Components ──
const Logo = () => (
  <div style={{ textAlign: "center", marginBottom: 8 }}>
    <div style={{ fontSize: 28, fontWeight: 800, color: C.primary, letterSpacing: -0.5 }}>DREAM ENTERPRISES</div>
    <div style={{ fontSize: 14, color: C.secondary, fontStyle: "italic", marginTop: 2 }}>d/b/a Puppy Heaven</div>
  </div>
);

const DocHeader = ({ title, subtitle, refNum }) => (
  <div style={{ borderBottom: `3px solid ${C.secondary}`, paddingBottom: 16, marginBottom: 24 }}>
    <Logo />
    <div style={{ textAlign: "center", marginTop: 12 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: C.medium, marginTop: 4 }}>{subtitle}</div>}
      {refNum && <div style={{ fontSize: 12, color: C.light, marginTop: 4, fontFamily: "monospace" }}>{refNum}</div>}
    </div>
  </div>
);

const Badge = ({ children, color = C.primary, bg = C.cream }) => (
  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, color, background: bg, marginRight: 6 }}>{children}</span>
);

const Input = ({ label, value, placeholder, required, type = "text", half }) => (
  <div style={{ flex: half ? "1 1 48%" : "1 1 100%", marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.dark, marginBottom: 4 }}>
      {label} {required && <span style={{ color: C.danger }}>*</span>}
    </label>
    <input
      type={type}
      readOnly
      value={value || ""}
      placeholder={placeholder || ""}
      style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, background: value ? C.white : "#FAFAFA", color: C.dark, boxSizing: "border-box" }}
    />
  </div>
);

const Select = ({ label, value, options, required }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.dark, marginBottom: 4 }}>
      {label} {required && <span style={{ color: C.danger }}>*</span>}
    </label>
    <select style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, background: C.white, color: C.dark }} defaultValue={value}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Section = ({ title, children, icon }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ fontSize: 15, fontWeight: 700, color: C.primary, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
      {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      {title}
    </div>
    {children}
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", ...style }}>{children}</div>
);

const InfoRow = ({ label, value, bold }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.cream}` }}>
    <span style={{ fontSize: 13, color: C.medium }}>{label}</span>
    <span style={{ fontSize: 13, color: C.dark, fontWeight: bold ? 700 : 500 }}>{value}</span>
  </div>
);

const Btn = ({ children, primary, onClick, full, small, disabled, outline }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: small ? "8px 16px" : "12px 24px",
      borderRadius: 8,
      border: outline ? `2px solid ${C.danger}` : primary ? "none" : `1px solid ${C.border}`,
      background: disabled ? "#CCC" : outline ? "transparent" : primary ? C.primary : C.white,
      color: disabled ? "#888" : outline ? C.danger : primary ? C.white : C.dark,
      fontWeight: 600,
      fontSize: small ? 13 : 15,
      cursor: disabled ? "not-allowed" : "pointer",
      width: full ? "100%" : "auto",
    }}
  >
    {children}
  </button>
);

const StatusPill = ({ status }) => {
  const map = {
    signed: { bg: "#E8F5E9", color: "#2E7D32", label: "Signed" },
    deposit_paid: { bg: "#E8F5E9", color: "#2E7D32", label: "Deposit Paid" },
    sent: { bg: "#FFF8E1", color: "#F57F17", label: "Sent" },
    viewed: { bg: "#E3F2FD", color: "#1565C0", label: "Viewed" },
    paid_in_full: { bg: "#E8F5E9", color: "#1B5E20", label: "Paid in Full" },
    draft: { bg: "#F5F5F5", color: "#757575", label: "Draft" },
  };
  const s = map[status] || map.draft;
  return <Badge color={s.color} bg={s.bg}>{s.label}</Badge>;
};

// Puppy photo placeholder
const PuppyPhoto = ({ name, size = 120 }) => (
  <div style={{
    width: size, height: size, borderRadius: 12, background: `linear-gradient(135deg, ${C.cream}, ${C.creamDark})`,
    display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", border: `2px solid ${C.border}`,
  }}>
    <span style={{ fontSize: size * 0.35 }}>&#128054;</span>
    <span style={{ fontSize: 10, color: C.medium, marginTop: 4 }}>{name}</span>
  </div>
);

// ═══════════════════════════════════════════
// FORM 1: ADMIN – CREATE DEPOSIT AGREEMENT
// ═══════════════════════════════════════════
const AdminCreateAgreement = () => {
  const [source, setSource] = useState("available");
  const [selectedPuppy, setSelectedPuppy] = useState("Gus – F1B Goldendoodle – Male – $1,800");
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 700, fontSize: 18 }}>+</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.dark }}>New Deposit Agreement</div>
            <div style={{ fontSize: 12, color: C.light }}>Create and send to customer</div>
          </div>
        </div>

        <Section title="Dog Source" icon="&#128021;">
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[["available", "Available Puppies"], ["upcoming", "Upcoming Litter"], ["custom", "Custom / Unlisted"]].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setSource(v)}
                style={{
                  flex: 1, padding: "10px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: source === v ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                  background: source === v ? "#EBF5EE" : C.white,
                  color: source === v ? C.primary : C.medium,
                }}
              >{l}</button>
            ))}
          </div>
          {source === "available" && (
            <Select label="Select Puppy" value={selectedPuppy} required options={["Gus – F1B Goldendoodle – Male – $1,800", "Bella – Toy Poodle – Female – $1,500"]} />
          )}
          {source === "upcoming" && (
            <Select label="Select Litter" required options={["Star x Bruno – F1B Goldendoodle – Due May 1–7", "Trixie x Koko – Mini Goldendoodle – Due May 3–9", "Luna x Bruno – Labradoodle Mix – Due May 7–13", "Puerto x Rico – Toy Poodle – Due May 11–17"]} />
          )}
          {source === "custom" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
              <Input label="Breed" placeholder="e.g., Goldendoodle" required half />
              <Input label="Color" placeholder="e.g., Apricot" half />
              <Input label="Gender" placeholder="Male / Female" half />
              <Input label="Date of Birth" placeholder="MM/DD/YYYY" half />
            </div>
          )}
        </Section>

        <Section title="Pricing" icon="&#128176;">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
            <Input label="Total Price" value="$1,800.00" required half />
            <Input label="Deposit Amount" value="$400.00" required half />
          </div>
          <div style={{ background: C.cream, borderRadius: 8, padding: 12, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: C.medium }}>Balance Due After Deposit</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.primary }}>$1,400.00</span>
          </div>
        </Section>

        <Section title="Payment Methods" icon="&#128179;">
          <div style={{ fontSize: 12, color: C.light, marginBottom: 8 }}>Select which payment options to offer this customer:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Zelle", "Cash App", "Venmo", "PayPal", "Cash", "Square", "Stripe"].map((m, i) => (
              <label key={m} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: `1px solid ${i < 5 ? C.primary : C.border}`, background: i < 5 ? "#EBF5EE" : C.white, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={i < 5} readOnly style={{ accentColor: C.primary }} />
                {m} {i >= 5 && <span style={{ fontSize: 10, color: C.light }}>(Coming Soon)</span>}
              </label>
            ))}
          </div>
        </Section>

        <Section title="Customer (Optional)" icon="&#128100;">
          <div style={{ fontSize: 12, color: C.light, marginBottom: 8 }}>Pre-fill if you have their info, or leave blank for customer to fill in.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
            <Input label="Customer Name" placeholder="Will fill in via the link" half />
            <Input label="Email or Phone" placeholder="For sending the link" half />
          </div>
        </Section>

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <Btn primary full>Generate Agreement Link</Btn>
        </div>

        <div style={{ marginTop: 16, background: "#EBF5EE", borderRadius: 8, padding: 14, border: `1px dashed ${C.primary}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.primary, marginBottom: 6 }}>GENERATED LINK</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <code style={{ flex: 1, fontSize: 13, color: C.dark, background: C.white, padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}` }}>puppyheavenllc.com/agreement/x7Kp9mQ2</code>
            <Btn small>Copy</Btn>
          </div>
          <div style={{ fontSize: 11, color: C.medium, marginTop: 6 }}>Send this link to your customer via text, email, or DM.</div>
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════
// FORM 2: CUSTOMER – DEPOSIT AGREEMENT
// ═══════════════════════════════════════════
const CustomerDepositAgreement = () => {
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#AAA";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, canvas.height - 30);
    ctx.lineTo(canvas.width - 20, canvas.height - 30);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#CCC";
    ctx.font = "13px Arial";
    ctx.fillText("Draw your signature here", canvas.width / 2 - 75, canvas.height / 2);
    if (signed) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = C.dark;
      ctx.font = "italic 28px Georgia";
      ctx.fillText("Carlos Rivera", 40, canvas.height - 35);
      ctx.strokeStyle = "#AAA";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(20, canvas.height - 20);
      ctx.lineTo(canvas.width - 20, canvas.height - 20);
      ctx.stroke();
    }
  }, [signed]);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <Card>
        <DocHeader title="Puppy Deposit Agreement" subtitle="Please review and sign below to secure your puppy." />

        <Section title="Puppy Details">
          <div style={{ display: "flex", gap: 16, background: C.cream, borderRadius: 10, padding: 16 }}>
            <PuppyPhoto name="Buddy" size={100} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.dark }}>Buddy</div>
              <div style={{ fontSize: 13, color: C.medium, marginTop: 2 }}>F1B Goldendoodle &middot; Male &middot; Apricot</div>
              <div style={{ fontSize: 12, color: C.light, marginTop: 2 }}>DOB: December 29, 2025 &middot; 13 weeks old</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <Badge>Vaccinated</Badge>
                <Badge>Microchipped</Badge>
                <Badge>Health Cert</Badge>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.light }}>Total Price</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.dark }}>$1,800.00</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.light }}>Deposit Required</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.secondary }}>$400.00</div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Your Information">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
            <Input label="Full Legal Name" value="Carlos Rivera" required half />
            <Input label="Email Address" value="carlos@email.com" required half />
            <Input label="Phone Number" value="(555) 123-4567" required half />
            <Input label="Street Address" value="1234 Palm Ave" required half />
            <Input label="City" value="Miami" required half />
            <Input label="State" value="FL" required half />
            <Input label="Zip Code" value="33101" required half />
          </div>
        </Section>

        <Section title="Puppy's Name">
          <Input label="What will you name your new puppy?" value="Buddy" placeholder="Enter puppy's name" required />
        </Section>

        <Section title="Terms & Conditions">
          <div style={{ maxHeight: 180, overflow: "auto", background: "#FAFAFA", border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, fontSize: 12, lineHeight: 1.7, color: C.medium }}>
            <p><strong>1. Deposit Amount & Purpose:</strong> The deposit of $400.00 secures the above-described puppy for the Buyer. This deposit is applied toward the total purchase price of $1,800.00.</p>
            <p><strong>2. Non-Refundable Policy:</strong> The deposit is non-refundable. If the Buyer decides not to proceed with the purchase for any reason, the deposit will be forfeited. At the Breeder's sole discretion, the deposit may be transferred to a future litter or a different available puppy.</p>
            <p><strong>3. Breeder's Guarantee:</strong> If the Breeder is unable to provide the reserved puppy due to health complications, the Buyer may choose a replacement puppy of equal value or receive a full refund of the deposit.</p>
            <p><strong>4. Health Guarantee:</strong> The puppy comes with a 72-hour health guarantee. The Buyer agrees to have the puppy examined by a licensed veterinarian within 72 hours of pickup. If a licensed veterinarian certifies a life-threatening congenital defect within this window, the Breeder will offer a replacement puppy or a full refund.</p>
            <p><strong>5. Vaccination & Health Records:</strong> The puppy will be provided with age-appropriate vaccinations, deworming, and a health record at the time of pickup. The puppy will be microchipped.</p>
            <p><strong>6. Balance Due:</strong> The remaining balance of $1,400.00 is due on or before the date of pickup/delivery. Failure to pay the balance by the agreed date may result in forfeiture of the deposit and release of the puppy for sale to another buyer.</p>
            <p><strong>7. Spay/Neuter Agreement:</strong> Unless purchased with breeding rights (at additional cost), the Buyer agrees to spay or neuter the puppy by 12 months of age.</p>
            <p><strong>8. No Resale / Rehoming:</strong> The Buyer agrees not to resell the puppy. If at any time the Buyer can no longer care for the puppy, they must contact the Breeder first.</p>
            <p><strong>9. Limitation of Liability:</strong> The Breeder's total liability shall not exceed the purchase price of the puppy.</p>
            <p><strong>10. Binding Upon Receipt:</strong> This agreement becomes binding upon receipt of deposit and Breeder's countersignature.</p>
          </div>
        </Section>

        <Section title="Digital Signature">
          <div style={{ border: `2px solid ${signed ? C.success : C.border}`, borderRadius: 10, overflow: "hidden", background: C.white }}>
            <canvas ref={canvasRef} width={560} height={120} style={{ width: "100%", height: 120, cursor: "crosshair" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ fontSize: 11, color: C.light }}>Sign with your finger (mobile) or mouse (desktop)</div>
            <button onClick={() => setSigned(!signed)} style={{ fontSize: 11, color: C.primary, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              {signed ? "Clear" : "Demo signature"}
            </button>
          </div>

          <div style={{ marginTop: 12 }}>
            <Input label="Type Your Full Legal Name" value={signed ? "Carlos Rivera" : ""} placeholder="Must match the name above" required />
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 8, cursor: "pointer" }} onClick={() => setAgreed(!agreed)}>
            <input type="checkbox" checked={agreed} readOnly style={{ marginTop: 3, accentColor: C.primary }} />
            <span style={{ fontSize: 13, color: C.dark }}>I have read and agree to the Terms & Conditions above. I understand that this deposit is non-refundable and that this constitutes a legally binding electronic signature.</span>
          </label>
        </Section>

        <Btn primary full disabled={!agreed || !signed}>Continue to Payment</Btn>

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: C.light }}>
          Secured by Dream Enterprises &middot; puppyheavenllc.com
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════
// FORM 3: PAYMENT METHOD SELECTION
// ═══════════════════════════════════════════
const PaymentSelection = () => {
  const [selected, setSelected] = useState(null);
  const methods = [
    { id: "zelle", name: "Zelle", icon: "Z", desc: "Pay instantly from your bank" },
    { id: "cashapp", name: "Cash App", icon: "$", desc: "Send via Cash App" },
    { id: "venmo", name: "Venmo", icon: "V", desc: "Pay with Venmo" },
    { id: "paypal", name: "PayPal", icon: "P", desc: "Pay with PayPal" },
    { id: "cash", name: "Cash", icon: "$$", desc: "Pay in person" },
  ];
  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <Card>
        <DocHeader title="Select Payment Method" subtitle="Choose how you'd like to pay your deposit" />
        <div style={{ background: C.cream, borderRadius: 8, padding: 14, marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: C.medium }}>Deposit Amount Due</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.primary }}>$400.00</div>
          <div style={{ fontSize: 12, color: C.light }}>for Buddy &middot; F1B Goldendoodle</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {methods.map(m => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                border: selected === m.id ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                background: selected === m.id ? "#EBF5EE" : C.white,
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 10, background: selected === m.id ? C.primary : C.cream, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: selected === m.id ? C.white : C.primary }}>
                {m.icon}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.dark }}>{m.name}</div>
                <div style={{ fontSize: 12, color: C.light }}>{m.desc}</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${selected === m.id ? C.primary : C.border}`, background: selected === m.id ? C.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {selected === m.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.white }} />}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <Btn primary full disabled={!selected}>Continue</Btn>
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════
// FORM 4: PAYMENT INSTRUCTIONS (ZELLE EXAMPLE)
// ═══════════════════════════════════════════
const PaymentInstructions = () => (
  <div style={{ maxWidth: 480, margin: "0 auto" }}>
    <Card>
      <DocHeader title="Pay with Zelle" subtitle="Send your deposit using the details below" />

      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ width: 160, height: 160, margin: "0 auto", background: C.cream, borderRadius: 12, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div style={{ fontSize: 48 }}>&#9638;&#9638;&#9638;</div>
          <div style={{ fontSize: 10, color: C.light, marginTop: 8 }}>QR Code</div>
        </div>
        <div style={{ fontSize: 11, color: C.light, marginTop: 8 }}>Scan with your banking app</div>
      </div>

      <div style={{ background: C.cream, borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 10 }}>OR SEND MANUALLY TO:</div>
        <InfoRow label="Recipient" value="Dream Enterprises LLC" bold />
        <InfoRow label="Email" value="payments@dreamenterprises.com" />
        <InfoRow label="Phone" value="(555) 987-6543" />
      </div>

      <div style={{ background: C.warningBg, borderRadius: 10, padding: 16, marginBottom: 20, border: `1px solid #FFE082` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.warning, marginBottom: 6 }}>IMPORTANT: In the memo/note field, write exactly:</div>
        <div style={{ background: C.white, borderRadius: 6, padding: 10, fontFamily: "monospace", fontSize: 14, color: C.dark, textAlign: "center", border: `1px dashed ${C.warning}` }}>
          Deposit – Buddy – Carlos Rivera
        </div>
      </div>

      <div style={{ background: C.cream, borderRadius: 10, padding: 14, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.medium }}>Amount to Send</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.primary }}>$400.00</div>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: "#F0F4FF", borderRadius: 8, border: "1px solid #BBDEFB" }}>
        <div style={{ fontSize: 12, color: "#1565C0" }}>After sending your payment, it may take a few minutes for us to confirm. You'll receive a deposit receipt via email once confirmed.</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Btn primary full>I've Sent My Payment</Btn>
      </div>
    </Card>
  </div>
);

// ═══════════════════════════════════════════
// FORM 5: PAYMENT PENDING
// ═══════════════════════════════════════════
const PaymentPending = () => (
  <div style={{ maxWidth: 540, margin: "0 auto" }}>
    <Card>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.successBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", marginBottom: 16 }}>
          <div style={{ fontSize: 48, color: C.success }}>&#10003;</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Thank You!</div>
        <div style={{ fontSize: 16, color: C.medium }}>Your payment is being verified.</div>
      </div>

      <div style={{ background: C.cream, borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 8 }}>PAYMENT SUMMARY</div>
        <InfoRow label="Amount" value="$400.00" bold />
        <InfoRow label="Payment Method" value="Zelle" />
        <InfoRow label="Puppy" value="Buddy (Gus)" />
      </div>

      <div style={{ background: "#F0F4FF", borderRadius: 10, padding: 16, marginBottom: 20, border: "1px solid #BBDEFB" }}>
        <div style={{ fontSize: 13, color: "#1565C0" }}>You'll receive an email once verified by our team.</div>
      </div>

      <Section title="Check Payment Status">
        <div style={{ fontSize: 13, color: C.medium, marginBottom: 10 }}>
          Use this link to check on your payment status:
        </div>
        <div style={{ background: C.white, borderRadius: 6, padding: 12, border: `1px solid ${C.border}`, marginBottom: 12, fontSize: 12, color: C.primary, wordBreak: "break-all" }}>
          puppyheavenllc.com/agreement/x7Kp9mQ2
        </div>
      </Section>

      <div style={{ textAlign: "center", fontSize: 13, color: C.medium }}>
        Questions? Contact us: <strong>(555) 987-6543</strong>
      </div>

      <div style={{ borderTop: `2px solid ${C.secondary}`, marginTop: 20, paddingTop: 12, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: C.light }}>Dream Enterprises d/b/a Puppy Heaven</div>
        <div style={{ fontSize: 11, color: C.light }}>Florida & North Carolina &middot; puppyheavenllc.com</div>
      </div>
    </Card>
  </div>
);

// ═══════════════════════════════════════════
// FORM 6: ADMIN – VERIFY PAYMENT
// ═══════════════════════════════════════════
const AdminVerifyPayment = () => (
  <div style={{ maxWidth: 680, margin: "0 auto" }}>
    <Card>
      <div style={{ background: "#FFF3E0", borderRadius: 10, padding: 16, marginBottom: 20, border: `1px solid #FFE082` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.warning }}>New payment received – needs verification</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Customer Card */}
        <div style={{ background: C.cream, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 8 }}>CUSTOMER</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 4 }}>Carlos Rivera</div>
          <div style={{ fontSize: 13, color: C.medium, lineHeight: 1.6 }}>
            carlos@email.com<br />
            (555) 123-4567<br />
            1234 Palm Ave, Miami, FL 33101
          </div>
        </div>

        {/* Puppy Card */}
        <div style={{ background: C.cream, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 8 }}>PUPPY</div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <PuppyPhoto name="Buddy" size={50} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>Buddy</div>
              <div style={{ fontSize: 12, color: C.medium }}>F1B Goldendoodle</div>
              <div style={{ fontSize: 12, color: C.light }}>Male · Apricot</div>
              <div style={{ fontSize: 12, color: C.light }}>Price: $1,800</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 12 }}>PAYMENT DETAILS</div>
        <InfoRow label="Amount" value="$400.00" bold />
        <InfoRow label="Payment Method" value="Zelle" />
        <InfoRow label="Submitted" value="April 1, 2026 at 2:15 PM EST" />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <Btn primary full>Confirm Payment Received</Btn>
        <Btn outline full>Payment Not Found / Issue</Btn>
      </div>

      <div style={{ background: "#F5F5F5", borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 8 }}>Confirming will:</div>
        <ol style={{ fontSize: 12, color: C.medium, lineHeight: 1.8, marginLeft: 20 }}>
          <li>Countersign the agreement on behalf of Dream Enterprises</li>
          <li>Send finalized agreement to customer via email</li>
          <li>Update status to Deposit Paid</li>
          <li>Notify Carlos and Yolanda via email</li>
        </ol>
      </div>

      <div style={{ background: C.cream, borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 6 }}>BREEDER COUNTERSIGNATURE</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>Dream Enterprises LLC</div>
        <div style={{ fontSize: 12, color: C.medium }}>April 1, 2026 at 4:12 PM EST</div>
      </div>
    </Card>
  </div>
);

// ═══════════════════════════════════════════
// FORM 7: FINALIZED AGREEMENT
// ═══════════════════════════════════════════
const FinalizedAgreement = () => (
  <div style={{ maxWidth: 640, margin: "0 auto" }}>
    <Card>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Badge color={C.success} bg={C.successBg}>Agreement Finalized</Badge>
      </div>

      <DocHeader title="Puppy Deposit Agreement" subtitle="Executed and Binding" />

      <Section title="Puppy Details">
        <div style={{ display: "flex", gap: 16, background: C.cream, borderRadius: 10, padding: 16 }}>
          <PuppyPhoto name="Buddy" size={80} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.dark }}>Buddy</div>
            <div style={{ fontSize: 12, color: C.light, marginBottom: 8 }}>Born as Gus</div>
            <div style={{ fontSize: 13, color: C.medium }}>F1B Goldendoodle &middot; Male &middot; Apricot</div>
            <div style={{ fontSize: 12, color: C.light, marginTop: 4 }}>DOB: December 29, 2025</div>
          </div>
        </div>
      </Section>

      <Section title="Customer Information">
        <div style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, padding: 12 }}>
          <InfoRow label="Name" value="Carlos Rivera" />
          <InfoRow label="Email" value="carlos@email.com" />
          <InfoRow label="Phone" value="(555) 123-4567" />
          <InfoRow label="Address" value="1234 Palm Ave, Miami, FL 33101" />
        </div>
      </Section>

      <Section title="Agreement Terms">
        <div style={{ fontSize: 12, color: C.medium, lineHeight: 1.6, padding: 12, background: "#FAFAFA", borderRadius: 8 }}>
          <p><strong>Deposit:</strong> $400.00 (non-refundable, applied to purchase price)</p>
          <p><strong>Total Price:</strong> $1,800.00</p>
          <p><strong>Balance Due:</strong> $1,400.00 due before pickup</p>
          <p><strong>Health Guarantee:</strong> 72-hour health guarantee with veterinarian examination required</p>
          <p><strong>Key Terms:</strong> Spay/neuter agreement, no resale/rehoming, full terms as agreed</p>
        </div>
      </Section>

      <Section title="Signatures">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: C.cream, borderRadius: 8, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 8 }}>CUSTOMER</div>
            <div style={{ fontStyle: "italic", fontSize: 20, fontFamily: "Georgia", color: C.dark, marginBottom: 4 }}>Carlos Rivera</div>
            <div style={{ fontSize: 11, color: C.light }}>April 1, 2026</div>
            <div style={{ fontSize: 11, color: C.light }}>2:34 PM EST</div>
          </div>
          <div style={{ background: C.cream, borderRadius: 8, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 8 }}>BREEDER</div>
            <div style={{ fontStyle: "italic", fontSize: 20, fontFamily: "Georgia", color: C.dark, marginBottom: 4 }}>Dream Enterprises LLC</div>
            <div style={{ fontSize: 11, color: C.light }}>April 1, 2026</div>
            <div style={{ fontSize: 11, color: C.light }}>4:12 PM EST</div>
          </div>
        </div>
      </Section>

      <div style={{ background: "#F0F4FF", borderRadius: 8, padding: 12, fontSize: 12, color: "#1565C0", textAlign: "center" }}>
        A copy has been sent to carlos@email.com
      </div>

      <div style={{ borderTop: `2px solid ${C.secondary}`, marginTop: 20, paddingTop: 12, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: C.light }}>Dream Enterprises d/b/a Puppy Heaven</div>
        <div style={{ fontSize: 11, color: C.light }}>puppyheavenllc.com</div>
      </div>
    </Card>
  </div>
);

// ═══════════════════════════════════════════
// FORM 8: EMAIL TEMPLATE - DEPOSIT CONFIRMED
// ═══════════════════════════════════════════
const EmailDepositConfirmed = () => (
  <div style={{ maxWidth: 640, margin: "0 auto", background: "#F9F7F3", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
    {/* Email Chrome */}
    <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: 16 }}>
      <div style={{ fontSize: 12, color: C.light }}>
        <strong>From:</strong> Dream Enterprises &lt;noreply@dreamenterprises.com&gt;<br />
        <strong>To:</strong> carlos@email.com<br />
        <strong>Subject:</strong> Your deposit for Buddy has been confirmed!
      </div>
    </div>

    {/* Email Body */}
    <div style={{ padding: 24, background: C.white }}>
      <Logo />

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.dark, marginBottom: 8 }}>Hi Carlos,</div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: C.medium }}>
          Great news! We've received and confirmed your <strong>$400.00 deposit</strong> for <strong>Buddy</strong> (F1B Goldendoodle).
        </div>
      </div>

      <div style={{ background: C.cream, borderRadius: 10, padding: 16, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 12 }}>DEPOSIT SUMMARY</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: C.light }}>Amount Paid</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.dark }}>$400.00</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.light }}>Balance Due</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.secondary }}>$1,400.00</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginBottom: 8 }}>Next Steps</div>
        <div style={{ fontSize: 13, color: C.medium, lineHeight: 1.7 }}>
          <strong>Balance Due:</strong> $1,400.00 is due before Buddy comes home (estimated pickup: April 15, 2026)<br />
          <strong>Your finalized deposit agreement</strong> is attached to this email and ready to reference.<br />
          <strong>Questions?</strong> Reply to this email or call us at (555) 987-6543
        </div>
      </div>

      <div style={{ fontSize: 13, color: C.medium, lineHeight: 1.6 }}>
        Congratulations on welcoming Buddy to your family!<br />
        <br />
        Dream Enterprises<br />
        <em>d/b/a Puppy Heaven</em>
      </div>
    </div>

    {/* Footer */}
    <div style={{ background: C.cream, padding: 16, textAlign: "center", fontSize: 11, color: C.light, borderTop: `1px solid ${C.border}` }}>
      puppyheavenllc.com &middot; Florida & North Carolina<br />
      (555) 987-6543
    </div>
  </div>
);

// ═══════════════════════════════════════════
// FORM 9: BALANCE DUE INVOICE (UPDATED)
// ═══════════════════════════════════════════
const BalanceDueInvoice = () => (
  <div style={{ maxWidth: 540, margin: "0 auto" }}>
    <Card>
      <DocHeader title="Balance Due Notice" subtitle="Your puppy is ready! Complete your purchase below." refNum="INV-2026-0001" />

      <div style={{ background: C.warningBg, borderRadius: 10, padding: 16, marginBottom: 20, border: `1px solid #FFE082`, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.warning, fontWeight: 600 }}>Payment Due By</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.dark }}>April 15, 2026</div>
      </div>

      <div style={{ display: "flex", gap: 12, background: C.cream, borderRadius: 10, padding: 16, marginBottom: 20, alignItems: "center" }}>
        <PuppyPhoto name="Buddy" size={80} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>Buddy is ready to come home!</div>
          <div style={{ fontSize: 12, color: C.light, marginTop: 2 }}>Born as Gus</div>
          <div style={{ fontSize: 13, color: C.medium }}>F1B Goldendoodle &middot; Male &middot; 14 weeks old</div>
          <div style={{ fontSize: 12, color: C.success, fontWeight: 600, marginTop: 4 }}>Vaccinated &middot; Microchipped &middot; Health Certified</div>
        </div>
      </div>

      <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 20 }}>
        <InfoRow label="Total Purchase Price" value="$1,800.00" />
        <InfoRow label="Deposit Paid (DEP-2026-0001)" value="-$400.00" />
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 8px", background: C.cream }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>Balance Due</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: C.secondary }}>$1,400.00</span>
        </div>
      </div>

      <Btn primary full>Make Final Payment</Btn>

      <div style={{ marginTop: 16, background: "#FAFAFA", borderRadius: 8, padding: 12, fontSize: 12, color: C.medium, lineHeight: 1.6, borderLeft: `3px solid ${C.primary}` }}>
        Once payment is confirmed, you'll receive your Puppy Welcome Packet with everything you need to bring Buddy home!
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: C.medium, textAlign: "center", lineHeight: 1.6 }}>
        Failure to pay by the due date may result in forfeiture of your deposit.
        <br />Questions? Contact us at (555) 987-6543
      </div>
    </Card>
  </div>
);

// ═══════════════════════════════════════════
// FORM 10: FINAL RECEIPT / BILL OF SALE (UPDATED)
// ═══════════════════════════════════════════
const FinalReceipt = () => (
  <div style={{ maxWidth: 540, margin: "0 auto" }}>
    <Card>
      <DocHeader title="Bill of Sale & Final Receipt" refNum="SALE-2026-0001" />

      <div style={{ textAlign: "center", marginBottom: 20, padding: 16, background: C.successBg, borderRadius: 10, border: `1px solid #A5D6A7` }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.success }}>PAID IN FULL</div>
        <div style={{ fontSize: 13, color: C.success }}>April 12, 2026</div>
      </div>

      <div style={{ background: C.cream, borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 8 }}>BUYER</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Carlos Rivera</div>
        <div style={{ fontSize: 13, color: C.medium }}>1234 Palm Ave, Miami, FL 33101</div>
        <div style={{ fontSize: 13, color: C.medium }}>carlos@email.com &middot; (555) 123-4567</div>
      </div>

      <div style={{ background: C.cream, borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 8 }}>PUPPY DETAILS</div>
        <div style={{ display: "flex", gap: 12 }}>
          <PuppyPhoto name="Buddy" size={70} />
          <div style={{ flex: 1 }}>
            <InfoRow label="Name" value="Buddy (born as Gus)" bold />
            <InfoRow label="Breed" value="F1B Goldendoodle" />
            <InfoRow label="Gender / Color" value="Male / Apricot" />
            <InfoRow label="DOB" value="December 29, 2025" />
            <InfoRow label="Microchip #" value="985112345678901" />
          </div>
        </div>
      </div>

      <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "10px 12px", background: C.primary, color: C.white, fontWeight: 700, fontSize: 13 }}>PAYMENT SUMMARY</div>
        <InfoRow label="Total Purchase Price" value="$1,800.00" bold />
        <InfoRow label="Deposit Paid (Apr 1 via Zelle)" value="$400.00" />
        <InfoRow label="Balance Paid (Apr 12 via Zelle)" value="$1,400.00" />
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 8px", background: C.successBg }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.success }}>Total Paid</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.success }}>$1,800.00</span>
        </div>
      </div>

      <div style={{ background: "#FAFAFA", borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 12, color: C.medium, lineHeight: 1.6 }}>
        <strong>Transfer of Ownership:</strong> Ownership of the above-described puppy is hereby transferred from Dream Enterprises LLC to Carlos Rivera as of April 12, 2026, subject to the terms and conditions of Agreement DEP-2026-0001.
      </div>

      <div style={{ background: "#F0F4FF", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: "#1565C0", border: "1px solid #BBDEFB" }}>
        <strong>Note:</strong> This receipt is generated automatically but held until manually released by the admin.
      </div>

      <div style={{ background: C.cream, borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.primary, marginBottom: 6 }}>BUYER'S SIGNATURE</div>
        <div style={{ background: C.white, borderRadius: 6, padding: "8px 16px", border: `1px solid ${C.border}` }}>
          <div style={{ fontStyle: "italic", fontSize: 22, fontFamily: "Georgia", color: C.dark }}>Carlos Rivera</div>
          <div style={{ fontSize: 10, color: C.light }}>Signed electronically on April 1, 2026 at 2:34 PM EST</div>
        </div>
      </div>

      <Btn full style={{ background: C.white, border: `1px solid ${C.border}`, color: C.primary, fontWeight: 600 }}>Admin: Send Receipt to Customer</Btn>

      <div style={{ borderTop: `2px solid ${C.secondary}`, marginTop: 16, paddingTop: 12, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: C.light }}>Dream Enterprises LLC d/b/a Puppy Heaven</div>
        <div style={{ fontSize: 11, color: C.light }}>puppyheavenllc.com &middot; Florida & North Carolina</div>
      </div>
    </Card>
  </div>
);

// ═══════════════════════════════════════════
// FORM 11: EMAIL TEMPLATE - WELCOME PACKET
// ═══════════════════════════════════════════
const EmailWelcomePacket = () => (
  <div style={{ maxWidth: 640, margin: "0 auto", background: "#F9F7F3", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
    {/* Email Chrome */}
    <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: 16 }}>
      <div style={{ fontSize: 12, color: C.light }}>
        <strong>From:</strong> Dream Enterprises &lt;noreply@dreamenterprises.com&gt;<br />
        <strong>To:</strong> carlos@email.com<br />
        <strong>Subject:</strong> Prepared to welcome your newest addition to your family
      </div>
    </div>

    {/* Email Body */}
    <div style={{ padding: 24, background: C.white }}>
      <Logo />

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.dark, marginBottom: 8 }}>Hi Carlos,</div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: C.medium, marginBottom: 12 }}>
          Congratulations — <strong>Buddy is coming home!</strong>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: C.medium }}>
          We've prepared a personalized Welcome Packet with everything you need to ensure Buddy's smooth transition into your family.
        </div>
      </div>

      <div style={{ background: C.cream, borderRadius: 10, padding: 16, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.primary, marginBottom: 12 }}>YOUR WELCOME PACKET INCLUDES:</div>
        <ul style={{ fontSize: 13, color: C.medium, lineHeight: 1.8, marginLeft: 20 }}>
          <li><strong>Health Records</strong> — Vaccination history, deworming, microchip info</li>
          <li><strong>Feeding Guide</strong> — Current food, amounts, and transition schedule</li>
          <li><strong>Don't Panic Care Guide</strong> — Common issues and when to call the vet</li>
          <li><strong>Local Vet Resources</strong> — Recommended veterinarians near 33101 (Miami, FL)</li>
        </ul>
      </div>

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <a href="#" style={{ display: "inline-block", padding: "12px 32px", background: C.primary, color: C.white, textDecoration: "none", borderRadius: 8, fontWeight: 600, fontSize: 14 }}>View Your Welcome Packet</a>
      </div>

      <div style={{ fontSize: 13, color: C.medium, lineHeight: 1.6 }}>
        We're so excited for you and Buddy! If you have any questions before pickup or after you bring Buddy home, don't hesitate to reach out.<br />
        <br />
        Dream Enterprises<br />
        <em>d/b/a Puppy Heaven</em>
      </div>
    </div>

    {/* Footer */}
    <div style={{ background: C.cream, padding: 16, textAlign: "center", fontSize: 11, color: C.light, borderTop: `1px solid ${C.border}` }}>
      puppyheavenllc.com &middot; Florida & North Carolina<br />
      (555) 987-6543
    </div>
  </div>
);

// ═══════════════════════════════════════════
// FORM 12: PUPPY WELCOME PACKET (UPDATED)
// ═══════════════════════════════════════════
const PuppyWelcomePacket = () => (
  <div style={{ maxWidth: 600, margin: "0 auto" }}>
    <Card style={{ background: C.lightBg }}>
      {/* Hero Profile Card */}
      <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryLight})`, borderRadius: 14, padding: 24, color: C.white, marginBottom: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, letterSpacing: 2, opacity: 0.7, marginBottom: 8 }}>WELCOME HOME</div>
          <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.2)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, border: "3px solid rgba(255,255,255,0.4)" }}>&#128054;</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>Buddy</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Born as Gus &middot; Renamed with love</div>
          <div style={{ fontSize: 13, color: C.medium, marginTop: 4 }}>F1B Goldendoodle &middot; Male &middot; Apricot</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16, fontSize: 12 }}>
            <div><div style={{ opacity: 0.6 }}>Born</div><div style={{ fontWeight: 600 }}>Dec 29, 2025</div></div>
            <div><div style={{ opacity: 0.6 }}>Parents</div><div style={{ fontWeight: 600 }}>Star & Bruno</div></div>
            <div><div style={{ opacity: 0.6 }}>Microchip</div><div style={{ fontWeight: 600 }}>985112345678901</div></div>
          </div>
          <div style={{ marginTop: 14, fontSize: 13, opacity: 0.8 }}>Proudly owned by <strong>Carlos Rivera</strong></div>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>Dream Enterprises &middot; Puppy Heaven</div>
        </div>
      </div>

      {/* Health Records */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>&#129658;</span> Health & Vaccination Record
        </div>
        <div style={{ borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: C.primary, padding: "8px 12px", color: C.white, fontSize: 11, fontWeight: 600 }}>
            <div>Vaccine/Treatment</div><div>Date</div><div>Status</div>
          </div>
          {[
            ["DHPP (1st Round)", "Feb 10, 2026", "Complete"],
            ["DHPP (2nd Round)", "Feb 24, 2026", "Complete"],
            ["Bordetella", "Feb 24, 2026", "Complete"],
            ["Deworming", "Feb 10, 2026", "Complete"],
            ["Rabies", "Due at 16 weeks", "Pending"],
          ].map(([v, d, s], i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "8px 12px", background: i % 2 ? C.cream : C.white, fontSize: 12 }}>
              <div style={{ fontWeight: 500 }}>{v}</div>
              <div style={{ color: C.medium }}>{d}</div>
              <div><Badge color={s === "Complete" ? C.success : C.warning} bg={s === "Complete" ? C.successBg : C.warningBg}>{s}</Badge></div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: 10, background: C.warningBg, borderRadius: 6, fontSize: 12, color: C.warning, fontWeight: 500, border: "1px solid #FFE082" }}>
          Please have Buddy examined by your vet within 72 hours of bringing him home.
        </div>
      </Card>

      {/* Feeding Guide */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>&#127858;</span> Feeding Guide
        </div>
        <div style={{ background: C.cream, borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>Current Food</div>
          <div style={{ fontSize: 14, color: C.medium, marginTop: 4 }}>Royal Canin Medium Puppy &middot; 3/4 cup &middot; 3x daily</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 8 }}>Switching Foods? Follow This Schedule:</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontSize: 12, color: C.medium }}>
          <Badge color={C.primary} bg="#EBF5EE">Days 1–3</Badge><span>75% current food + 25% new food</span>
          <Badge color={C.primary} bg="#EBF5EE">Days 4–6</Badge><span>50% current food + 50% new food</span>
          <Badge color={C.primary} bg="#EBF5EE">Days 7–9</Badge><span>25% current food + 75% new food</span>
          <Badge color={C.primary} bg="#EBF5EE">Day 10+</Badge><span>100% new food</span>
        </div>
        <div style={{ marginTop: 12, padding: 10, background: "#FFEBEE", borderRadius: 6, fontSize: 12, color: C.danger, border: "1px solid #FFCDD2" }}>
          <strong>Never feed:</strong> Grapes, raisins, chocolate, onions, garlic, xylitol (sweetener), macadamia nuts, alcohol, cooked bones.
        </div>
      </Card>

      {/* Don't Panic Guide */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>&#128155;</span> Don't Panic Guide
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 6 }}>Vomiting</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: C.successBg, borderRadius: 8, padding: 10, fontSize: 12, border: "1px solid #A5D6A7" }}>
              <div style={{ fontWeight: 600, color: C.success, marginBottom: 4 }}>Usually Normal:</div>
              <div style={{ color: C.medium, lineHeight: 1.5 }}>White foam on empty stomach. Yellow bile first thing in morning (try a bedtime snack). Undigested food from eating too fast. Single episode with no other symptoms.</div>
            </div>
            <div style={{ background: "#FFEBEE", borderRadius: 8, padding: 10, fontSize: 12, border: "1px solid #FFCDD2" }}>
              <div style={{ fontWeight: 600, color: C.danger, marginBottom: 4 }}>Call Your Vet:</div>
              <div style={{ color: C.medium, lineHeight: 1.5 }}>More than 3 times in 24 hours. Blood (red streaks or dark coffee-ground look). Combined with lethargy or diarrhea. Refuses food and water. Any vomiting under 12 weeks.</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 6 }}>Coat & Grooming</div>
          <div style={{ background: C.cream, borderRadius: 8, padding: 10, fontSize: 12, color: C.medium, lineHeight: 1.6 }}>
            Some shedding during adjustment to a new home is normal. Brush daily to prevent matting (Goldendoodles have curly coats!). First professional grooming recommended at 12–16 weeks. Excessive scratching may indicate allergies or fleas — check with your vet.
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 6 }}>Energy & Behavior</div>
          <div style={{ background: C.cream, borderRadius: 8, padding: 10, fontSize: 12, color: C.medium, lineHeight: 1.6 }}>
            Puppies sleep 18–20 hours a day — this is completely normal! Initial shyness in a new home is expected. Give Buddy 2–3 quiet days to adjust. If he won't eat or play at all after 48 hours, contact your vet.
          </div>
        </div>
      </Card>

      {/* Local Resources */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>&#128205;</span> Local Resources Near You
        </div>
        <div style={{ fontSize: 12, color: C.light, marginBottom: 12 }}>Based on your zip code: 33101 (Miami, FL)</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 6 }}>Veterinary Clinics</div>
          {[
            ["Coral Gables Animal Hospital", "2100 Coral Way, Miami", "0.8 mi", "4.8"],
            ["Miami Veterinary Specialists", "8601 Sunset Dr, Miami", "3.2 mi", "4.7"],
            ["Brickell Animal Hospital", "1401 SW 1st Ave, Miami", "1.1 mi", "4.6"],
          ].map(([n, a, d, r]) => (
            <div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.cream}`, fontSize: 12 }}>
              <div>
                <div style={{ fontWeight: 600, color: C.dark }}>{n}</div>
                <div style={{ color: C.light }}>{a}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: C.secondary, fontWeight: 600 }}>{r} stars</div>
                <div style={{ color: C.light }}>{d}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 6 }}>24-Hour Emergency</div>
          <div style={{ background: "#FFEBEE", borderRadius: 8, padding: 10, fontSize: 12, border: "1px solid #FFCDD2" }}>
            <div style={{ fontWeight: 600, color: C.danger }}>Miami Veterinary Emergency &middot; (305) 666-4142</div>
            <div style={{ color: C.medium }}>8601 Sunset Dr, Miami, FL 33143 &middot; Open 24/7</div>
          </div>
        </div>

        <div style={{ background: C.cream, borderRadius: 8, padding: 10, fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: C.dark, marginBottom: 4 }}>Important Numbers</div>
          <div style={{ color: C.medium, lineHeight: 1.8 }}>
            ASPCA Poison Control: <strong>(888) 426-4435</strong><br />
            Miami-Dade Animal Services: <strong>(305) 884-1101</strong>
          </div>
        </div>
      </Card>

      {/* Breeder Contact */}
      <Card>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>&#128222;</span> We're Here for You
        </div>
        <div style={{ fontSize: 13, color: C.medium, lineHeight: 1.7, marginBottom: 12 }}>
          Congratulations on your new family member! If you ever have questions about Buddy — whether it's about feeding, training, health, or anything else — please don't hesitate to reach out. We care about every puppy we raise, and we're always here to help.
        </div>
        <div style={{ background: C.cream, borderRadius: 8, padding: 14 }}>
          <div style={{ fontWeight: 600, color: C.dark }}>Dream Enterprises / Puppy Heaven</div>
          <div style={{ fontSize: 13, color: C.medium, marginTop: 4 }}>puppyheavenllc.com &middot; (555) 987-6543</div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: C.warning, background: C.warningBg, borderRadius: 6, padding: 10, border: "1px solid #FFE082" }}>
          <strong>Remember:</strong> If you ever find yourself unable to care for Buddy, please contact us first. We will always help find the right home.
        </div>
      </Card>
    </Card>
  </div>
);

// ═══════════════════════════════════════════
// FORM 13: ADMIN AGREEMENT DASHBOARD
// ═══════════════════════════════════════════
const AdminDashboard = () => {
  const agreements = [
    { customer: "Carlos Rivera", puppy: "Buddy", breed: "F1B Goldendoodle", price: "$1,800", deposit: "$400", status: "deposit_paid", date: "Apr 1" },
    { customer: "Maria Santos", puppy: "Upcoming Litter Slot", breed: "Toy Poodle", price: "$1,500", deposit: "$400", status: "signed", date: "Mar 30" },
    { customer: "James Wilson", puppy: "Upcoming Litter Slot", breed: "F1B Goldendoodle", price: "$1,800", deposit: "$400", status: "sent", date: "Mar 28" },
    { customer: "Emily Chen", puppy: "Snow", breed: "Shih Tzu", price: "$1,500", deposit: "$400", status: "paid_in_full", date: "Mar 15" },
    { customer: "Draft Agreement", puppy: "–", breed: "–", price: "–", deposit: "–", status: "draft", date: "Apr 1" },
  ];
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>Deposit Agreements</div>
            <div style={{ fontSize: 13, color: C.light }}>Manage all customer agreements</div>
          </div>
          <Btn primary small>+ New Agreement</Btn>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            ["Active", "3", C.primary, "#EBF5EE"],
            ["Deposits Collected", "$1,200", C.success, C.successBg],
            ["Pending Signature", "1", C.warning, C.warningBg],
            ["Completed Sales", "1", "#1565C0", "#E3F2FD"],
          ].map(([label, val, color, bg]) => (
            <div key={label} style={{ background: bg, borderRadius: 8, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
              <div style={{ fontSize: 11, color: C.medium }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 0.6fr", background: C.primary, padding: "10px 12px", color: C.white, fontSize: 11, fontWeight: 600, gap: 8 }}>
            <div>Customer</div><div>Puppy</div><div>Price</div><div>Deposit</div><div>Status</div><div>Date</div>
          </div>
          {agreements.map((a, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 0.6fr", padding: "10px 12px", background: i % 2 ? C.cream : C.white, fontSize: 12, alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div style={{ fontWeight: 600, color: C.dark }}>{a.customer}</div>
              <div>
                <div style={{ color: C.dark }}>{a.puppy}</div>
                <div style={{ fontSize: 10, color: C.light }}>{a.breed}</div>
              </div>
              <div style={{ fontWeight: 600 }}>{a.price}</div>
              <div>{a.deposit}</div>
              <div><StatusPill status={a.status} /></div>
              <div style={{ color: C.light }}>{a.date}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════
// MAIN APP WITH TAB NAVIGATION
// ═══════════════════════════════════════════
const tabs = [
  { id: "admin-create", label: "Create Agreement", icon: "+" },
  { id: "admin-dash", label: "Dashboard", icon: "G" },
  { id: "deposit", label: "Deposit Form", icon: "1" },
  { id: "payment", label: "Pay Method", icon: "2" },
  { id: "instructions", label: "Pay Instructions", icon: "3" },
  { id: "pending", label: "Payment Pending", icon: "4" },
  { id: "verify", label: "Admin: Verify", icon: "V" },
  { id: "finalized", label: "Finalized Agreement", icon: "F" },
  { id: "email-deposit", label: "Email: Deposit", icon: "E" },
  { id: "invoice", label: "Final Payment", icon: "I" },
  { id: "final", label: "Final Receipt", icon: "R" },
  { id: "email-welcome", label: "Email: Welcome", icon: "W" },
  { id: "welcome", label: "Welcome Packet", icon: "P" },
];

export default function FormMockups() {
  const [active, setActive] = useState("admin-create");

  const render = () => {
    switch (active) {
      case "admin-create": return <AdminCreateAgreement />;
      case "admin-dash": return <AdminDashboard />;
      case "deposit": return <CustomerDepositAgreement />;
      case "payment": return <PaymentSelection />;
      case "instructions": return <PaymentInstructions />;
      case "pending": return <PaymentPending />;
      case "verify": return <AdminVerifyPayment />;
      case "finalized": return <FinalizedAgreement />;
      case "email-deposit": return <EmailDepositConfirmed />;
      case "invoice": return <BalanceDueInvoice />;
      case "final": return <FinalReceipt />;
      case "email-welcome": return <EmailWelcomePacket />;
      case "welcome": return <PuppyWelcomePacket />;
      default: return null;
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', 'Arial', sans-serif", background: "#F4F2ED", minHeight: "100vh" }}>
      {/* Top Header */}
      <div style={{ background: C.primary, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: C.white, fontWeight: 700, fontSize: 16 }}>Dream Enterprises — Form Templates Preview</div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>13 Templates &middot; All Interactive</div>
      </div>

      {/* Tab Bar */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 12px", overflowX: "auto", display: "flex", gap: 2, whiteSpace: "nowrap" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              padding: "10px 14px",
              fontSize: 12,
              fontWeight: active === t.id ? 700 : 500,
              color: active === t.id ? C.primary : C.medium,
              background: "none",
              border: "none",
              borderBottom: active === t.id ? `3px solid ${C.primary}` : "3px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: 4, fontSize: 10, fontWeight: 700,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: active === t.id ? C.primary : C.cream,
              color: active === t.id ? C.white : C.medium,
            }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "24px 16px", maxWidth: 800, margin: "0 auto" }}>
        {render()}
      </div>
    </div>
  );
}
