"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgentRating, AgentReputation } from "@/lib/agents/reputation/types";
import { authFetch } from "@/lib/dynamic/auth-fetch";

type AgentChatRatingProps = {
  agentId: string;
  agentName: string;
};

export function AgentChatRating({ agentId, agentName }: AgentChatRatingProps) {
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState("");
  const [reputation, setReputation] = useState<AgentReputation | null>(null);
  const [existingRating, setExistingRating] = useState<AgentRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRatings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [reputationRes, userRatingRes] = await Promise.all([
        fetch(`/api/agents/${agentId}/reputation`),
        authFetch(`/api/agents/${agentId}/rating`).catch(() => null),
      ]);

      const reputationData = await reputationRes.json();
      if (reputationData.success) {
        setReputation(reputationData.reputation);
      }

      if (userRatingRes?.ok) {
        const userData = await userRatingRes.json();
        if (userData.success && userData.rating) {
          setExistingRating(userData.rating);
          setStars(userData.rating.stars);
          setComment(userData.rating.comment ?? "");
          setSubmitted(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ratings");
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void loadRatings();
  }, [loadRatings]);

  const submitRating = async () => {
    if (stars < 1 || stars > 5 || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await authFetch(`/api/agents/${agentId}/rating`, {
        method: "POST",
        body: JSON.stringify({
          stars,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.error ?? "Failed to submit rating");
        return;
      }

      setExistingRating(data.rating);
      setReputation(data.reputation);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  const displayStars = hoverStars || stars;

  if (loading) {
    return (
      <div className="text-muted-foreground flex shrink-0 items-center gap-2 border-t pt-3 text-xs">
        <Loader2 className="size-3.5 animate-spin" />
        Loading reputation…
      </div>
    );
  }

  return (
    <div className="border-border bg-muted/30 flex shrink-0 flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Rate {agentName}</p>
          <p className="text-muted-foreground text-xs">
            Your rating builds this agent&apos;s marketplace reputation.
          </p>
        </div>
        {reputation && reputation.ratingCount > 0 && (
          <p className="text-muted-foreground text-xs">
            {reputation.averageStars.toFixed(1)}★ · {reputation.ratingCount}{" "}
            {reputation.ratingCount === 1 ? "review" : "reviews"}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, index) => {
          const value = index + 1;
          const filled = value <= displayStars;
          return (
            <button
              key={value}
              type="button"
              className="rounded p-0.5 transition-transform hover:scale-110"
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              onMouseEnter={() => setHoverStars(value)}
              onMouseLeave={() => setHoverStars(0)}
              onClick={() => {
                setStars(value);
                setSubmitted(false);
              }}
            >
              <Star
                className={`size-6 ${
                  filled
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40"
                }`}
              />
            </button>
          );
        })}
        {stars > 0 && (
          <span className="text-muted-foreground ml-2 text-xs">
            {stars}/5
          </span>
        )}
      </div>

      <textarea
        className="border-input bg-background min-h-16 w-full rounded-md border px-3 py-2 text-sm"
        placeholder="Optional comment — what went well or what could improve?"
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          setSubmitted(false);
        }}
        maxLength={500}
        disabled={submitting}
      />

      {error && <p className="text-destructive text-xs">{error}</p>}

      {submitted && existingRating ? (
        <p className="text-xs text-green-700 dark:text-green-400">
          Thanks — your rating is on the record
          {existingRating.updatedAt ? " (updated)" : ""}.
        </p>
      ) : null}

      <Button
        size="sm"
        className="w-fit"
        disabled={stars < 1 || submitting}
        onClick={() => void submitRating()}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving…
          </>
        ) : existingRating ? (
          "Update rating"
        ) : (
          "Submit rating"
        )}
      </Button>
    </div>
  );
}
