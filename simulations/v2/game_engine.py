"""
Shared game engine for V2 Monte Carlo simulations.
Models the updated Detroit Solarpunk City Builder with all systems interacting.
"""
import random
import math
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple

# ============================================================
# CONSTANTS
# ============================================================

NUM_TILES = 40  # Total city tiles

TILE_TYPES = {
    'industrial': 5,
    'urban_dense': 8,
    'urban_sparse': 10,
    'waterfront': 4,
    'vacant': 8,
    'park': 5,
}

TILE_CONTAMINATION = {
    'industrial': 0.80,
    'urban_dense': 0.40,
    'urban_sparse': 0.25,
    'waterfront': 0.50,
    'vacant': 0.20,
    'park': 0.10,
}

TILE_STARTING_ECO = {
    'industrial': 0.05,
    'urban_dense': 0.12,
    'urban_sparse': 0.10,
    'waterfront': 0.18,
    'vacant': 0.08,
    'park': 0.35,
}

SEASONS = ['spring', 'summer', 'fall', 'winter']

# Project definitions: (cost_M, duration, tile_eco_pct, food_pct, trust_pct, revenue_M, category, is_outdoor, stage_req)
# tile_eco_pct is bonus to the specific tile's eco; city-wide eco gain is derived from tile improvements
PROJECTS = {
    'food_forest':       (0.75, 3, 15, 3, 2, 0,    'ecology',        True,  'awakening'),
    'soil_remediation':  (1.0,  4, 10, 0, 0, 0,    'ecology',        True,  'awakening'),
    'rain_garden':       (0.4,  2, 10, 0, 0, 0,    'ecology',        True,  'awakening'),
    'native_planting':   (0.8,  3, 12, 0, 0, 0,    'ecology',        True,  'awakening'),
    'solar_grid':        (1.5,  4, 5,  0, 0, 0.2,  'infrastructure', True,  'awakening'),
    'greenway':          (1.0,  3, 8,  0, 0, 0,    'infrastructure', True,  'awakening'),
    'maker_space':       (0.6,  2, 0,  0, 4, 0.1,  'community',      False, 'awakening'),
    'community_kitchen': (0.5,  2, 0,  5, 3, 0,    'community',      False, 'awakening'),
    'land_trust':        (1.2,  3, 0,  0, 5, 0,    'community',      False, 'awakening'),
    'wetland_restoration': (2.0, 5, 20, 0, 0, 0,   'restoration',    True,  'transition'),
    'wildlife_corridor':   (3.0, 8, 15, 0, 0, 0,   'restoration',    True,  'transition'),
    'regional_collab':     (2.0, 6, 0,  0, 3, 0,   'restoration',    False, 'transition'),
}

GROWTH_PROJECTS = {'solar_grid', 'maker_space'}
DEGROWTH_PROJECTS = {'wetland_restoration', 'native_planting', 'rain_garden', 'food_forest'}
DEGROWTH_MAINTENANCE = 0.05  # $50K/year per de-growth project

POLICIES = {
    'urban_ag_zoning':         (30, 8,  0.3, 'urban_ag'),
    'green_infra_grants':      (40, 10, 0.4, 'green_grants'),
    'coop_tax_incentives':     (50, 12, 0.5, 'coop_tax'),
    'participatory_budgeting': (55, 15, 0.5, 'part_budget'),
    'community_land_trust':    (45, 10, 0.3, 'land_trust_ord'),
    'water_commons':           (60, 15, 0.5, 'water_commons'),
}

COUNTER_NARRATIVES = {
    'corporate_media':    (0.08, 3.5, 'opinion_-2',   'always'),
    'developer_lobbying': (0.06, 2.5, 'budget_-0.1',  'land_reform_policy'),
    'state_pushback':     (0.05, 5.5, 'opinion_-3',   '3+_policies'),
    'federal_threat':     (0.03, 4.0, 'trust_-2',     'restoration+'),
    'astroturf':          (0.07, 2.0, 'trust_-3',     'always'),
    'nimbyism':           (0.10, 1.5, 'block_project', '3+_projects'),
}

COMMUNITY_LEADERS = [
    ('Grace Okafor-Williams', 30, 4),
    ('Darius Kemp', 20, 3),
    ('Lucia Espinoza', 15, 4),
    ('Elder Whitehorse', 25, 3),
    ('Kez Monroe', 10, 3),
    ('Hassan Farah', 5, 4),
    ('Tamika Jefferson', 20, 3),
    ('Big Mike Novak', 15, 3),
]

COUNCIL_MEMBERS = [
    ('Marlena Calloway', 60, 'progressive'),
    ('JT Thibodeaux', 20, 'moderate'),
    ('Denise Okonkwo', 40, 'progressive'),
    ('Victor Marek', 10, 'moderate'),
    ('Pat Lundgren', -30, 'conservative'),
    ('Tomoko Reyes', 50, 'progressive'),
    ('Bobby Slade', -15, 'moderate_conservative'),
    ('Aaliyah Foster', 5, 'moderate'),
    ('Frank Bukowski', -50, 'conservative'),
]

AI_CITIES = {
    'Ann Arbor':    {'stage': 'transition',  'eco': 45, 'food': 30, 'trust': 55},
    'Toledo':       {'stage': 'awakening',   'eco': 20, 'food': 15, 'trust': 35},
    'Cleveland':    {'stage': 'awakening',   'eco': 25, 'food': 20, 'trust': 40},
    'Chicago':      {'stage': 'transition',  'eco': 35, 'food': 25, 'trust': 30},
    'Milwaukee':    {'stage': 'awakening',   'eco': 30, 'food': 25, 'trust': 45},
    'Windsor':      {'stage': 'transition',  'eco': 40, 'food': 35, 'trust': 50},
    'Flint':        {'stage': 'awakening',   'eco': 15, 'food': 10, 'trust': 25},
    'Lansing':      {'stage': 'awakening',   'eco': 25, 'food': 20, 'trust': 40},
    'Grand Rapids': {'stage': 'transition',  'eco': 35, 'food': 30, 'trust': 50},
}


