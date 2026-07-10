import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ── Shared trigger button ─────────────────────────────────────
function TriggerButton({ label, hasValue, size = "md", onClick, triggerRef }) {
  const height = size === "sm" ? "32px" : "40px";
  const fontSize = size === "sm" ? "12px" : "13.5px";
  const [hovered, setHovered] = useState(false);

  return (
    <button
      ref={triggerRef}
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

// ── Popover card (rendered via portal, positioned in fixed coords) ──
function PopoverBox({ innerRef, coords, children }) {
  return (
    <div
      ref={innerRef}
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        minWidth: coords.width,
        background: "var(--paper-raised)",
        border: "1px solid var(--line)",
        borderRadius: "12px",
        boxShadow: "0 8px 24px rgba(28,33,40,0.12)",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
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

// ── Shared hook: measures trigger position for portal placement ──
function useTriggerPosition(open) {
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    function updatePosition() {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return { triggerRef, popoverRef, coords };
}

// ═══════════════════════════════════════════════════════════════
// SelectPopover — generic list picker (portal-based, no clipping)
// ═══════════════════════════════════════════════════════════════
export function SelectPopover({ value, onChange, options, placeholder, size, width }) {
  const [open, setOpen] = useState(false);
  const { triggerRef, popoverRef, coords } = useTriggerPosition(open);

  useEffect(() => {
    function outside(e) {
      const inTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const inPopover = popoverRef.current && popoverRef.current.contains(e.target);
      if (!inTrigger && !inPopover) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  const current = options.find((o) => String(o.value) === String(value));

  return (
    <div style={{ width: width || "auto" }}>
      <TriggerButton
        triggerRef={triggerRef}
        label={current ? current.label : placeholder}
        hasValue={!!current && current.value !== ""}
        size={size}
        onClick={() => setOpen((o) => !o)}
      />
      {open && createPortal(
        <PopoverBox innerRef={popoverRef} coords={coords}>
          {options.map((opt) => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              selected={String(opt.value) === String(value)}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            />
          ))}
        </PopoverBox>,
        document.body
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DatePopover — dd-mm-yyyy display, opens native picker on 1 click
// ═══════════════════════════════════════════════════════════════
export function DatePopover({ value, onChange, placeholder = "dd-mm-yyyy", size, width }) {
  const inputRef = useRef(null);

  function fmt(d) {
    if (!d) return null;
    const date = new Date(d + "T00:00:00");
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch (e) {
        // fall through to focus/click fallback
      }
    }
    el.focus();
    el.click();
  }

  return (
    <div style={{ position: "relative", width: width || "auto", display: "flex", alignItems: "center", gap: "4px" }}>
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <TriggerButton
          label={fmt(value) || placeholder}
          hasValue={!!value}
          size={size}
          onClick={openPicker}
        />
        <input
          ref={inputRef}
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          tabIndex={-1}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1px",
            height: "1px",
            opacity: 0,
            border: "none",
            padding: 0,
            pointerEvents: "none",
          }}
        />
      </div>
      {value && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
          title="Clear date"
          style={{
            all: "unset",
            cursor: "pointer",
            color: "var(--slate-light)",
            fontSize: "14px",
            lineHeight: 1,
            padding: "4px",
            flexShrink: 0,
          }}
        >
          ×
        </button>
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