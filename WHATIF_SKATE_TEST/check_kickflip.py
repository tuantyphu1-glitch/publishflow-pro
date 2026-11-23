"""Automated QA for Double_Kickflip_720.blend
python check_kickflip.py <blend> <reference_v2.blend> <json_out>
Checks: 1 leg length, 2 board flip = 720 deg, 3 body does not rotate with the board,
4 feet re-catch the board before landing, 5 four wheels touch the ground on landing,
6 camera framing; plus floor / board penetration and foot sliding on the deck."""
import bpy, sys, json, math
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
blend, ref_blend, out = ARGS[0:3]
DECK = 0.104

# ---- reference leg length (v2)
bpy.ops.wm.open_mainfile(filepath=ref_blend)
rb = bpy.data.objects["RIG_Character"].data.bones
ref = {n: rb[n].length for n in ("thigh.L", "shin.L")}
ref_total_h = max((o.matrix_world @ Vector(c)).z for o in bpy.data.collections["Character"].all_objects
                  if o.type == "MESH" for c in o.bound_box)

bpy.ops.wm.open_mainfile(filepath=blend)
s = bpy.context.scene
cam = s.camera
dg = bpy.context.evaluated_depsgraph_get()
rig = bpy.data.objects["RIG_Character"]
master = bpy.data.objects["CTRL_Master"]
broot = bpy.data.objects["BOARD_Root"]
bctrl = bpy.data.objects["BOARD_Ctrl"]
B = rig.data.bones
new = {n: B[n].length for n in ("thigh.L", "shin.L")}

char = [o for o in bpy.data.collections["Character"].all_objects if o.type == "MESH"]
board = [o for o in bpy.data.collections["Skateboard"].all_objects if o.type == "MESH"]
wheels = [o for o in board if o.name.startswith("Wheel_") and o.name.count("_") == 1]
soles = [bpy.data.objects["Shoe_Sole_L"], bpy.data.objects["Shoe_Sole_R"]]


def local(o):
    n = len(o.data.vertices)
    a = np.empty(n * 3); o.data.vertices.foreach_get("co", a)
    return np.c_[a.reshape(-1, 3), np.ones(n)]


LV = {o.name: local(o) for o in char + board}


def world(o):
    return (LV[o.name] @ np.array(o.evaluated_get(dg).matrix_world).T)[:, :3]


def deck_top(x):
    ax = np.abs(x)
    return DECK + np.where(ax > 0.26, 0.05 * ((ax - 0.26) / 0.14) ** 2, 0.0)