# ============================================================
# TILE
# ============================================================

@dataclass
class Tile:
    tile_type: str
    eco: float = 0.0
    contamination: float = 0.0
    gentrification_pressure: float = 0.0
    has_land_trust: bool = False
    community_ownership: bool = False
    completed_projects: List[str] = field(default_factory=list)

    def visual_stage(self):
        if self.eco >= 90:
            return 'beyond'
        elif self.eco >= 70:
            return 'restoration'
        elif self.eco >= 40:
            return 'transition'
        else:
            return 'dystopia'


# ============================================================
# GAME STATE
# ============================================================

@dataclass
class ActiveProject:
    name: str
    tile_idx: int
    progress: int
    duration: int
    is_community_led: bool = False
    is_community_proposed: bool = False

@dataclass
class GameState:
    trust: float = 50.0
    eco: float = 15.0       # City-wide meter, NOT tile average
    food: float = 10.0
    will: float = 60.0
    budget: float = 4.2
    climate: float = 30.0

    turn: int = 1
    year: int = 1

    tiles: List[Tile] = field(default_factory=list)
    active_projects: List[ActiveProject] = field(default_factory=list)
    completed_project_names: List[str] = field(default_factory=list)
    total_projects_completed: int = 0

    enacted_policies: List[str] = field(default_factory=list)
    annual_revenue_bonus: float = 0.0

    consecutive_narrative: Dict[str, int] = field(default_factory=dict)

    stage: str = 'awakening'
    specialization_path: str = 'balanced'

    tp1_triggered: bool = False
    tp2_triggered: bool = False

    reelection_results: List[bool] = field(default_factory=list)

    leader_trusts: List[float] = field(default_factory=list)
    council_dispositions: List[float] = field(default_factory=list)

    antagonist_levels: Dict[str, int] = field(default_factory=dict)
    antagonist_active: Dict[str, bool] = field(default_factory=dict)

    degrowth_count: int = 0
    growth_count: int = 0
    community_led_count: int = 0
    player_initiated_count: int = 0
    tiles_displaced: int = 0
    policies_enacted_count: int = 0

    continental_goals: Dict[str, float] = field(default_factory=dict)
    ai_cities: Dict[str, Dict] = field(default_factory=dict)
    cahokia_active: bool = False

    total_revenue: float = 0.0
    total_maintenance: float = 0.0
    total_spending: float = 0.0

    history: Dict[str, List[float]] = field(default_factory=dict)


def init_game(path: str = 'balanced') -> GameState:
    gs = GameState()
    gs.specialization_path = path

    for ttype, count in TILE_TYPES.items():
        for _ in range(count):
            gs.tiles.append(Tile(
                tile_type=ttype,
                eco=TILE_STARTING_ECO[ttype] * 100,
                contamination=TILE_CONTAMINATION[ttype] * 100,
            ))

    gs.leader_trusts = [float(l[1]) for l in COMMUNITY_LEADERS]
    gs.council_dispositions = [float(c[1]) for c in COUNCIL_MEMBERS]

    gs.antagonist_levels = {'cross': 0, 'voss': 0, 'webb': 1, 'chen': 0}
    gs.antagonist_active = {'cross': False, 'voss': False, 'webb': True, 'chen': False}

    gs.continental_goals = {'watershed': 0.0, 'wildlife': 0.0, 'food_network': 0.0, 'buffalo_commons': 0.0}
    gs.ai_cities = {name: dict(data) for name, data in AI_CITIES.items()}

    gs.history = {
        'trust': [], 'eco': [], 'food': [], 'will': [], 'budget': [],
        'climate': [], 'gentrif_avg': [], 'tiles_transformed': [],
        'projects_completed': [], 'leader_trust_avg': [],
        'council_disp_avg': [], 'stage_num': [],
        'revenue': [], 'maintenance': [], 'spending': [],
    }

    return gs


# ============================================================
# HELPERS
# ============================================================

def season(turn: int) -> str:
    return SEASONS[(turn - 1) % 4]

def year_from_turn(turn: int) -> int:
    return (turn - 1) // 4 + 1

def clamp(val, lo=0.0, hi=100.0):
    return max(lo, min(hi, val))

def max_concurrent_projects(trust: float) -> int:
    return int(2 + trust / 25)

def narrative_actions_per_turn(trust: float) -> int:
    return int(1 + trust / 30)

def stage_num(stage: str) -> int:
    return {'awakening': 0, 'transition': 1, 'restoration': 2, 'beyond': 3}.get(stage, 0)

def tiles_at_visual(tiles, visual: str) -> int:
    thresholds = {'transition': 40, 'restoration': 70, 'beyond': 90}
    threshold = thresholds.get(visual, 40)
    return sum(1 for t in tiles if t.eco >= threshold)

def avg_gentrification(tiles):
    return sum(t.gentrification_pressure for t in tiles) / len(tiles) if tiles else 0


# ============================================================
# CLIMATE SYSTEM
# ============================================================

def climate_tick(gs: GameState):
    yr = year_from_turn(gs.turn)
    base_rise = 0.92
    acceleration = 1 + (yr - 1) * 0.03
    randomness = random.uniform(0.8, 1.2)
    increase = base_rise * acceleration * randomness

    if season(gs.turn) == 'summer':
        increase += 0.2

    gs.climate = clamp(gs.climate + increase)

    if gs.climate >= 60 and not gs.tp1_triggered:
        gs.tp1_triggered = True
        gs.trust = clamp(gs.trust - 2)
    if gs.climate >= 85 and not gs.tp2_triggered:
        gs.tp2_triggered = True
        gs.trust = clamp(gs.trust - 3)
        gs.will = clamp(gs.will - 2)


