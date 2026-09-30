"use client";

import { useCallback, useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { Cl } from "@stacks/transactions";
import { addressAtom } from "@/store/wallet";
import { useVoting_CreatePoll, useVoting_Vote } from "@/generated/hooks";
import {
  voting_getPoll,
  voting_getPollCount,
  voting_hasVoted,
} from "@/generated/contracts";

const MAX_TITLE = 120;
const MAX_OPTION = 80;

interface Poll {
  id: number;
  title: string;
  optionA: string;
  optionB: string;
  votesA: bigint;
  votesB: bigint;
  creator: string;
}

/** Unwrap cvToValue output: { type: 'ok', value: ... } */
function unwrapOk(raw: unknown): unknown {
  if (raw && typeof raw === "object" && (raw as { type?: string }).type === "ok") {
    return (raw as { value?: unknown }).value;
  }
  return null;
}

function toBigInt(raw: unknown): bigint | null {
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) return BigInt(raw);
  if (typeof raw === "string" && raw !== "") return BigInt(raw);
  return null;
}

function parsePoll(id: number, raw: unknown): Poll | null {
  const value = unwrapOk(raw);
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const votesA = toBigInt(record["votes-a"]);
  const votesB = toBigInt(record["votes-b"]);
  if (votesA === null || votesB === null) return null;
  return {
    id,
    title: String(record.title ?? ""),
    optionA: String(record["option-a"] ?? ""),
    optionB: String(record["option-b"] ?? ""),
    votesA,
    votesB,
    creator: String(record.creator ?? ""),
  };
}

function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address;
}

