"use client";

import { useCallback, useState } from "react";

import { AddWatchStep1Url } from "@/components/add-watch/AddWatchStep1Url";
import { AddWatchStep2Sources } from "@/components/add-watch/AddWatchStep2Sources";
import { AddWatchStep3Conditions } from "@/components/add-watch/AddWatchStep3Conditions";
import { AddWatchStep4Contact } from "@/components/add-watch/AddWatchStep4Contact";
import { AddWatchStep5Confirm } from "@/components/add-watch/AddWatchStep5Confirm";
import type { AddWatchSource } from "@/components/add-watch/types";
import { isValidHttpsWatchUrl } from "@/lib/url-validation";

type PreviewResponse = {
  suggestedLabel: string | null;
  platform: "ticketmaster" | "seatgeek" | "generic" | null;
  eventId: string | null;
};

type AddWatchFormProps = {
  onCreated: () => void;
};

function truncateForLabel(url: string, max: number): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max - 1)}…`;
}

export function AddWatchForm({ onCreated }: AddWatchFormProps) {
  const [step, setStep] = useState(1);
  const [step1Url, setStep1Url] = useState("");
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step1Loading, setStep1Loading] = useState(false);

  const [sources, setSources] = useState<AddWatchSource[]>([]);
  const [label, setLabel] = useState("");

  const [addUrl, setAddUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const [maxPrice, setMaxPrice] = useState("");
  const [minTickets, setMinTickets] = useState(1);

  const [email, setEmail] = useState("");
  const [step4EmailError, setStep4EmailError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resetAll = useCallback(() => {
    setStep(1);
    setStep1Url("");
    setStep1Error(null);
    setStep1Loading(false);
    setSources([]);
    setLabel("");
    setAddUrl("");
    setAddError(null);
    setAddLoading(false);
    setMaxPrice("");
    setMinTickets(1);
    setEmail("");
    setStep4EmailError(null);
    setSubmitting(false);
    setSubmitError(null);
  }, []);

  const runPreview = useCallback(
    async (
      url: string,
    ): Promise<{ ok: true; data: PreviewResponse } | { ok: false; error: string }> => {
      const response = await fetch("/api/ticket-page-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const body = (await response.json()) as PreviewResponse & { error?: string };
      if (!response.ok) {
        return { ok: false, error: body.error ?? "Preview request failed" };
      }
      return {
        ok: true,
        data: {
          suggestedLabel: body.suggestedLabel,
          platform: body.platform,
          eventId: body.eventId,
        },
      };
    },
    [],
  );

  const handleStep1Continue = useCallback(async () => {
    const u = step1Url.trim();
    if (!isValidHttpsWatchUrl(u)) {
      return;
    }
    setStep1Error(null);
    setStep1Loading(true);
    const result = await runPreview(u);
    setStep1Loading(false);
    if (!result.ok) {
      setStep1Error(result.error);
      return;
    }
    const preview = result.data;
    const first: AddWatchSource = {
      url: u,
      platform: preview.platform,
      eventId: preview.eventId,
    };
    setSources((prev) => {
      if (prev.length === 0) return [first];
      return [first, ...prev.slice(1)];
    });
    setLabel((current) => {
      const trimmed = current.trim();
      if (trimmed.length > 0) return current;
      const suggested = preview.suggestedLabel?.trim();
      if (suggested) return suggested;
      return truncateForLabel(u, 48);
    });
    setStep(2);
  }, [runPreview, step1Url]);

  const handleStep2Back = useCallback(() => {
    setStep(1);
    setStep1Url(sources[0]?.url ?? "");
    setStep1Error(null);
  }, [sources]);

  const handleAddSource = useCallback(async () => {
    const u = addUrl.trim();
    if (!isValidHttpsWatchUrl(u)) {
      setAddError("Please enter a valid https:// URL");
      return;
    }
    if (sources.length >= 3) return;
    setAddError(null);
    setAddLoading(true);
    const result = await runPreview(u);
    setAddLoading(false);
    if (!result.ok) {
      setAddError(result.error);
      return;
    }
    const preview = result.data;
    setSources((prev) => [
      ...prev,
      { url: u, platform: preview.platform, eventId: preview.eventId },
    ]);
    setAddUrl("");
  }, [addUrl, runPreview, sources.length]);

  const isStep4EmailValid = useCallback((value: string) => {
    const t = value.trim();
    return t.length > 0 && t.includes("@");
  }, []);

  const handleStep4Continue = useCallback(() => {
    if (!isStep4EmailValid(email)) {
      setStep4EmailError("Please enter a valid email address.");
      return;
    }
    setStep4EmailError(null);
    setStep(5);
  }, [email, isStep4EmailValid]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    const response = await fetch("/api/watches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: label.trim(),
        urls: sources.map((s) => ({
          url: s.url,
          platform: s.platform,
          event_id: s.eventId,
        })),
        price_threshold: (() => {
          const t = maxPrice.trim();
          if (t === "") return null;
          const n = Number(t);
          return Number.isFinite(n) ? n : null;
        })(),
        group_size: minTickets <= 1 ? null : minTickets,
        alert_email: true,
        alert_sms: false,
        alert_email_address: email.trim(),
        alert_phone_e164: null,
      }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setSubmitError(body.error ?? "Failed to create watch");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    resetAll();
    onCreated();
  }, [
    email,
    label,
    maxPrice,
    minTickets,
    onCreated,
    resetAll,
    sources,
  ]);

  return (
    <section
      className="rounded-[var(--radius-lg)] border-[length:var(--border-default)] border-solid border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-[var(--space-4)]"
      aria-labelledby="add-watch-heading"
    >
      <div className="mb-[var(--space-4)] grid gap-[var(--space-2)]">
        <h2 id="add-watch-heading" className="text-section text-[var(--color-text)]">
          Add watch
        </h2>
        <p className="text-small text-[var(--color-text-muted)]">Step {step} of 5</p>
      </div>

      {step === 1 ? (
        <AddWatchStep1Url
          url={step1Url}
          onUrlChange={(v) => {
            setStep1Url(v);
            setStep1Error(null);
          }}
          urlError={step1Error}
          showHttpsHint={
            step1Url.trim().length > 0 && !isValidHttpsWatchUrl(step1Url)
          }
          loading={step1Loading}
          onContinue={handleStep1Continue}
        />
      ) : null}

      {step === 2 ? (
        <AddWatchStep2Sources
          label={label}
          onLabelChange={setLabel}
          sources={sources}
          onRemoveSource={(index) => {
            setSources((prev) => prev.filter((_, i) => i !== index));
          }}
          addUrl={addUrl}
          onAddUrlChange={(v) => {
            setAddUrl(v);
            setAddError(null);
          }}
          addError={addError}
          addLoading={addLoading}
          onAdd={handleAddSource}
          onBack={handleStep2Back}
          onContinue={() => setStep(3)}
        />
      ) : null}

      {step === 3 ? (
        <AddWatchStep3Conditions
          maxPrice={maxPrice}
          onMaxPriceChange={setMaxPrice}
          minTickets={minTickets}
          onMinTicketsChange={setMinTickets}
          onBack={() => setStep(2)}
          onContinue={() => setStep(4)}
        />
      ) : null}

      {step === 4 ? (
        <AddWatchStep4Contact
          email={email}
          onEmailChange={(v) => {
            setEmail(v);
            setStep4EmailError(null);
          }}
          emailError={step4EmailError}
          onBack={() => setStep(3)}
          onContinue={handleStep4Continue}
        />
      ) : null}

      {step === 5 ? (
        <AddWatchStep5Confirm
          label={label}
          sources={sources}
          maxPrice={maxPrice}
          minTickets={minTickets}
          email={email}
          submitting={submitting}
          error={submitError}
          onBack={() => setStep(4)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </section>
  );
}
