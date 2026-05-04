"""
Simulation 3: Climate Pressure Race
Model the race between climate pressure (always rising) and player adaptation.
Find the point of no return, minimum adaptation pace, and tipping point timing.
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from dataclasses import dataclass
from typing import Dict, List, Tuple
import json

np.random.seed(42)

NUM_ITERATIONS = 1000
TOTAL_TURNS = 64

# Climate parameters from spec
BASE_CLIMATE_RISE = 0.8    # per turn
ACCELERATION_PER_YEAR = 0.03  # 3% faster per year
SUMMER_BONUS = 0.3

# Tipping points
TIPPING_1 = 70  # Growing season reduction
TIPPING_2 = 85  # Severe ongoing damage

# Adaptation: each completed ecology project provides ongoing damage reduction
# Modeled as effective_damage = base_damage * (1 - adaptation_level)
# where adaptation_level comes from completed projects


@dataclass
class ClimateState:
    climate: float = 30.0
    eco: float = 15.0
    trust: float = 50.0
    food: float = 10.0
    budget: float = 4.2
    adaptation_level: float = 0.0  # 0 to 1, how much damage is mitigated
    projects_completed: int = 0
    tipping1_turn: int = -1
    tipping2_turn: int = -1
    unwinnable_turn: int = -1  # turn when game becomes unwinnable
    alive: bool = True


def climate_rise_per_turn(turn: int) -> float:
    """Calculate how much climate rises this turn."""
    year = turn // 4
    season = ["Spring", "Summer", "Fall", "Winter"][turn % 4]
    base = BASE_CLIMATE_RISE * (1.0 + year * ACCELERATION_PER_YEAR)
    seasonal = SUMMER_BONUS if season == "Summer" else 0.0
    return base + seasonal


def climate_damage(climate: float, season_idx: int) -> Tuple[float, float, float]:
    """Calculate damage from climate events.
    Returns (eco_damage, food_damage, trust_damage)"""
    # Event probability scales with pressure
    event_prob = min(0.9, 0.1 + climate / 100 * 0.7)

    if np.random.random() > event_prob:
        return (0, 0, 0)

    severity = 0.3 + (climate / 100) * 0.7

    season = ["Spring", "Summer", "Fall", "Winter"][season_idx]
    if season == "Summer":
        return (severity * 1, severity * 1, severity * 3)
    elif season == "Spring":
        return (severity * 2, severity * 2, severity * 1)
    elif season == "Fall":
        return (severity * 2, severity * 1, severity * 2)
    else:
        return (severity * 0.5, severity * 0.5, severity * 2)


def simulate_climate_race(adaptation_pace: str, adaptation_start: int = 0) -> Dict:
    """
    adaptation_pace: 'none', 'slow', 'medium', 'fast', 'optimal'
    adaptation_start: turn at which adaptation efforts begin
    """
    state = ClimateState()

    climate_history = []
    eco_history = []
    adaptation_history = []
    damage_history = []

    # Adaptation rates per turn once started
    adaptation_rates = {
        "none": 0.0,
        "slow": 0.005,    # ~0.5% per turn
        "medium": 0.012,  # ~1.2% per turn
        "fast": 0.02,     # ~2% per turn
        "optimal": 0.03,  # ~3% per turn
    }

    eco_gain_rates = {
        "none": 0.0,
        "slow": 0.5,
        "medium": 1.2,
        "fast": 2.0,
        "optimal": 3.0,
    }

    rate = adaptation_rates[adaptation_pace]
    eco_rate = eco_gain_rates[adaptation_pace]

    for t in range(TOTAL_TURNS):
        season_idx = t % 4

        # Climate always rises
        rise = climate_rise_per_turn(t)
        state.climate += rise
        state.climate = min(100, state.climate)

        # Tipping point tracking
        if state.climate >= TIPPING_1 and state.tipping1_turn == -1:
            state.tipping1_turn = t
        if state.climate >= TIPPING_2 and state.tipping2_turn == -1:
            state.tipping2_turn = t

        # Tipping point effects
        tipping_eco_drain = 0
        tipping_food_drain = 0
        if state.climate >= TIPPING_2:
            tipping_eco_drain = 1.5
            tipping_food_drain = 1.0
        elif state.climate >= TIPPING_1:
            tipping_eco_drain = 0.5
            tipping_food_drain = 0.5

        # Climate event damage
        eco_dmg, food_dmg, trust_dmg = climate_damage(state.climate, season_idx)

        # Adaptation reduces damage
        effective_reduction = state.adaptation_level
        eco_dmg *= (1 - effective_reduction)
        food_dmg *= (1 - effective_reduction)
        trust_dmg *= (1 - effective_reduction)

        state.eco -= eco_dmg + tipping_eco_drain
        state.food -= food_dmg + tipping_food_drain
        state.trust -= trust_dmg

        # Player adaptation efforts
        if t >= adaptation_start:
            state.adaptation_level = min(0.7, state.adaptation_level + rate)  # Cap at 70% reduction
            state.eco += eco_rate

            # Spring ecology bonus
            if season_idx == 0:
                state.eco += eco_rate * 0.3

        # Annual budget
        if t > 0 and t % 4 == 0:
            state.budget += 2.5

        # Clamp
        state.eco = np.clip(state.eco, 0, 100)
        state.food = np.clip(state.food, 0, 100)
        state.trust = np.clip(state.trust, 0, 100)

        # Check if game is unwinnable
        # Unwinnable = eco below 0 and climate above tipping 2 with no way to recover
        if state.eco <= 5 and state.climate >= 85 and state.unwinnable_turn == -1:
            state.unwinnable_turn = t

        total_dmg = eco_dmg + food_dmg + trust_dmg
        climate_history.append(state.climate)
        eco_history.append(state.eco)
        adaptation_history.append(state.adaptation_level)
        damage_history.append(total_dmg)

    return {
        "climate_history": climate_history,
        "eco_history": eco_history,
        "adaptation_history": adaptation_history,
        "damage_history": damage_history,
        "tipping1_turn": state.tipping1_turn,
        "tipping2_turn": state.tipping2_turn,
        "unwinnable_turn": state.unwinnable_turn,
        "final_climate": state.climate,
        "final_eco": state.eco,
    }


def run_analysis():
    print("="*80)
    print("SIMULATION 3: CLIMATE PRESSURE RACE")
    print("="*80)

    # --- Part 1: Pure climate rise (no adaptation) ---
    print("\n--- Part 1: Climate Rise Without Adaptation ---")
    climate_no_adapt = []
    for _ in range(100):
        result = simulate_climate_race("none")
        climate_no_adapt.append(result)

    avg_tipping1 = np.mean([r["tipping1_turn"] for r in climate_no_adapt if r["tipping1_turn"] >= 0])
    avg_tipping2 = np.mean([r["tipping2_turn"] for r in climate_no_adapt if r["tipping2_turn"] >= 0])
    pct_tipping1 = sum(1 for r in climate_no_adapt if r["tipping1_turn"] >= 0) / len(climate_no_adapt) * 100
    pct_tipping2 = sum(1 for r in climate_no_adapt if r["tipping2_turn"] >= 0) / len(climate_no_adapt) * 100

    print(f"  Climate starts at 30%, rises every turn")
    print(f"  Tipping Point 1 (70%): avg turn {avg_tipping1:.1f} ({pct_tipping1:.0f}% of games)")
    print(f"  Tipping Point 2 (85%): avg turn {avg_tipping2:.1f} ({pct_tipping2:.0f}% of games)")

    # --- Part 2: Different adaptation paces ---
    print("\n--- Part 2: Different Adaptation Paces ---")
    paces = ["none", "slow", "medium", "fast", "optimal"]
    pace_results = {}

    for pace in paces:
        print(f"\n  Adaptation pace: {pace}")
        iter_results = []
        for _ in range(NUM_ITERATIONS):
            result = simulate_climate_race(pace)
            iter_results.append(result)

        avg_final_eco = np.mean([r["final_eco"] for r in iter_results])
        avg_final_climate = np.mean([r["final_climate"] for r in iter_results])
        pct_unwinnable = sum(1 for r in iter_results if r["unwinnable_turn"] >= 0) / NUM_ITERATIONS * 100
        avg_unwinnable = np.mean([r["unwinnable_turn"] for r in iter_results if r["unwinnable_turn"] >= 0]) if pct_unwinnable > 0 else -1

        avg_eco_history = np.mean([r["eco_history"] for r in iter_results], axis=0)
        avg_climate_history = np.mean([r["climate_history"] for r in iter_results], axis=0)
        avg_adapt_history = np.mean([r["adaptation_history"] for r in iter_results], axis=0)

        pace_results[pace] = {
            "avg_final_eco": avg_final_eco,
            "avg_final_climate": avg_final_climate,
            "pct_unwinnable": pct_unwinnable,
            "avg_unwinnable_turn": avg_unwinnable,
            "avg_eco_history": avg_eco_history,
            "avg_climate_history": avg_climate_history,
            "avg_adapt_history": avg_adapt_history,
        }

        print(f"    Final eco: {avg_final_eco:.1f}%")
        print(f"    Final climate: {avg_final_climate:.1f}%")
        print(f"    % games become unwinnable: {pct_unwinnable:.1f}%")
        if avg_unwinnable >= 0:
            print(f"    Avg unwinnable turn: {avg_unwinnable:.1f}")

    # --- Part 3: Delayed adaptation start ---
    print("\n--- Part 3: Effect of Delayed Adaptation (medium pace) ---")
    delay_results = {}
    for delay in [0, 4, 8, 12, 16, 24, 32]:
        iter_results = []
        for _ in range(NUM_ITERATIONS):
            result = simulate_climate_race("medium", adaptation_start=delay)
            iter_results.append(result)

        avg_final_eco = np.mean([r["final_eco"] for r in iter_results])
        pct_unwinnable = sum(1 for r in iter_results if r["unwinnable_turn"] >= 0) / NUM_ITERATIONS * 100

        delay_results[delay] = {
            "avg_final_eco": avg_final_eco,
            "pct_unwinnable": pct_unwinnable,
        }

        print(f"  Start at turn {delay}: final eco {avg_final_eco:.1f}%, unwinnable {pct_unwinnable:.1f}%")

    # --- Charts ---
    turns = np.arange(TOTAL_TURNS)

    # Chart 1: Climate vs Eco for different adaptation paces
    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    fig.suptitle("Climate Pressure Race: Adaptation Paces", fontsize=14)

    colors = {"none": "#F44336", "slow": "#FF9800", "medium": "#FFEB3B",
              "fast": "#4CAF50", "optimal": "#2196F3"}

    for pace in paces:
        r = pace_results[pace]
        axes[0].plot(turns, r["avg_climate_history"], label=f"{pace}", color=colors[pace], linewidth=2)
        axes[1].plot(turns, r["avg_eco_history"], label=f"{pace}", color=colors[pace], linewidth=2)

    axes[0].axhline(y=70, color='orange', linestyle='--', alpha=0.7, label='Tipping 1 (70%)')
    axes[0].axhline(y=85, color='red', linestyle='--', alpha=0.7, label='Tipping 2 (85%)')
    axes[0].set_title("Climate Pressure Over Time")
    axes[0].set_xlabel("Turn")
    axes[0].set_ylabel("Climate Pressure (%)")
    axes[0].legend(fontsize=8)
    axes[0].grid(True, alpha=0.3)

    axes[1].axhline(y=30, color='blue', linestyle=':', alpha=0.5, label='Transition req (30%)')
    axes[1].axhline(y=60, color='green', linestyle=':', alpha=0.5, label='Restoration req (60%)')
    axes[1].axhline(y=85, color='purple', linestyle=':', alpha=0.5, label='Beyond req (85%)')
    axes[1].set_title("Ecological Health Over Time")
    axes[1].set_xlabel("Turn")
    axes[1].set_ylabel("Ecological Health (%)")
    axes[1].legend(fontsize=8)
    axes[1].grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig("/Users/annhoward/src/city_builder/simulations/sim3_climate_race.png", dpi=150)
    plt.close()

    # Chart 2: Delayed adaptation impact
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    fig.suptitle("Impact of Delayed Adaptation (Medium Pace)", fontsize=14)

    delays = sorted(delay_results.keys())
    eco_vals = [delay_results[d]["avg_final_eco"] for d in delays]
    unwin_vals = [delay_results[d]["pct_unwinnable"] for d in delays]

    ax1.bar(range(len(delays)), eco_vals, color="#4CAF50")
    ax1.set_xticks(range(len(delays)))
    ax1.set_xticklabels([f"T{d}" for d in delays])
    ax1.set_xlabel("Adaptation Start Turn")
    ax1.set_ylabel("Final Eco Health (%)")
    ax1.set_title("Final Ecological Health by Start Turn")
    ax1.grid(True, alpha=0.3, axis='y')

    ax2.bar(range(len(delays)), unwin_vals, color="#F44336")
    ax2.set_xticks(range(len(delays)))
    ax2.set_xticklabels([f"T{d}" for d in delays])
    ax2.set_xlabel("Adaptation Start Turn")
    ax2.set_ylabel("% Games Unwinnable")
    ax2.set_title("% Games Becoming Unwinnable by Start Turn")
    ax2.grid(True, alpha=0.3, axis='y')

    plt.tight_layout()
    plt.savefig("/Users/annhoward/src/city_builder/simulations/sim3_delayed_adaptation.png", dpi=150)
    plt.close()

    # Chart 3: Point of no return analysis
    fig, ax = plt.subplots(figsize=(12, 6))
    fig.suptitle("Climate Pressure: Pure Rise Trajectory (No Adaptation)", fontsize=14)

    # Show the pure climate rise curve
    avg_climate_none = pace_results["none"]["avg_climate_history"]
    ax.plot(turns, avg_climate_none, color="red", linewidth=3, label="Climate Pressure")

    ax.axhline(y=70, color='orange', linestyle='--', linewidth=2, label=f'Tipping 1 (70%) ~ Turn {avg_tipping1:.0f}')
    ax.axhline(y=85, color='darkred', linestyle='--', linewidth=2, label=f'Tipping 2 (85%) ~ Turn {avg_tipping2:.0f}')

    ax.fill_between(turns, 0, avg_climate_none, alpha=0.1, color='red')
    ax.set_xlabel("Turn (4 turns = 1 year)")
    ax.set_ylabel("Climate Pressure (%)")
    ax.legend(fontsize=10)
    ax.grid(True, alpha=0.3)

    # Add year markers
    for year in range(0, 17, 4):
        turn = year * 4
        if turn < TOTAL_TURNS:
            ax.axvline(x=turn, color='gray', linestyle=':', alpha=0.3)
            ax.annotate(f"Year {year}", xy=(turn, 5), fontsize=8, color='gray')

    plt.tight_layout()
    plt.savefig("/Users/annhoward/src/city_builder/simulations/sim3_pure_climate_rise.png", dpi=150)
    plt.close()

    # --- Summary ---
    print("\n" + "="*80)
    print("SIMULATION 3: CLIMATE RACE - KEY FINDINGS")
    print("="*80)

    print(f"\n1. TIPPING POINT TIMING (without adaptation):")
    print(f"   Tipping 1 (70%): Turn {avg_tipping1:.0f} = Year {avg_tipping1/4:.0f} (Season {int(avg_tipping1)%4})")
    print(f"   Tipping 2 (85%): Turn {avg_tipping2:.0f} = Year {avg_tipping2/4:.0f} (Season {int(avg_tipping2)%4})")

    print(f"\n2. MINIMUM ADAPTATION PACE:")
    for pace in paces:
        r = pace_results[pace]
        viable = "VIABLE" if r["pct_unwinnable"] < 20 else "RISKY" if r["pct_unwinnable"] < 50 else "NOT VIABLE"
        print(f"   {pace:>8}: {viable} (unwinnable in {r['pct_unwinnable']:.1f}% of games, final eco {r['avg_final_eco']:.1f}%)")

    print(f"\n3. POINT OF NO RETURN:")
    for delay, dr in delay_results.items():
        if dr["pct_unwinnable"] > 50:
            print(f"   If adaptation starts after turn {delay}, >50% of games become unwinnable")
            break
    else:
        print(f"   Even starting at turn 32, games remain winnable with medium adaptation")

    # Save JSON
    summary = {
        "tipping_point_1_avg_turn": round(avg_tipping1, 1),
        "tipping_point_2_avg_turn": round(avg_tipping2, 1),
        "adaptation_viability": {
            pace: {
                "pct_unwinnable": round(pace_results[pace]["pct_unwinnable"], 1),
                "final_eco": round(pace_results[pace]["avg_final_eco"], 1),
                "final_climate": round(pace_results[pace]["avg_final_climate"], 1),
            } for pace in paces
        },
        "delayed_adaptation": {
            str(d): {
                "final_eco": round(dr["avg_final_eco"], 1),
                "pct_unwinnable": round(dr["pct_unwinnable"], 1),
            } for d, dr in delay_results.items()
        },
    }

    with open("/Users/annhoward/src/city_builder/simulations/sim3_results.json", "w") as f:
        json.dump(summary, f, indent=2)

    print("\nResults saved to sim3_results.json")


if __name__ == "__main__":
    run_analysis()
