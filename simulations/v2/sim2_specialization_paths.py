#!/usr/bin/env python3
"""
Simulation 2: Specialization Path Viability
Validates each of the 3 paths can reach stage milestones on time.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from game_engine import simulate_game, stage_num

NUM_ITERATIONS = 1000
PATHS = ['ecology', 'community', 'policy']
PATH_LABELS = {
    'ecology': 'Ecology-First',
    'community': 'Community-First',
    'policy': 'Policy-First',
}

OUT_DIR = os.path.dirname(__file__)


def run_simulations():
    results = {}

    for path in PATHS:
        print(f"  Running {path}...", flush=True)
        data = {
            'transition_turn': [],
            'restoration_turn': [],
            'beyond_turn': [],
            'reached_transition': 0,
            'reached_restoration': 0,
            'reached_beyond': 0,
            'transition_in_10_14': 0,
            'restoration_in_32_40': 0,
            'beyond_in_48_56': 0,
            'survived': 0,
            # Per-turn meter trajectories
            'turn_trust': np.zeros(64),
            'turn_eco': np.zeros(64),
            'turn_food': np.zeros(64),
            'turn_will': np.zeros(64),
            'turn_stage': np.zeros(64),
            'turn_tiles': np.zeros(64),
            # Strengths/weaknesses tracking
            'final_trust': [],
            'final_eco': [],
            'final_food': [],
            'final_will': [],
            'final_budget': [],
            'final_gentrif': [],
            'total_projects': [],
            'community_led': [],
            'policies_enacted': [],
        }

        for i in range(NUM_ITERATIONS):
            gs = simulate_game(path, seed=i * 2000 + PATHS.index(path))
            turns_played = len(gs.history['trust'])
            survived = turns_played >= 64 and len(gs.reelection_results) >= 4 and all(gs.reelection_results)

            if survived:
                data['survived'] += 1

            # Stage milestones
            stage_history = gs.history.get('stage_num', [])
            trans_turn = None
            rest_turn = None
            beyond_turn = None

            for t_idx, s in enumerate(stage_history):
                if s >= 1 and trans_turn is None:
                    trans_turn = t_idx + 1
                    data['reached_transition'] += 1
                if s >= 2 and rest_turn is None:
                    rest_turn = t_idx + 1
                    data['reached_restoration'] += 1
                if s >= 3 and beyond_turn is None:
                    beyond_turn = t_idx + 1
                    data['reached_beyond'] += 1

            if trans_turn:
                data['transition_turn'].append(trans_turn)
                if 10 <= trans_turn <= 14:
                    data['transition_in_10_14'] += 1
            if rest_turn:
                data['restoration_turn'].append(rest_turn)
                if 32 <= rest_turn <= 40:
                    data['restoration_in_32_40'] += 1
            if beyond_turn:
                data['beyond_turn'].append(beyond_turn)
                if 48 <= beyond_turn <= 56:
                    data['beyond_in_48_56'] += 1

            # Per-turn accumulation
            for t_idx in range(min(turns_played, 64)):
                data['turn_trust'][t_idx] += gs.history['trust'][t_idx]
                data['turn_eco'][t_idx] += gs.history['eco'][t_idx]
                data['turn_food'][t_idx] += gs.history['food'][t_idx]
                data['turn_will'][t_idx] += gs.history['will'][t_idx]
                data['turn_stage'][t_idx] += gs.history['stage_num'][t_idx]
                data['turn_tiles'][t_idx] += gs.history['tiles_transformed'][t_idx]

            # Final values
            data['final_trust'].append(gs.history['trust'][-1] if gs.history['trust'] else 0)
            data['final_eco'].append(gs.history['eco'][-1] if gs.history['eco'] else 0)
            data['final_food'].append(gs.history['food'][-1] if gs.history['food'] else 0)
            data['final_will'].append(gs.history['will'][-1] if gs.history['will'] else 0)
            data['final_budget'].append(gs.history['budget'][-1] if gs.history['budget'] else 0)
            data['final_gentrif'].append(gs.history['gentrif_avg'][-1] if gs.history['gentrif_avg'] else 0)
            data['total_projects'].append(gs.total_projects_completed)
            data['community_led'].append(gs.community_led_count)
            data['policies_enacted'].append(gs.policies_enacted_count)

        # Average per-turn
        for key in ['turn_trust', 'turn_eco', 'turn_food', 'turn_will', 'turn_stage', 'turn_tiles']:
            data[key] /= NUM_ITERATIONS

        results[path] = data

    return results


def generate_charts(results):
    turns = np.arange(1, 65)
    colors = {'ecology': '#2ecc71', 'community': '#3498db', 'policy': '#9b59b6'}

    # Chart 1: Stage progression comparison
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    fig.suptitle('V2 Simulation 2: Specialization Path Viability', fontsize=14, fontweight='bold')

    # Stage over time
    ax = axes[0][0]
    for path in PATHS:
        ax.plot(turns, results[path]['turn_stage'], label=PATH_LABELS[path],
                color=colors[path], linewidth=2)
    ax.set_xlabel('Turn')
    ax.set_ylabel('Avg Stage')
    ax.set_yticks([0, 1, 2, 3])
    ax.set_yticklabels(['Awakening', 'Transition', 'Restoration', 'Beyond'])
    ax.set_title('Average Stage Progression')
    ax.legend()
    ax.grid(True, alpha=0.3)
    # Target windows
    ax.axvspan(10, 14, alpha=0.1, color='yellow', label='Transition target')
    ax.axvspan(32, 40, alpha=0.1, color='green')
    ax.axvspan(48, 56, alpha=0.1, color='blue')

    # Transition timing histogram
    ax = axes[0][1]
    for path in PATHS:
        if results[path]['transition_turn']:
            ax.hist(results[path]['transition_turn'], bins=range(1, 30),
                    alpha=0.5, label=PATH_LABELS[path], color=colors[path])
    ax.axvspan(10, 14, alpha=0.2, color='yellow', label='Target (10-14)')
    ax.set_xlabel('Turn')
    ax.set_ylabel('Count')
    ax.set_title('Transition Timing Distribution')
    ax.legend(fontsize=8)

    # Restoration timing histogram
    ax = axes[1][0]
    for path in PATHS:
        if results[path]['restoration_turn']:
            ax.hist(results[path]['restoration_turn'], bins=range(10, 65),
                    alpha=0.5, label=PATH_LABELS[path], color=colors[path])
    ax.axvspan(32, 40, alpha=0.2, color='green', label='Target (32-40)')
    ax.set_xlabel('Turn')
    ax.set_ylabel('Count')
    ax.set_title('Restoration Timing Distribution')
    ax.legend(fontsize=8)

    # Achievement rates
    ax = axes[1][1]
    x = np.arange(3)
    w = 0.25
    for pi, path in enumerate(PATHS):
        vals = [
            results[path]['transition_in_10_14'] / NUM_ITERATIONS * 100,
            results[path]['restoration_in_32_40'] / NUM_ITERATIONS * 100,
            results[path]['beyond_in_48_56'] / NUM_ITERATIONS * 100,
        ]
        bars = ax.bar(x + pi * w, vals, w, label=PATH_LABELS[path], color=colors[path])
        for bar, val in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                    f'{val:.0f}%', ha='center', fontsize=8)
    ax.set_ylabel('% in Target Window')
    ax.set_title('% Reaching Stage in Target Window')
    ax.set_xticks(x + w)
    ax.set_xticklabels(['Trans (10-14)', 'Rest (32-40)', 'Beyond (48-56)'])
    ax.legend()
    ax.set_ylim(0, 105)

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, 'sim2_path_viability.png'), dpi=150)
    plt.close()

    # Chart 2: Path strengths and weaknesses (radar-like comparison)
    fig, axes = plt.subplots(1, 3, figsize=(16, 5))
    fig.suptitle('V2 Simulation 2: Path Strengths & Weaknesses', fontsize=14, fontweight='bold')

    for pi, path in enumerate(PATHS):
        ax = axes[pi]
        d = results[path]
        # Meter trajectories for this path
        ax.plot(turns, d['turn_trust'], label='Trust', color='#3498db')
        ax.plot(turns, d['turn_eco'], label='Eco', color='#2ecc71')
        ax.plot(turns, d['turn_food'], label='Food', color='#e67e22')
        ax.plot(turns, d['turn_will'], label='Will', color='#9b59b6')
        ax.set_xlabel('Turn')
        ax.set_ylabel('Meter Value (%)')
        ax.set_title(f'{PATH_LABELS[path]} Path')
        ax.set_ylim(0, 100)
        ax.legend(fontsize=7)
        ax.grid(True, alpha=0.3)
        for t in [16, 32, 48, 64]:
            ax.axvline(x=t, color='gray', linestyle='--', alpha=0.3)

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, 'sim2_path_meters.png'), dpi=150)
    plt.close()


def save_results(results):
    output = {}
    for path in PATHS:
        d = results[path]
        output[path] = {
            'survival_rate': d['survived'] / NUM_ITERATIONS,
            'reached_transition_pct': d['reached_transition'] / NUM_ITERATIONS,
            'reached_restoration_pct': d['reached_restoration'] / NUM_ITERATIONS,
            'reached_beyond_pct': d['reached_beyond'] / NUM_ITERATIONS,
            'transition_in_target_pct': d['transition_in_10_14'] / NUM_ITERATIONS,
            'restoration_in_target_pct': d['restoration_in_32_40'] / NUM_ITERATIONS,
            'beyond_in_target_pct': d['beyond_in_48_56'] / NUM_ITERATIONS,
            'avg_transition_turn': float(np.mean(d['transition_turn'])) if d['transition_turn'] else None,
            'avg_restoration_turn': float(np.mean(d['restoration_turn'])) if d['restoration_turn'] else None,
            'avg_beyond_turn': float(np.mean(d['beyond_turn'])) if d['beyond_turn'] else None,
            'final_trust_mean': float(np.mean(d['final_trust'])),
            'final_eco_mean': float(np.mean(d['final_eco'])),
            'final_food_mean': float(np.mean(d['final_food'])),
            'final_will_mean': float(np.mean(d['final_will'])),
            'final_budget_mean': float(np.mean(d['final_budget'])),
            'avg_projects': float(np.mean(d['total_projects'])),
            'avg_community_led': float(np.mean(d['community_led'])),
            'avg_policies': float(np.mean(d['policies_enacted'])),
        }

    with open(os.path.join(OUT_DIR, 'sim2_results.json'), 'w') as f:
        json.dump(output, f, indent=2)


if __name__ == '__main__':
    print("Simulation 2: Specialization Path Viability (3 paths x 1000 iterations)")
    results = run_simulations()
    print("Generating charts...")
    generate_charts(results)
    print("Saving results...")
    save_results(results)
    print("Done!")

    print("\n=== SUMMARY ===")
    for path in PATHS:
        d = results[path]
        print(f"\n{PATH_LABELS[path]}:")
        print(f"  Survival: {d['survived']/NUM_ITERATIONS*100:.1f}%")
        trans_turn = f"{np.mean(d['transition_turn']):.1f}" if d['transition_turn'] else 'N/A'
        rest_turn = f"{np.mean(d['restoration_turn']):.1f}" if d['restoration_turn'] else 'N/A'
        beyond_turn = f"{np.mean(d['beyond_turn']):.1f}" if d['beyond_turn'] else 'N/A'
        print(f"  Reached Transition: {d['reached_transition']/NUM_ITERATIONS*100:.1f}% (avg turn {trans_turn})")
        print(f"    In target (10-14): {d['transition_in_10_14']/NUM_ITERATIONS*100:.1f}%")
        print(f"  Reached Restoration: {d['reached_restoration']/NUM_ITERATIONS*100:.1f}% (avg turn {rest_turn})")
        print(f"    In target (32-40): {d['restoration_in_32_40']/NUM_ITERATIONS*100:.1f}%")
        print(f"  Reached Beyond: {d['reached_beyond']/NUM_ITERATIONS*100:.1f}% (avg turn {beyond_turn})")
        print(f"    In target (48-56): {d['beyond_in_48_56']/NUM_ITERATIONS*100:.1f}%")
        print(f"  Final: Trust={np.mean(d['final_trust']):.1f}% Eco={np.mean(d['final_eco']):.1f}% Food={np.mean(d['final_food']):.1f}% Will={np.mean(d['final_will']):.1f}%")
