"""
Simulation 4: Political Will Dynamics
Model the political will economy: spending on policies, regen from trust,
loss from events, counter-narrative drain.
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from dataclasses import dataclass, field
from typing import Dict, List, Tuple
import json

np.random.seed(42)

NUM_ITERATIONS = 1000
TOTAL_TURNS = 64

# Policy costs (political will %)
POLICIES = {
    # Name: (will_threshold, will_cost, ongoing_will_drain_per_turn, trust_effect, eco_effect)
    # Awakening
    "Urban Ag Zoning":          (25, 8,  0.0, 2, 1),
    "Community Land Trust":     (35, 10, 0.0, 3, 0),
    "Green Infra Grants":       (30, 8,  0.5, 1, 2),

    # Transition
    "Participatory Budget":     (45, 12, 0.0, 5, 0),
    "Coop Tax Incentives":      (40, 10, 0.5, 2, 0),
    "Water Transit Pilot":      (50, 15, 1.0, 2, 3),
    "Reparative Housing":       (55, 15, 0.5, 4, 0),

    # Restoration
    "Regional Food Compact":    (55, 18, 1.0, 3, 3),
    "Ecological Corridor Zone": (60, 20, 1.0, 2, 5),
    "De-growth Transition":     (70, 25, 1.5, 5, 5),

    # High-cost transformative
    "Municipal Coop Bank":      (65, 20, 0.5, 4, 0),
    "Universal Basic Services": (75, 30, 2.0, 8, 0),
}

# Counter-narrative types
COUNTER_NARRATIVES = [
    {"name": "Corporate Media Attack", "will_drain": 5, "trust_drain": 2, "prob": 0.15},
    {"name": "State Legislature Pushback", "will_drain": 8, "trust_drain": 1, "prob": 0.08},
    {"name": "Developer Lobby Campaign", "will_drain": 4, "trust_drain": 1, "prob": 0.12},
    {"name": "NIMBYism Surge", "will_drain": 3, "trust_drain": 3, "prob": 0.10},
    {"name": "Federal Defunding Threat", "will_drain": 6, "trust_drain": 2, "prob": 0.05},
]

# Narrative action types
NARRATIVE_ACTIONS = [
    {"name": "Community Meeting", "will_gain": 2, "trust_gain": 3, "cost": 0},
    {"name": "Media Campaign", "will_gain": 3, "trust_gain": 1, "cost": 0.1},
    {"name": "Education Program", "will_gain": 1, "trust_gain": 2, "cost": 0.05},
    {"name": "Cultural Event", "will_gain": 2, "trust_gain": 4, "cost": 0.1},
    {"name": "Demonstration", "will_gain": 4, "trust_gain": 2, "cost": 0},
]


@dataclass
class PoliticalState:
    will: float = 60.0
    trust: float = 50.0
    eco: float = 15.0
    food: float = 10.0
    budget: float = 4.2

    policies_enacted: List[str] = field(default_factory=list)
    policies_attempted: int = 0
    policies_blocked: int = 0
    counter_narrative_hits: int = 0
    narrative_actions_taken: int = 0
    will_spent_on_policies: float = 0.0
    will_drained_by_counters: float = 0.0
    will_gained_from_trust: float = 0.0
    will_gained_from_narrative: float = 0.0

    # Track ongoing policy drains
    ongoing_drain: float = 0.0

    will_below_20_turns: int = 0
    will_below_40_turns: int = 0
    recall_triggered: bool = False


def get_narrative_actions_available(trust: float) -> int:
    """Number of narrative actions based on trust."""
    if trust >= 80:
        return 4
    elif trust >= 60:
        return 3
    elif trust >= 40:
        return 2
    else:
        return 1


def simulate_political_will(strategy: str) -> Dict:
    """
    Strategies:
    - 'policy_heavy': Pass as many policies as possible
    - 'narrative_first': Build trust/narrative before policies
    - 'balanced': Mix of both
    - 'reactive': Only spend political will when needed
    """
    state = PoliticalState()
    will_history = []
    trust_history = []
    policies_count_history = []
    drain_history = []
    regen_history = []

    # Track narrative compounding
    narrative_streak = 0

    for t in range(TOTAL_TURNS):
        turn_drain = 0
        turn_regen = 0

        # --- Counter-narratives ---
        for cn in COUNTER_NARRATIVES:
            # Probability increases slightly when player is doing well
            effective_prob = cn["prob"] * (1 + len(state.policies_enacted) * 0.02)
            if np.random.random() < effective_prob:
                state.will -= cn["will_drain"]
                state.trust -= cn["trust_drain"]
                state.counter_narrative_hits += 1
                state.will_drained_by_counters += cn["will_drain"]
                turn_drain += cn["will_drain"]

        # --- Ongoing policy drains ---
        state.will -= state.ongoing_drain
        turn_drain += state.ongoing_drain

        # --- Feedback loops ---
        # Trust > 70% -> Will regen +2%/turn
        if state.trust > 70:
            state.will += 2.0
            state.will_gained_from_trust += 2.0
            turn_regen += 2.0
        elif state.trust > 50:
            state.will += 1.0
            state.will_gained_from_trust += 1.0
            turn_regen += 1.0

        # Food sovereignty > 50% -> Trust +1%/turn
        if state.food > 50:
            state.trust += 1.0

        # --- Narrative actions ---
        num_actions = get_narrative_actions_available(state.trust)

        if strategy in ["narrative_first", "balanced"]:
            # Use all available narrative actions
            for i in range(num_actions):
                action = NARRATIVE_ACTIONS[np.random.randint(len(NARRATIVE_ACTIONS))]
                # Compounding: consecutive narrative effort is more effective
                compound_bonus = 1.0 + min(narrative_streak * 0.1, 0.5)
                will_gain = action["will_gain"] * compound_bonus
                trust_gain = action["trust_gain"] * compound_bonus

                state.will += will_gain
                state.trust += trust_gain
                state.budget -= action["cost"]
                state.narrative_actions_taken += 1
                state.will_gained_from_narrative += will_gain
                turn_regen += will_gain

            narrative_streak += 1

        elif strategy == "policy_heavy":
            # Only 1 narrative action
            action = NARRATIVE_ACTIONS[0]
            state.will += action["will_gain"]
            state.trust += action["trust_gain"]
            state.narrative_actions_taken += 1
            state.will_gained_from_narrative += action["will_gain"]
            turn_regen += action["will_gain"]
            narrative_streak = 0

        elif strategy == "reactive":
            # Narrative only when will is low
            if state.will < 40:
                for i in range(num_actions):
                    action = NARRATIVE_ACTIONS[np.random.randint(len(NARRATIVE_ACTIONS))]
                    state.will += action["will_gain"]
                    state.trust += action["trust_gain"]
                    state.budget -= action["cost"]
                    state.narrative_actions_taken += 1
                    state.will_gained_from_narrative += action["will_gain"]
                    turn_regen += action["will_gain"]
                narrative_streak += 1
            else:
                narrative_streak = 0

        # --- Policy spending ---
        if strategy == "policy_heavy":
            # Try to pass a policy every turn
            available = [name for name, (thresh, cost, drain, te, ee) in POLICIES.items()
                        if name not in state.policies_enacted and state.will >= thresh]
            if available:
                # Pick the most expensive one we can afford
                available.sort(key=lambda n: POLICIES[n][1], reverse=True)
                name = available[0]
                thresh, cost, drain, te, ee = POLICIES[name]
                state.policies_attempted += 1
                state.will -= cost
                state.will_spent_on_policies += cost
                state.ongoing_drain += drain
                state.trust += te
                state.eco += ee
                state.policies_enacted.append(name)
                turn_drain += cost

        elif strategy == "balanced":
            # Pass a policy every 3-4 turns if will is high enough
            if t % 3 == 0:
                available = [name for name, (thresh, cost, drain, te, ee) in POLICIES.items()
                            if name not in state.policies_enacted and state.will >= thresh
                            and state.will - cost >= 30]  # Keep reserve
                if available:
                    # Pick mid-range
                    available.sort(key=lambda n: POLICIES[n][1])
                    name = available[len(available)//2]
                    thresh, cost, drain, te, ee = POLICIES[name]
                    state.policies_attempted += 1
                    state.will -= cost
                    state.will_spent_on_policies += cost
                    state.ongoing_drain += drain
                    state.trust += te
                    state.eco += ee
                    state.policies_enacted.append(name)
                    turn_drain += cost

        elif strategy == "narrative_first":
            # Only pass policies after trust is high (turn 12+)
            if t >= 12 and t % 4 == 0:
                available = [name for name, (thresh, cost, drain, te, ee) in POLICIES.items()
                            if name not in state.policies_enacted and state.will >= thresh
                            and state.will - cost >= 35]
                if available:
                    available.sort(key=lambda n: POLICIES[n][1])
                    name = available[len(available)//2]
                    thresh, cost, drain, te, ee = POLICIES[name]
                    state.policies_attempted += 1
                    state.will -= cost
                    state.will_spent_on_policies += cost
                    state.ongoing_drain += drain
                    state.trust += te
                    state.eco += ee
                    state.policies_enacted.append(name)
                    turn_drain += cost

        elif strategy == "reactive":
            # Only pass policies when will is above 60%
            if state.will > 60:
                available = [name for name, (thresh, cost, drain, te, ee) in POLICIES.items()
                            if name not in state.policies_enacted and state.will >= thresh
                            and state.will - cost >= 40]
                if available:
                    # Pick cheapest
                    available.sort(key=lambda n: POLICIES[n][1])
                    name = available[0]
                    thresh, cost, drain, te, ee = POLICIES[name]
                    state.policies_attempted += 1
                    state.will -= cost
                    state.will_spent_on_policies += cost
                    state.ongoing_drain += drain
                    state.trust += te
                    state.eco += ee
                    state.policies_enacted.append(name)
                    turn_drain += cost

        # Project-based eco/food gain (simplified background)
        state.eco += np.random.uniform(0.5, 1.5)
        state.food += np.random.uniform(0.3, 1.0)

        # Budget
        if t > 0 and t % 4 == 0:
            state.budget += 2.5 * (0.7 + state.trust / 100 * 0.6)

        # Clamp
        state.will = np.clip(state.will, 0, 100)
        state.trust = np.clip(state.trust, 0, 100)
        state.eco = np.clip(state.eco, 0, 100)
        state.food = np.clip(state.food, 0, 100)
        state.budget = max(0, state.budget)

        # Track low will
        if state.will < 20:
            state.will_below_20_turns += 1
            if t % 16 == 15:  # End of term
                state.recall_triggered = True
        if state.will < 40:
            state.will_below_40_turns += 1

        will_history.append(state.will)
        trust_history.append(state.trust)
        policies_count_history.append(len(state.policies_enacted))
        drain_history.append(turn_drain)
        regen_history.append(turn_regen)

    return {
        "will_history": will_history,
        "trust_history": trust_history,
        "policies_count_history": policies_count_history,
        "drain_history": drain_history,
        "regen_history": regen_history,
        "policies_enacted": len(state.policies_enacted),
        "policies_blocked": state.policies_blocked,
        "counter_narrative_hits": state.counter_narrative_hits,
        "narrative_actions": state.narrative_actions_taken,
        "will_spent_policies": state.will_spent_on_policies,
        "will_drained_counters": state.will_drained_by_counters,
        "will_from_trust": state.will_gained_from_trust,
        "will_from_narrative": state.will_gained_from_narrative,
        "will_below_20_turns": state.will_below_20_turns,
        "will_below_40_turns": state.will_below_40_turns,
        "recall_triggered": state.recall_triggered,
        "final_will": state.will,
        "final_trust": state.trust,
        "ongoing_drain": state.ongoing_drain,
    }


def run_analysis():
    print("="*80)
    print("SIMULATION 4: POLITICAL WILL DYNAMICS")
    print("="*80)

    strategies = ["policy_heavy", "balanced", "narrative_first", "reactive"]
    all_results = {}

    for strategy in strategies:
        print(f"\nRunning {NUM_ITERATIONS} iterations for '{strategy}' strategy...")

        iter_results = []
        for _ in range(NUM_ITERATIONS):
            result = simulate_political_will(strategy)
            iter_results.append(result)

        # Aggregate
        avg_will = np.mean([r["will_history"] for r in iter_results], axis=0)
        avg_trust = np.mean([r["trust_history"] for r in iter_results], axis=0)
        avg_policies = np.mean([r["policies_count_history"] for r in iter_results], axis=0)
        avg_drain = np.mean([r["drain_history"] for r in iter_results], axis=0)
        avg_regen = np.mean([r["regen_history"] for r in iter_results], axis=0)

        avg_final_will = np.mean([r["final_will"] for r in iter_results])
        avg_final_trust = np.mean([r["final_trust"] for r in iter_results])
        avg_policies_enacted = np.mean([r["policies_enacted"] for r in iter_results])
        avg_counter_hits = np.mean([r["counter_narrative_hits"] for r in iter_results])
        avg_will_spent = np.mean([r["will_spent_policies"] for r in iter_results])
        avg_will_drained = np.mean([r["will_drained_counters"] for r in iter_results])
        avg_will_from_trust = np.mean([r["will_from_trust"] for r in iter_results])
        avg_will_from_narrative = np.mean([r["will_from_narrative"] for r in iter_results])
        avg_below_20 = np.mean([r["will_below_20_turns"] for r in iter_results])
        avg_below_40 = np.mean([r["will_below_40_turns"] for r in iter_results])
        pct_recall = sum(1 for r in iter_results if r["recall_triggered"]) / NUM_ITERATIONS * 100
        avg_ongoing_drain = np.mean([r["ongoing_drain"] for r in iter_results])

        all_results[strategy] = {
            "avg_will": avg_will,
            "avg_trust": avg_trust,
            "avg_policies": avg_policies,
            "avg_drain": avg_drain,
            "avg_regen": avg_regen,
            "avg_final_will": avg_final_will,
            "avg_final_trust": avg_final_trust,
            "avg_policies_enacted": avg_policies_enacted,
            "avg_counter_hits": avg_counter_hits,
            "avg_will_spent": avg_will_spent,
            "avg_will_drained": avg_will_drained,
            "avg_will_from_trust": avg_will_from_trust,
            "avg_will_from_narrative": avg_will_from_narrative,
            "avg_below_20": avg_below_20,
            "avg_below_40": avg_below_40,
            "pct_recall": pct_recall,
            "avg_ongoing_drain": avg_ongoing_drain,
        }

        print(f"  Avg policies enacted: {avg_policies_enacted:.1f}")
        print(f"  Avg final will: {avg_final_will:.1f}%")
        print(f"  Avg final trust: {avg_final_trust:.1f}%")
        print(f"  Counter-narrative hits: {avg_counter_hits:.1f}")
        print(f"  Will spent on policies: {avg_will_spent:.1f}%")
        print(f"  Will drained by counters: {avg_will_drained:.1f}%")
        print(f"  Will gained from trust: {avg_will_from_trust:.1f}%")
        print(f"  Will gained from narrative: {avg_will_from_narrative:.1f}%")
        print(f"  Turns with will < 20%: {avg_below_20:.1f}")
        print(f"  Turns with will < 40%: {avg_below_40:.1f}")
        print(f"  Recall triggered: {pct_recall:.1f}%")
        print(f"  Avg ongoing policy drain: {avg_ongoing_drain:.1f}%/turn")

    # --- Charts ---
    turns = np.arange(TOTAL_TURNS)

    # Chart 1: Political Will over time
    fig, axes = plt.subplots(2, 2, figsize=(16, 10))
    fig.suptitle("Political Will Dynamics by Strategy", fontsize=14)

    strategy_colors = {"policy_heavy": "#F44336", "balanced": "#2196F3",
                       "narrative_first": "#4CAF50", "reactive": "#FF9800"}

    for idx, strategy in enumerate(strategies):
        ax = axes[idx // 2][idx % 2]
        r = all_results[strategy]

        ax.plot(turns, r["avg_will"], label="Political Will", color="purple", linewidth=2)
        ax.plot(turns, r["avg_trust"], label="Trust", color="blue", linewidth=2, linestyle="--")
        ax2 = ax.twinx()
        ax2.plot(turns, r["avg_policies"], label="Policies", color="green", linewidth=2, linestyle=":")
        ax2.set_ylabel("Policies Enacted", color="green")

        ax.axhline(y=20, color='red', linestyle='--', alpha=0.5, label='Recall threshold')
        ax.axhline(y=50, color='orange', linestyle='--', alpha=0.3, label='50% mark')

        ax.set_title(f"{strategy.replace('_', ' ').title()}")
        ax.set_xlabel("Turn")
        ax.set_ylabel("%")
        ax.set_ylim(0, 100)
        ax.legend(loc='lower left', fontsize=7)
        ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig("/Users/annhoward/src/city_builder/simulations/sim4_political_will.png", dpi=150)
    plt.close()

    # Chart 2: Will economy balance
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    fig.suptitle("Political Will Economy Balance", fontsize=14)

    x = np.arange(len(strategies))
    labels = [s.replace("_", "\n") for s in strategies]

    # Sources of will
    will_from_trust = [all_results[s]["avg_will_from_trust"] for s in strategies]
    will_from_narrative = [all_results[s]["avg_will_from_narrative"] for s in strategies]
    will_spent = [all_results[s]["avg_will_spent"] for s in strategies]
    will_drained = [all_results[s]["avg_will_drained"] for s in strategies]
    ongoing_drain_total = [all_results[s]["avg_ongoing_drain"] * 64 for s in strategies]  # total over game

    # Inflows
    ax1.bar(x - 0.15, will_from_trust, 0.3, label="From Trust Feedback", color="#4CAF50")
    ax1.bar(x + 0.15, will_from_narrative, 0.3, label="From Narrative Actions", color="#2196F3")
    ax1.set_xticks(x)
    ax1.set_xticklabels(labels)
    ax1.set_ylabel("Total Will Gained (%)")
    ax1.set_title("Will Inflows (64 turns)")
    ax1.legend()
    ax1.grid(True, alpha=0.3, axis='y')

    # Outflows
    ax2.bar(x - 0.2, will_spent, 0.2, label="Policy Costs", color="#F44336")
    ax2.bar(x, will_drained, 0.2, label="Counter-Narrative", color="#FF9800")
    ax2.bar(x + 0.2, ongoing_drain_total, 0.2, label="Ongoing Policy Drain", color="#9C27B0")
    ax2.set_xticks(x)
    ax2.set_xticklabels(labels)
    ax2.set_ylabel("Total Will Lost (%)")
    ax2.set_title("Will Outflows (64 turns)")
    ax2.legend()
    ax2.grid(True, alpha=0.3, axis='y')

    plt.tight_layout()
    plt.savefig("/Users/annhoward/src/city_builder/simulations/sim4_will_economy.png", dpi=150)
    plt.close()

    # Chart 3: Drain vs Regen over time
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    fig.suptitle("Will Drain vs Regen Over Time", fontsize=14)

    for idx, strategy in enumerate(["policy_heavy", "balanced"]):
        ax = axes[idx]
        r = all_results[strategy]

        # Smooth with rolling average
        window = 4
        drain_smooth = np.convolve(r["avg_drain"], np.ones(window)/window, mode='valid')
        regen_smooth = np.convolve(r["avg_regen"], np.ones(window)/window, mode='valid')
        t_smooth = turns[:len(drain_smooth)]

        ax.plot(t_smooth, drain_smooth, label="Drain (smoothed)", color="red", linewidth=2)
        ax.plot(t_smooth, regen_smooth, label="Regen (smoothed)", color="green", linewidth=2)
        ax.fill_between(t_smooth, drain_smooth, regen_smooth,
                        where=regen_smooth > drain_smooth, alpha=0.2, color='green', label='Net positive')
        ax.fill_between(t_smooth, drain_smooth, regen_smooth,
                        where=drain_smooth > regen_smooth, alpha=0.2, color='red', label='Net negative')

        ax.set_title(f"{strategy.replace('_', ' ').title()}")
        ax.set_xlabel("Turn")
        ax.set_ylabel("Will %/turn")
        ax.legend(fontsize=8)
        ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig("/Users/annhoward/src/city_builder/simulations/sim4_drain_vs_regen.png", dpi=150)
    plt.close()

    # --- Key findings ---
    print("\n" + "="*80)
    print("SIMULATION 4: POLITICAL WILL - KEY FINDINGS")
    print("="*80)

    print("\n1. WILL SUSTAINABILITY:")
    for strategy in strategies:
        r = all_results[strategy]
        net = (r["avg_will_from_trust"] + r["avg_will_from_narrative"]) - (r["avg_will_spent"] + r["avg_will_drained"])
        print(f"   {strategy:>16}: Net will over 64 turns = {net:+.1f}%, final will = {r['avg_final_will']:.1f}%")
        print(f"                    Ongoing drain at end: {r['avg_ongoing_drain']:.1f}%/turn, recall risk: {r['pct_recall']:.1f}%")

    print("\n2. CAN THE PLAYER KEEP PASSING POLICIES?")
    for strategy in strategies:
        r = all_results[strategy]
        print(f"   {strategy:>16}: {r['avg_policies_enacted']:.1f} policies enacted, turns below 40% will: {r['avg_below_40']:.1f}")

    print("\n3. COUNTER-NARRATIVE IMPACT:")
    for strategy in strategies:
        r = all_results[strategy]
        print(f"   {strategy:>16}: {r['avg_counter_hits']:.1f} counter-narrative events, {r['avg_will_drained']:.1f}% total drain")

    # Save JSON
    summary = {}
    for strategy in strategies:
        r = all_results[strategy]
        summary[strategy] = {
            "avg_policies_enacted": round(r['avg_policies_enacted'], 1),
            "avg_final_will": round(r['avg_final_will'], 1),
            "avg_final_trust": round(r['avg_final_trust'], 1),
            "will_economy": {
                "from_trust": round(r['avg_will_from_trust'], 1),
                "from_narrative": round(r['avg_will_from_narrative'], 1),
                "spent_on_policies": round(r['avg_will_spent'], 1),
                "drained_by_counters": round(r['avg_will_drained'], 1),
                "ongoing_drain_per_turn": round(r['avg_ongoing_drain'], 1),
            },
            "risk_metrics": {
                "turns_below_20_pct": round(r['avg_below_20'], 1),
                "turns_below_40_pct": round(r['avg_below_40'], 1),
                "recall_triggered_pct": round(r['pct_recall'], 1),
            },
            "counter_narrative_hits": round(r['avg_counter_hits'], 1),
        }

    with open("/Users/annhoward/src/city_builder/simulations/sim4_results.json", "w") as f:
        json.dump(summary, f, indent=2)

    print("\nResults saved to sim4_results.json")


if __name__ == "__main__":
    run_analysis()
