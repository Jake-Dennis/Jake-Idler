extends Node

# ─── Monster Generation ───────────────────────────────────────

const BASE_MONSTER_ATK = 50
const BASE_MONSTER_DEF = 5
const BASE_MONSTER_HP = 8000
const FLOOR_EXP = 0.5

var trash_names = ["Goblin", "Skeleton", "Slime", "Bat", "Spider", "Wolf", "Zombie", "Ghost", "Orc", "Demon"]
var boss_prefixes = ["Brutal", "Vicious", "Colossal", "Dread", "Infernal"]
var bracket_boss_names = ["Demon Lord", "Ancient Wyrm", "Lich King", "Titan", "Void Walker"]

func generate_monster(floor_num: int, is_boss: bool = false) -> Dictionary:
	var scale = pow(floor_num, FLOOR_EXP)
	var atk = round(BASE_MONSTER_ATK * scale * (2.0 if is_boss else 1.0))
	var def = round(BASE_MONSTER_DEF * scale * (2.0 if is_boss else 1.0))
	var hp = round(BASE_MONSTER_HP * scale * (3.0 if is_boss else 1.0))

	var monster_name = ""
	if is_boss:
		monster_name = boss_prefixes[floor_num % 5] + " " + trash_names[floor_num % trash_names.size()]
	else:
		monster_name = trash_names[floor_num % trash_names.size()]

	return {
		"name": monster_name,
		"is_boss": is_boss,
		"atk": atk,
		"def": def,
		"max_hp": hp,
		"current_hp": hp,
		"xp_reward": round(20 * scale * (3 if is_boss else 1)),
		"gold_reward": round(10 * scale * (3 if is_boss else 1)),
	}

func generate_floor(floor_number: int) -> Array:
	# Returns array of monster dicts (trash + boss at end)
	var monsters = []
	var trash_count = 1 + (floor_number % 2)
	for i in trash_count:
		monsters.append(generate_monster(floor_number, false))
	monsters.append(generate_monster(floor_number, true))
	return monsters

# ─── Damage Formula ───────────────────────────────────────────

func calc_monster_damage(monster_atk: float, target_def: float) -> int:
	var ratio = monster_atk / (monster_atk + target_def)
	var base = 1.0 + ratio * 9.0
	var variance = (randf() - 0.5) * 4.0
	var crit = randf() < 0.1
	var dmg = round((base + variance) * (2.0 if crit else 1.0))
	return maxi(1, int(dmg))

func calc_player_damage(player_atk: float, monster_def: float) -> int:
	var base = player_atk - monster_def
	if base <= 0:
		return maxi(1, int(base))
	var variance = 0.8 + randf() * 0.4
	var crit = randf() < 0.1
	var dmg = round(base * variance * (1.5 if crit else 1.0))
	return maxi(1, int(dmg))

# ─── Loot ─────────────────────────────────────────────────────

func roll_loot(floor_number: int, is_boss: bool, is_bracket_boss: bool) -> Dictionary:
	var gold = round(10 * pow(floor_number, FLOOR_EXP) * (3 if is_boss else 1))
	var result = { "gold": gold, "equipment": null }

	# Shard drops
	var rarities = [Global.Rarity.COMMON, Global.Rarity.UNCOMMON, Global.Rarity.RARE, Global.Rarity.EPIC, Global.Rarity.LEGENDARY]
	var weights = [60, 25, 10, 4, 1]
	var roll = randf() * 100.0
	var cumulative = 0
	var dropped_rarity = rarities[0]
	for i in weights.size():
		cumulative += weights[i]
		if roll <= cumulative:
			dropped_rarity = rarities[i]
			break

	var rarity_key = Global.Rarity.find_key(dropped_rarity)
	if rarity_key != null:
		Global.shards[rarity_key.to_lower()] += 1

	# Bracket bosses drop equipment
	if is_bracket_boss:
		var slots = ["rightHandWeapon", "leftHand", "helmet", "body", "legs", "boots", "gloves",
			"necklace", "leftRing", "rightRing", "leftEarring", "rightearring"]
		var slot = slots[randi() % slots.size()]
		var types_by_slot = {
			"rightHandWeapon": ["melee", "range", "mage"],
			"leftHand": ["melee", "range", "mage"],
		}
		var equip_type = types_by_slot.get(slot, ["universal"])[randi() % types_by_slot.get(slot, ["universal"]).size()]
		var rarity = rarities[randi() % rarities.size()]
		var bracket = ceil(floor_number / 10.0)
		var level = bracket * 10
		result.equipment = {
			"id": str(randi()),
			"slot": slot,
			"type": equip_type,
			"level": level,
			"rarity": rarity,
			"stats": Global.compute_item_stats(slot, level, rarity),
		}

	return result
