import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Uses a portal so the popover renders at document.body level —
// this prevents it being clipped by any parent overflow or z-index.
function PopoverCard({ anchorRef, onClose, children }) {
  const [pos, setPos] = useState(null);
  const [ready, setReady] = useState(false);
  const boxRef = useRef(null);

  useLayoutEffect(() => {
    if (!anchorRef.current || !boxRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    // Measure the box's real rendered size (not a guessed width) so the
    // flipped position lines up exactly against the trigger, with no gap.
    const boxRect = boxRef.current.getBoundingClientRect();
    const POPOVER_W = boxRect.width;
    const POPOVER_H = boxRect.height;

    // Flip left if overflows right edge of viewport
    const overflowsRight = rect.left + POPOVER_W > window.innerWidth - 12;
    const left = overflowsRight
      ? rect.right + window.scrollX - POPOVER_W
      : rect.left + window.scrollX;

    // Flip upward if overflows bottom of viewport
    const overflowsBottom = rect.bottom + POPOVER_H > window.innerHeight;
    const top = overflowsBottom
      ? rect.top + window.scrollY - POPOVER_H - 6
      : rect.bottom + window.scrollY + 6;

    setPos({ top, left, minWidth: rect.width });
    setReady(true);
  }, []);

  useEffect(() => {
    function handle(e) {
      if (
        anchorRef.current && !anchorRef.current.contains(e.target) &&
        boxRef.current && !boxRef.current.contains(e.target)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return createPortal(
    <div
      ref={boxRef}
      style={{
        position: "absolute",
        // First frame renders off-screen (unmeasured) so we can read its
        // real size, then we snap it into the correct spot and reveal it —
        // this avoids any visible flash while still being pixel-accurate.
        top: pos ? pos.top : -9999,
        left: pos ? pos.left : -9999,
        visibility: ready ? "visible" : "hidden",
        minWidth: pos ? pos.minWidth : undefined,
        background: "var(--paper-raised)",
        border: "1px solid var(--line)",
        borderRadius: "12px",
        boxShadow: "0 8px 24px rgba(28,33,40,0.12)",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {children}
    </div>,
    document.body
  );
}

// ── Trigger button (looks like a custom select) ───────────────
function TriggerBtn({ label, hasValue, size = "md", onClick }) {
  const height = size === "sm" ? "32px" : "40px";
  const fontSize = size === "sm" ? "12px" : "13.5px";
  const [hov, setHov] = useState(false);

  return (
    <button
      className="popover-trigger-btn"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        all: "unset",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        height,
        padding: "0 10px 0 12px",
        border: `1px solid ${hov ? "var(--sage)" : "var(--line)"}`,
        borderRadius: "9px",
        background: "var(--paper)",
        color: hasValue ? "var(--ink-soft)" : "var(--slate-light)",
        fontSize,
        fontWeight: hasValue ? "500" : "400",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "border-color 0.15s",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis" }}>
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

// ── Option row ────────────────────────────────────────────────
function OptionRow({ label, selected, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="popover-option-row"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "10px 14px",
        fontSize: "13px",
        fontWeight: selected ? "600" : "400",
        color: selected ? "var(--sage-deep)" : "var(--ink-soft)",
        background: selected ? "var(--sage-pale)" : hov ? "rgba(28,33,40,0.04)" : "transparent",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      {selected ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : <span style={{ width: 13 }} />}
      {label}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SelectPopover — generic visible dropdown trigger
// ═══════════════════════════════════════════════════════════════
export function SelectPopover({ value, onChange, options, placeholder, size, width }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = options.find((o) => String(o.value) === String(value));

  return (
    <div ref={ref} style={{ position: "relative", width: width || "auto" }}>
      <TriggerBtn
        label={current ? current.label : placeholder}
        hasValue={!!current && current.value !== ""}
        size={size}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <PopoverCard anchorRef={ref} onClose={() => setOpen(false)}>
          {options.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              selected={String(opt.value) === String(value)}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            />
          ))}
        </PopoverCard>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DatePopover — date in a popover (for Captured)
// ═══════════════════════════════════════════════════════════════
export function DatePopover({ value, onChange, placeholder = "Pick date", size, width }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  function fmt(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div ref={ref} style={{ position: "relative", width: width || "auto" }}>
      <TriggerBtn
        label={fmt(value) || placeholder}
        hasValue={!!value}
        size={size}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <PopoverCard anchorRef={ref} onClose={() => setOpen(false)}>
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              type="date" value={value || ""} autoFocus
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
        </PopoverCard>
      )}
    </div>
  );
}

const REPEAT_OPTS = [
  { value: "none", label: "No repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

// ═══════════════════════════════════════════════════════════════
// RepeatPopover — visible repeat selector (for create row)
// ═══════════════════════════════════════════════════════════════
export function RepeatPopover({ value, onChange, size, width }) {
  return (
    <SelectPopover
      value={value || "none"}
      onChange={onChange}
      options={REPEAT_OPTS}
      placeholder="No repeat"
      size={size}
      width={width}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// PencilPopover — pencil icon that opens any custom content.
// children = render prop receiving { close }.
// Used for repeat-only (Today's tasks) and date+repeat (Upcoming).
// ═══════════════════════════════════════════════════════════════
export function PencilPopover({ children, active }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Edit"
        style={{
          all: "unset",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: active ? "var(--sage-deep)" : "var(--slate)",
          padding: "4px",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = "var(--ink)"}
        onMouseLeave={(e) => e.currentTarget.style.color = active ? "var(--sage-deep)" : "var(--slate)"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      {open && (
        <PopoverCard anchorRef={ref} onClose={() => setOpen(false)}>
          {children({ close: () => setOpen(false) })}
        </PopoverCard>
      )}
    </div>
  );
}