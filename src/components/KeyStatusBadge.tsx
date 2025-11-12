// This file provides a runtime check for missing private key and a UI badge for key status.
import { useEffect, useState } from "react";

export function useKeyStatus() {
  const [hasKey, setHasKey] = useState<boolean>(true);

  useEffect(() => {
    try {
      const key = localStorage.getItem("privateKey");
      setHasKey(!!key);
    } catch {
      setHasKey(false);
    }
  }, []);

  return hasKey;
}

export function KeyStatusBadge() {
  const hasKey = useKeyStatus();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 12,
        padding: "2px 8px",
        borderRadius: 8,
        background: hasKey ? "#16a34a" : "#f87171",
        color: "#fff",
        marginLeft: 8,
      }}
      title={hasKey ? "Private key found" : "Private key missing. Sign out and sign in again."}
    >
      {hasKey ? "Keys OK" : "No Key"}
    </span>
  );
}
