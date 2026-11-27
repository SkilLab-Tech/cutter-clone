// T-010: hidden /smoke page (gate G-1). Connects over Web Serial and cuts the 25 mm square.
// Not linked from the navigation. Technical settings live under "Avançado" (BP-UX-002).
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BAUD_RATES,
  DEFAULT_SERIAL_SETTINGS,
  TransportError,
  smokeSquareBytes,
  type BaudRate,
  type FlowControl,
  type Parity,
  type SerialSettings,
} from "@cutter-clone/core";
import { requestSerialPort, WebSerialTransport } from "../transport/web-serial";
import { getNavigatorSerial } from "../transport/web-serial-types";

type Phase = "closed" | "opening" | "open" | "sending" | "sent" | "lost";

interface LogLine {
  id: number;
  text: string;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
}

/** Printable ASCII; anything else becomes "·" so control bytes (XON/XOFF) stay visible. */
function printable(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : "·")).join("");
}

export function SmokePage() {
  const { t } = useTranslation();
  const ids = { baud: useId(), parity: useId(), flow: useId(), xon: useId() };
  const supported = getNavigatorSerial() !== undefined;
  const [settings, setSettings] = useState<SerialSettings>(DEFAULT_SERIAL_SETTINGS);
  const [phase, setPhase] = useState<Phase>("closed");
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const transportRef = useRef<WebSerialTransport | null>(null);
  const nextId = useRef(0);

  const addLog = useCallback((text: string) => {
    setLog((l) => [...l, { id: nextId.current++, text }]);
  }, []);

  useEffect(
    () => () => {
      void transportRef.current?.close();
    },
    [],
  );

  const errorMessage = (err: unknown): string => {
    if (err instanceof TransportError) {
      if (err.code === "busy") return t("smoke.errors.busy");
      if (err.code === "cancelled") return t("smoke.errors.cancelled");
      if (err.code === "lost") return t("smoke.errors.lost");
      if (err.code === "unsupported") return t("smoke.unsupported");
    }
    return t("smoke.errors.generic");
  };

  async function connect() {
    setError(null);
    try {
      const port = await requestSerialPort();
      setPhase("opening");
      const transport = new WebSerialTransport(port);
      transport.onReceive((bytes) =>
        addLog(
          t("smoke.advanced.receivedLine", {
            n: bytes.length,
            hex: hex(bytes),
            text: printable(bytes),
          }),
        ),
      );
      transport.onDisconnect(() => {
        setPhase("lost");
        setError(t("smoke.errors.lost"));
        transportRef.current = null;
      });
      await transport.open(settings);
      transportRef.current = transport;
      setPhase("open");
    } catch (err) {
      setPhase("closed");
      setError(errorMessage(err));
    }
  }

  async function cut() {
    const transport = transportRef.current;
    if (transport === null) return;
    setError(null);
    setPhase("sending");
    const bytes = smokeSquareBytes();
    try {
      await transport.write(bytes);
      addLog(t("smoke.advanced.sentLine", { n: bytes.length, text: printable(bytes) }));
      setPhase((p) => (p === "sending" ? "sent" : p));
    } catch (err) {
      setError(errorMessage(err));
      setPhase(transport.state === "open" ? "open" : "lost");
    }
  }

  async function disconnect() {
    const transport = transportRef.current;
    transportRef.current = null;
    await transport?.close();
    setPhase("closed");
  }

  const connected = phase === "open" || phase === "sending" || phase === "sent";
  const statusKey = phase === "lost" ? "lost" : phase;

  return (
    <section aria-labelledby="screen-title" data-screen="smoke">
      <h1 id="screen-title">{t("smoke.title")}</h1>
      <p>{t("smoke.intro")}</p>
      <p>{t("smoke.steps")}</p>

      {!supported ? (
        <p className="state state-error" role="alert">
          {t("smoke.unsupported")}
        </p>
      ) : (
        <>
          <p className="smoke-status" role="status" aria-live="polite">
            <strong>{t("smoke.status.label")}:</strong>{" "}
            <span data-testid="smoke-status">{t(`smoke.status.${statusKey}`)}</span>
          </p>
          {error !== null && (
            <div className="state state-error" role="alert">
              <p>{error}</p>
            </div>
          )}
          <div className="smoke-actions">
            {!connected ? (
              <button type="button" onClick={() => void connect()} disabled={phase === "opening"}>
                {t("smoke.connect")}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => void cut()} disabled={phase === "sending"}>
                  {t("smoke.cut")}
                </button>
                <button type="button" onClick={() => void disconnect()}>
                  {t("smoke.disconnect")}
                </button>
              </>
            )}
          </div>

          <details className="advanced">
            <summary>{t("smoke.advanced.title")}</summary>
            <fieldset disabled={connected || phase === "opening"}>
              <p>
                <label htmlFor={ids.baud}>{t("smoke.advanced.baud")}</label>{" "}
                <select
                  id={ids.baud}
                  value={settings.baudRate}
                  onChange={(e) =>
                    setSettings({ ...settings, baudRate: Number(e.target.value) as BaudRate })
                  }
                >
                  {BAUD_RATES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </p>
              <p>
                <label htmlFor={ids.parity}>{t("smoke.advanced.parity")}</label>{" "}
                <select
                  id={ids.parity}
                  value={settings.parity}
                  onChange={(e) => setSettings({ ...settings, parity: e.target.value as Parity })}
                >
                  <option value="none">{t("smoke.advanced.parityNone")}</option>
                  <option value="even">{t("smoke.advanced.parityEven")}</option>
                  <option value="odd">{t("smoke.advanced.parityOdd")}</option>
                </select>
              </p>
              <p>
                <label htmlFor={ids.flow}>{t("smoke.advanced.flow")}</label>{" "}
                <select
                  id={ids.flow}
                  value={settings.flowControl}
                  onChange={(e) =>
                    setSettings({ ...settings, flowControl: e.target.value as FlowControl })
                  }
                >
                  <option value="none">{t("smoke.advanced.flowNone")}</option>
                  <option value="hardware">{t("smoke.advanced.flowHardware")}</option>
                </select>
              </p>
              <p>
                <input
                  id={ids.xon}
                  type="checkbox"
                  checked={settings.softwareXonXoff}
                  onChange={(e) => setSettings({ ...settings, softwareXonXoff: e.target.checked })}
                />{" "}
                <label htmlFor={ids.xon}>{t("smoke.advanced.xonxoff")}</label>
              </p>
              <p className="hint">{t("smoke.advanced.fixed")}</p>
            </fieldset>
            <h2>{t("smoke.advanced.log")}</h2>
            <pre className="port-log" role="log" aria-live="polite" data-testid="port-log">
              {log.length === 0 ? t("smoke.advanced.logEmpty") : log.map((l) => l.text).join("\n")}
            </pre>
          </details>
        </>
      )}
    </section>
  );
}
