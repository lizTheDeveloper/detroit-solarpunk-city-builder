"""
Simulation 1: Meter Dynamics
Model all 6 meters over 64 turns (4 terms / 16 years).
Simulate different player strategies with randomized events.
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from dataclasses import dataclass, field
from typing import List, Tuple, Dict
import json

np.random.seed(42)

# --- Constants ---
TOTAL_TURNS = 64
TURNS_PER_YEAR = 4
TURNS_PER_TERM = 16
SEASONS = ["Spring", "Summer", "Fall", "Winter"]
NUM_ITERATIONS = 1000

# Stage transition thresholds
STAGE_THRESHOLDS = {
    "Awakening->Transition": {"trust": 50, "eco": 30, "food": 25, "tiles": 5},
    "Transition->Restoration": {"trust": 75, "eco": 60, "food": 60, "will": 50, "tiles": 15},
    "Restoration->Beyond": {"eco": 85, "food": 80, "tiles": 25},
}

# Re-election thresholds (turn 16, 32, 48, 64)
REELECTION_TRUST_MIN = 30
REELECTION_WILL_MIN = 20


@dataclass
class GameState:
    trust: float = 50.0       # Community Trust %
    eco: float = 15.0         # Ecological Health %
    food: float = 10.0        # Food Sovereignty %
    will: float = 60.0        # Political Will %
    budget: float = 4.2       # Budget in $M
    climate: float = 30.0     # Climate Pressure %

    stage: int = 0            # 0=Awakening, 1=Transition, 2=Restoration, 3=Beyond
    tiles_transformed: int = 0
    turn: int = 0
    alive: bool = True
    loss_reason: str = ""
    stage_transitions: Dict[int, int] = field(default_factory=dict)  # stage -> turn reached

    def clamp(self):
        self.trust = np.clip(self.trust, 0, 100)
        self.eco = np.clip(self.eco, 0, 100)
        self.food = np.clip(self.food, 0, 100)
        self.will = np.clip(self.will, 0, 100)
        self.climate = np.clip(self.climate, 0, 100)
        self.budget = max(self.budget, 0)


def get_season(turn: int) -> str:
    return SEASONS[turn % 4]


def climate_tick(state: GameState) -> float:
    """Climate pressure rises every turn with acceleration."""
    year = state.turn // 4
    base_rise = 0.8  # base rise per turn
    acceleration = 1.0 + (year * 0.03)  # 3% faster per year

    # Summer gets extra climate pressure
    season = get_season(state.turn)
    seasonal_bonus = 0.3 if season == "Summer" else 0.0

    return base_rise * acceleration + seasonal_bonus


def feedback_loops(state: GameState):
    """Apply feedback loops between meters."""
    # Trust > 70% -> Political Will regen +2%/turn
    if state.trust > 70:
        state.will += 2.0
    elif state.trust > 50:
        state.will += 1.0

    # Food Sovereignty > 50% -> Trust +1%/turn
    if state.food > 50:
        state.trust += 1.0
    elif state.food > 30:
        state.trust += 0.5

    # Eco Health reduces climate damage
    # (applied during events)

    # Low budget constrains everything (morale hit)
    if state.budget < 0.5:
        state.trust -= 1.0
        state.will -= 1.0


def generate_climate_event(state: GameState) -> Tuple[float, float, float, float]:
    """Generate climate event damage based on pressure and season.
    Returns (trust_dmg, eco_dmg, food_dmg, budget_dmg)"""
    season = get_season(state.turn)
    pressure = state.climate

    # Probability of climate event scales with pressure
    event_prob = min(0.9, 0.1 + pressure / 100 * 0.7)

    if np.random.random() > event_prob:
        return (0, 0, 0, 0)

    # Base damage scales with pressure
    severity = 0.3 + (pressure / 100) * 0.7  # 0.3 to 1.0

    # Eco health reduces damage
    damage_reduction = state.eco / 200  # up to 50% reduction at 100% eco
    severity *= (1 - damage_reduction)

    # Seasonal events
    if season == "Summer":
        # Heat wave - hits trust and budget
        return (severity * 3, severity * 1, severity * 1, severity * 0.3)
    elif season == "Spring":
        # Flooding - hits infrastructure and budget
        return (severity * 1, severity * 2, severity * 2, severity * 0.4)
    elif season == "Fall":
        # Storms - hits everything moderately
        return (severity * 2, severity * 2, severity * 1, severity * 0.2)
    else:
        # Winter - cold snaps, hits trust and budget
        return (severity * 2, severity * 0.5, severity * 0.5, severity * 0.3)


def generate_political_event(state: GameState) -> Tuple[float, float]:
    """Generate political events. Returns (will_change, trust_change)"""
    # Counter-narrative: corporate/state pushback
    # More likely when player is doing well
    pushback_prob = 0.15 + (state.trust / 200)  # 15-65%

    if np.random.random() < pushback_prob:
        # Counter-narrative drains political will
        drain = np.random.uniform(2, 6)
        trust_drain = np.random.uniform(0, 2)
        return (-drain, -trust_drain)

    # Positive community event
    if state.trust > 40 and np.random.random() < 0.2:
        return (np.random.uniform(1, 3), np.random.uniform(1, 2))

    return (0, 0)


def generate_random_event(state: GameState) -> Tuple[float, float, float, float, float]:
    """Random events: budget grants, crises, etc.
    Returns (trust, eco, food, will, budget) changes."""
    roll = np.random.random()

    if roll < 0.05:
        # Federal grant
        return (0, 0, 0, 0, np.random.uniform(0.5, 1.5))
    elif roll < 0.10:
        # Infrastructure crisis
        return (-3, 0, 0, -2, -np.random.uniform(0.3, 0.8))
    elif roll < 0.15:
        # Community celebration
        return (3, 0, 1, 1, 0)
    elif roll < 0.20:
        # Developer pressure
        return (-1, -1, 0, -3, np.random.uniform(0, 0.3))

    return (0, 0, 0, 0, 0)


def tipping_point_effects(state: GameState):
    """Apply tipping point effects at climate thresholds."""
    if state.climate >= 85:
        # Severe tipping point: major ongoing damage
        state.eco -= 1.5
        state.food -= 1.0
        state.trust -= 0.5
    elif state.climate >= 70:
        # First tipping point: growing season reduction, new stress
        state.food -= 0.5
        state.eco -= 0.5


def apply_strategy(state: GameState, strategy: str):
    """Apply player strategy actions for the turn.
    Models project completion, policy effects, and narrative actions."""
    season = get_season(state.turn)

    if strategy == "aggressive":
        # Heavy spending early, many projects, bold policies
        if state.stage == 0:
            # Awakening: spend heavily
            spending = min(state.budget, 1.0)
            state.budget -= spending
            state.eco += 2.5
            state.food += 2.0
            state.trust += 1.5
            state.will -= 3.0  # Bold policies cost political will

            # Tile transformation (aggressive: ~1 tile every 2-3 turns)
            if state.turn % 2 == 0 and state.budget > 0.3:
                state.tiles_transformed += 1
                state.budget -= 0.3
        elif state.stage == 1:
            spending = min(state.budget, 0.9)
            state.budget -= spending
            state.eco += 2.0
            state.food += 2.5
            state.trust += 1.0
            state.will -= 2.0
            if state.turn % 2 == 0:
                state.tiles_transformed += 1
                state.budget -= 0.2
        elif state.stage >= 2:
            spending = min(state.budget, 0.8)
            state.budget -= spending
            state.eco += 2.5
            state.food += 2.0
            state.trust += 0.5
            state.will -= 1.5
            if state.turn % 3 == 0:
                state.tiles_transformed += 1
                state.budget -= 0.2

        # Narrative actions (aggressive: always 2)
        state.trust += 1.5
        state.will += 1.0

    elif strategy == "balanced":
        # Moderate spending, steady progress
        if state.stage == 0:
            spending = min(state.budget, 0.6)
            state.budget -= spending
            state.eco += 1.5
            state.food += 1.5
            state.trust += 1.0
            state.will -= 1.5
            if state.turn % 3 == 0:
                state.tiles_transformed += 1
                state.budget -= 0.2
        elif state.stage == 1:
            spending = min(state.budget, 0.7)
            state.budget -= spending
            state.eco += 2.0
            state.food += 2.0
            state.trust += 1.0
            state.will -= 1.5
            if state.turn % 3 == 0:
                state.tiles_transformed += 1
                state.budget -= 0.2
        elif state.stage >= 2:
            spending = min(state.budget, 0.7)
            state.budget -= spending
            state.eco += 2.0
            state.food += 2.0
            state.trust += 0.8
            state.will -= 1.0
            if state.turn % 3 == 0:
                state.tiles_transformed += 1
                state.budget -= 0.2

        # Narrative actions (balanced: 1-2)
        state.trust += 1.0
        state.will += 0.5

    elif strategy == "conservative":
        # Low spending, slow and safe
        if state.stage == 0:
            spending = min(state.budget, 0.3)
            state.budget -= spending
            state.eco += 0.8
            state.food += 0.8
            state.trust += 0.5
            state.will -= 0.5
            if state.turn % 4 == 0:
                state.tiles_transformed += 1
                state.budget -= 0.15
        elif state.stage >= 1:
            spending = min(state.budget, 0.4)
            state.budget -= spending
            state.eco += 1.0
            state.food += 1.0
            state.trust += 0.5
            state.will -= 0.5
            if state.turn % 4 == 0:
                state.tiles_transformed += 1
                state.budget -= 0.15

        # Narrative actions (conservative: 1)
        state.trust += 0.5
        state.will += 0.3

    # Spring planting bonus for ecology projects
    if season == "Spring":
        state.eco += 0.5

    # Fall harvest bonus
    if season == "Fall":
        state.food += 0.5


def annual_budget_replenish(state: GameState):
    """Replenish budget each year (every 4 turns, on Spring)."""
    if state.turn > 0 and state.turn % 4 == 0:
        # Base tax revenue
        base_revenue = 2.5  # $2.5M base annual revenue

        # Modified by trust (economic health proxy)
        trust_modifier = 0.7 + (state.trust / 100) * 0.6  # 0.7x to 1.3x

        # Stage bonus (cooperative economics in later stages)
        stage_bonus = state.stage * 0.3

        revenue = base_revenue * trust_modifier + stage_bonus
        state.budget += revenue


def check_stage_transition(state: GameState):
    """Check and apply stage transitions."""
    if state.stage == 0:
        thresh = STAGE_THRESHOLDS["Awakening->Transition"]
        if (state.trust >= thresh["trust"] and state.eco >= thresh["eco"]
            and state.food >= thresh["food"] and state.tiles_transformed >= thresh["tiles"]):
            state.stage = 1
            state.stage_transitions[1] = state.turn

    if state.stage == 1:
        thresh = STAGE_THRESHOLDS["Transition->Restoration"]
        if (state.trust >= thresh["trust"] and state.eco >= thresh["eco"]
            and state.food >= thresh["food"] and state.will >= thresh["will"]
            and state.tiles_transformed >= thresh["tiles"]):
            state.stage = 2
            state.stage_transitions[2] = state.turn

    if state.stage == 2:
        thresh = STAGE_THRESHOLDS["Restoration->Beyond"]
        if (state.eco >= thresh["eco"] and state.food >= thresh["food"]
            and state.tiles_transformed >= thresh["tiles"]):
            state.stage = 3
            state.stage_transitions[3] = state.turn


def check_loss_conditions(state: GameState):
    """Check if the player loses."""
    # Re-election check at turn 16, 32, 48
    if state.turn > 0 and state.turn % 16 == 0:
        if state.trust < REELECTION_TRUST_MIN or state.will < REELECTION_WILL_MIN:
            state.alive = False
            state.loss_reason = f"Lost re-election (Trust={state.trust:.1f}%, Will={state.will:.1f}%)"

    # Budget crisis with no recovery possible
    if state.budget <= 0 and state.trust < 20:
        state.alive = False
        state.loss_reason = "Austerity death spiral"

    # Climate overwhelm
    if state.climate >= 95 and state.eco < 30:
        state.alive = False
        state.loss_reason = "Climate catastrophe"


def simulate_game(strategy: str) -> Tuple[GameState, List[List[float]]]:
    """Run one complete game simulation. Returns final state and meter history."""
    state = GameState()

    # meter_history: [turn][trust, eco, food, will, budget, climate]
    history = []

    for t in range(TOTAL_TURNS):
        state.turn = t

        if not state.alive:
            # Pad history with last known values
            history.append([state.trust, state.eco, state.food, state.will, state.budget, state.climate])
            continue

        # 1. Climate tick
        state.climate += climate_tick(state)

        # 2. Climate events
        c_trust, c_eco, c_food, c_budget = generate_climate_event(state)
        state.trust -= c_trust
        state.eco -= c_eco
        state.food -= c_food
        state.budget -= c_budget

        # 3. Political events
        will_change, trust_change = generate_political_event(state)
        state.will += will_change
        state.trust += trust_change

        # 4. Random events
        r_trust, r_eco, r_food, r_will, r_budget = generate_random_event(state)
        state.trust += r_trust
        state.eco += r_eco
        state.food += r_food
        state.will += r_will
        state.budget += r_budget

        # 5. Player strategy actions
        apply_strategy(state, strategy)

        # 6. Feedback loops
        feedback_loops(state)

        # 7. Tipping point effects
        tipping_point_effects(state)

        # 8. Annual budget
        annual_budget_replenish(state)

        # 9. Clamp values
        state.clamp()

        # 10. Check stage transitions
        check_stage_transition(state)

        # 11. Check loss conditions
        check_loss_conditions(state)

        # Record history
        history.append([state.trust, state.eco, state.food, state.will, state.budget, state.climate])

    return state, history


def run_simulations():
    strategies = ["aggressive", "balanced", "conservative"]
    results = {}

    for strategy in strategies:
        print(f"\nRunning {NUM_ITERATIONS} iterations for '{strategy}' strategy...")

        all_histories = []
        wins = 0
        losses_by_reason = {}
        stage_transition_turns = {1: [], 2: [], 3: []}
        final_stages = []

        for i in range(NUM_ITERATIONS):
            state, history = simulate_game(strategy)
            all_histories.append(history)

            if state.alive:
                wins += 1
            else:
                reason = state.loss_reason
                losses_by_reason[reason] = losses_by_reason.get(reason, 0) + 1

            final_stages.append(state.stage)

            for s, t in state.stage_transitions.items():
                stage_transition_turns[s].append(t)

        # Compute average trajectories
        histories_array = np.array(all_histories)
        avg_history = np.mean(histories_array, axis=0)
        std_history = np.std(histories_array, axis=0)

        # Compute percentiles for confidence bands
        p10 = np.percentile(histories_array, 10, axis=0)
        p90 = np.percentile(histories_array, 90, axis=0)

        win_rate = wins / NUM_ITERATIONS * 100

        avg_stage_turns = {}
        for s in [1, 2, 3]:
            if stage_transition_turns[s]:
                avg_stage_turns[s] = np.mean(stage_transition_turns[s])
                pct_reaching = len(stage_transition_turns[s]) / NUM_ITERATIONS * 100
            else:
                avg_stage_turns[s] = None
                pct_reaching = 0
            avg_stage_turns[f"{s}_pct"] = pct_reaching

        stage_dist = {s: final_stages.count(s) / NUM_ITERATIONS * 100 for s in range(4)}

        results[strategy] = {
            "win_rate": win_rate,
            "losses_by_reason": losses_by_reason,
            "avg_history": avg_history,
            "std_history": std_history,
            "p10": p10,
            "p90": p90,
            "avg_stage_turns": avg_stage_turns,
            "stage_dist": stage_dist,
        }

        print(f"  Win rate: {win_rate:.1f}%")
        print(f"  Loss reasons: {losses_by_reason}")
        print(f"  Stage distribution: {stage_dist}")
        for s in [1, 2, 3]:
            stage_names = {1: "Transition", 2: "Restoration", 3: "Beyond"}
            if avg_stage_turns[s] is not None:
                print(f"  Avg turn to {stage_names[s]}: {avg_stage_turns[s]:.1f} ({avg_stage_turns[f'{s}_pct']:.1f}% reach it)")
            else:
                print(f"  {stage_names[s]}: never reached")

    # --- Generate Charts ---
    meter_names = ["Community Trust", "Ecological Health", "Food Sovereignty",
                   "Political Will", "Budget ($M)", "Climate Pressure"]
    colors = ["#2196F3", "#4CAF50", "#FF9800", "#9C27B0", "#F44336", "#795548"]

    turns = np.arange(TOTAL_TURNS)

    # Chart 1: Average meter trajectories per strategy
    fig, axes = plt.subplots(2, 3, figsize=(18, 10))
    fig.suptitle("Meter Dynamics: Average Trajectories by Strategy (1000 iterations)", fontsize=14)

    for idx, (meter_name, color) in enumerate(zip(meter_names, colors)):
        ax = axes[idx // 3][idx % 3]
        for strategy in strategies:
            avg = results[strategy]["avg_history"][:, idx]
            p10 = results[strategy]["p10"][:, idx]
            p90 = results[strategy]["p90"][:, idx]

            linestyle = {"aggressive": "-", "balanced": "--", "conservative": ":"}[strategy]
            ax.plot(turns, avg, linestyle=linestyle, label=strategy, linewidth=2)
            ax.fill_between(turns, p10, p90, alpha=0.1)

        ax.set_title(meter_name, fontsize=12)
        ax.set_xlabel("Turn")
        ax.set_ylabel("%" if idx != 4 else "$M")
        ax.legend(fontsize=8)
        ax.grid(True, alpha=0.3)

        # Add stage transition markers
        for year_turn in [16, 32, 48]:
            ax.axvline(x=year_turn, color='gray', linestyle='--', alpha=0.3)

        # Climate tipping points
        if idx == 5:
            ax.axhline(y=70, color='orange', linestyle='--', alpha=0.5, label='Tipping 1')
            ax.axhline(y=85, color='red', linestyle='--', alpha=0.5, label='Tipping 2')

    plt.tight_layout()
    plt.savefig("/Users/annhoward/src/city_builder/simulations/sim1_meter_trajectories.png", dpi=150)
    plt.close()

    # Chart 2: Win/loss rates and stage progression
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    fig.suptitle("Game Outcomes by Strategy", fontsize=14)

    x = np.arange(len(strategies))
    width = 0.25

    # Win rates
    win_rates = [results[s]["win_rate"] for s in strategies]
    ax1.bar(x, win_rates, width=0.5, color=["#F44336", "#2196F3", "#4CAF50"])
    ax1.set_xticks(x)
    ax1.set_xticklabels(strategies)
    ax1.set_ylabel("Win Rate (%)")
    ax1.set_title("Survival Rate (64 turns)")
    ax1.set_ylim(0, 100)
    for i, v in enumerate(win_rates):
        ax1.text(i, v + 1, f"{v:.1f}%", ha='center', fontsize=11)

    # Stage distribution
    stage_names = ["Awakening", "Transition", "Restoration", "Beyond"]
    stage_colors = ["#FFCDD2", "#BBDEFB", "#C8E6C9", "#E1BEE7"]

    bottom = np.zeros(len(strategies))
    for stage_idx in range(4):
        vals = [results[s]["stage_dist"][stage_idx] for s in strategies]
        ax2.bar(x, vals, width=0.5, bottom=bottom, label=stage_names[stage_idx],
                color=stage_colors[stage_idx])
        bottom += vals

    ax2.set_xticks(x)
    ax2.set_xticklabels(strategies)
    ax2.set_ylabel("% of Games")
    ax2.set_title("Final Stage Distribution")
    ax2.legend()

    plt.tight_layout()
    plt.savefig("/Users/annhoward/src/city_builder/simulations/sim1_outcomes.png", dpi=150)
    plt.close()

    # --- Print Detailed Report ---
    print("\n" + "="*80)
    print("SIMULATION 1: METER DYNAMICS - DETAILED RESULTS")
    print("="*80)

    for strategy in strategies:
        r = results[strategy]
        print(f"\n--- {strategy.upper()} Strategy ---")
        print(f"  Survival rate: {r['win_rate']:.1f}%")
        print(f"  Final stage distribution: {r['stage_dist']}")

        avg_final = r['avg_history'][-1]
        print(f"  Average final meter values (turn 64):")
        for i, name in enumerate(meter_names):
            print(f"    {name}: {avg_final[i]:.1f}")

        print(f"  Stage transition timing:")
        st = r['avg_stage_turns']
        for s, sname in [(1, "Transition"), (2, "Restoration"), (3, "Beyond")]:
            if st[s] is not None:
                print(f"    -> {sname}: avg turn {st[s]:.1f} ({st[f'{s}_pct']:.1f}% of games)")
            else:
                print(f"    -> {sname}: NEVER REACHED")

        print(f"  Loss breakdown:")
        for reason, count in sorted(r['losses_by_reason'].items(), key=lambda x: -x[1]):
            print(f"    {reason}: {count} ({count/NUM_ITERATIONS*100:.1f}%)")

    # Summary JSON
    summary = {}
    for strategy in strategies:
        r = results[strategy]
        avg_final = r['avg_history'][-1]
        summary[strategy] = {
            "survival_rate": round(r['win_rate'], 1),
            "final_meters": {
                name: round(float(avg_final[i]), 1) for i, name in enumerate(meter_names)
            },
            "stage_distribution": {k: round(v, 1) for k, v in r['stage_dist'].items()},
            "stage_transition_turns": {
                str(s): round(float(r['avg_stage_turns'][s]), 1) if r['avg_stage_turns'][s] is not None else None
                for s in [1, 2, 3]
            },
            "pct_reaching_stage": {
                str(s): round(float(r['avg_stage_turns'][f'{s}_pct']), 1)
                for s in [1, 2, 3]
            }
        }

    with open("/Users/annhoward/src/city_builder/simulations/sim1_results.json", "w") as f:
        json.dump(summary, f, indent=2)

    print("\nResults saved to sim1_results.json")
    print("Charts saved to sim1_meter_trajectories.png and sim1_outcomes.png")


if __name__ == "__main__":
    run_simulations()
