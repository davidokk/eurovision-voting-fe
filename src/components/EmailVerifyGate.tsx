import { useCallback, useEffect, useState } from "react";
import { fetchMe } from "../api/user";
import type { Theme } from "../types/contest";
import { EmailVerifyModal } from "./EmailVerifyModal";

type Props = {
  theme?: Theme;
};

export function EmailVerifyGate({ theme = "dark-blue" }: Props) {
  const [show, setShow] = useState(false);
  const [legacyHint, setLegacyHint] = useState(false);

  const check = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setShow(false);
      return;
    }
    try {
      const me = await fetchMe(token);
      setShow(!me.email_verified);
      setLegacyHint(me.needs_email_setup);
    } catch {
      setShow(false);
    }
  }, []);

  useEffect(() => {
    void check();
    window.addEventListener("ev-auth-updated", check);
    return () => window.removeEventListener("ev-auth-updated", check);
  }, [check]);

  if (!show) return null;

  return (
    <EmailVerifyModal
      theme={theme}
      legacyHint={legacyHint}
      onVerified={() => {
        setShow(false);
        window.dispatchEvent(new CustomEvent("ev-auth-updated"));
      }}
    />
  );
}
