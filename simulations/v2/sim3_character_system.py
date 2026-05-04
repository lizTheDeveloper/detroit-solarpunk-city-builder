#!/usr/bin/env python3
"""
Simulation 3: Character System Stress Test
Models relationship dynamics, proposal acceptance, coalition building, re-election scoring.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import json
import random
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from game_engine import COMMUNITY_LEADERS, COUNCIL_MEMBERS

NUM_ITERATIONS = 1000
OUT_DIR = os.path.dirname(__file__)


def simulate_character_system(accept_rate: float, seed: int = 0):
    """
    Simulate 64 turns of the character system with a given proposal acceptance rate.
    accept_rate: 0.0 to 1.0 (what fraction of proposals are accepted)
    Returns dict of metrics.
    """
    random.seed(seed)

    # Init leader trusts
    leader_trusts = [float(l[1]) for l in COMMUNITY_LEADERS]
    # Init council dispositions
    council_disps = [float(c[1]) for c in COUNCIL_MEMBERS]

    trust_history = [[] for _ in range(8)]
    council_history = [[] for _ in range(9)]
    advocates_history = []
    champions_history = []
    coalitions_history = []
    council_allies_history = []
    reelection_scores = []
    hostile_leaders = []

    city_trust = 50.0  # simplified city trust

    for turn in range(1, 65):
        # Each leader proposes ~1 project per turn (if trust >= 0)
        for i in range(8):
            if leader_trusts[i] >= 0:
                # Leader proposes
                roll = random.random()
                if roll < accept_rate:
                    leader_trusts[i] += 10  # Accept
                    city_trust = min(100, city_trust + 0.5)
                elif roll < accept_rate + 0.15:
                    leader_trusts[i] += 3  # Modify
                elif roll < accept_rate + 0.15 + 0.10:
                    leader_trusts[i] -= 5  # Defer
                else:
                    leader_trusts[i] -= 15  # Reject
                    city_trust = max(0, city_trust - 1)

        # Relationship decay
        for i in range(8):
            if leader_trusts[i] >= 60:
                leader_trusts[i] -= 0.5
            elif leader_trusts[i] > -50:
                if leader_trusts[i] > 0:
                    leader_trusts[i] -= 1.0
                elif leader_trusts[i] < 0:
                    leader_trusts[i] += 1.0
            # Hostile stays

        # Council decay + policy effects (simplified)
        for i in range(9):
            if council_disps[i] >= 60:
                council_disps[i] -= 0.5
            elif council_disps[i] > -50:
                if council_disps[i] > 0:
                    council_disps[i] -= 1.0
                elif council_disps[i] < 0:
                    council_disps[i] += 1.0

        # Periodic policy effects on council (every 4 turns, player enacts a policy)
        if turn % 4 == 0:
            for i in range(9):
                leaning = COUNCIL_MEMBERS[i][2]
                if leaning == 'progressive':
                    council_disps[i] = min(100, council_disps[i] + 5)
                elif leaning == 'moderate':
                    council_disps[i] = min(100, council_disps[i] + 2)
                elif leaning in ('conservative', 'moderate_conservative'):
                    council_disps[i] = max(-100, council_disps[i] - 3)

        # Direct engagement with lowest-trust leader (1 per turn)
        min_idx = min(range(8), key=lambda j: leader_trusts[j])
        if leader_trusts[min_idx] > -50:
            leader_trusts[min_idx] += 7

        # Clamp
        for i in range(8):
            leader_trusts[i] = max(-100, min(100, leader_trusts[i]))
        for i in range(9):
            council_disps[i] = max(-100, min(100, council_disps[i]))

        # Record
        for i in range(8):
            trust_history[i].append(leader_trusts[i])
        for i in range(9):
            council_history[i].append(council_disps[i])

        advocates = sum(1 for t in leader_trusts if t >= 40)
        champions = sum(1 for t in leader_trusts if t >= 60)
        coalitions = advocates // 3
        council_allies = sum(1 for d in council_disps if d >= 30)
        hostile = sum(1 for t in leader_trusts if t <= -50)

        advocates_history.append(advocates)
        champions_history.append(champions)
        coalitions_history.append(coalitions)
        council_allies_history.append(council_allies)
        hostile_leaders.append(hostile)

        # Re-election scoring at turns 16, 32, 48, 64
        if turn in (16, 32, 48, 64):
            score = city_trust
            for d in council_disps:
                if d >= 30:
                    score += 3
                elif d <= -30:
                    score -= 3
            for t in leader_trusts:
                if t >= 40:
                    score += 5
                elif t <= -20:
                    score -= 5
            score += coalitions * 8
            # Simplified antagonist penalty
            score -= 6  # ~2 antagonists at level 3+
            reelection_scores.append(score)

    return {
        'trust_history': trust_history,
        'council_history': council_history,
        'advocates_history': advocates_history,
        'champions_history': champions_history,
        'coalitions_history': coalitions_history,
        'council_allies_history': council_allies_history,
        'reelection_scores': reelection_scores,
        'hostile_leaders': hostile_leaders,
        'final_leader_trusts': list(leader_trusts),
        'final_council_disps': list(council_disps),
    }


def run_simulations():
    acceptance_rates = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
    results = {}

    for rate in acceptance_rates:
        print(f"  Running accept_rate={rate:.1f}...", flush=True)
        data = {
            'avg_advocates': np.zeros(64),
            'avg_champions': np.zeros(64),
            'avg_coalitions': np.zeros(64),
            'avg_council_allies': np.zeros(64),
            'avg_hostile': np.zeros(64),
            'avg_leader_trust': [np.zeros(64) for _ in range(8)],
            'avg_council_disp': [np.zeros(64) for _ in range(9)],
            'reelection_wins': [0, 0, 0, 0],
            'reelection_scores_all': [[], [], [], []],
            'final_advocates': [],
            'final_coalitions': [],
            'first_coalition_turn': [],
        }

        for i in range(NUM_ITERATIONS):
            r = simulate_character_system(rate, seed=i * 3000 + int(rate * 100))

            for t in range(64):
                data['avg_advocates'][t] += r['advocates_history'][t]
                data['avg_champions'][t] += r['champions_history'][t]
                data['avg_coalitions'][t] += r['coalitions_history'][t]
                data['avg_council_allies'][t] += r['council_allies_history'][t]
                data['avg_hostile'][t] += r['hostile_leaders'][t]
                for li in range(8):
                    data['avg_leader_trust'][li][t] += r['trust_history'][li][t]
                for ci in range(9):
                    data['avg_council_disp'][ci][t] += r['council_history'][ci][t]

            for ri, score in enumerate(r['reelection_scores']):
                data['reelection_scores_all'][ri].append(score)
                if score >= 50:
                    data['reelection_wins'][ri] += 1

            data['final_advocates'].append(sum(1 for t in r['final_leader_trusts'] if t >= 40))
            data['final_coalitions'].append(sum(1 for t in r['final_leader_trusts'] if t >= 40) // 3)

            # First coalition turn
            first_coal = None
            for t, c in enumerate(r['coalitions_history']):
                if c >= 1:
                    first_coal = t + 1
                    break
            if first_coal:
                data['first_coalition_turn'].append(first_coal)

        # Average
        for key in ['avg_advocates', 'avg_champions', 'avg_coalitions',
                     'avg_council_allies', 'avg_hostile']:
            data[key] /= NUM_ITERATIONS
        for li in range(8):
            data['avg_leader_trust'][li] /= NUM_ITERATIONS
        for ci in range(9):
            data['avg_council_disp'][ci] /= NUM_ITERATIONS

        results[rate] = data

    return results


def generate_charts(results):
    turns = np.arange(1, 65)
    rates = sorted(results.keys())

    # Chart 1: Advocates and coalitions by acceptance rate
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    fig.suptitle('V2 Simulation 3: Character System Stress Test', fontsize=14, fontweight='bold')

    cmap = plt.cm.viridis(np.linspace(0, 1, len(rates)))

    # Advocates over time
    ax = axes[0][0]
    for ri, rate in enumerate(rates):
        ax.plot(turns, results[rate]['avg_advocates'], label=f'{rate:.0%}', color=cmap[ri])
    ax.set_xlabel('Turn')
    ax.set_ylabel('Avg Advocates (trust >= 40)')
    ax.set_title('Community Advocates by Acceptance Rate')
    ax.legend(title='Accept Rate', fontsize=7, ncol=2)
    ax.grid(True, alpha=0.3)
    ax.set_ylim(0, 8.5)

    # Coalitions over time
    ax = axes[0][1]
    for ri, rate in enumerate(rates):
        ax.plot(turns, results[rate]['avg_coalitions'], label=f'{rate:.0%}', color=cmap[ri])
    ax.set_xlabel('Turn')
    ax.set_ylabel('Avg Coalitions (3+ advocates)')
    ax.set_title('Coalitions by Acceptance Rate')
    ax.legend(title='Accept Rate', fontsize=7, ncol=2)
    ax.grid(True, alpha=0.3)

    # Council allies over time
    ax = axes[1][0]
    for ri, rate in enumerate(rates):
        ax.plot(turns, results[rate]['avg_council_allies'], label=f'{rate:.0%}', color=cmap[ri])
    ax.set_xlabel('Turn')
    ax.set_ylabel('Avg Council Allies (disp >= 30)')
    ax.set_title('Council Allies by Acceptance Rate')
    ax.legend(title='Accept Rate', fontsize=7, ncol=2)
    ax.grid(True, alpha=0.3)
    ax.set_ylim(0, 9.5)

    # Re-election win rates
    ax = axes[1][1]
    for ri, rate in enumerate(rates):
        wins = [results[rate]['reelection_wins'][j] / NUM_ITERATIONS * 100 for j in range(4)]
        ax.plot([1, 2, 3, 4], wins, 'o-', label=f'{rate:.0%}', color=cmap[ri])
    ax.set_xlabel('Re-election #')
    ax.set_ylabel('Win Rate (%)')
    ax.set_title('Re-election Win Rate by Acceptance Rate')
    ax.legend(title='Accept Rate', fontsize=7, ncol=2)
    ax.set_ylim(0, 105)
    ax.set_xticks([1, 2, 3, 4])

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, 'sim3_character_system.png'), dpi=150)
    plt.close()

    # Chart 2: Individual leader trajectories at 50% acceptance
    fig, axes = plt.subplots(2, 1, figsize=(14, 10))
    fig.suptitle('V2 Simulation 3: Individual Character Trajectories (50% Accept Rate)', fontsize=14, fontweight='bold')

    rate = 0.5
    leader_names = [l[0].split()[0] for l in COMMUNITY_LEADERS]  # First names
    ax = axes[0]
    for li in range(8):
        ax.plot(turns, results[rate]['avg_leader_trust'][li], label=leader_names[li])
    ax.axhline(y=40, color='green', linestyle='--', alpha=0.5, label='Advocate threshold')
    ax.axhline(y=60, color='gold', linestyle='--', alpha=0.5, label='Champion threshold')
    ax.axhline(y=-20, color='red', linestyle='--', alpha=0.5, label='Opposition threshold')
    ax.set_xlabel('Turn')
    ax.set_ylabel('Trust Score')
    ax.set_title('Community Leader Trust (8 leaders)')
    ax.legend(fontsize=7, ncol=3)
    ax.grid(True, alpha=0.3)

    council_names = [c[0].split()[0] for c in COUNCIL_MEMBERS]
    ax = axes[1]
    for ci in range(9):
        ax.plot(turns, results[rate]['avg_council_disp'][ci], label=council_names[ci])
    ax.axhline(y=30, color='green', linestyle='--', alpha=0.5, label='Lean Yes')
    ax.axhline(y=-30, color='red', linestyle='--', alpha=0.5, label='Opponent')
    ax.set_xlabel('Turn')
    ax.set_ylabel('Disposition')
    ax.set_title('Council Member Dispositions (9 members)')
    ax.legend(fontsize=7, ncol=3)
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, 'sim3_individual_chars.png'), dpi=150)
    plt.close()

    # Chart 3: Summary metrics vs acceptance rate
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle('V2 Simulation 3: Metrics vs Proposal Acceptance Rate', fontsize=14, fontweight='bold')

    ax = axes[0][0]
    final_adv = [np.mean(results[r]['final_advocates']) for r in rates]
    final_coal = [np.mean(results[r]['final_coalitions']) for r in rates]
    ax.plot([r*100 for r in rates], final_adv, 'o-', label='Final Advocates', color='#2ecc71')
    ax.plot([r*100 for r in rates], final_coal, 's-', label='Final Coalitions', color='#3498db')
    ax.set_xlabel('Proposal Acceptance Rate (%)')
    ax.set_ylabel('Count')
    ax.set_title('Final Advocates & Coalitions')
    ax.legend()
    ax.grid(True, alpha=0.3)

    ax = axes[0][1]
    first_coal = [np.mean(results[r]['first_coalition_turn']) if results[r]['first_coalition_turn'] else 65
                  for r in rates]
    ax.plot([r*100 for r in rates], first_coal, 'o-', color='#e67e22')
    ax.set_xlabel('Proposal Acceptance Rate (%)')
    ax.set_ylabel('Turn')
    ax.set_title('Average Turn to First Coalition')
    ax.grid(True, alpha=0.3)
    ax.set_ylim(0, 65)

    ax = axes[1][0]
    hostile_final = [results[r]['avg_hostile'][-1] for r in rates]
    ax.plot([r*100 for r in rates], hostile_final, 'o-', color='#e74c3c')
    ax.set_xlabel('Proposal Acceptance Rate (%)')
    ax.set_ylabel('Hostile Leaders')
    ax.set_title('Hostile Leaders at Game End')
    ax.grid(True, alpha=0.3)

    ax = axes[1][1]
    for ri_idx in range(4):
        scores = [np.mean(results[r]['reelection_scores_all'][ri_idx]) for r in rates]
        ax.plot([r*100 for r in rates], scores, 'o-', label=f'Election {ri_idx+1}')
    ax.axhline(y=50, color='red', linestyle='--', label='Win threshold')
    ax.set_xlabel('Proposal Acceptance Rate (%)')
    ax.set_ylabel('Score')
    ax.set_title('Average Re-election Scores')
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, 'sim3_acceptance_metrics.png'), dpi=150)
    plt.close()


def save_results(results):
    output = {}
    for rate in sorted(results.keys()):
        d = results[rate]
        output[f'accept_{rate:.0%}'] = {
            'final_avg_advocates': float(np.mean(d['final_advocates'])),
            'final_avg_coalitions': float(np.mean(d['final_coalitions'])),
            'first_coalition_turn': float(np.mean(d['first_coalition_turn'])) if d['first_coalition_turn'] else None,
            'reelection_win_rates': [w / NUM_ITERATIONS for w in d['reelection_wins']],
            'avg_reelection_scores': [float(np.mean(s)) for s in d['reelection_scores_all']],
            'final_hostile_leaders': float(d['avg_hostile'][-1]),
            'final_council_allies': float(d['avg_council_allies'][-1]),
        }

    with open(os.path.join(OUT_DIR, 'sim3_results.json'), 'w') as f:
        json.dump(output, f, indent=2)


if __name__ == '__main__':
    print("Simulation 3: Character System Stress Test")
    results = run_simulations()
    print("Generating charts...")
    generate_charts(results)
    print("Saving results...")
    save_results(results)
    print("Done!")

    print("\n=== SUMMARY ===")
    for rate in sorted(results.keys()):
        d = results[rate]
        print(f"\nAccept rate {rate:.0%}:")
        print(f"  Final advocates: {np.mean(d['final_advocates']):.1f}")
        print(f"  Final coalitions: {np.mean(d['final_coalitions']):.1f}")
        print(f"  First coalition: turn {np.mean(d['first_coalition_turn']):.0f}" if d['first_coalition_turn'] else "  First coalition: never")
        print(f"  Council allies: {d['avg_council_allies'][-1]:.1f}")
        print(f"  Re-election wins: {[d['reelection_wins'][j]/NUM_ITERATIONS*100 for j in range(4)]}")
        print(f"  Hostile leaders: {d['avg_hostile'][-1]:.2f}")
