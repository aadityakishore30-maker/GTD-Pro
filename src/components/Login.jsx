import { useEffect, useRef } from "react";
import { supabase } from "../services/supabase";
import logo from "../assets/Screenshot_2026-06-19_143129-removebg-preview.webp";

function TickCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Grid-based placement: divide screen into cells so ticks never overlap
    const COLS = 4;
    const ROWS = 3;
    const COUNT = COLS * ROWS;

    function getGridPosition(index) {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const cellW = window.innerWidth / COLS;
      const cellH = window.innerHeight / ROWS;
      const margin = 60;
      return {
        x: cellW * col + margin + Math.random() * (cellW - margin * 2),
        y: cellH * row + margin + Math.random() * (cellH - margin * 2),
      };
    }

    const items = Array.from({ length: COUNT }, (_, i) => {
      const pos = getGridPosition(i);
      return {
        x: pos.x,
        y: pos.y,
        gridIndex: i,
        radius: 16 + Math.random() * 14,
        startTime: null,
        delay: Math.random() * 12000,
        totalDuration: 1800 + Math.random() * 1200,
      };
    });

    let animId;

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 2);
    }

    function drawItem(ctx, item, elapsed) {
      const { x, y, radius } = item;
      const circleInDur = 600;
      const tickDrawDur = 500;
      const holdDur = 400;
      const fadeOutDur = 600;

      let globalOpacity = 1;
      let circleProgress = 0;
      let tickProgress = 0;

      if (elapsed < circleInDur) {
        // Phase 1: circle draws itself
        circleProgress = easeOut(elapsed / circleInDur);
        globalOpacity = Math.min(elapsed / 200, 1) * 0.13;
      } else if (elapsed < circleInDur + tickDrawDur) {
        // Phase 2: tick draws inside complete circle
        circleProgress = 1;
        tickProgress = easeOut((elapsed - circleInDur) / tickDrawDur);
        globalOpacity = 0.13;
      } else if (elapsed < circleInDur + tickDrawDur + holdDur) {
        // Phase 3: hold
        circleProgress = 1;
        tickProgress = 1;
        globalOpacity = 0.13;
      } else if (elapsed < item.totalDuration) {
        // Phase 4: fade out
        const fadeElapsed = elapsed - circleInDur - tickDrawDur - holdDur;
        circleProgress = 1;
        tickProgress = 1;
        globalOpacity = (1 - easeOut(fadeElapsed / fadeOutDur)) * 0.13;
      } else {
        return false; // done
      }

      ctx.save();
      ctx.globalAlpha = globalOpacity;
      ctx.strokeStyle = "#3D6B5A";
      ctx.lineWidth = radius * 0.13;
      ctx.lineCap = "round";

      // Draw partial circle arc
      if (circleProgress > 0) {
        ctx.beginPath();
        ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * circleProgress);
        ctx.stroke();
      }

      // Draw tick inside
      if (tickProgress > 0) {
        const t1End = 0.4; // first segment ends at 40% of tick progress
        const p1x = x - radius * 0.38;
        const p1y = y + radius * 0.05;
        const p2x = x - radius * 0.08;
        const p2y = y + radius * 0.35;
        const p3x = x + radius * 0.42;
        const p3y = y - radius * 0.28;

        ctx.beginPath();
        if (tickProgress <= t1End) {
          const t = tickProgress / t1End;
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p1x + (p2x - p1x) * t, p1y + (p2y - p1y) * t);
        } else {
          const t = (tickProgress - t1End) / (1 - t1End);
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.lineTo(p2x + (p3x - p2x) * t, p2y + (p3y - p2y) * t);
        }
        ctx.stroke();
      }

      ctx.restore();
      return true; // still alive
    }

    function animate(timestamp) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      items.forEach((item) => {
        if (item.startTime === null) {
          if (timestamp >= item.delay) {
            item.startTime = timestamp;
          } else {
            return;
          }
        }

        if (timestamp < item.startTime) return;

        const elapsed = timestamp - item.startTime;
        const alive = drawItem(ctx, item, elapsed);

        if (!alive) {
          const pos = getGridPosition(item.gridIndex);
          item.x = pos.x;
          item.y = pos.y;
          item.radius = 16 + Math.random() * 14;
          item.totalDuration = 1800 + Math.random() * 1200;
          item.startTime = timestamp + 2000 + Math.random() * 6000;
          item.delay = 0;
        }
      });

      animId = requestAnimationFrame(animate);
    }

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

function Login() {
  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  }

  return (
    <div style={styles.page}>
      <TickCanvas />

      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <img src={logo} alt="Captur." style={styles.logoImg} />
        </div>

        <p style={styles.tagline}>Clear what matters, leave the rest for later.</p>

        <div style={styles.divider} />

        <button style={styles.googleBtn} onClick={signInWithGoogle}>
          <GoogleIcon />
          Sign in with Google
        </button>

        <p style={styles.footer}>
          By signing in, you agree to capture more and stress less.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    backgroundColor: "#F0EFEA",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    overflow: "hidden",
  },
  card: {
    position: "relative",
    zIndex: 1,
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e4e2dc",
    padding: "40px 48px",
    width: "100%",
    maxWidth: "380px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  logoWrap: {
    marginBottom: "12px",
  },
  logoImg: {
    height: "72px",
    width: "auto",
    display: "block",
  },
  tagline: {
    fontSize: "13px",
    color: "#8b938d",
    margin: "0",
    textAlign: "center",
    lineHeight: "1.5",
  },
  divider: {
    width: "100%",
    height: "1px",
    backgroundColor: "#e4e2dc",
    margin: "28px 0",
  },
  googleBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "10px 20px",
    backgroundColor: "#3D6B5A",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    letterSpacing: "0.01em",
  },
  footer: {
    marginTop: "20px",
    fontSize: "13px",
    color: "#b0b8b3",
    textAlign: "center",
    lineHeight: "1.6",
  },
};

export default Login;