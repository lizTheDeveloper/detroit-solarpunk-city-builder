#!/usr/bin/env python3
"""
Simulation 5: Endgame & Continental Goals
Models Beyond the Map stage, AI cities, resource transfers, and continental goal progress.
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
from game_engine import AI_CITIES, clamp

NUM_ITERATIONS = 1000
OUT_DIR = os.path.dirname(__file__)

# Scenarios: different budget allocation to regional goals
SCENARIOS = [
    'no_regional',      # 0% budget to region
    'light_regional',   # ~10% budget to region
    'moderate_regional', # ~20% budget to region
    'heavy_regional',   # ~30% budget to region
    'cahokia_choice',   # 20% permanent + additional
    'cahokia_early',    # Accept Cahokia at Beyond entry (~turn 50)
]

SCENARIO_LABELS = {
    'no_regional': 'No Regional Aid',
    'light_regional': 'Light Aid (~10%)',
    'moderate_regional': 'Moderate Aid (~20%)',
    'heavy_regional': 'Heavy Aid (~30%)',
    'cahokia_choice': 'Cahokia + Moderate',
    'cahokia_early': 'Cahokia Early Entry',
}


def simulate_endgame(scenario: str, seed: int = 0):
    """
    Simulate turns 50-64 (Beyond the Map stage).
    Assumes the player reached Beyond around turn 50 with good meters.
    """
    random.seed(seed)

    # Player state at Beyond entry
    player_eco = random.uniform(78, 88)
    player_food = random.uniform(72, 82)
    player_trust = random.uniform(60, 80)
    player_will = random.uniform(40, 55)
    player_budget = random.uniform(2.5, 4.0)
    climate = random.uniform(82, 92)

    # Local state
    restoration_tiles = random.randint(22, 30)
    wildlife_corridors = random.randint(0, 2)
    degrowth_projects = random.randint(5, 10)

    # AI cities
    ai_cities = {}
    for name, data in AI_CITIES.items():
        ai_cities[name] = {
            'eco': data['eco'] + random.uniform(5, 15),  # Some progress by turn 50
            'food': data['food'] + random.uniform(3, 10),
            'trust': data['trust'] + random.uniform(2, 8),
            'stage': data['stage'],
            'relationship': 'neutral',
        }
    # Ann Arbor starts cooperative
    ai_cities['Ann Arbor']['relationship'] = 'cooperative'

    # Continental goals
    goals = {
        'watershed': 0.0,
        'wildlife': 0.0,
        'food_network': 0.0,
        'buffalo_commons': 0.0,
    }

    cahokia_active = scenario in ('cahokia_choice', 'cahokia_early')
    budget_to_regional_pct = {
        'no_regional': 0.0,
        'light_regional': 0.10,
        'moderate_regional': 0.20,
        'heavy_regional': 0.30,
        'cahokia_choice': 0.20,
        'cahokia_early': 0.20,
    }[scenario]

    goal_history = {g: [] for g in goals}
    budget_history = []
    transfers_made = 0
    regional_projects_completed = 0

    for turn in range(15):  # Turns 50-64
        # Climate keeps rising
        yr = 13 + turn // 4  # ~Year 13-16
        climate_rise = 0.92 * (1 + (yr - 1) * 0.03) * random.uniform(0.8, 1.2)
        climate = min(100, climate + climate_rise)

        # Player eco slowly grows
        player_eco = clamp(player_eco + random.uniform(-0.5, 1.0))
        player_food = clamp(player_food + random.uniform(-0.3, 0.8))
        player_trust = clamp(player_trust + random.uniform(-0.5, 0.5))

        # Annual replenishment (every 4 turns starting from Spring)
        if turn % 4 == 0:
            base_replenish = 1.5 * (0.5 + player_eco * 0.005 + player_trust * 0.003)
            player_budget += base_replenish

            if cahokia_active:
                player_budget -= base_replenish * 0.20

        # De-growth maintenance
        player_budget -= degrowth_projects * 0.05 / 4  # Per-turn fraction

        # Regional spending
        regional_budget = player_budget * budget_to_regional_pct
        player_budget -= regional_budget

        # Resource transfers
        if regional_budget > 0.2:
            # Send to neediest city
            neediest = min(ai_cities.items(), key=lambda x: x[1]['eco'])
            transfers_made += 1
            neediest[1]['eco'] = clamp(neediest[1]['eco'] + 5)
            neediest[1]['trust'] = clamp(neediest[1]['trust'] + 3)

            # Build relationships
            if transfers_made % 3 == 0:
                for city in ai_cities.values():
                    if city['relationship'] == 'neutral':
                        city['relationship'] = 'cooperative'
                        break

        # Regional project (every ~3 turns)
        if turn % 3 == 0 and regional_budget > 0.3:
            # Attempt regional project
            cooperative_cities = sum(1 for c in ai_cities.values()
                                     if c['relationship'] in ('cooperative', 'allied'))
            if cooperative_cities >= 3:
                # Complete a regional project
                proj_type = random.choice(['water_monitoring', 'wildlife_segment',
                                           'seed_bank', 'land_return'])
                regional_projects_completed += 1

                if proj_type == 'water_monitoring':
                    goals['watershed'] = clamp(goals['watershed'] + 15)
                elif proj_type == 'wildlife_segment':
                    goals['wildlife'] = clamp(goals['wildlife'] + 10)
                elif proj_type == 'seed_bank':
                    goals['food_network'] = clamp(goals['food_network'] + 20)
                elif proj_type == 'land_return':
                    for g in goals:
                        goals[g] = clamp(goals[g] + 5)

        # AI city progression
        for city_name, city in ai_cities.items():
            base_eco = 0.5
            base_food = 0.3
            base_trust = 0.4

            stage_mult = {'awakening': 1.0, 'transition': 1.5, 'restoration': 2.0, 'beyond': 2.0}
            mult = stage_mult.get(city['stage'], 1.0)

            # Player assistance bonus
            if city['relationship'] in ('cooperative', 'allied'):
                mult *= 1.25

            city['eco'] = clamp(city['eco'] + base_eco * mult + random.uniform(-0.3, 0.3))
            city['food'] = clamp(city['food'] + base_food * mult + random.uniform(-0.2, 0.2))
            city['trust'] = clamp(city['trust'] + base_trust * mult + random.uniform(-0.2, 0.2))

            # Climate catastrophe for awakening cities
            if climate >= 85 and city['stage'] == 'awakening':
                if random.random() < 0.15:
                    city['eco'] = max(0, city['eco'] - 20)
                    city['trust'] = max(0, city['trust'] - 10)

            # Stage transitions
            if city['stage'] == 'awakening':
                if city['eco'] >= 25 and city['food'] >= 20 and city['trust'] >= 50:
                    city['stage'] = 'transition'
            elif city['stage'] == 'transition':
                if city['eco'] >= 55 and city['food'] >= 55 and city['trust'] >= 70:
                    city['stage'] = 'restoration'

        # Continental goal per-turn progress
        # Watershed
        cities_restoration_high_eco = sum(1 for c in ai_cities.values()
                                           if c['stage'] in ('restoration', 'beyond') and c['eco'] > 70)
        goals['watershed'] = clamp(goals['watershed'] + cities_restoration_high_eco * 1.0)
        if player_eco > 50:
            goals['watershed'] = clamp(goals['watershed'] + (player_eco - 50) * 0.5)
        # Water tile bonus
        goals['watershed'] = clamp(goals['watershed'] + restoration_tiles * 0.02)

        # Wildlife
        cities_restoration_eco65 = sum(1 for c in ai_cities.values()
                                        if c['stage'] in ('restoration', 'beyond') and c['eco'] > 65)
        goals['wildlife'] = clamp(goals['wildlife'] + cities_restoration_eco65 * 2.0)
        goals['wildlife'] = clamp(goals['wildlife'] + wildlife_corridors * 2.0)

        # Food Network
        cities_food_60 = sum(1 for c in ai_cities.values() if c['food'] > 60)
        # Include Detroit
        if player_food > 60:
            cities_food_60 += 1
        goals['food_network'] = clamp(goals['food_network'] + cities_food_60 * 2.0)

        # Buffalo Commons
        bc = 0
        if restoration_tiles >= 20:
            bc += 1
        if cahokia_active:
            bc += 2
        allied = sum(1 for c in ai_cities.values() if c['relationship'] == 'allied')
        bc += allied
        goals_above_50 = sum(1 for g in ['watershed', 'wildlife', 'food_network']
                             if goals[g] >= 50)
        bc += goals_above_50
        bc += degrowth_projects * 0.05  # De-growth bonus
        if player_eco < 70:
            bc -= 3
        goals['buffalo_commons'] = clamp(goals['buffalo_commons'] + bc)

        # Record
        for g in goals:
            goal_history[g].append(goals[g])
        budget_history.append(player_budget)

    # Cooperative win check: 2 of 4 goals at 100%
    goals_at_100 = sum(1 for v in goals.values() if v >= 100)
    goals_at_50 = sum(1 for v in goals.values() if v >= 50)
    coop_win = goals_at_100 >= 2

    return {
        'goal_history': goal_history,
        'budget_history': budget_history,
        'final_goals': dict(goals),
        'goals_at_100': goals_at_100,
        'goals_at_50': goals_at_50,
        'coop_win': coop_win,
        'transfers_made': transfers_made,
        'regional_projects': regional_projects_completed,
        'final_budget': player_budget,
        'ai_city_stages': {name: city['stage'] for name, city in ai_cities.items()},
    }


def run_simulations():
    results = {}

    for scenario in SCENARIOS:
        print(f"  Running {scenario}...", flush=True)
        data = {
            'goal_watershed': np.zeros(15),
            'goal_wildlife': np.zeros(15),
            'goal_food': np.zeros(15),
            'goal_buffalo': np.zeros(15),
            'avg_budget': np.zeros(15),
            'coop_wins': 0,
            'goals_at_100': [],
            'goals_at_50': [],
            'final_watershed': [],
            'final_wildlife': [],
            'final_food': [],
            'final_buffalo': [],
            'final_budget': [],
            'transfers': [],
            'regional_projects': [],
        }

        for i in range(NUM_ITERATIONS):
            r = simulate_endgame(scenario, seed=i * 5000 + SCENARIOS.index(scenario))

            for t in range(15):
                data['goal_watershed'][t] += r['goal_history']['watershed'][t]
                data['goal_wildlife'][t] += r['goal_history']['wildlife'][t]
                data['goal_food'][t] += r['goal_history']['food_network'][t]
                data['goal_buffalo'][t] += r['goal_history']['buffalo_commons'][t]
                data['avg_budget'][t] += r['budget_history'][t]

            if r['coop_win']:
                data['coop_wins'] += 1

            data['goals_at_100'].append(r['goals_at_100'])
            data['goals_at_50'].append(r['goals_at_50'])
            data['final_watershed'].append(r['final_goals']['watershed'])
            data['final_wildlife'].append(r['final_goals']['wildlife'])
            data['final_food'].append(r['final_goals']['food_network'])
            data['final_buffalo'].append(r['final_goals']['buffalo_commons'])
            data['final_budget'].append(r['final_budget'])
            data['transfers'].append(r['transfers_made'])
            data['regional_projects'].append(r['regional_projects'])

        # Average
        data['goal_watershed'] /= NUM_ITERATIONS
        data['goal_wildlife'] /= NUM_ITERATIONS
        data['goal_food'] /= NUM_ITERATIONS
        data['goal_buffalo'] /= NUM_ITERATIONS
        data['avg_budget'] /= NUM_ITERATIONS

        results[scenario] = data

    return results


def generate_charts(results):
    endgame_turns = np.arange(50, 65)
    colors = ['#95a5a6', '#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6']

    # Chart 1: Continental goal progress by scenario
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    fig.suptitle('V2 Simulation 5: Continental Goal Progress (Turns 50-64)', fontsize=14, fontweight='bold')

    goal_names = ['Watershed', 'Wildlife', 'Food Network', 'Buffalo Commons']
    goal_keys = ['goal_watershed', 'goal_wildlife', 'goal_food', 'goal_buffalo']

    for gi, (gname, gkey) in enumerate(zip(goal_names, goal_keys)):
        ax = axes[gi // 2][gi % 2]
        for si, scenario in enumerate(SCENARIOS):
            ax.plot(endgame_turns, results[scenario][gkey],
                    label=SCENARIO_LABELS[scenario], color=colors[si], linewidth=1.5)
        ax.axhline(y=100, color='green', linestyle='--', alpha=0.5, label='Complete')
        ax.axhline(y=50, color='orange', linestyle='--', alpha=0.3, label='50%')
        ax.set_xlabel('Turn')
        ax.set_ylabel('Progress (%)')
        ax.set_title(f'{gname} Goal')
        ax.legend(fontsize=7)
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 105)

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, 'sim5_continental_goals.png'), dpi=150)
    plt.close()

    # Chart 2: Win rates and budget impact
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    fig.suptitle('V2 Simulation 5: Endgame Outcomes', fontsize=14, fontweight='bold')

    # Cooperative win rate
    ax = axes[0][0]
    scen_labels = [SCENARIO_LABELS[s] for s in SCENARIOS]
    win_rates = [results[s]['coop_wins'] / NUM_ITERATIONS * 100 for s in SCENARIOS]
    bars = ax.bar(scen_labels, win_rates, color=colors)
    ax.set_ylabel('Cooperative Win Rate (%)')
    ax.set_title('Cooperative Win Rate (2 goals at 100%)')
    for bar, val in zip(bars, win_rates):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                f'{val:.1f}%', ha='center', fontsize=9)
    ax.tick_params(axis='x', rotation=25)
    ax.set_ylim(0, 105)

    # Goals at 50%+ distribution
    ax = axes[0][1]
    for si, scenario in enumerate(SCENARIOS):
        vals = results[scenario]['goals_at_50']
        counts = [vals.count(i) / NUM_ITERATIONS * 100 for i in range(5)]
        ax.bar(np.arange(5) + si * 0.12, counts, 0.12,
               label=SCENARIO_LABELS[scenario], color=colors[si])
    ax.set_xlabel('Goals at 50%+')
    ax.set_ylabel('% of runs')
    ax.set_title('Distribution of Goals Reaching 50%')
    ax.legend(fontsize=6)

    # Budget over time
    ax = axes[1][0]
    for si, scenario in enumerate(SCENARIOS):
        ax.plot(endgame_turns, results[scenario]['avg_budget'],
                label=SCENARIO_LABELS[scenario], color=colors[si])
    ax.set_xlabel('Turn')
    ax.set_ylabel('Budget ($M)')
    ax.set_title('Budget During Endgame')
    ax.legend(fontsize=7)
    ax.grid(True, alpha=0.3)

    # Final goal values comparison
    ax = axes[1][1]
    x = np.arange(4)
    w = 0.12
    for si, scenario in enumerate(SCENARIOS):
        vals = [
            np.mean(results[scenario]['final_watershed']),
            np.mean(results[scenario]['final_wildlife']),
            np.mean(results[scenario]['final_food']),
            np.mean(results[scenario]['final_buffalo']),
        ]
        ax.bar(x + si * w, vals, w, label=SCENARIO_LABELS[scenario], color=colors[si])
    ax.set_ylabel('Final Progress (%)')
    ax.set_title('Final Continental Goal Progress')
    ax.set_xticks(x + w * 2.5)
    ax.set_xticklabels(['Watershed', 'Wildlife', 'Food', 'Buffalo'])
    ax.legend(fontsize=6)
    ax.set_ylim(0, 105)

    plt.tight_layout()
    plt.savefig(os.path.join(OUT_DIR, 'sim5_endgame_outcomes.png'), dpi=150)
    plt.close()


def save_results(results):
    output = {}
    for scenario in SCENARIOS:
        d = results[scenario]
        output[scenario] = {
            'coop_win_rate': d['coop_wins'] / NUM_ITERATIONS,
            'avg_goals_at_100': float(np.mean(d['goals_at_100'])),
            'avg_goals_at_50': float(np.mean(d['goals_at_50'])),
            'final_watershed_mean': float(np.mean(d['final_watershed'])),
            'final_wildlife_mean': float(np.mean(d['final_wildlife'])),
            'final_food_mean': float(np.mean(d['final_food'])),
            'final_buffalo_mean': float(np.mean(d['final_buffalo'])),
            'final_budget_mean': float(np.mean(d['final_budget'])),
            'avg_transfers': float(np.mean(d['transfers'])),
            'avg_regional_projects': float(np.mean(d['regional_projects'])),
        }

    with open(os.path.join(OUT_DIR, 'sim5_results.json'), 'w') as f:
        json.dump(output, f, indent=2)


if __name__ == '__main__':
    print("Simulation 5: Endgame & Continental Goals")
    results = run_simulations()
    print("Generating charts...")
    generate_charts(results)
    print("Saving results...")
    save_results(results)
    print("Done!")

    print("\n=== SUMMARY ===")
    for scenario in SCENARIOS:
        d = results[scenario]
        print(f"\n{SCENARIO_LABELS[scenario]}:")
        print(f"  Cooperative win: {d['coop_wins']/NUM_ITERATIONS*100:.1f}%")
        print(f"  Avg goals at 100%: {np.mean(d['goals_at_100']):.2f}")
        print(f"  Avg goals at 50%: {np.mean(d['goals_at_50']):.2f}")
        print(f"  Final: Watershed={np.mean(d['final_watershed']):.1f}% Wildlife={np.mean(d['final_wildlife']):.1f}% Food={np.mean(d['final_food']):.1f}% Buffalo={np.mean(d['final_buffalo']):.1f}%")
        print(f"  Final budget: ${np.mean(d['final_budget']):.2f}M")
        print(f"  Transfers: {np.mean(d['transfers']):.1f}, Regional projects: {np.mean(d['regional_projects']):.1f}")
