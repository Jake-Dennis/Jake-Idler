extends Node

signal round_processed(round_data: Dictionary)
signal combat_finished(result: Dictionary)

var running: bool = false
var tick_timer: Timer = null

# Combat state
var heroes: Array = []   # { hero_id, role, pos, hp, max_hp, atk, def, healing, alive }
var monsters: Array = [] # { name, is_boss, atk, def, max_hp, current_hp }
var current_monster_index: int = 0
var monsters_defeated: int = 0
var total_monsters: int = 0
var floor_number: int = 0
var floor_completed: bool = false
var floor_failed: bool = false
var round_index: int = 0
var total_gold: int = 0

const POS_PRIORITY = ["front", "middle", "rear"]
const HEAL_PRIORITY = ["tank", "dps", "healer"]

func start_combat(party: Array, floor_mobs: Array, floor: int) -> void:
	# party: [{ hero_id, role, position, atk, def, hp, healing }]
	# floor_mobs: from DungeonData.generate_floor()
	heroes = party.duplicate(true)
	monsters = floor_mobs.duplicate(true)
	current_monster_index = 0
	monsters_defeated = 0
	total_monsters = monsters.size()
	floor_number = floor
	floor_completed = false
	floor_failed = false
	round_index = 0
	total_gold = 0
	running = true

	if tick_timer == null:
		tick_timer = Timer.new()
		tick_timer.timeout.connect(_on_tick)
		add_child(tick_timer)
	tick_timer.start(1.0)

func stop_combat() -> void:
	running = false
	if tick_timer:
		tick_timer.stop()

func _on_tick() -> void:
	if not running:
		return
	_process_round()

func _process_round() -> void:
	round_index += 1

	var current_monster = _get_current_monster()
	if current_monster == null:
		floor_completed = true
		_finish(true)
		return

	var alive_heroes = []
	for h in heroes:
		if h.alive:
			alive_heroes.append(h)

	if alive_heroes.size() == 0:
		floor_failed = true
		_finish(false)
		return

	var hero_data = []
	var total_dps = 0
	var last_crit = false
	var total_healing = 0

	# ─── 1. Healers heal ───────────────────────────────────
	for h in alive_heroes:
		if h.healing <= 0:
			hero_data.append(_make_hdata(h, 0, false, 0, 0, false, 0))
			continue

		var targets = []
		for t in alive_heroes:
			if t.hero_id != h.hero_id:
				targets.append(t)

		if targets.size() == 0:
			hero_data.append(_make_hdata(h, 0, false, 0, 0, false, 0))
			continue

		targets.sort_custom(func(a, b): return _heal_sort(a, b))
		var target = targets[0]
		var heal_amt = round(h.healing * 0.5)
		var actual = mini(heal_amt, target.max_hp - target.hp)
		if actual > 0:
			target.hp = mini(target.max_hp, target.hp + actual)
			total_healing += actual

		hero_data.append(_make_hdata(h, 0, false, actual, 0, false, 0))

	# ─── 2. DPS attack ─────────────────────────────────────
	for h in alive_heroes:
		if h.role != "dps":
			continue
		var dmg = DungeonData.calc_player_damage(h.atk, current_monster.def)
		var crit = randf() < 0.1
		current_monster.current_hp = maxi(0, current_monster.current_hp - dmg)
		total_dps += dmg
		if dmg > 0:
			last_crit = crit

		var existing = null
		for hd in hero_data:
			if hd.hero_id == h.hero_id:
				existing = hd
				break
		if existing:
			existing.damage = dmg
			existing.crit = crit
		else:
			hero_data.append(_make_hdata(h, dmg, crit, 0, 0, false, 0))

	# ─── 3. Monsters attack ────────────────────────────────
	var monster_list = []
	for i in range(current_monster_index, monsters.size() - 1):
		var m = monsters[i]
		if m.current_hp > 0:
			monster_list.append(m)

	# Boss multi-attack if all trash dead
	var boss_fight = monster_list.size() == 0
	if boss_fight:
		var boss = monsters[monsters.size() - 1]
		if boss != null and boss.current_hp > 0:
			for i in heroes.size():
				monster_list.append(boss)

	# Find target (tank → dps → healer)
	var target = null
	for pos in POS_PRIORITY:
		for h in alive_heroes:
			if h.position == pos and h.alive:
				target = h
				break
		if target:
			break
	if target == null and alive_heroes.size() > 0:
		target = alive_heroes[0]

	var total_mon_dmg = 0
	var any_crit = false
	if target:
		for m in monster_list:
			var dmg = DungeonData.calc_monster_damage(m.atk, target.def)
			total_mon_dmg += dmg
			if dmg > 0:
				any_crit = any_crit or (randf() < 0.1)

		target.hp = maxi(0, target.hp - total_mon_dmg)
		if target.hp <= 0:
			target.alive = false

		var existing = null
		for hd in hero_data:
			if hd.hero_id == target.hero_id:
				existing = hd
				break
		if existing:
			existing.damage_taken = total_mon_dmg
			existing.monster_crit = any_crit
			existing.hp = target.hp

	# ─── 4. Emit round ─────────────────────────────────────
	var monster_died = current_monster.current_hp <= 0
	var round_data = {
		"round": round_index,
		"heroes": hero_data,
		"monster_name": current_monster.name,
		"monster_is_boss": current_monster.is_boss,
		"monster_hp": current_monster.current_hp,
		"monster_max_hp": current_monster.max_hp,
		"total_damage": total_dps,
		"total_monster_damage": total_mon_dmg,
		"monster_died": monster_died,
	}
	round_processed.emit(round_data)

	# ─── 5. Monster died handling ─────────────────────────
	if monster_died:
		monsters_defeated += 1
		total_gold += current_monster.gold_reward
		var next_idx = current_monster_index + 1

		if next_idx < monsters.size():
			current_monster_index = next_idx
		else:
			floor_completed = true
			_finish(true)
			return

	# ─── 6. Wipe check ─────────────────────────────────────
	var all_dead = true
	for h in heroes:
		if h.alive:
			all_dead = false
			break
	if all_dead:
		floor_failed = true
		_finish(false)

func _get_current_monster():
	if current_monster_index < monsters.size():
		return monsters[current_monster_index]
	return null

func _make_hdata(h, dmg, crit, healing, dmg_taken, mon_crit, healing_recv) -> Dictionary:
	return {
		"hero_id": h.hero_id,
		"role": h.role,
		"position": h.position,
		"damage": dmg,
		"crit": crit,
		"healing_done": healing,
		"hp": h.hp,
		"max_hp": h.max_hp,
		"alive": h.alive,
		"damage_taken": dmg_taken,
		"monster_crit": mon_crit,
		"healing_received": healing_recv,
	}

func _heal_sort(a, b) -> bool:
	var pa = HEAL_PRIORITY.find(a.role)
	var pb = HEAL_PRIORITY.find(b.role)
	if pa != pb:
		return pa < pb
	return (float(a.hp) / a.max_hp) < (float(b.hp) / b.max_hp)

func _finish(won: bool) -> void:
	running = false
	if tick_timer:
		tick_timer.stop()
	combat_finished.emit({
		"won": won,
		"rounds": round_index,
		"gold": total_gold,
		"monsters_defeated": monsters_defeated,
		"total_monsters": total_monsters,
	})
