"""
Simulation 2: Project Economy
Model project throughput, budget constraints, and stage transition feasibility.
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from dataclasses import dataclass, field
from typing import List, Dict, Tuple
import json

np.random.seed(42)

NUM_ITERATIONS = 1000
TOTAL_TURNS = 64

# Project definitions based on spec
PROJECTS = {
    # Name: (cost_$M, duration_turns, stage_req, will_req, effects)
    # effects: (eco%, food%, trust%, tiles_transformed)

    # Awakening stage
    "Soil Remediation":    (0.4, 3, 0, 30, (3, 0, 1, 0)),
    "Community Garden":    (0.2, 2, 0, 20, (2, 4, 3, 1)),
    "Rain Garden":         (0.3, 2, 0, 25, (4, 0, 1, 0)),
    "Food Forest":         (0.5, 3, 0, 30, (5, 5, 3, 1)),
    "Solar Panel Install": (0.6, 3, 0, 35, (2, 0, 2, 1)),
    "Community Kitchen":   (0.3, 2, 0, 25, (0, 3, 4, 1)),

    # Transition stage
    "Maker Space":         (0.7, 4, 1, 40, (1, 1, 5, 1)),
    "Water Transit Pilot": (0.8, 4, 1, 45, (3, 0, 3, 1)),
    "Coop Housing":        (0.9, 5, 1, 50, (1, 0, 5, 1)),
    "Greenway":            (0.6, 3, 1, 35, (5, 1, 2, 1)),
    "Land Trust":          (0.4, 3, 1, 40, (1, 2, 4, 1)),

    # Restoration stage
    "Wetland Restoration": (1.0, 5, 2, 45, (8, 2, 2, 1)),
    "Wildlife Corridor":   (1.2, 6, 2, 50, (10, 1, 3, 1)),
    "Native Planting":     (0.5, 3, 2, 30, (6, 2, 2, 1)),
    "Regional Collab":     (1.5, 6, 2, 60, (5, 3, 5, 1)),
}


@dataclass
class ProjectState:
    budget: float = 4.2
    trust: float = 50.0
    eco: float = 15.0
    food: float = 10.0
    will: float = 60.0
    climate: float = 30.0
    stage: int = 0
    tiles_transformed: int = 0
    turn: int = 0

    active_projects: List[Tuple[str, int]] = field(default_factory=list)  # (name, turns_remaining)
    completed_projects: List[Tuple[str, int]] = field(default_factory=list)  # (name, completion_turn)

    def concurrent_limit(self) -> int:
        """Max concurrent projects based on trust."""
        if self.trust >= 80:
            return 5
        elif self.trust >= 60:
            return 4
        elif self.trust >= 40:
            return 3
        else:
            return 2

    def available_projects(self) -> List[str]:
        """Projects available given current stage."""
        return [name for name, (cost, dur, stage_req, will_req, effects)
                in PROJECTS.items() if stage_req <= self.stage]


def simulate_project_economy(strategy: str) -> Dict:
    """Simulate project economy for a given strategy."""
    state = ProjectState()

    projects_completed_per_term = [0, 0, 0, 0]
    budget_history = []
    tiles_history = []
    projects_active_history = []

    for t in range(TOTAL_TURNS):
        state.turn = t
        season = ["Spring", "Summer", "Fall", "Winter"][t % 4]

        # Annual budget replenishment
        if t > 0 and t % 4 == 0:
            trust_mod = 0.7 + (state.trust / 100) * 0.6
            state.budget += 2.5 * trust_mod + state.stage * 0.3

        # Climate pressure rise (simplified)
        year = t // 4
        state.climate += 0.8 * (1 + year * 0.03)
        state.climate = min(state.climate, 100)

        # Random event budget drain
        if np.random.random() < 0.15:
            state.budget -= np.random.uniform(0.1, 0.4)
            state.budget = max(0, state.budget)

        # Advance active projects
        completed_this_turn = []
        new_active = []
        for name, remaining in state.active_projects:
            # Spring bonus for ecology projects
            bonus = 1 if season == "Spring" and PROJECTS[name][4][0] > 3 else 0
            remaining -= (1 + bonus)
            if remaining <= 0:
                completed_this_turn.append(name)
            else:
                new_active.append((name, remaining))

        state.active_projects = new_active

        # Apply completion effects
        for name in completed_this_turn:
            effects = PROJECTS[name][4]
            state.eco += effects[0]
            state.food += effects[1]
            state.trust += effects[2]
            state.tiles_transformed += effects[3]
            state.completed_projects.append((name, t))

            term = t // 16
            if term < 4:
                projects_completed_per_term[term] += 1

        # Start new projects based on strategy
        available = state.available_projects()
        slots = state.concurrent_limit() - len(state.active_projects)

        if strategy == "aggressive":
            # Start as many projects as possible
            np.random.shuffle(available)
            for proj_name in available:
                if slots <= 0:
                    break
                cost, dur, stage_req, will_req, effects = PROJECTS[proj_name]
                if state.budget >= cost and state.will >= will_req:
                    state.active_projects.append((proj_name, dur))
                    state.budget -= cost
                    state.will -= 2  # Political cost of starting projects
                    slots -= 1

        elif strategy == "balanced":
            # Prioritize by value, be budget-conscious
            scored = []
            for proj_name in available:
                cost, dur, stage_req, will_req, effects = PROJECTS[proj_name]
                value = sum(effects[:3]) / max(cost, 0.1) / dur
                scored.append((value, proj_name))
            scored.sort(reverse=True)

            for _, proj_name in scored:
                if slots <= 0 or state.budget < 1.0:  # Keep $1M reserve
                    break
                cost, dur, stage_req, will_req, effects = PROJECTS[proj_name]
                if state.budget >= cost and state.will >= will_req:
                    state.active_projects.append((proj_name, dur))
                    state.budget -= cost
                    state.will -= 1.5
                    slots -= 1

        elif strategy == "conservative":
            # Only start cheap projects, keep large reserve
            cheap = [(name, PROJECTS[name]) for name in available
                     if PROJECTS[name][0] <= 0.4]
            for proj_name, (cost, dur, stage_req, will_req, effects) in cheap:
                if slots <= 0 or state.budget < 2.0:
                    break
                if state.budget >= cost and state.will >= will_req:
                    state.active_projects.append((proj_name, dur))
                    state.budget -= cost
                    state.will -= 1.0
                    slots -= 1

        # Feedback loops (simplified)
        if state.trust > 70:
            state.will += 2
        if state.food > 50:
            state.trust += 1

        # Counter-narrative drain
        if np.random.random() < 0.2:
            state.will -= np.random.uniform(2, 5)

        # Narrative actions restore some will
        state.will += 1.0
        state.trust += 0.5

        # Clamp
        state.eco = np.clip(state.eco, 0, 100)
        state.food = np.clip(state.food, 0, 100)
        state.trust = np.clip(state.trust, 0, 100)
        state.will = np.clip(state.will, 0, 100)

        # Check stage transitions
        if state.stage == 0 and state.trust >= 50 and state.eco >= 30 and state.food >= 25 and state.tiles_transformed >= 5:
            state.stage = 1
        if state.stage == 1 and state.trust >= 75 and state.eco >= 60 and state.food >= 60 and state.will >= 50 and state.tiles_transformed >= 15:
            state.stage = 2
        if state.stage == 2 and state.eco >= 85 and state.food >= 80 and state.tiles_transformed >= 25:
            state.stage = 3

        budget_history.append(state.budget)
        tiles_history.append(state.tiles_transformed)
        projects_active_history.append(len(state.active_projects))

    return {
        "projects_completed_per_term": projects_completed_per_term,
        "total_completed": len(state.completed_projects),
        "final_tiles": state.tiles_transformed,
        "final_stage": state.stage,
        "budget_history": budget_history,
        "tiles_history": tiles_history,
        "active_history": projects_active_history,
        "final_eco": state.eco,
        "final_food": state.food,
        "final_trust": state.trust,
        "final_will": state.will,
    }


def run_analysis():
    strategies = ["aggressive", "balanced", "conservative"]
    all_results = {}

    for strategy in strategies:
        print(f"\nRunning {NUM_ITERATIONS} iterations for '{strategy}' strategy...")

        iter_results = []
        for i in range(NUM_ITERATIONS):
            result = simulate_project_economy(strategy)
            iter_results.append(result)

        # Aggregate
        total_completed = [r["total_completed"] for r in iter_results]
        final_tiles = [r["final_tiles"] for r in iter_results]
        final_stage = [r["final_stage"] for r in iter_results]
        per_term = np.array([r["projects_completed_per_term"] for r in iter_results])
        budget_histories = np.array([r["budget_history"] for r in iter_results])
        tiles_histories = np.array([r["tiles_history"] for r in iter_results])

        all_results[strategy] = {
            "avg_total_completed": np.mean(total_completed),
            "std_total_completed": np.std(total_completed),
            "avg_per_term": np.mean(per_term, axis=0).tolist(),
            "avg_final_tiles": np.mean(final_tiles),
            "std_final_tiles": np.std(final_tiles),
            "avg_budget": np.mean(budget_histories, axis=0),
            "avg_tiles": np.mean(tiles_histories, axis=0),
            "stage_dist": {s: final_stage.count(s) / NUM_ITERATIONS * 100 for s in range(4)},
            "pct_5_tiles_by_16": sum(1 for r in iter_results if r["tiles_history"][15] >= 5) / NUM_ITERATIONS * 100,
            "pct_15_tiles_by_32": sum(1 for r in iter_results if r["tiles_history"][31] >= 15) / NUM_ITERATIONS * 100,
            "pct_25_tiles_by_48": sum(1 for r in iter_results if r["tiles_history"][47] >= 25) / NUM_ITERATIONS * 100,
            "avg_final_meters": {
                "eco": np.mean([r["final_eco"] for r in iter_results]),
                "food": np.mean([r["final_food"] for r in iter_results]),
                "trust": np.mean([r["final_trust"] for r in iter_results]),
                "will": np.mean([r["final_will"] for r in iter_results]),
            },
        }

        r = all_results[strategy]
        print(f"  Avg projects completed: {r['avg_total_completed']:.1f} +/- {r['std_total_completed']:.1f}")
        print(f"  Per term: {[f'{v:.1f}' for v in r['avg_per_term']]}")
        print(f"  Avg tiles transformed: {r['avg_final_tiles']:.1f} +/- {r['std_final_tiles']:.1f}")
        print(f"  Stage dist: {r['stage_dist']}")
        print(f"  5 tiles by turn 16 (1 term): {r['pct_5_tiles_by_16']:.1f}%")
        print(f"  15 tiles by turn 32 (2 terms): {r['pct_15_tiles_by_32']:.1f}%")
        print(f"  25 tiles by turn 48 (3 terms): {r['pct_25_tiles_by_48']:.1f}%")

    # --- Charts ---
    turns = np.arange(TOTAL_TURNS)

    # Chart 1: Budget over time
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    fig.suptitle("Project Economy: Budget and Tiles Over Time", fontsize=14)

    for idx, strategy in enumerate(strategies):
        ax = axes[idx]
        r = all_results[strategy]
        ax.plot(turns, r["avg_budget"], label="Budget ($M)", color="red", linewidth=2)
        ax2 = ax.twinx()
        ax2.plot(turns, r["avg_tiles"], label="Tiles Transformed", color="green", linewidth=2, linestyle="--")

        ax.set_title(f"{strategy.capitalize()}")
        ax.set_xlabel("Turn")
        ax.set_ylabel("Budget ($M)", color="red")
        ax2.set_ylabel("Tiles Transformed", color="green")
        ax.grid(True, alpha=0.3)

        # Milestone lines
        ax2.axhline(y=5, color='gray', linestyle=':', alpha=0.5)
        ax2.axhline(y=15, color='gray', linestyle=':', alpha=0.5)
        ax2.axhline(y=25, color='gray', linestyle=':', alpha=0.5)
        ax2.annotate("5 tiles", xy=(2, 5.5), fontsize=8, color='gray')
        ax2.annotate("15 tiles", xy=(2, 15.5), fontsize=8, color='gray')
        ax2.annotate("25 tiles", xy=(2, 25.5), fontsize=8, color='gray')

    plt.tight_layout()
    plt.savefig("/Users/annhoward/src/city_builder/simulations/sim2_project_economy.png", dpi=150)
    plt.close()

    # Chart 2: Projects per term bar chart
    fig, ax = plt.subplots(figsize=(10, 6))
    x = np.arange(4)
    width = 0.25

    for idx, strategy in enumerate(strategies):
        r = all_results[strategy]
        offset = (idx - 1) * width
        ax.bar(x + offset, r['avg_per_term'], width, label=strategy.capitalize())

    ax.set_xlabel("Term")
    ax.set_ylabel("Projects Completed")
    ax.set_title("Average Projects Completed Per Term")
    ax.set_xticks(x)
    ax.set_xticklabels(["Term 1\n(Turns 1-16)", "Term 2\n(Turns 17-32)",
                         "Term 3\n(Turns 33-48)", "Term 4\n(Turns 49-64)"])
    ax.legend()
    ax.grid(True, alpha=0.3, axis='y')

    plt.tight_layout()
    plt.savefig("/Users/annhoward/src/city_builder/simulations/sim2_projects_per_term.png", dpi=150)
    plt.close()

    # Awakening->Transition feasibility analysis
    print("\n" + "="*80)
    print("AWAKENING -> TRANSITION FEASIBILITY (within 1 term = 16 turns)")
    print("="*80)

    # Focused analysis: can you reach Trust>=50, Eco>=30, Food>=25, 5 tiles in 16 turns?
    print(f"\nStarting: Trust=50%, Eco=15%, Food=10%, Budget=$4.2M")
    print(f"Target: Trust>=50%, Eco>=30%, Food>=25%, 5 tiles transformed")
    print(f"\nTo reach Eco 30% from 15%: need +15% eco")
    print(f"To reach Food 25% from 10%: need +15% food")
    print(f"To reach 5 tiles: need 5 tile-transforming projects completed")
    print(f"\nWith Food Forest (3 turns, $0.5M, +5% eco, +5% food, 1 tile):")
    print(f"  5 food forests = 15 turns minimum (sequential), $2.5M")
    print(f"  But with 2-3 concurrent: ~6-9 turns, still $2.5M")
    print(f"  Eco: +25% (15+25=40%), Food: +25% (10+25=35%) -- meets thresholds")
    print(f"  Budget: $4.2M - $2.5M = $1.7M remaining")
    print(f"  Plus Spring bonuses accelerate ecology projects")
    print(f"\nVerdict: Achievable but tight. Requires focused strategy and no major crises.")

    for strategy in strategies:
        r = all_results[strategy]
        print(f"\n{strategy}: {r['pct_5_tiles_by_16']:.1f}% reach 5 tiles by turn 16")

    # --- Print detailed results ---
    print("\n" + "="*80)
    print("SIMULATION 2: PROJECT ECONOMY - DETAILED RESULTS")
    print("="*80)

    for strategy in strategies:
        r = all_results[strategy]
        print(f"\n--- {strategy.upper()} ---")
        print(f"  Avg projects completed (64 turns): {r['avg_total_completed']:.1f}")
        print(f"  Per term: {[f'{v:.1f}' for v in r['avg_per_term']]}")
        print(f"  Avg tiles: {r['avg_final_tiles']:.1f}")
        print(f"  5 tiles by T16: {r['pct_5_tiles_by_16']:.1f}%")
        print(f"  15 tiles by T32: {r['pct_15_tiles_by_32']:.1f}%")
        print(f"  25 tiles by T48: {r['pct_25_tiles_by_48']:.1f}%")
        print(f"  Final stage dist: {r['stage_dist']}")
        print(f"  Final meters: eco={r['avg_final_meters']['eco']:.1f}%, food={r['avg_final_meters']['food']:.1f}%, trust={r['avg_final_meters']['trust']:.1f}%, will={r['avg_final_meters']['will']:.1f}%")

    # Save JSON
    summary = {}
    for strategy in strategies:
        r = all_results[strategy]
        summary[strategy] = {
            "avg_projects_completed": round(r['avg_total_completed'], 1),
            "avg_per_term": [round(v, 1) for v in r['avg_per_term']],
            "avg_final_tiles": round(r['avg_final_tiles'], 1),
            "tile_milestones": {
                "5_by_turn16": round(r['pct_5_tiles_by_16'], 1),
                "15_by_turn32": round(r['pct_15_tiles_by_32'], 1),
                "25_by_turn48": round(r['pct_25_tiles_by_48'], 1),
            },
            "stage_distribution": {str(k): round(v, 1) for k, v in r['stage_dist'].items()},
            "final_meters": {k: round(v, 1) for k, v in r['avg_final_meters'].items()},
        }

    with open("/Users/annhoward/src/city_builder/simulations/sim2_results.json", "w") as f:
        json.dump(summary, f, indent=2)

    print("\nResults saved to sim2_results.json")


if __name__ == "__main__":
    run_analysis()