def climate_events(gs: GameState):
    s = season(gs.turn)
    base_probs = {'summer': 0.25, 'spring': 0.20, 'fall': 0.15, 'winter': 0.10}
    base = base_probs.get(s, 0)
    if base == 0:
        return

    if gs.tp2_triggered:
        base *= 2

    event_prob = base * (0.5 + gs.climate * 0.01)
    severity = 0.5 + gs.climate / 100

    if random.random() < event_prob:
        eco_mult = max(0.1, 1.0 - gs.eco * 0.008)

        if s == 'summer':
            gs.trust = clamp(gs.trust - 2 * severity)
            gs.budget -= 0.1 * severity
        elif s == 'spring':
            for _ in range(min(3, len(gs.tiles))):
                idx = random.randint(0, len(gs.tiles) - 1)
                dmg = 15 * severity * eco_mult
                gs.tiles[idx].eco = max(0, gs.tiles[idx].eco - dmg)
            gs.budget -= 0.2 * severity
        elif s == 'fall':
            idx = random.randint(0, len(gs.tiles) - 1)
            gs.tiles[idx].eco = max(0, gs.tiles[idx].eco - 10 * severity * eco_mult)
            gs.budget -= 0.15 * severity
        elif s == 'winter':
            idx = random.randint(0, len(gs.tiles) - 1)
            gs.tiles[idx].eco = max(0, gs.tiles[idx].eco - 5 * severity * eco_mult)

    # Invasive species after TP1
    if gs.tp1_triggered and random.random() < 0.15:
        idx = random.randint(0, len(gs.tiles) - 1)
        gs.tiles[idx].eco = max(0, gs.tiles[idx].eco - 5)

    # Infrastructure cascade after TP2
    if gs.tp2_triggered and random.random() < 0.10:
        for _ in range(random.randint(2, 3)):
            idx = random.randint(0, len(gs.tiles) - 1)
            gs.tiles[idx].eco = max(0, gs.tiles[idx].eco - 8)


# ============================================================
# PROJECT SYSTEM
# ============================================================

def get_available_projects(gs: GameState) -> List[str]:
    available = []
    for name, info in PROJECTS.items():
        stage_req = info[8]
        if stage_req == 'awakening':
            available.append(name)
        elif stage_req == 'transition' and stage_num(gs.stage) >= 1:
            available.append(name)
        elif stage_req == 'transition' and gs.eco >= 75:
            available.append(name)
    return available


def start_project(gs: GameState, proj_name: str, tile_idx: int,
                  community_led: bool = False, community_proposed: bool = False) -> bool:
    if len(gs.active_projects) >= max_concurrent_projects(gs.trust):
        return False

    info = PROJECTS[proj_name]
    base_cost = info[0]
    base_duration = info[1]

    cost = base_cost
    duration = base_duration

    if community_proposed:
        cost *= 0.85
    if community_led:
        cost *= 1.30
        duration = math.ceil(duration * 1.5)

    if 'green_infra_grants' in gs.enacted_policies and info[6] == 'ecology':
        cost *= 0.80
    if 'water_commons' in gs.enacted_policies and proj_name in ('wetland_restoration',):
        cost *= 0.70

    if gs.budget < cost:
        return False

    gs.budget -= cost
    gs.total_spending += cost

    ap = ActiveProject(
        name=proj_name, tile_idx=tile_idx,
        progress=0, duration=duration,
        is_community_led=community_led,
        is_community_proposed=community_proposed,
    )
    gs.active_projects.append(ap)
    return True


def advance_projects(gs: GameState):
    s = season(gs.turn)
    completed = []

    for proj in gs.active_projects:
        info = PROJECTS[proj.name]
        advance = 1

        if s == 'spring' and not gs.tp1_triggered and info[6] == 'ecology':
            advance += 1
        if s == 'winter' and info[7]:
            advance = max(0, advance - 1)

        proj.progress += advance
        if proj.progress >= proj.duration:
            completed.append(proj)

    for proj in completed:
        gs.active_projects.remove(proj)
        complete_project(gs, proj)