F = {}
prev_ang, flip_unwrapped = None, 0.0
for f in range(s.frame_start, s.frame_end + 1):
    s.frame_set(f)
    BW = np.array(broot.matrix_world)
    Binv = np.linalg.inv(BW)
    # --- flip angle: board 'up' axis seen around the board's long axis
    up = broot.matrix_world.to_3x3() @ Vector((0, 0, 1))
    ang = math.atan2(-up.y, up.z)
    if prev_ang is not None:
        d = ang - prev_ang
        d = (d + math.pi) % (2 * math.pi) - math.pi
        flip_unwrapped += d
    prev_ang = ang
    # --- body orientation (master + rig root must not rotate; torso lean only)
    body_rot = math.degrees(rig.matrix_world.to_quaternion().angle)
    chest_y = (rig.matrix_world @ rig.pose.bones["chest"].matrix).to_3x3() @ Vector((0, 1, 0))
    torso_tilt = math.degrees(chest_y.angle(Vector((0, 0, 1))))
    # --- penetration: character vertices inside the board volume (board-local box)
    pen_board, minz_char = 0, 1e9
    allp = []
    for o in char:
        W = world(o)
        allp.append(W)
        minz_char = min(minz_char, W[:, 2].min())
        L = np.c_[W, np.ones(len(W))] @ Binv.T
        inside = (np.abs(L[:, 0]) < 0.40) & (np.abs(L[:, 1]) < 0.105) & (L[:, 2] > 0.0) & \
                 (L[:, 2] < deck_top(L[:, 0]) - 0.002)
        pen_board += int(inside.sum())
    minz_board = min(world(o)[:, 2].min() for o in board)
    wb = [float(world(w)[:, 2].min()) for w in wheels]
    # --- feet on the deck?
    gaps, sole_local = [], []
    for so in soles:
        L = np.c_[world(so), np.ones(len(LV[so.name]))] @ Binv.T
        gaps.append(float(L[:, 2].min() - DECK))
        sole_local.append(L[:, :3].mean(axis=0))
    # --- camera framing
    P = np.vstack(allp + [world(o) for o in board])
    P = P[:: max(1, len(P) // 4000)]
    pr = np.array([tuple(world_to_camera_view(s, cam, Vector(p))) for p in P])
    margin = float(min(pr[:, 0].min(), pr[:, 1].min(), 1 - pr[:, 0].max(), 1 - pr[:, 1].max()))
    F[f] = dict(flip_deg=round(math.degrees(flip_unwrapped), 2), body_rot_deg=round(body_rot, 3),
                torso_tilt_deg=round(torso_tilt, 1), pen_board=pen_board,
                minz_char=round(float(minz_char), 4), minz_board=round(float(minz_board), 4),
                wheel_bottoms=[round(v, 4) for v in wb], sole_gap=[round(g, 4) for g in gaps],
                sole_local=[[round(float(v), 4) for v in sl] for sl in sole_local],
                master_z=round(master.matrix_world.translation.z, 4), margin=round(margin, 4))

fr = sorted(F)
air = [f for f in fr if F[f]["master_z"] > 1e-4]
land = max(air) + 1
flip_frames = [f for f in fr if 1.0 < F[f]["flip_deg"] < 719.0]
flip_end = max(flip_frames) + 1
caught = [f for f in fr if f >= flip_end and max(abs(g) for g in F[f]["sole_gap"]) < 0.003]
catch = min(caught) if caught else None
on_board = [f for f in fr if f >= (catch or 10 ** 9)]
drift = max((np.linalg.norm(np.array(F[f]["sole_local"][k]) - np.array(F[catch]["sole_local"][k]))
             for f in on_board for k in (0, 1)), default=None)
pre_drift = max(np.linalg.norm(np.array(F[f]["sole_local"][k]) - np.array(F[1]["sole_local"][k]))
                for f in range(1, 62) for k in (0, 1))
leg_ratio = (new["thigh.L"] + new["shin.L"]) / (ref["thigh.L"] + ref["shin.L"])
total_h = max((o.matrix_world @ Vector(c)).z for o in char for c in o.bound_box) if False else None
s.frame_set(1)

R = {
    "1_leg_length": {"thigh_ratio": round(new["thigh.L"] / ref["thigh.L"], 3),
                     "shin_ratio": round(new["shin.L"] / ref["shin.L"], 3),
                     "leg_ratio": round(leg_ratio, 3), "pass": 1.15 <= leg_ratio <= 1.20},
    "2_board_flip": {"total_deg": F[fr[-1]]["flip_deg"], "flip_frames": [min(flip_frames), flip_end],
                     "pass": abs(F[fr[-1]]["flip_deg"] - 720) < 0.5},
    "3_body_not_rotating": {"max_body_rot_deg": max(F[f]["body_rot_deg"] for f in fr),
                            "max_torso_tilt_deg": max(F[f]["torso_tilt_deg"] for f in fr),
                            "pass": max(F[f]["body_rot_deg"] for f in fr) < 0.01},
    "4_catch_before_landing": {"catch_frame": catch, "landing_frame": land,
                               "frames_on_board_before_landing": (land - catch) if catch else None,
                               "pass": catch is not None and catch < land},
    "5_four_wheels_on_landing": {"landing_frame": land, "wheel_bottoms": F[land]["wheel_bottoms"],
                                 "pass": all(-0.0015 <= w <= 0.0015 for w in F[land]["wheel_bottoms"])},
    "6_camera_framing": {"min_margin": min(F[f]["margin"] for f in fr),
                         "worst_frame": min(fr, key=lambda f: F[f]["margin"]),
                         "pass": min(F[f]["margin"] for f in fr) > 0.0},
    "extra_no_board_penetration": {"frames_with_penetration": [f for f in fr if F[f]["pen_board"] > 0],
                                   "pass": all(F[f]["pen_board"] == 0 for f in fr)},
    "extra_no_floor_penetration": {"min_char_z": min(F[f]["minz_char"] for f in fr),
                                   "min_board_z": min(F[f]["minz_board"] for f in fr),
                                   "pass": min(min(F[f]["minz_char"], F[f]["minz_board"]) for f in fr) > -0.001},
    "extra_no_foot_slide": {"after_catch_m": round(float(drift), 6) if drift is not None else None,
                            "before_pop_m": round(float(pre_drift), 6),
                            "pass": drift is not None and drift < 0.001 and pre_drift < 0.001},
    "info": {"airborne": [min(air), max(air)], "apex_m": max(F[f]["master_z"] for f in fr)},
}
R["ALL_PASS"] = all(v["pass"] for k, v in R.items() if isinstance(v, dict) and "pass" in v)
json.dump({"summary": R, "frames": F}, open(out, "w"), indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))
print(json.dumps(R, indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o)))
