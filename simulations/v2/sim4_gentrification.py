#!/usr/bin/env python3
"""
Simulation 4: Gentrification & Displacement
Models gentrification pressure, displacement crises, and strategy trade-offs.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import json
import random
import math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from game_engine import (NUM_TILES, TILE_TYPES, TILE_STARTING_ECO, TILE_CONTAMINATION,
                         Tile, clamp, PROJECTS, GROWTH_PROJECTS, DEGROWTH_PROJECTS)

NUM_ITERATIONS = 1000
OUT_DIR = os.path.dirname(__file__)

STRATEGIES = ['community_led', 'player_initiated', 'mixed', 'aggressive_growth', 'with_land_trusts', 'policy_anti_gentrif']
STRATEGY_LABELS = {
    'community_led': 'Community-Led',
    'player_initiated': 'Player-Initiated',
    'mixed': 'Mixed (50/50)',
    'aggressive_growth': 'Aggressive Growth',
    'with_land_trusts': 'With Land Trusts',
    'policy_anti_gentrif': 'Anti-Gentrif Policies',
}


def init_tiles():
    tiles = []
    for ttype, count in TILE_TYPES.items():
        for _ in range(count):
            tiles.append(Tile(
                tile_type=ttype,
                eco=TILE_STARTING_ECO[ttype] * 100,
                contamination=TILE_CONTAMINATION[ttype] * 100,
            ))
    return tiles


def simulate_gentrification(strategy: str, seed: int = 0):
    """Simulate 64 turns focusing on gentrification dynamics."""
    random.seed(seed)
    tiles = init_tiles()

    gentrif_history = np.zeros(64)
    max_gentrif_history = np.zeros(64)
    displacement_events = 0
    tiles_over_50 = np.zeros(64)
    tiles_over_75 = np.zeros(64)
    projects_done = 0
    land_trusts_built = 0
    tiles_transformed = np.zeros(64)
    trust = 50.0

    # Anti-gentrification policy reduces increases by 30%
    has_anti_gentrif_policy = strategy in ('policy_anti_gentrif', 'with_land_trusts')

    for turn in range(64):
        # Complete ~1.5 projects per turn
        n_projects = random.randint(1, 2)
        for _ in range(n_projects):
            # Pick a random tile
            idx = random.randint(0, len(tiles) - 1)
            tile = tiles[idx]

            # Choose project type
            if strategy == 'aggressive_growth':
                proj = random.choice(['solar_grid', 'maker_space', 'greenway', 'food_forest'])
                is_community_led = False
            elif strategy == 'community_led':
                proj = random.choice(['food_forest', 'native_planting', 'rain_garden', 'community_kitchen'])
                is_community_led = True
            elif strategy == 'player_initiated':
                proj = random.choice(['food_forest', 'solar_grid', 'greenway', 'maker_space'])
                is_community_led = False
            elif strategy == 'with_land_trusts':
                if not tile.has_land_trust and random.random() < 0.3:
                    proj = 'land_trust'
                    is_community_led = True
                else:
                    proj = random.choice(['food_forest', 'native_planting', 'community_kitchen'])
                    is_community_led = True
            elif strategy == 'policy_anti_gentrif':
                proj = random.choice(['food_forest', 'native_planting', 'rain_garden', 'maker_space'])
                is_community_led = random.random() < 0.6
            else:  # mixed
                proj = random.choice(['food_forest', 'solar_grid', 'greenway', 'native_planting', 'maker_space'])
                is_community_led = random.random() < 0.5

            # Apply eco gain
            info = PROJECTS[proj]
            eco_gain = info[2]
            if tile.contamination > 30 and info[6] == 'ecology':
                eco_gain *= 0.5
            tile.eco = clamp(tile.eco + eco_gain)

            # Land trust
            if proj == 'land_trust':
                tile.has_land_trust = True
                land_trusts_built += 1

            # Gentrification pressure
            base_gentrif = 8.0

            if is_community_led:
                base_gentrif *= 0.5  # -50%
            else:
                base_gentrif *= 1.5  # +50%

            # Growth projects add extra
            if proj in GROWTH_PROJECTS:
                base_gentrif += 5

            # Anti-gentrification policy
            if has_anti_gentrif_policy:
                base_gentrif *= 0.7

            # Community ownership halves
            if tile.community_ownership:
                base_gentrif *= 0.5

            # Land trust blocks gentrification
            if tile.has_land_trust:
                base_gentrif = 0

            tile.gentrification_pressure = clamp(tile.gentrification_pressure + base_gentrif)

            # Adjacent pressure (half)
            adj_gentrif = base_gentrif * 0.5
            for ai in range(max(0, idx - 2), min(len(tiles), idx + 3)):
                if ai != idx and not tiles[ai].has_land_trust:
                    tiles[ai].gentrification_pressure = clamp(
                        tiles[ai].gentrification_pressure + adj_gentrif)

            if is_community_led:
                tile.community_ownership = True

            projects_done += 1

        # Natural decay
        for tile in tiles:
            tile.gentrification_pressure = max(0, tile.gentrification_pressure - 2)

            # Trust erosion at 50%+
            if tile.gentrification_pressure >= 50:
                trust = max(0, trust - 0.1)

            # Displacement at 75%+
            if tile.gentrification_pressure >= 75 and not tile.has_land_trust:
                displacement_events += 1
                trust = max(0, trust - 0.5)
                tile.gentrification_pressure = max(0, tile.gentrification_pressure - 10)

        # Record
        gp = [t.gentrification_pressure for t in tiles]
        gentrif_history[turn] = np.mean(gp)
        max_gentrif_history[turn] = max(gp)
        tiles_over_50[turn] = sum(1 for g in gp if g >= 50)
        tiles_over_75[turn] = sum(1 for g in gp if g >= 75)
        tiles_transformed[turn] = sum(1 for t in tiles if t.eco >= 40)

    return {
        'gentrif_history': gentrif_history,
        'max_gentrif_history': max_gentrif_history,
        'displacement_events': displacement_events,
        'tiles_over_50': tiles_over_50,
        'tiles_over_75': tiles_over_75,
        'tiles_transformed': tiles_transformed,
        'projects_done': projects_done,
        'land_trusts': land_trusts_built,
        'final_trust': trust,
        'final_gentrif': [t.gentrification_pressure for t in tiles],
    }


def run_simulations():
    results = {}

    for strat in STRATEGIES:
        print(f"  Running {strat}...", flush=True)
        data = {
            'avg_gentrif': np.zeros(64),
            'avg_max_gentrif': np.zeros(64),
            'avg_tiles_50': np.zeros(64),
            'avg_tiles_75': np.zeros(64),
            'avg_tiles_transformed': np.zeros(64),
            'total_displacement': [],
            'final_trust': [],
            'land_trusts': [],
        }

        for i in range(NUM_ITERATIONS):
            r = simulate_gentrification(strat, seed=i * 4000 + STRATEGIES.index(strat))

            data['avg_gentrif'] += r['gentrif_history']
            data['avg_max_gentrif'] += r['max_gentrif_history']
            data['avg_tiles_50'] += r['tiles_over_50']
            data['avg_tiles_75'] += r['tiles_over_75']
            data['avg_tiles_transformed'] += r['tiles_transformed']
            data['total_displacement'].append(r['displacement_events'])
            data['final_trust'].append(r['final_trust'])
            data['land_trusts'].append(r['land_trusts'])

        data['avg_gentrif'] /= NUM_ITERATIONS
        data['avg_max_gentrif'] /= NUM_ITERATIONS
        data['avg_tiles_50'] /= NUM_ITERATIONS
        data['avg_tiles_75'] /= NUM_ITERATIONS
        data['avg_tiles_transformed'] /= NUM_ITERATIONS

        results[strat] = data

    return results


def generate_charts(results):
    turns = np.arange(1, 65)
    colors = ['#3498db', '#e74c3c', '#f39c12', '#c0392b', '#2ecc71', '#9b59b6']

    # Chart 1: Gentrification pressure over time
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    fig.suptitle('V2 Simulation 4: Gentrification & Displacement', fontsize=14, fontweight='bold')

    ax = axes[0][0]
    for si, strat in enumerate(STRATEGIES):
        ax.plot(turns, results[strat]['avg_gentrif'], label=STRATEGY_LABELS[strat], color=colors[si])
    ax.axhline(y=50, color='orange', linestyle='--', alpha=0.5, label='Warning (50%)')
    ax.axhline(y=75, color='red', linestyle='--', alpha=0.5, label='Crisis (75%)')
    ax.set_xlabel('Turn')
    ax.set_ylabel('Avg Gentrification Pressure (%)')
    ax.set_title('Average Gentrification Pressure')
    ax.legend(fontsize=7)
    ax.grid(True, alpha=0.3)

    ax = axes[0][1]
    for si, strat in enumerate(STRATEGIES):
        ax.plot(turns, results[strat]['avg_max_gentrif'], label=STRATEGY_LABELS[strat], color=colors[si])
    ax.axhline(y=50, color='orange', linestyle='--', alpha=0.5)
    ax.axhline(y=75, color='red', linestyle='--', alpha=0.5)
    ax.set_xlabel('Turn')
    ax.set_ylabel('Max Tile Gentrification (%)')
    ax.set_title('Peak Gentrification (Worst Tile)')
    ax.legend(fontsize=7)
    ax.grid(True, alpha=0.3)

    ax = axes[1][0]
    for si, strat in enumerate(STRATEGIES):
        ax.plot(turns, results[strat]['avg_tiles_50'], label=STRATEGY_LABELS[strat], color=colors[si])
    ax.set_xlabel('Turn')
    ax.set_ylabel('Tiles at Warning Level')
    ax.set_title('Tiles Above 50% Gentrification')
    ax.legend(fontsize=7)
    ax.grid(True, alpha=0.3)

    ax = axes[1][1]
    strats_labels = [STRATEGY_LABELS[s] for s in STRATEGIES]
    displ = [np.mean(results[s]['total_displacement']) for s in STRATEGIES]
    bars = ax.bar(strats_labels, displ, color=colors)
    ax.set_ylabel('Avg Displacement Events')
    ax.set_title('Total Displacement Events (64 turns)')
    for bar, val in zip(bars, displ):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                f'{val:.1f}', ha='center', fontsize=9)
    ax.tick_params(axis='x', rotation=25)

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, 'sim4_gentrification.png'), dpi=150)
    plt.close()

    # Chart 2: Trade-off - transformation speed vs displacement
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    fig.suptitle('V2 Simulation 4: Transformation vs Displacement Trade-off', fontsize=14, fontweight='bold')

    ax = axes[0]
    for si, strat in enumerate(STRATEGIES):
        final_tiles = results[strat]['avg_tiles_transformed'][-1]
        avg_displ = np.mean(results[strat]['total_displacement'])
        ax.scatter(final_tiles, avg_displ, s=150, c=colors[si], label=STRATEGY_LABELS[strat], zorder=5)
    ax.set_xlabel('Tiles Transformed (eco >= 40%)')
    ax.set_ylabel('Avg Displacement Events')
    ax.set_title('Speed vs Justice: Transformation Speed vs Displacement')
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3)

    ax = axes[1]
    for si, strat in enumerate(STRATEGIES):
        ax.plot(turns, results[strat]['avg_tiles_transformed'],
                label=STRATEGY_LABELS[strat], color=colors[si])
    ax.set_xlabel('Turn')
    ax.set_ylabel('Tiles Transformed')
    ax.set_title('Tile Transformation Rate')
    ax.legend(fontsize=7)
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, 'sim4_tradeoffs.png'), dpi=150)
    plt.close()


def save_results(results):
    output = {}
    for strat in STRATEGIES:
        d = results[strat]
        output[strat] = {
            'avg_displacement': float(np.mean(d['total_displacement'])),
            'median_displacement': float(np.median(d['total_displacement'])),
            'max_displacement': float(np.max(d['total_displacement'])),
            'zero_displacement_pct': float(sum(1 for x in d['total_displacement'] if x == 0) / NUM_ITERATIONS),
            'final_avg_gentrif': float(d['avg_gentrif'][-1]),
            'final_max_gentrif': float(d['avg_max_gentrif'][-1]),
            'final_tiles_transformed': float(d['avg_tiles_transformed'][-1]),
            'avg_final_trust': float(np.mean(d['final_trust'])),
            'avg_land_trusts': float(np.mean(d['land_trusts'])),
        }

    with open(os.path.join(OUT_DIR, 'sim4_results.json'), 'w') as f:
        json.dump(output, f, indent=2)


if __name__ == '__main__':
    print("Simulation 4: Gentrification & Displacement")
    results = run_simulations()
    print("Generating charts...")
    generate_charts(results)
    print("Saving results...")
    save_results(results)
    print("Done!")

    print("\n=== SUMMARY ===")
    for strat in STRATEGIES:
        d = results[strat]
        print(f"\n{STRATEGY_LABELS[strat]}:")
        print(f"  Avg displacement: {np.mean(d['total_displacement']):.1f}")
        print(f"  Zero displacement: {sum(1 for x in d['total_displacement'] if x == 0)/NUM_ITERATIONS*100:.1f}%")
        print(f"  Final avg gentrif: {d['avg_gentrif'][-1]:.1f}%")
        print(f"  Final tiles transformed: {d['avg_tiles_transformed'][-1]:.1f}")
        print(f"  Final trust: {np.mean(d['final_trust']):.1f}%")