export default function VotingApp() {
  const address = useAtomValue(addressAtom);
  const createPoll = useVoting_CreatePoll();
  const vote = useVoting_Vote();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedMap, setVotedMap] = useState<Record<number, 1 | 2>>({});
  const [votedSet, setVotedSet] = useState<Record<number, boolean>>({});
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [pollsError, setPollsError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [votingPollId, setVotingPollId] = useState<number | null>(null);
  const [pollTxError, setPollTxError] = useState<string | null>(null);

  const loadPolls = useCallback(async () => {
    setLoadingPolls(true);
    setPollsError(null);
    try {
      const countRaw = await voting_getPollCount([]);
      const count = toBigInt(unwrapOk(countRaw));
      if (count === null) {
        setPollsError("Contract not deployed yet. Run: stacksdapp deploy --network testnet --yes");
        setPolls([]);
        return;
      }
      const ids = Array.from({ length: Number(count) }, (_, i) => i + 1);
      const results = await Promise.all(ids.map((id) => voting_getPoll([Cl.uint(id)])));
      const parsed = results
        .map((raw, i) => parsePoll(ids[i], raw))
        .filter((p): p is Poll => p !== null);
      parsed.sort((a, b) => b.id - a.id);
      setPolls(parsed);
    } catch (e) {
      setPollsError(e instanceof Error ? e.message : "Failed to load polls.");
    } finally {
      setLoadingPolls(false);
    }
  }, []);

  // Load polls on mount and after confirmed transactions.
  useEffect(() => {
    void loadPolls();
  }, [loadPolls]);

  // Refresh the list once a create-poll or vote transaction is confirmed.
  useEffect(() => {
    if (createPoll.txStatus === "success" || vote.txStatus === "success") {
      void loadPolls();
    }
  }, [createPoll.txStatus, vote.txStatus, loadPolls]);

  // Track which option the connected wallet has voted for on each poll.
  // The contract stores a per-poll ballot marker; the chosen option is kept
  // in session state and mirrored to localStorage so it survives reloads.
  useEffect(() => {
    if (!address) {
      setVotedMap({});
      setVotedSet({});
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        polls.map(async (poll) => {
          try {
            const raw = await voting_hasVoted([Cl.uint(poll.id), Cl.principal(address)]);
            return [poll.id, unwrapOk(raw) === true] as const;
          } catch {
            return [poll.id, false] as const;
          }
        }),
      );
      if (cancelled) return;
      let stored: Record<string, 1 | 2> = {};
      try {
        stored = JSON.parse(localStorage.getItem(`stackvote:${address}`) ?? "{}");
      } catch {
        stored = {};
      }
      const map: Record<number, 1 | 2> = {};
      const set: Record<number, boolean> = {};
      for (const [id, hasVoted] of entries) {
        if (!hasVoted) continue;
        set[id] = true;
        if (stored[String(id)]) map[id] = stored[String(id)];
      }
      setVotedMap((prev) => ({ ...prev, ...map }));
      setVotedSet((prev) => ({ ...prev, ...set }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, polls.length]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setPollTxError(null);

    if (!address) {
      setFormError("Connect your wallet first.");
      return;
    }
    if (!title.trim() || !optionA.trim() || !optionB.trim()) {
      setFormError("Title and both options are required.");
      return;
    }
    if (title.trim().length > MAX_TITLE || optionA.trim().length > MAX_OPTION || optionB.trim().length > MAX_OPTION) {
      setFormError(`Title must be ≤ ${MAX_TITLE} characters and options ≤ ${MAX_OPTION}.`);
      return;
    }

    try {
      await createPoll.call([
        Cl.stringAscii(title.trim()),
        Cl.stringAscii(optionA.trim()),
        Cl.stringAscii(optionB.trim()),
      ]);
      setTitle("");
      setOptionA("");
      setOptionB("");
    } catch (err) {
      setPollTxError(err instanceof Error ? err.message : "Transaction failed.");
    }
  };

  const handleVote = async (pollId: number, option: 1 | 2) => {
    setPollTxError(null);
    if (!address) {
      setPollTxError("Connect your wallet first.");
      return;
    }
    setVotingPollId(pollId);
    try {
      await vote.call([Cl.uint(pollId), Cl.uint(option)]);
      setVotedSet((prev) => ({ ...prev, [pollId]: true }));
      setVotedMap((prev) => {
        const next = { ...prev, [pollId]: option };
        if (address) {
          const stored = JSON.parse(localStorage.getItem(`stackvote:${address}`) ?? "{}");
          stored[String(pollId)] = option;
          localStorage.setItem(`stackvote:${address}`, JSON.stringify(stored));
        }
        return next;
      });
      setPolls((prev) =>
        prev.map((p) =>
          p.id === pollId
            ? option === 1
              ? { ...p, votesA: p.votesA + 1n }
              : { ...p, votesB: p.votesB + 1n }
            : p,
        ),
      );
    } catch (err) {
      setPollTxError(err instanceof Error ? err.message : "Transaction failed.");
    } finally {
      setVotingPollId(null);
    }
  };

  const createBusy = createPoll.loading || createPoll.txStatus === "pending";
  const voteBusy = vote.loading || vote.txStatus === "pending";

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Hero */}
      <div className="text-center mt-6">
        <h1 className="text-[32px] md:text-[40px] font-medium font-instrument">StackVote</h1>
        <p className="text-[13px] font-mono text-[#908E8E] mt-2">
          On-chain polls and voting, secured by Bitcoin via Stacks.
        </p>
      </div>

      {/* Create poll */}
      <section className="bg-[#1F1E1F] rounded-2xl p-5 md:p-6 border border-[#2A2929]">
        <h2 className="text-[16px] font-medium font-instrument mb-4">Create a poll</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Poll question (e.g. Which chain is best?)"
            maxLength={MAX_TITLE}
            className="bg-[#131416] border border-[#2A2929] rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#6E6C6C] outline-none focus:border-[#5A5858]"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={optionA}
              onChange={(e) => setOptionA(e.target.value)}
              placeholder="Option A"
              maxLength={MAX_OPTION}
              className="bg-[#131416] border border-[#2A2929] rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#6E6C6C] outline-none focus:border-[#5A5858]"
            />
            <input
              type="text"
              value={optionB}
              onChange={(e) => setOptionB(e.target.value)}
              placeholder="Option B"
              maxLength={MAX_OPTION}
              className="bg-[#131416] border border-[#2A2929] rounded-xl px-4 py-3 text-[14px] text-white placeholder-[#6E6C6C] outline-none focus:border-[#5A5858]"
            />
          </div>
          {formError && <p className="text-[12px] font-mono text-[#E06C6C]">{formError}</p>}
          <button
            type="submit"
            disabled={createBusy || !address}
            className="mt-1 bg-[#F4F3EF] text-[#131416] rounded-full px-6 py-3 text-[14px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {createBusy ? "Waiting for wallet confirmation…" : "Create Poll"}
          </button>
          {!address && (
            <p className="text-[12px] font-mono text-[#908E8E]">
              Connect your wallet (top right) to create polls and vote.
            </p>
          )}
          {createPoll.txStatus === "success" && (
            <p className="text-[12px] font-mono text-[#6EC08A]">
              Poll created on-chain.{" "}
              {createPoll.explorerUrl && (
                <a href={createPoll.explorerUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  View transaction
                </a>
              )}
            </p>
          )}
        </form>
      </section>

      {/* Transaction error banner */}
      {(pollTxError || createPoll.txStatusError || vote.txStatusError) && (
        <div className="bg-[#2A1E1E] border border-[#4A2E2E] rounded-2xl p-4">
          <p className="text-[12px] font-mono text-[#E06C6C]">
            {pollTxError ?? createPoll.txStatusError ?? vote.txStatusError}
          </p>
        </div>
      )}

      {/* Polls list */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[16px] font-medium font-instrument">
          Polls <span className="text-[#908E8E] font-mono text-[13px]">({polls.length})</span>
        </h2>

        {loadingPolls && (
          <div className="bg-[#1F1E1F] rounded-2xl p-8 border border-[#2A2929] text-center">
            <p className="text-[13px] font-mono text-[#908E8E]">Loading polls…</p>
          </div>
        )}

        {!loadingPolls && pollsError && (
          <div className="bg-[#2A1E1E] border border-[#4A2E2E] rounded-2xl p-4">
            <p className="text-[12px] font-mono text-[#E06C6C]">{pollsError}</p>
          </div>
        )}

        {!loadingPolls && !pollsError && polls.length === 0 && (
          <div className="bg-[#1F1E1F] rounded-2xl p-8 border border-[#2A2929] text-center">
            <p className="text-[13px] font-mono text-[#908E8E]">No polls yet. Create the first one above.</p>
          </div>
        )}

        {polls.map((poll) => {
          const total = poll.votesA + poll.votesB;
          const pctA = total > 0n ? Number((poll.votesA * 1000n) / total) / 10 : 0;
          const pctB = total > 0n ? Number((poll.votesB * 1000n) / total) / 10 : 0;
          const myVote = votedMap[poll.id];
          const hasVoted = votedSet[poll.id] === true;
          const busy = voteBusy && votingPollId === poll.id;

          return (
            <article key={poll.id} className="bg-[#1F1E1F] rounded-2xl p-5 md:p-6 border border-[#2A2929] flex flex-col gap-4">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[16px] font-medium font-instrument leading-snug">{poll.title}</h3>
                  <span className="text-[11px] font-mono text-[#6E6C6C] shrink-0">#{poll.id}</span>
                </div>
                <p className="text-[11px] font-mono text-[#6E6C6C] mt-1">
                  by {shortAddress(poll.creator)} · {total.toString()} {total === 1n ? "vote" : "votes"}
                </p>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-3">
                {([1, 2] as const).map((option) => {
                  const label = option === 1 ? poll.optionA : poll.optionB;
                  const votes = option === 1 ? poll.votesA : poll.votesB;
                  const pct = option === 1 ? pctA : pctB;
                  const isMine = myVote === option;

                  return (
                    <div key={option} className="relative">
                      <div
                        className="absolute inset-0 bg-[#2A2929] rounded-xl transition-all"
                        style={{ width: `${pct}%` }}
                      />
                      <button
                        onClick={() => handleVote(poll.id, option)}
                        disabled={!address || voteBusy || hasVoted}
                        className={`relative w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                          isMine
                            ? "border-[#F4F3EF]"
                            : "border-transparent hover:border-[#5A5858]"
                        } disabled:cursor-not-allowed`}
                      >
                        <span className="flex items-center gap-2 text-[14px]">
                          {isMine && <span className="text-[#6EC08A]">✓</span>}
                          {label}
                        </span>
                        <span className="text-[12px] font-mono text-[#908E8E] shrink-0">
                          {busy && hasVoted ? "Confirming…" : `${votes} (${pct.toFixed(1)}%)`}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Status line */}
              <div className="min-h-[18px]">
                {myVote !== undefined ? (
                  <p className="text-[12px] font-mono text-[#6EC08A]">
                    You voted for &ldquo;{myVote === 1 ? poll.optionA : poll.optionB}&rdquo;. Ballots are final.
                  </p>
                ) : hasVoted ? (
                  <p className="text-[12px] font-mono text-[#6EC08A]">
                    You have already voted on this poll. Ballots are final.
                  </p>
                ) : vote.txStatus === "pending" && votingPollId === poll.id ? (
                  <p className="text-[12px] font-mono text-[#908E8E]">Waiting for wallet confirmation…</p>
                ) : null}
                {vote.txStatus === "success" && vote.explorerUrl && votingPollId === poll.id && (
                  <p className="text-[12px] font-mono text-[#6EC08A]">
                    Vote confirmed.{" "}
                    <a href={vote.explorerUrl} target="_blank" rel="noopener noreferrer" className="underline">
                      View transaction
                    </a>
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
