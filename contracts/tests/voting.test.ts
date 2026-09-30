import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

function createPoll(title = "Best blockchain?", optionA = "Stacks", optionB = "Bitcoin") {
  return simnet.callPublicFn(
    "voting",
    "create-poll",
    [Cl.stringAscii(title), Cl.stringAscii(optionA), Cl.stringAscii(optionB)],
    deployer,
  );
}

describe("voting", () => {
  it("creates a poll with a unique incremental id", () => {
    const first = createPoll();
    expect(first.result).toBeOk(Cl.uint(1));

    const second = createPoll("Second poll?", "Yes", "No");
    expect(second.result).toBeOk(Cl.uint(2));
  });

  it("stores poll details on-chain", () => {
    createPoll("Favorite language?", "Clarity", "Solidity");
    const { result } = simnet.callReadOnlyFn("voting", "get-poll", [Cl.uint(1)], deployer);
    expect(result).toBeOk(
      Cl.tuple({
        title: Cl.stringAscii("Favorite language?"),
        "option-a": Cl.stringAscii("Clarity"),
        "option-b": Cl.stringAscii("Solidity"),
        "votes-a": Cl.uint(0),
        "votes-b": Cl.uint(0),
        creator: Cl.principal(deployer),
      }),
    );
  });

  it("rejects empty title and empty options", () => {
    const emptyTitle = createPoll("", "A", "B");
    expect(emptyTitle.result).toBeErr(Cl.uint(101));

    const emptyOptionA = createPoll("Title", "", "B");
    expect(emptyOptionA.result).toBeErr(Cl.uint(102));

    const emptyOptionB = createPoll("Title", "A", "");
    expect(emptyOptionB.result).toBeErr(Cl.uint(102));
  });

  it("votes and tracks counts per option", () => {
    createPoll("Tabs or spaces?", "Tabs", "Spaces");

    const vote1 = simnet.callPublicFn("voting", "vote", [Cl.uint(1), Cl.uint(1)], wallet1);
    expect(vote1.result).toBeOk(Cl.bool(true));

    const vote2 = simnet.callPublicFn("voting", "vote", [Cl.uint(1), Cl.uint(2)], wallet2);
    expect(vote2.result).toBeOk(Cl.bool(true));

    const { result } = simnet.callReadOnlyFn("voting", "get-results", [Cl.uint(1)], deployer);
    expect(result).toBeOk(
      Cl.tuple({ "votes-a": Cl.uint(1), "votes-b": Cl.uint(1), "total-votes": Cl.uint(2) }),
    );
  });

  it("rejects duplicate votes from the same address", () => {
    createPoll("Duplicate?", "A", "B");
    simnet.callPublicFn("voting", "vote", [Cl.uint(1), Cl.uint(1)], wallet1);

    const again = simnet.callPublicFn("voting", "vote", [Cl.uint(1), Cl.uint(2)], wallet1);
    expect(again.result).toBeErr(Cl.uint(104));

    const { result } = simnet.callReadOnlyFn("voting", "has-voted", [Cl.uint(1), Cl.principal(wallet1)], deployer);
    expect(result).toBeOk(Cl.bool(true));
  });

  it("rejects invalid poll ids and invalid options", () => {
    createPoll("Valid?", "A", "B");

    const badPoll = simnet.callPublicFn("voting", "vote", [Cl.uint(999), Cl.uint(1)], wallet1);
    expect(badPoll.result).toBeErr(Cl.uint(100));

    const badOption = simnet.callPublicFn("voting", "vote", [Cl.uint(1), Cl.uint(3)], wallet1);
    expect(badOption.result).toBeErr(Cl.uint(103));

    const zeroOption = simnet.callPublicFn("voting", "vote", [Cl.uint(1), Cl.uint(0)], wallet1);
    expect(zeroOption.result).toBeErr(Cl.uint(103));
  });

  it("reports has-voted false for non-voters", () => {
    createPoll("Non-voter?", "A", "B");
    const { result } = simnet.callReadOnlyFn("voting", "has-voted", [Cl.uint(1), Cl.principal(wallet2)], deployer);
    expect(result).toBeOk(Cl.bool(false));
  });

  it("get-poll-count tracks the number of created polls", () => {
    createPoll("One?", "A", "B");
    createPoll("Two?", "C", "D");
    const { result } = simnet.callReadOnlyFn("voting", "get-poll-count", [], deployer);
    expect(result).toBeOk(Cl.uint(2));
  });
});
