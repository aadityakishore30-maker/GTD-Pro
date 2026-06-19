function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "12px",
          minWidth: "350px",
        }}
      >
        <h3>{title}</h3>

        <p>{message}</p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "20px",
          }}
        >
          <button onClick={onCancel}>
            Cancel
          </button>

          <button
  onClick={() => {
    console.log("CONFIRM BUTTON CLICKED");
    onConfirm();
  }}
  style={{
    background: "#dc2626",
    color: "#fff",
  }}
>
  {confirmLabel}
</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;