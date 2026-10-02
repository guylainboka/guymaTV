"use client";

import dynamic from "next/dynamic";

/**
 * The guymaTV app is a fully client-side orchestrator — it uses
 * useState/useEffect/useRef and the document API, so we render it
 * client-only to avoid any SSR mismatches.
 */
const GuymaApp = dynamic(() => import("@/components/guyma/GuymaApp"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1412",
        color: "#ccff80",
        fontFamily: "Sora, sans-serif",
        fontWeight: 700,
        fontSize: 26,
        letterSpacing: "-0.02em",
      }}
    >
      guymaTV
    </div>
  ),
});

export default function Home() {
  return <GuymaApp />;
}
