import type { CSSProperties } from "react";
import { Html } from "@react-three/drei";

const footerBarStyle: CSSProperties = {
  position: "absolute",
  right: 0,
  bottom: 0,
  left: 0,
  display: "flex",
  justifyContent: "center",
  boxSizing: "border-box",
  minHeight: 48,
  padding: "10px 12px max(10px, env(safe-area-inset-bottom))",
  overflow: "hidden",
  background: "rgba(7, 15, 28, 0.72)",
  borderTop: "1px solid rgba(255, 255, 255, 0.14)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  pointerEvents: "none",
  userSelect: "none",
};

const footerContentStyle: CSSProperties = {
  boxSizing: "border-box",
  maxWidth: "100%",
  color: "rgba(248, 250, 252, 0.82)",
  fontFamily: '"Space Grotesk", system-ui, sans-serif',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.08em",
  lineHeight: 1.2,
  textAlign: "center",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  pointerEvents: "none",
  userSelect: "none",
};

/** A full-width, camera-safe HTML footer rendered through R3F's <Html> bridge. */
export const FooterHud = () => (
  <Html fullscreen zIndexRange={[20, 0]} pointerEvents="none">
    <div aria-label="made with ❤️ by vincentt" style={footerBarStyle}>
      <div className="footer-hud__content" style={footerContentStyle}>
        made with ❤️ by vincentt
      </div>
      <div className="footer-hud__shimmer" aria-hidden="true" />
    </div>
  </Html>
);