def complete_project(gs: GameState, proj: ActiveProject):
    info = PROJECTS[proj.name]
    tile = gs.tiles[proj.tile_idx]
    tile_eco_gain = info[2]
    food_gain = info[3]
    trust_gain = info[4]
    revenue = info[5]

    # Contamination effectiveness reduction (tile eco only)
    effective_tile_eco = tile_eco_gain
    if tile.contamination > 30 and info[6] == 'ecology':
        effective_tile_eco *= 0.5

    # Community-led trust bonus / Player-initiated trust penalty
    if proj.is_community_led:
        trust_gain *= 1.60
    else:
        trust_gain *= 0.60

    if proj.is_community_proposed:
        trust_gain *= 1.50

    # Apply tile eco
    tile.eco = clamp(tile.eco + effective_tile_eco)

    # City-wide eco: direct global boost from project completion
    # The spec lists "Tile Eco" per project but also shows global eco gains in examples.
    # We model city-wide eco as rising proportional to project tile_eco contribution.
    # Scale factor: project contributes tile_eco * 0.5 to the global meter.
    # This means a Food Forest (+15% tile) gives +7.5% global eco.
    # At ~20 projects over 64 turns, total global eco gain = ~100-150%, which
    # with climate damage creates a race to ~60-80% final eco.
    city_eco_gain = tile_eco_gain * 0.5
    gs.eco = clamp(gs.eco + city_eco_gain)

    # Food and trust
    gs.food = clamp(gs.food + food_gain)
    gs.trust = clamp(gs.trust + trust_gain)

    # Soil remediation
    if proj.name == 'soil_remediation':
        tile.contamination *= 0.4

    # Land trust
    if proj.name == 'land_trust':
        tile.has_land_trust = True

    # Revenue
    if revenue > 0:
        gs.annual_revenue_bonus += revenue

    # Gentrification pressure
    base_gentrif = 8
    if proj.is_community_led:
        base_gentrif *= 0.5
    else:
        base_gentrif *= 1.5

    if tile.community_ownership:
        base_gentrif *= 0.5

    if tile.has_land_trust:
        base_gentrif = 0

    tile.gentrification_pressure = clamp(tile.gentrification_pressure + base_gentrif)

    # Adjacent gentrification
    adj_gentrif = base_gentrif * 0.5
    for i in range(max(0, proj.tile_idx - 2), min(len(gs.tiles), proj.tile_idx + 3)):
        if i != proj.tile_idx:
            gs.tiles[i].gentrification_pressure = clamp(
                gs.tiles[i].gentrification_pressure + adj_gentrif)

    if proj.is_community_led:
        tile.community_ownership = True

    tile.completed_projects.append(proj.name)
    gs.completed_project_names.append(proj.name)
    gs.total_projects_completed += 1

    if proj.name in GROWTH_PROJECTS:
        gs.growth_count += 1
    if proj.name in DEGROWTH_PROJECTS:
        gs.degrowth_count += 1
    if proj.is_community_led:
        gs.community_led_count += 1
    else:
        gs.player_initiated_count += 1


# ============================================================
# POLICY SYSTEM
# ============================================================

def try_enact_policy(gs: GameState, policy_name: str) -> bool:
    if policy_name in gs.enacted_policies:
        return False

    info = POLICIES[policy_name]
    base_threshold = info[0]
    enact_cost = info[1]

    effective_threshold = base_threshold * 0.95

    if gs.will < effective_threshold:
        return False

    # Council vote for major policies (threshold > 40)
    if base_threshold > 40:
        yes_votes = 0
        for disp in gs.council_dispositions:
            if disp >= 30:
                yes_votes += 1
            elif disp >= 0:
                if random.random() < 0.5 + disp / 100:
                    yes_votes += 1
            elif disp >= -10:
                if random.random() < 0.3:
                    yes_votes += 1
        if yes_votes < 5:
            gs.will = clamp(gs.will - enact_cost)
            return False

    gs.will = clamp(gs.will - enact_cost)
    gs.enacted_policies.append(policy_name)
    gs.policies_enacted_count += 1

    if policy_name == 'participatory_budgeting':
        gs.trust = clamp(gs.trust + 3)
    elif policy_name == 'water_commons':
        gs.food = clamp(gs.food + 5)
        gs.trust = clamp(gs.trust + 3)
    elif policy_name == 'coop_tax_incentives':
        gs.annual_revenue_bonus += 0.15

    return True


def apply_policy_drains(gs: GameState):
    total_drain = 0
    for pname in gs.enacted_policies:
        info = POLICIES[pname]
        drain = min(0.5, info[2])
        total_drain += drain
    total_drain = min(4.0, total_drain)
    gs.will = clamp(gs.will - total_drain)


# ============================================================
# NARRATIVE SYSTEM
# ============================================================

def apply_narrative_actions(gs: GameState, strategy: str):
    n_actions = narrative_actions_per_turn(gs.trust)
    s = season(gs.turn)
    winter_bonus = 0.5 if s == 'winter' else 0

    for _ in range(n_actions):
        if strategy in ('ecology', 'balanced', 'pure_degrowth'):
            action_type = random.choice(['community_meeting', 'education', 'cultural_event'])
        elif strategy == 'community':
            action_type = random.choice(['community_meeting', 'cultural_event', 'community_meeting'])
        elif strategy == 'policy':
            action_type = random.choice(['media_campaign', 'education', 'media_campaign'])
        elif strategy == 'aggressive_growth':
            action_type = random.choice(['media_campaign', 'demonstration', 'media_campaign'])
        else:
            action_type = random.choice(['community_meeting', 'media_campaign', 'education', 'cultural_event'])

        topic = action_type
        consec = gs.consecutive_narrative.get(topic, 0)
        compounding = min(0.25, consec * 0.05)
        multiplier = 1.0 + compounding
        gs.consecutive_narrative[topic] = consec + 1

        if action_type == 'community_meeting':
            gs.will = clamp(gs.will + (1.0 + winter_bonus) * multiplier)
            gs.trust = clamp(gs.trust + 0.5 * multiplier)
        elif action_type == 'media_campaign':
            gs.will = clamp(gs.will + (1.5 + winter_bonus) * multiplier)
        elif action_type == 'education':
            gs.will = clamp(gs.will + (1.0 + winter_bonus) * multiplier)
        elif action_type == 'cultural_event':
            gs.will = clamp(gs.will + (1.0 + winter_bonus) * multiplier)
            gs.trust = clamp(gs.trust + 2.0 * multiplier)
        elif action_type == 'demonstration':
            gs.will = clamp(gs.will + (2.0 + winter_bonus) * multiplier)
            gs.trust = clamp(gs.trust - 2.0)


