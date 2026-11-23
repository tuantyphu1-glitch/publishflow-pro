"""Automated QA for skateboard_360.blend: ground penetration, wheel contact,
foot lock, IK reach, camera framing. python check_animation.py <blend> <json_out>"""
import bpy, sys, json, math
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
blend, out = ARGS[0], ARGS[1]
bpy.ops.wm.open_mainfile(filepath=blend)
s = bpy.context.scene
cam = s.camera
objs = [o for c in ("Character", "Skateboard") for o in bpy.data.collections[c].all_objects if o.type == "MESH"]
local = {}
for o in objs:
    n = len(o.data.vertices)
    a = np.empty(n * 3, dtype=np.float64); o.data.vertices.foreach_get("co", a)
    local[o.name] = np.c_[a.reshape(-1, 3), np.ones(n)]
master, rig, deck = bpy.data.objects["CTRL_Master"], bpy.data.objects["RIG_Character"], bpy.data.objects["Board_Deck"]
wheels = [o for o in objs if o.name.startswith("Wheel_") and o.name.count("_") == 1]
shoes = [bpy.data.objects["Shoe_Sole_L"], bpy.data.objects["Shoe_Sole_R"]]
res = {"frames": {}}
worst = {"min_z": (1e9, 0), "frame_margin": (1e9, 0), "ik_gap": (0, 0), "foot_drift": (0, 0)}
ref_shoe = None
dg = bpy.context.evaluated_depsgraph_get()
for f in range(s.frame_start, s.frame_end + 1):
    s.frame_set(f)
    allpts = []
    minz = 1e9
    for o in objs:
        M = np.array(o.evaluated_get(dg).matrix_world)
        w = local[o.name] @ M.T
        allpts.append(w[:, :3])
        minz = min(minz, w[:, 2].min())
    P = np.vstack(allpts)
    # subsample for projection
    P = P[:: max(1, len(P) // 4000)]
    proj = np.array([tuple(world_to_camera_view(s, cam, Vector(p))) for p in P])
    margin = min(proj[:, 0].min(), proj[:, 1].min(), 1 - proj[:, 0].max(), 1 - proj[:, 1].max())
    wheel_bottom = min(np.min(local[w.name] @ np.array(w.evaluated_get(dg).matrix_world).T, axis=0)[2] for w in wheels)
    gaps = []
    for sd in ("L", "R"):
        tail = rig.matrix_world @ rig.pose.bones[f"shin.{sd}"].tail
        tgt = rig.matrix_world @ rig.pose.bones[f"foot_IK.{sd}"].head
        gaps.append((tail - tgt).length)
    dm = deck.matrix_world.inverted()
    shoe_local = [tuple(dm @ sh.matrix_world.translation) for sh in shoes]
    if ref_shoe is None: ref_shoe = shoe_local
    drift = max((Vector(a) - Vector(b)).length for a, b in zip(shoe_local, ref_shoe))
    mz = master.matrix_world.translation.z
    res["frames"][f] = dict(min_z=round(float(minz), 4), wheel_bottom=round(float(wheel_bottom), 4),
                            margin=round(float(margin), 4), edges=[round(float(v),3) for v in (proj[:,0].min(), proj[:,1].min(), 1-proj[:,0].max(), 1-proj[:,1].max())], ik_gap=round(max(gaps), 4),
                            foot_drift=round(drift, 5), master_z=round(mz, 4),
                            spin_deg=round(math.degrees(master.rotation_euler.z), 2))
    if minz < worst["min_z"][0]: worst["min_z"] = (float(minz), f)
    if margin < worst["frame_margin"][0]: worst["frame_margin"] = (float(margin), f)
    if max(gaps) > worst["ik_gap"][0]: worst["ik_gap"] = (max(gaps), f)
    if drift > worst["foot_drift"][0]: worst["foot_drift"] = (drift, f)
fr = res["frames"]
air = [f for f in fr if fr[f]["master_z"] > 1e-4]
grounded = [f for f in fr if fr[f]["master_z"] <= 1e-4]
res["summary"] = {
    "lowest_point_m": worst["min_z"], "tightest_frame_margin": worst["frame_margin"],
    "max_ik_gap_m": worst["ik_gap"], "max_foot_drift_on_deck_m": worst["foot_drift"],
    "airborne_frames": [min(air), max(air)] if air else None,
    "grounded_wheel_bottom_range": [min(fr[f]["wheel_bottom"] for f in grounded), max(fr[f]["wheel_bottom"] for f in grounded)],
    "apex_height_m": max(fr[f]["master_z"] for f in fr),
    "final_spin_deg": fr[s.frame_end]["spin_deg"],
    "frames_with_margin_below_2pct": [f for f in fr if fr[f]["margin"] < 0.02],
}
json.dump(res, open(out, "w"), indent=1)
print(json.dumps(res["summary"], indent=1))
