#!/usr/bin/env python3
"""
Simulation 1: Full Game Playthrough
1000 iterations x 6 strategies, tracking all systems.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from game_engine import simulate_game, stage_num, tiles_at_visual, avg_gentrification

NUM_ITERATIONS = 1000
STRATEGIES = ['ecology', 'community', 'policy', 'balanced', 'aggressive_growth', 'pure_degrowth']
STRATEGY_LABELS = {
    'ecology': 'Ecology-First',
    'community': 'Community-First',
    'policy': 'Policy-First',
    'balanced': 'Balanced',
    'aggressive_growth': 'Aggressive Growth',
    'pure_degrowth': 'Pure De-growth',
}

OUT_DIR = os.path.dirname(__file__)


def run_simulations():
    results = {}

    for strat in STRATEGIES:
        print(f"  Running {strat}...", flush=True)
        strat_data = {
            'survived': 0,
            'final_trust': [],
            'final_eco': [],
            'final_food': [],
            'final_will': [],
            'final_budget': [],
            'final_climate': [],
            'final_gentrif': [],
            'final_stage': [],
            'reached_transition': 0,
            'reached_restoration': 0,
            'reached_beyond': 0,
            'turn_to_transition': [],
            'turn_to_restoration': [],
            'turn_to_beyond': [],
            'total_projects': [],
            'total_policies': [],
            'tiles_transformed': [],
            'reelection_1_pass': 0,
            'reelection_2_pass': 0,
            'reelection_3_pass': 0,
            'reelection_4_pass': 0,
            'leader_trust_avg': [],
            'council_disp_avg': [],
            'tiles_displaced': [],
            'growth_count': [],
            'degrowth_count': [],
            'community_led': [],
            'player_initiated': [],
            'antagonist_levels': [],
            # Per-turn averages (accumulated)
            'turn_trust': np.zeros(64),
            'turn_eco': np.zeros(64),
            'turn_food': np.zeros(64),
            'turn_will': np.zeros(64),
            'turn_budget': np.zeros(64),
            'turn_climate': np.zeros(64),
            'turn_gentrif': np.zeros(64),
            'turn_tiles': np.zeros(64),
            'turn_stage': np.zeros(64),
            'turn_leader_trust': np.zeros(64),
            'turn_council_disp': np.zeros(64),
        }

        for i in range(NUM_ITERATIONS):
            gs = simulate_game(strat, seed=i * 1000 + STRATEGIES.index(strat))

            turns_played = len(gs.history['trust'])
            survived = turns_played >= 64 and len(gs.reelection_results) >= 4 and all(gs.reelection_results)

            if survived:
                strat_data['survived'] += 1

            # Final values (at last turn played)
            strat_data['final_trust'].append(gs.history['trust'][-1] if gs.history['trust'] else 0)
            strat_data['final_eco'].append(gs.history['eco'][-1] if gs.history['eco'] else 0)
            strat_data['final_food'].append(gs.history['food'][-1] if gs.history['food'] else 0)
            strat_data['final_will'].append(gs.history['will'][-1] if gs.history['will'] else 0)
            strat_data['final_budget'].append(gs.history['budget'][-1] if gs.history['budget'] else 0)
            strat_data['final_climate'].append(gs.history['climate'][-1] if gs.history['climate'] else 0)
            strat_data['final_gentrif'].append(gs.history['gentrif_avg'][-1] if gs.history['gentrif_avg'] else 0)
            strat_data['final_stage'].append(stage_num(gs.stage))

            strat_data['total_projects'].append(gs.total_projects_completed)
            strat_data['total_policies'].append(gs.policies_enacted_count)
            strat_data['tiles_transformed'].append(tiles_at_visual(gs.tiles, 'transition'))
            strat_data['tiles_displaced'].append(gs.tiles_displaced)
            strat_data['growth_count'].append(gs.growth_count)
            strat_data['degrowth_count'].append(gs.degrowth_count)
            strat_data['community_led'].append(gs.community_led_count)
            strat_data['player_initiated'].append(gs.player_initiated_count)

            avg_ant = sum(gs.antagonist_levels.values()) / max(1, len(gs.antagonist_levels))
            strat_data['antagonist_levels'].append(avg_ant)

            # Stage milestones
            stage_history = gs.history['stage_num']
            for t_idx, s in enumerate(stage_history):
                if s >= 1:
                    strat_data['turn_to_transition'].append(t_idx + 1)
                    strat_data['reached_transition'] += 1
                    break

            for t_idx, s in enumerate(stage_history):
                if s >= 2:
                    strat_data['turn_to_restoration'].append(t_idx + 1)
                    strat_data['reached_restoration'] += 1
                    break

            for t_idx, s in enumerate(stage_history):
                if s >= 3:
                    strat_data['turn_to_beyond'].append(t_idx + 1)
                    strat_data['reached_beyond'] += 1
                    break

            # Re-election pass rates
            if len(gs.reelection_results) >= 1 and gs.reelection_results[0]:
                strat_data['reelection_1_pass'] += 1
            if len(gs.reelection_results) >= 2 and gs.reelection_results[1]:
                strat_data['reelection_2_pass'] += 1
            if len(gs.reelection_results) >= 3 and gs.reelection_results[2]:
                strat_data['reelection_3_pass'] += 1
            if len(gs.reelection_results) >= 4 and gs.reelection_results[3]:
                strat_data['reelection_4_pass'] += 1

            strat_data['leader_trust_avg'].append(
                sum(gs.leader_trusts) / len(gs.leader_trusts) if gs.leader_trusts else 0)
            strat_data['council_disp_avg'].append(
                sum(gs.council_dispositions) / len(gs.council_dispositions))

            # Per-turn accumulation
            for t_idx in range(min(turns_played, 64)):
                strat_data['turn_trust'][t_idx] += gs.history['trust'][t_idx]
                strat_data['turn_eco'][t_idx] += gs.history['eco'][t_idx]
                strat_data['turn_food'][t_idx] += gs.history['food'][t_idx]
                strat_data['turn_will'][t_idx] += gs.history['will'][t_idx]
                strat_data['turn_budget'][t_idx] += gs.history['budget'][t_idx]
                strat_data['turn_climate'][t_idx] += gs.history['climate'][t_idx]
                strat_data['turn_gentrif'][t_idx] += gs.history['gentrif_avg'][t_idx]
                strat_data['turn_tiles'][t_idx] += gs.history['tiles_transformed'][t_idx]
                strat_data['turn_stage'][t_idx] += gs.history['stage_num'][t_idx]
                strat_data['turn_leader_trust'][t_idx] += gs.history['leader_trust_avg'][t_idx]
                strat_data['turn_council_disp'][t_idx] += gs.history['council_disp_avg'][t_idx]

        # Average per-turn data
        for key in ['turn_trust', 'turn_eco', 'turn_food', 'turn_will', 'turn_budget',
                    'turn_climate', 'turn_gentrif', 'turn_tiles', 'turn_stage',
                    'turn_leader_trust', 'turn_council_disp']:
            strat_data[key] /= NUM_ITERATIONS

        results[strat] = strat_data

    return results


def generate_charts(results):
    turns = np.arange(1, 65)

    # Chart 1: Meter trajectories (6 subplots)
    fig, axes = plt.subplots(3, 2, figsize=(16, 18))
    fig.suptitle('V2 Simulation 1: Meter Trajectories by Strategy (1000 iterations avg)', fontsize=14, fontweight='bold')

    meters = [
        ('turn_trust', 'Community Trust (%)', 0, 100),
        ('turn_eco', 'Ecological Health (%)', 0, 100),
        ('turn_food', 'Food Sovereignty (%)', 0, 100),
        ('turn_will', 'Political Will (%)', 0, 100),
        ('turn_budget', 'Budget ($M)', 0, None),
        ('turn_climate', 'Climate Pressure (%)', 0, 100),
    ]

    for idx, (key, label, ymin, ymax) in enumerate(meters):
        ax = axes[idx // 2][idx % 2]
        for strat in STRATEGIES:
            ax.plot(turns, results[strat][key], label=STRATEGY_LABELS[strat], linewidth=1.5)
        ax.set_xlabel('Turn')
        ax.set_ylabel(label)
        ax.set_title(label)
        if ymax:
            ax.set_ylim(ymin, ymax)
        ax.legend(fontsize=7)
        ax.grid(True, alpha=0.3)
        # Mark re-election turns
        for t in [16, 32, 48, 64]:
            ax.axvline(x=t, color='gray', linestyle='--', alpha=0.3)

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, 'sim1_meter_trajectories.png'), dpi=150)
    plt.close()

    # Chart 2: Outcomes summary
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    fig.suptitle('V2 Simulation 1: Game Outcomes by Strategy', fontsize=14, fontweight='bold')

    # Survival rates
    ax = axes[0][0]
    strats = list(STRATEGY_LABELS.values())
    survival = [results[s]['survived'] / NUM_ITERATIONS * 100 for s in STRATEGIES]
    colors = ['#2ecc71', '#3498db', '#9b59b6', '#f39c12', '#e74c3c', '#1abc9c']
    bars = ax.bar(strats, survival, color=colors)
    ax.set_ylabel('Survival Rate (%)')
    ax.set_title('Full Game Survival Rate (all 4 re-elections passed)')
    ax.set_ylim(0, 105)
    for bar, val in zip(bars, survival):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                f'{val:.1f}%', ha='center', fontsize=9)
    ax.tick_params(axis='x', rotation=20)

    # Stage progression
    ax = axes[0][1]
    x = np.arange(len(STRATEGIES))
    w = 0.2
    trans = [results[s]['reached_transition'] / NUM_ITERATIONS * 100 for s in STRATEGIES]
    rest = [results[s]['reached_restoration'] / NUM_ITERATIONS * 100 for s in STRATEGIES]
    beyond = [results[s]['reached_beyond'] / NUM_ITERATIONS * 100 for s in STRATEGIES]
    ax.bar(x - w, trans, w, label='Transition', color='#f1c40f')
    ax.bar(x, rest, w, label='Restoration', color='#2ecc71')
    ax.bar(x + w, beyond, w, label='Beyond the Map', color='#3498db')
    ax.set_ylabel('% of runs reaching stage')
    ax.set_title('Stage Progression')
    ax.set_xticks(x)
    ax.set_xticklabels([STRATEGY_LABELS[s] for s in STRATEGIES], fontsize=8, rotation=20)
    ax.legend()
    ax.set_ylim(0, 105)

    # Re-election pass rates
    ax = axes[1][0]
    for si, strat in enumerate(STRATEGIES):
        rates = [
            results[strat]['reelection_1_pass'] / NUM_ITERATIONS * 100,
            results[strat]['reelection_2_pass'] / NUM_ITERATIONS * 100,
            results[strat]['reelection_3_pass'] / NUM_ITERATIONS * 100,
            results[strat]['reelection_4_pass'] / NUM_ITERATIONS * 100,
        ]
        ax.plot([1, 2, 3, 4], rates, 'o-', label=STRATEGY_LABELS[strat], color=colors[si])
    ax.set_xlabel('Re-election #')
    ax.set_ylabel('Pass Rate (%)')
    ax.set_title('Re-election Pass Rates')
    ax.legend(fontsize=7)
    ax.set_ylim(0, 105)
    ax.set_xticks([1, 2, 3, 4])

    # Final meter averages
    ax = axes[1][1]
    meter_names = ['Trust', 'Eco', 'Food', 'Will', 'Climate']
    x = np.arange(len(meter_names))
    w = 0.12
    for si, strat in enumerate(STRATEGIES):
        vals = [
            np.mean(results[strat]['final_trust']),
            np.mean(results[strat]['final_eco']),
            np.mean(results[strat]['final_food']),
            np.mean(results[strat]['final_will']),
            np.mean(results[strat]['final_climate']),
        ]
        ax.bar(x + si * w, vals, w, label=STRATEGY_LABELS[strat], color=colors[si])
    ax.set_ylabel('Final Value (%)')
    ax.set_title('Final Meter Averages')
    ax.set_xticks(x + w * 2.5)
    ax.set_xticklabels(meter_names)
    ax.legend(fontsize=7)
    ax.set_ylim(0, 100)

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, 'sim1_outcomes.png'), dpi=150)
    plt.close()

    # Chart 3: Gentrification & Character System
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    fig.suptitle('V2 Simulation 1: Characters & Gentrification', fontsize=14, fontweight='bold')

    # Gentrification
    ax = axes[0][0]
    for si, strat in enumerate(STRATEGIES):
        ax.plot(turns, results[strat]['turn_gentrif'], label=STRATEGY_LABELS[strat], color=colors[si])
    ax.set_xlabel('Turn')
    ax.set_ylabel('Avg Gentrification Pressure (%)')
    ax.set_title('Average Gentrification Pressure Over Time')
    ax.legend(fontsize=7)
    ax.grid(True, alpha=0.3)

    # Leader trust
    ax = axes[0][1]
    for si, strat in enumerate(STRATEGIES):
        ax.plot(turns, results[strat]['turn_leader_trust'], label=STRATEGY_LABELS[strat], color=colors[si])
    ax.set_xlabel('Turn')
    ax.set_ylabel('Avg Leader Trust')
    ax.set_title('Average Community Leader Trust Over Time')
    ax.legend(fontsize=7)
    ax.grid(True, alpha=0.3)

    # Council disposition
    ax = axes[1][0]
    for si, strat in enumerate(STRATEGIES):
        ax.plot(turns, results[strat]['turn_council_disp'], label=STRATEGY_LABELS[strat], color=colors[si])
    ax.set_xlabel('Turn')
    ax.set_ylabel('Avg Council Disposition')
    ax.set_title('Average Council Disposition Over Time')
    ax.legend(fontsize=7)
    ax.grid(True, alpha=0.3)

    # Displacement
    ax = axes[1][1]
    strats_labels = [STRATEGY_LABELS[s] for s in STRATEGIES]
    displaced = [np.mean(results[s]['tiles_displaced']) for s in STRATEGIES]
    bars = ax.bar(strats_labels, displaced, color=colors)
    ax.set_ylabel('Avg Displacement Events')
    ax.set_title('Average Displacement Events Per Game')
    for bar, val in zip(bars, displaced):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
                f'{val:.1f}', ha='center', fontsize=9)
    ax.tick_params(axis='x', rotation=20)

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, 'sim1_characters_gentrif.png'), dpi=150)
    plt.close()

    # Chart 4: Stage progression over time
    fig, ax = plt.subplots(figsize=(12, 6))
    for si, strat in enumerate(STRATEGIES):
        ax.plot(turns, results[strat]['turn_stage'], label=STRATEGY_LABELS[strat], color=colors[si], linewidth=2)
    ax.set_xlabel('Turn')
    ax.set_ylabel('Avg Stage (0=Awakening, 1=Transition, 2=Restoration, 3=Beyond)')
    ax.set_title('Average Stage Progression Over Time')
    ax.set_yticks([0, 1, 2, 3])
    ax.set_yticklabels(['Awakening', 'Transition', 'Restoration', 'Beyond'])
    ax.legend()
    ax.grid(True, alpha=0.3)
    for t in [16, 32, 48, 64]:
        ax.axvline(x=t, color='gray', linestyle='--', alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, 'sim1_stage_progression.png'), dpi=150)
    plt.close()


def save_results(results):
    """Save numeric results to JSON."""
    output = {}
    for strat in STRATEGIES:
        r = results[strat]
        output[strat] = {
            'survival_rate': r['survived'] / NUM_ITERATIONS,
            'final_trust_mean': float(np.mean(r['final_trust'])),
            'final_eco_mean': float(np.mean(r['final_eco'])),
            'final_food_mean': float(np.mean(r['final_food'])),
            'final_will_mean': float(np.mean(r['final_will'])),
            'final_budget_mean': float(np.mean(r['final_budget'])),
            'final_climate_mean': float(np.mean(r['final_climate'])),
            'final_gentrif_mean': float(np.mean(r['final_gentrif'])),
            'avg_stage': float(np.mean(r['final_stage'])),
            'reached_transition_pct': r['reached_transition'] / NUM_ITERATIONS,
            'reached_restoration_pct': r['reached_restoration'] / NUM_ITERATIONS,
            'reached_beyond_pct': r['reached_beyond'] / NUM_ITERATIONS,
            'avg_turn_to_transition': float(np.mean(r['turn_to_transition'])) if r['turn_to_transition'] else None,
            'avg_turn_to_restoration': float(np.mean(r['turn_to_restoration'])) if r['turn_to_restoration'] else None,
            'avg_turn_to_beyond': float(np.mean(r['turn_to_beyond'])) if r['turn_to_beyond'] else None,
            'avg_projects': float(np.mean(r['total_projects'])),
            'avg_policies': float(np.mean(r['total_policies'])),
            'avg_tiles_transformed': float(np.mean(r['tiles_transformed'])),
            'reelection_1_pass_rate': r['reelection_1_pass'] / NUM_ITERATIONS,
            'reelection_2_pass_rate': r['reelection_2_pass'] / NUM_ITERATIONS,
            'reelection_3_pass_rate': r['reelection_3_pass'] / NUM_ITERATIONS,
            'reelection_4_pass_rate': r['reelection_4_pass'] / NUM_ITERATIONS,
            'avg_leader_trust': float(np.mean(r['leader_trust_avg'])),
            'avg_council_disp': float(np.mean(r['council_disp_avg'])),
            'avg_displacement': float(np.mean(r['tiles_displaced'])),
            'avg_growth_projects': float(np.mean(r['growth_count'])),
            'avg_degrowth_projects': float(np.mean(r['degrowth_count'])),
            'avg_community_led': float(np.mean(r['community_led'])),
            'avg_player_initiated': float(np.mean(r['player_initiated'])),
            'avg_antagonist_level': float(np.mean(r['antagonist_levels'])),
        }

    with open(os.path.join(OUT_DIR, 'sim1_results.json'), 'w') as f:
        json.dump(output, f, indent=2)


if __name__ == '__main__':
    print("Simulation 1: Full Game Playthrough (6 strategies x 1000 iterations)")
    results = run_simulations()
    print("Generating charts...")
    generate_charts(results)
    print("Saving results...")
    save_results(results)
    print("Done! Charts saved to v2/")

    # Print summary
    print("\n=== SUMMARY ===")
    for strat in STRATEGIES:
        r = results[strat]
        print(f"\n{STRATEGY_LABELS[strat]}:")
        print(f"  Survival: {r['survived']/NUM_ITERATIONS*100:.1f}%")
        print(f"  Final Trust: {np.mean(r['final_trust']):.1f}%")
        print(f"  Final Eco: {np.mean(r['final_eco']):.1f}%")
        print(f"  Final Food: {np.mean(r['final_food']):.1f}%")
        print(f"  Final Will: {np.mean(r['final_will']):.1f}%")
        print(f"  Final Budget: ${np.mean(r['final_budget']):.2f}M")
        print(f"  Final Climate: {np.mean(r['final_climate']):.1f}%")
        print(f"  Reached Transition: {r['reached_transition']/NUM_ITERATIONS*100:.1f}%")
        print(f"  Reached Restoration: {r['reached_restoration']/NUM_ITERATIONS*100:.1f}%")
        print(f"  Reached Beyond: {r['reached_beyond']/NUM_ITERATIONS*100:.1f}%")
        print(f"  Re-election pass: {r['reelection_1_pass']/NUM_ITERATIONS*100:.0f}%/{r['reelection_2_pass']/NUM_ITERATIONS*100:.0f}%/{r['reelection_3_pass']/NUM_ITERATIONS*100:.0f}%/{r['reelection_4_pass']/NUM_ITERATIONS*100:.0f}%")
        print(f"  Avg Projects: {np.mean(r['total_projects']):.1f}")
        print(f"  Avg Displacement: {np.mean(r['tiles_displaced']):.1f}")