def apply_counter_narratives(gs: GameState):
    worst_drain = 0
    worst_name = None

    for name, (prob, will_drain, effect, trigger) in COUNTER_NARRATIVES.items():
        if trigger == 'always':
            pass
        elif trigger == 'land_reform_policy':
            if 'community_land_trust' not in gs.enacted_policies:
                continue
        elif trigger == '3+_policies':
            if len(gs.enacted_policies) < 3:
                continue
        elif trigger == 'restoration+':
            if stage_num(gs.stage) < 2:
                continue
        elif trigger == '3+_projects':
            if len(gs.active_projects) < 3:
                continue

        if random.random() < prob:
            if will_drain > worst_drain:
                worst_drain = will_drain
                worst_name = name

    if worst_name:
        cn = COUNTER_NARRATIVES[worst_name]
        gs.will = clamp(gs.will - cn[1])
        effect = cn[2]
        if effect.startswith('trust_'):
            val = float(effect.split('_')[1])
            gs.trust = clamp(gs.trust + val)
        elif effect.startswith('budget_'):
            val = float(effect.split('_')[1])
            gs.budget += val


# ============================================================
# METER FEEDBACK
# ============================================================

def apply_feedback_loops(gs: GameState):
    # Political Will regeneration: +1 baseline + trust bonus
    will_regen = 1.0 + max(0, (gs.trust - 40) * 0.1)
    gs.will = clamp(gs.will + will_regen)

    # Food Sovereignty -> Trust
    trust_food = max(0, (gs.food - 20) * 0.05)
    gs.trust = clamp(gs.trust + trust_food)

    # Trust passive decay
    gs.trust = clamp(gs.trust - 0.3)

    # Fall food bonus
    if season(gs.turn) == 'fall':
        bonus = 1.0
        if gs.tp1_triggered:
            bonus *= 0.5
        gs.food = clamp(gs.food + bonus)

    # Leader trust -> Community Trust (small bonus: avg/50, so max ~+2%)
    if gs.leader_trusts:
        avg_leader = sum(gs.leader_trusts) / len(gs.leader_trusts)
        gs.trust = clamp(gs.trust + avg_leader / 50)

    # Council disposition -> Will (small: +0.5 per ally, -0.5 per adversary)
    allies = sum(1 for d in gs.council_dispositions if d >= 30)
    adversaries = sum(1 for d in gs.council_dispositions if d <= -30)
    gs.will = clamp(gs.will + (allies - adversaries) * 0.5)


# ============================================================
# GENTRIFICATION SYSTEM
# ============================================================

def apply_gentrification_effects(gs: GameState):
    for tile in gs.tiles:
        tile.gentrification_pressure = max(0, tile.gentrification_pressure - 2)

        if tile.gentrification_pressure >= 50:
            gs.trust = clamp(gs.trust - 0.05)  # Mild erosion per tile

        if tile.gentrification_pressure >= 75 and not tile.has_land_trust:
            gs.trust = clamp(gs.trust - 0.3)
            gs.tiles_displaced += 1
            tile.gentrification_pressure = max(0, tile.gentrification_pressure - 10)


# ============================================================
# CHARACTER SYSTEM
# ============================================================

def update_characters(gs: GameState, strategy: str):
    # Leader interactions: ONE proposal per leader per turn, weighted by strategy
    for i in range(len(gs.leader_trusts)):
        if gs.leader_trusts[i] < -50:
            # Hostile: no proposals, active opposition
            gs.will = clamp(gs.will - 0.3)
            continue

        if gs.leader_trusts[i] < 0:
            # Disillusioned: no proposals
            continue

        # Leader proposes. Player responds based on strategy.
        roll = random.random()
        if strategy in ('community', 'pure_degrowth'):
            # High acceptance
            if roll < 0.55:
                gs.leader_trusts[i] = min(100, gs.leader_trusts[i] + 10)
            elif roll < 0.80:
                gs.leader_trusts[i] = min(100, gs.leader_trusts[i] + 3)
            elif roll < 0.95:
                gs.leader_trusts[i] -= 5
            else:
                gs.leader_trusts[i] -= 15
        elif strategy in ('ecology', 'balanced'):
            if roll < 0.35:
                gs.leader_trusts[i] = min(100, gs.leader_trusts[i] + 10)
            elif roll < 0.60:
                gs.leader_trusts[i] = min(100, gs.leader_trusts[i] + 3)
            elif roll < 0.85:
                gs.leader_trusts[i] -= 5
            else:
                gs.leader_trusts[i] -= 15
        elif strategy == 'policy':
            if roll < 0.25:
                gs.leader_trusts[i] = min(100, gs.leader_trusts[i] + 10)
            elif roll < 0.50:
                gs.leader_trusts[i] = min(100, gs.leader_trusts[i] + 3)
            elif roll < 0.80:
                gs.leader_trusts[i] -= 5
            else:
                gs.leader_trusts[i] -= 15
        elif strategy == 'aggressive_growth':
            if roll < 0.20:
                gs.leader_trusts[i] = min(100, gs.leader_trusts[i] + 10)
            elif roll < 0.40:
                gs.leader_trusts[i] = min(100, gs.leader_trusts[i] + 3)
            elif roll < 0.70:
                gs.leader_trusts[i] -= 5
            else:
                gs.leader_trusts[i] -= 15

    # Leader trust decay (applied AFTER interactions)
    for i in range(len(gs.leader_trusts)):
        if gs.leader_trusts[i] >= 60:
            gs.leader_trusts[i] -= 0.5
        elif gs.leader_trusts[i] > -50:
            if gs.leader_trusts[i] > 0:
                gs.leader_trusts[i] -= 1.0
            elif gs.leader_trusts[i] < 0:
                gs.leader_trusts[i] += 1.0

    # Council: slowly shift from policies enacted
    for i in range(len(gs.council_dispositions)):
        leaning = COUNCIL_MEMBERS[i][2]
        # Each enacted policy per turn nudges council
        policy_effect = len(gs.enacted_policies) * 0.1
        if leaning == 'progressive':
            gs.council_dispositions[i] = min(100, gs.council_dispositions[i] + policy_effect)
        elif leaning == 'conservative':
            gs.council_dispositions[i] = max(-100, gs.council_dispositions[i] - policy_effect * 0.5)
        elif leaning == 'moderate_conservative':
            gs.council_dispositions[i] = max(-100, gs.council_dispositions[i] - policy_effect * 0.3)

    # Council decay
    for i in range(len(gs.council_dispositions)):
        if gs.council_dispositions[i] >= 60:
            gs.council_dispositions[i] -= 0.5
        elif -50 < gs.council_dispositions[i] < 50:
            if gs.council_dispositions[i] > 0:
                gs.council_dispositions[i] -= 0.5
            elif gs.council_dispositions[i] < 0:
                gs.council_dispositions[i] += 0.5

    # Clamp
    for i in range(len(gs.leader_trusts)):
        gs.leader_trusts[i] = max(-100, min(100, gs.leader_trusts[i]))
    for i in range(len(gs.council_dispositions)):
        gs.council_dispositions[i] = max(-100, min(100, gs.council_dispositions[i]))


