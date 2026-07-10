import { useEffect, useRef, useState } from "react";

// ── Shared trigger button ─────────────────────────────────────
function TriggerButton({ label, hasValue, size = "md", onClick }) {
  const height = size === "sm" ? "32px" : "40px";
  const fontSize = size === "sm" ? "12px" : "13.5px";
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        all: "unset",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "6px",
        height,
        padding: "0 10px 0 12px",
        border: `1px solid ${hovered ? "var(--sage)" : "var(--line)"}`,
        borderRadius: "9px",
        background: "var(--paper)",
        color: hasValue ? "var(--ink-soft)" : "var(--slate-light)",
        fontSize,
        fontWeight: hasValue ? "500" : "400",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "border-color 0.15s ease",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <span style={{ flex: 1, textAlign: "left", overflow: "hidden",
        textOverflow: "ellipsis" }}>
        {label}
      </span>
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="6"
        viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0, opacity: 0.45 }}>
        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ── Popover card ──────────────────────────────────────────────
function PopoverBox({ children }) {
  return (
    <div style={{
      position: "absolute",
      top: "calc(100% + 6px)",
      left: 0,
      minWidth: "100%",
      background: "var(--paper-raised)",
      border: "1px solid var(--line)",
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(28,33,40,0.12)",
      zIndex: 300,
      overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

// ── Option row ────────────────────────────────────────────────
function OptionRow({ label, selected, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "10px 14px",
        fontSize: "13px",
        fontWeight: selected ? "600" : "400",
        color: selected ? "var(--sage-deep)" : "var(--ink-soft)",
        background: selected ? "var(--sage-pale)" : hovered ? "rgba(28,33,40,0.04)" : "transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      {selected ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ flexShrink: 0 }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <span style={{ width: 13, flexShrink: 0 }} />
      )}
      {label}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SelectPopover — generic list picker
// ═══════════════════════════════════════════════════════════════
export function SelectPopover({ value, onChange, options, placeholder, size, width }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function outside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  const current = options.find((o) => String(o.value) === String(value));

  return (
    <div ref={ref} style={{ position: "relative", width: width || "auto" }}>
      <TriggerButton
        label={current ? current.label : placeholder}
        hasValue={!!current && current.value !== ""}
        size={size}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <PopoverBox>
          {options.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              selected={String(opt.value) === String(value)}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            />
          ))}
        </PopoverBox>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DatePopover — date picker in a popover
// ═══════════════════════════════════════════════════════════════
export function DatePopover({ value, onChange, placeholder = "Pick date", size, width }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function outside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  function fmt(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div ref={ref} style={{ position: "relative", width: width || "auto" }}>
      <TriggerButton
        label={fmt(value) || placeholder}
        hasValue={!!value}
        size={size}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <PopoverBox>
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              type="date"
              value={value || ""}
              autoFocus
              onChange={(e) => { onChange(e.target.value); setOpen(false); }}
              style={{ width: "100%", height: "36px", fontSize: "13px",
                borderRadius: "8px", border: "1px solid var(--line)",
                padding: "0 10px", background: "var(--paper)", color: "var(--ink)" }}
            />
            {value && (
              <button onClick={() => { onChange(""); setOpen(false); }}
                className="btn-ghost"
                style={{ fontSize: "12px", minHeight: "unset", padding: "6px 10px" }}>
                Clear date
              </button>
            )}
          </div>
        </PopoverBox>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RepeatPopover — repeat selector
// ═══════════════════════════════════════════════════════════════
const REPEAT_OPTIONS = [
  { value: "none", label: "No repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function RepeatPopover({ value, onChange, size, width }) {
  return (
    <SelectPopover
      value={value || "none"}
      onChange={onChange}
      options={REPEAT_OPTIONS}
      placeholder="No repeat"
      size={size}
      width={width}
    />
  );
}