def update_antagonists(gs: GameState):
    if gs.turn >= 4 and not gs.antagonist_active['cross']:
        gs.antagonist_active['cross'] = True
        gs.antagonist_levels['cross'] = 1
    if gs.trust > 55 and not gs.antagonist_active['voss']:
        gs.antagonist_active['voss'] = True
        gs.antagonist_levels['voss'] = 1
    if stage_num(gs.stage) >= 1 and not gs.antagonist_active['chen']:
        gs.antagonist_active['chen'] = True
        gs.antagonist_levels['chen'] = 1

    for ant in ['cross', 'voss', 'webb', 'chen']:
        if gs.antagonist_active.get(ant) and gs.antagonist_levels.get(ant, 0) < 5:
            if gs.turn % 4 == 0:
                gs.antagonist_levels[ant] = min(5, gs.antagonist_levels.get(ant, 0) + 1)

    for ant, active in gs.antagonist_active.items():
        if active:
            level = gs.antagonist_levels.get(ant, 0)
            if ant == 'webb':
                gs.will = clamp(gs.will - 0.2 * level)
            if ant == 'cross' and level >= 3:
                gs.trust = clamp(gs.trust - 0.1 * (level - 2))
            if ant == 'voss' and gs.budget < 2.0:
                gs.will = clamp(gs.will - 0.3 * level)


# ============================================================
# BUDGET SYSTEM
# ============================================================

def budget_replenishment(gs: GameState):
    s = season(gs.turn)
    if s != 'spring' or gs.turn == 1:
        return

    base = 1.5
    eco_mod = gs.eco * 0.005
    trust_mod = gs.trust * 0.003
    modifier = 0.5 + eco_mod + trust_mod
    replenishment = base * modifier

    revenue = gs.annual_revenue_bonus
    total = replenishment + revenue

    gs.budget += total
    gs.total_revenue += total

    maintenance = gs.degrowth_count * DEGROWTH_MAINTENANCE
    gs.budget -= maintenance
    gs.total_maintenance += maintenance

    if gs.cahokia_active:
        gs.budget -= total * 0.20


# ============================================================
# STAGE TRANSITIONS
# ============================================================

def check_stage_transition(gs: GameState):
    path = gs.specialization_path
    n_transition = tiles_at_visual(gs.tiles, 'transition')
    n_restoration = tiles_at_visual(gs.tiles, 'restoration')

    if gs.stage == 'awakening':
        if path == 'ecology':
            if gs.eco >= 45 and gs.food >= 35 and n_transition >= 6 and gs.trust >= 35:
                gs.stage = 'transition'
                gs.trust = clamp(gs.trust + 3)
                gs.will = clamp(gs.will + 2)
        elif path == 'community':
            if gs.trust >= 65 and gs.food >= 35 and gs.community_led_count >= 5 and gs.eco >= 20:
                gs.stage = 'transition'
                gs.trust = clamp(gs.trust + 3)
                gs.will = clamp(gs.will + 2)
        elif path == 'policy':
            if len(gs.enacted_policies) >= 4 and gs.will >= 55 and gs.eco >= 25 and gs.trust >= 40:
                gs.stage = 'transition'
                gs.trust = clamp(gs.trust + 3)
                gs.will = clamp(gs.will + 2)
        else:  # balanced
            if gs.trust >= 50 and gs.eco >= 25 and gs.food >= 20 and n_transition >= 5:
                gs.stage = 'transition'
                gs.trust = clamp(gs.trust + 3)
                gs.will = clamp(gs.will + 2)

    elif gs.stage == 'transition':
        if path == 'ecology':
            if gs.eco >= 70 and gs.food >= 55 and n_transition >= 12:
                gs.stage = 'restoration'
                gs.trust = clamp(gs.trust + 5)
                gs.will = clamp(gs.will + 3)
        elif path == 'community':
            if gs.trust >= 80 and gs.eco >= 50 and gs.food >= 55 and gs.community_led_count >= 10:
                gs.stage = 'restoration'
                gs.trust = clamp(gs.trust + 5)
                gs.will = clamp(gs.will + 3)
        elif path == 'policy':
            if len(gs.enacted_policies) >= 5 and gs.will >= 60 and gs.eco >= 50 and n_transition >= 10:
                gs.stage = 'restoration'
                gs.trust = clamp(gs.trust + 5)
                gs.will = clamp(gs.will + 3)
        else:
            if gs.trust >= 70 and gs.eco >= 55 and gs.food >= 55 and gs.will >= 40 and n_transition >= 15:
                gs.stage = 'restoration'
                gs.trust = clamp(gs.trust + 5)
                gs.will = clamp(gs.will + 3)

    elif gs.stage == 'restoration':
        regional_done = 'regional_collab' in gs.completed_project_names
        if gs.eco >= 80 and gs.food >= 75 and n_restoration >= 25 and regional_done:
            gs.stage = 'beyond'
            gs.will = clamp(gs.will + 5)


# ============================================================
# RE-ELECTION
# ============================================================

def check_reelection(gs: GameState) -> bool:
    score = gs.trust

    for d in gs.council_dispositions:
        if d >= 30:
            score += 3
        elif d <= -30:
            score -= 3

    for t in gs.leader_trusts:
        if t >= 40:
            score += 5
        elif t <= -20:
            score -= 5

    advocates = sum(1 for t in gs.leader_trusts if t >= 40)
    coalitions = advocates // 3
    score += coalitions * 8

    for ant, level in gs.antagonist_levels.items():
        if gs.antagonist_active.get(ant) and level >= 3:
            score -= 3

    won = score >= 50
    gs.reelection_results.append(won)
    if won:
        gs.will = clamp(gs.will + 5)
        gs.budget += 0.5
    return won


# ============================================================
# BEYOND THE MAP
# ============================================================

def update_continental_goals(gs: GameState):
    if gs.stage != 'beyond':
        return

    if gs.eco > 50:
        gs.continental_goals['watershed'] = clamp(
            gs.continental_goals['watershed'] + (gs.eco - 50) * 0.5)

    corridors = gs.completed_project_names.count('wildlife_corridor')
    gs.continental_goals['wildlife'] = clamp(
        gs.continental_goals['wildlife'] + corridors * 2)

    if gs.food > 60:
        gs.continental_goals['food_network'] = clamp(
            gs.continental_goals['food_network'] + (gs.food - 60) * 0.4)

    bc_progress = 0
    if tiles_at_visual(gs.tiles, 'restoration') >= 20:
        bc_progress += 1
    if gs.cahokia_active:
        bc_progress += 2
    goals_above_50 = sum(1 for g in ['watershed', 'wildlife', 'food_network']
                         if gs.continental_goals.get(g, 0) >= 50)
    bc_progress += goals_above_50
    if gs.eco < 70:
        bc_progress -= 3
    gs.continental_goals['buffalo_commons'] = clamp(
        gs.continental_goals['buffalo_commons'] + bc_progress)

    for city_name, city in gs.ai_cities.items():
        base_eco = 0.5
        base_food = 0.3
        base_trust = 0.4

        if city['stage'] == 'transition':
            base_eco *= 1.5; base_food *= 1.5; base_trust *= 1.5
        elif city['stage'] == 'restoration':
            base_eco *= 2.0; base_food *= 2.0; base_trust *= 2.0

        city['eco'] = clamp(city['eco'] + base_eco + random.uniform(-0.5, 0.5))
        city['food'] = clamp(city['food'] + base_food + random.uniform(-0.3, 0.3))
        city['trust'] = clamp(city['trust'] + base_trust + random.uniform(-0.3, 0.3))

        if gs.climate >= 85 and city['stage'] == 'awakening':
            if random.random() < 0.15:
                city['eco'] = max(0, city['eco'] - 20)
                city['trust'] = max(0, city['trust'] - 10)

        if city['stage'] == 'awakening':
            if city['eco'] >= 25 and city['food'] >= 20 and city['trust'] >= 50:
                city['stage'] = 'transition'
        elif city['stage'] == 'transition':
            if city['eco'] >= 55 and city['food'] >= 55 and city['trust'] >= 70:
                city['stage'] = 'restoration'

    for city_name, city in gs.ai_cities.items():
        if city['eco'] > 70 and city['stage'] in ('restoration', 'beyond'):
            gs.continental_goals['watershed'] = clamp(
                gs.continental_goals['watershed'] + 1.0)
        if city['stage'] in ('restoration', 'beyond') and city['eco'] > 65:
            gs.continental_goals['wildlife'] = clamp(
                gs.continental_goals['wildlife'] + 2.0)
        if city['food'] > 60:
            gs.continental_goals['food_network'] = clamp(
                gs.continental_goals['food_network'] + 2.0)


# ============================================================
# STRATEGY AI
# ============================================================

def pick_project_for_strategy(gs: GameState, strategy: str) -> Optional[Tuple[str, int, bool, bool]]:
    available = get_available_projects(gs)
    if not available:
        return None

    candidate_tiles = [(i, t) for i, t in enumerate(gs.tiles) if t.eco < 85]
    if not candidate_tiles:
        return None

    if strategy == 'ecology':
        preferred = ['food_forest', 'native_planting', 'rain_garden', 'soil_remediation',
                      'wetland_restoration', 'greenway']
        community_led = True
        community_proposed = random.random() < 0.4
    elif strategy == 'community':
        preferred = ['food_forest', 'community_kitchen', 'land_trust', 'maker_space',
                      'rain_garden', 'native_planting']
        community_led = True
        community_proposed = random.random() < 0.6
    elif strategy == 'policy':
        preferred = ['solar_grid', 'greenway', 'food_forest', 'maker_space']
        community_led = False
        community_proposed = False
    elif strategy == 'aggressive_growth':
        preferred = ['solar_grid', 'maker_space', 'greenway', 'food_forest']
        community_led = False
        community_proposed = False
    elif strategy == 'pure_degrowth':
        preferred = ['food_forest', 'native_planting', 'rain_garden', 'wetland_restoration',
                      'soil_remediation']
        community_led = True
        community_proposed = random.random() < 0.5
    else:  # balanced
        preferred = ['food_forest', 'rain_garden', 'solar_grid', 'maker_space',
                      'greenway', 'native_planting', 'community_kitchen']
        community_led = random.random() < 0.5
        community_proposed = random.random() < 0.3

    for pname in preferred:
        if pname not in available:
            continue
        info = PROJECTS[pname]

        if pname in ('food_forest', 'community_kitchen'):
            valid = [(i, t) for i, t in candidate_tiles if t.contamination <= 50 and t.eco < 85]
        elif info[6] == 'ecology':
            valid = [(i, t) for i, t in candidate_tiles if t.eco < 70]
        else:
            valid = candidate_tiles

        if valid:
            # Strategy: prioritize tiles closest to the next visual threshold
            # to push them over (especially to reach 40% for transition visual)
            def tile_priority(it):
                idx, t = it
                eco = t.eco
                # Prioritize tiles between 25-39% (close to transition threshold)
                if 25 <= eco < 40:
                    return -1000 + eco  # Highest priority: push over 40%
                elif 55 <= eco < 70:
                    return -500 + eco   # Push over 70% for restoration
                else:
                    return eco  # Default: lowest eco first
            valid.sort(key=tile_priority)
            tile_idx = valid[0][0]

            cost = info[0]
            if community_proposed:
                cost *= 0.85
            if community_led:
                cost *= 1.30
            if 'green_infra_grants' in gs.enacted_policies and info[6] == 'ecology':
                cost *= 0.80

            # Budget safety: keep at least $0.5M reserve
            if gs.budget >= cost + 0.5:
                return (pname, tile_idx, community_led, community_proposed)

    return None


def pick_policy_for_strategy(gs: GameState, strategy: str) -> Optional[str]:
    if strategy == 'ecology':
        order = ['urban_ag_zoning', 'green_infra_grants', 'water_commons']
    elif strategy == 'community':
        order = ['community_land_trust', 'participatory_budgeting', 'urban_ag_zoning']
    elif strategy == 'policy':
        order = ['urban_ag_zoning', 'green_infra_grants', 'coop_tax_incentives',
                 'participatory_budgeting', 'community_land_trust', 'water_commons']
    elif strategy == 'aggressive_growth':
        order = ['coop_tax_incentives', 'green_infra_grants', 'urban_ag_zoning']
    elif strategy == 'pure_degrowth':
        order = ['urban_ag_zoning', 'green_infra_grants', 'community_land_trust']
    else:
        order = ['urban_ag_zoning', 'green_infra_grants', 'coop_tax_incentives',
                 'community_land_trust', 'participatory_budgeting', 'water_commons']

    for pname in order:
        if pname not in gs.enacted_policies:
            info = POLICIES[pname]
            eff_threshold = info[0] * 0.95
            # Need enough will to pass threshold AND survive the cost
            if gs.will >= eff_threshold and gs.will >= info[1] + 15:
                return pname
    return None


# ============================================================
# MAIN TURN LOOP
# ============================================================

def simulate_turn(gs: GameState, strategy: str):
    climate_tick(gs)
    climate_events(gs)

    # Start projects (pace: try 1-2 per turn)
    max_proj = max_concurrent_projects(gs.trust)
    attempts = 0
    while len(gs.active_projects) < max_proj and attempts < 2:
        proj = pick_project_for_strategy(gs, strategy)
        if proj:
            start_project(gs, proj[0], proj[1], proj[2], proj[3])
        else:
            break
        attempts += 1

    # Policy (try every few turns)
    if strategy in ('policy',) or (strategy in ('balanced', 'aggressive_growth') and gs.turn % 2 == 0) or \
       (strategy in ('ecology', 'community', 'pure_degrowth') and gs.turn % 4 == 0):
        policy = pick_policy_for_strategy(gs, strategy)
        if policy:
            try_enact_policy(gs, policy)

    apply_narrative_actions(gs, strategy)

    advance_projects(gs)
    apply_policy_drains(gs)
    apply_counter_narratives(gs)
    apply_feedback_loops(gs)
    budget_replenishment(gs)
    apply_gentrification_effects(gs)
    update_characters(gs, strategy)
    update_antagonists(gs)
    check_stage_transition(gs)

    if gs.stage == 'beyond':
        update_continental_goals(gs)

    gs.budget = max(0, gs.budget)

    # Record history
    gs.history['trust'].append(gs.trust)
    gs.history['eco'].append(gs.eco)
    gs.history['food'].append(gs.food)
    gs.history['will'].append(gs.will)
    gs.history['budget'].append(gs.budget)
    gs.history['climate'].append(gs.climate)
    gs.history['gentrif_avg'].append(avg_gentrification(gs.tiles))
    gs.history['tiles_transformed'].append(tiles_at_visual(gs.tiles, 'transition'))
    gs.history['projects_completed'].append(gs.total_projects_completed)
    gs.history['leader_trust_avg'].append(
        sum(gs.leader_trusts) / len(gs.leader_trusts) if gs.leader_trusts else 0)
    gs.history['council_disp_avg'].append(
        sum(gs.council_dispositions) / len(gs.council_dispositions) if gs.council_dispositions else 0)
    gs.history['stage_num'].append(stage_num(gs.stage))
    gs.history['revenue'].append(gs.total_revenue)
    gs.history['maintenance'].append(gs.total_maintenance)
    gs.history['spending'].append(gs.total_spending)


def simulate_game(strategy: str, seed: Optional[int] = None) -> GameState:
    if seed is not None:
        random.seed(seed)

    path_map = {
        'ecology': 'ecology',
        'community': 'community',
        'policy': 'policy',
        'balanced': 'balanced',
        'aggressive_growth': 'balanced',
        'pure_degrowth': 'ecology',
    }

    gs = init_game(path=path_map.get(strategy, 'balanced'))
    gs.specialization_path = path_map.get(strategy, 'balanced')

    for turn in range(1, 65):
        gs.turn = turn
        gs.year = year_from_turn(turn)

        simulate_turn(gs, strategy)

        if turn in (16, 32, 48, 64):
            if not check_reelection(gs):
                break

    return gs
