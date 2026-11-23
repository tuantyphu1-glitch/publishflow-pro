"""Character look-dev renders (animation muted): front, 45 degrees, full body.
python lookdev.py <blend> <outdir> [percent] [samples]"""
import bpy, sys, os, math
from mathutils import Vector, Euler
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
blend, outdir = ARGS[0], ARGS[1]
pct = int(ARGS[2]) if len(ARGS) > 2 else 100
spp = int(ARGS[3]) if len(ARGS) > 3 else 64
bpy.ops.wm.open_mainfile(filepath=blend)
s = bpy.context.scene
for name in ("CTRL_Master", "RIG_Character", "Camera", "CAM_Target"):
    o = bpy.data.objects[name]
    if o.animation_data: o.animation_data.action = None
for o in bpy.data.objects:
    if o.name.startswith("Eye_") and o.animation_data: o.animation_data.action = None; o.scale = (1, 1, 1)
mouth = bpy.data.objects["Mouth"]
mouth.data.shape_keys.animation_data_clear()
mouth.data.shape_keys.key_blocks["Open"].value = 0.75
master = bpy.data.objects["CTRL_Master"]; master.location = (0, 0, 0); master.rotation_euler = (0, 0, 0)
rig = bpy.data.objects["RIG_Character"]

def rot(name, e, loc=None):
    pb = rig.pose.bones[name]; R = pb.bone.matrix_local.to_3x3()
    pb.rotation_quaternion = (R.inverted() @ Euler([math.radians(a) for a in e]).to_matrix() @ R).to_quaternion()
    if loc: pb.location = R.inverted() @ Vector(loc)
for pb in rig.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
rot("hips", (3, 2, 0), (0, 0, -0.04)); rot("spine", (2, 0, 0)); rot("chest", (0, -2, 0))
rot("head", (-4, -5, 4))
rot("upper_arm.L", (-8, -6, 0)); rot("forearm.L", (-28, 0, 0))
rot("upper_arm.R", (-4, 8, 0)); rot("forearm.R", (-22, 0, 0))
cam = bpy.data.objects["Camera"]
for c in list(cam.constraints): cam.constraints.remove(c)
tgt = bpy.data.objects["CAM_Target"]
for c in list(tgt.constraints): tgt.constraints.remove(c)
cam.constraints.new("TRACK_TO").target = tgt
cam.constraints[0].track_axis, cam.constraints[0].up_axis = "TRACK_NEGATIVE_Z", "UP_Y"
s.render.use_motion_blur = False
s.render.resolution_percentage = pct
s.eevee.taa_render_samples = spp
os.makedirs(outdir, exist_ok=True)
SHOTS = {  # name: camera position, look-at, lens, fstop
    "view_front":     ((0.0, -2.6, 1.05), (0, 0, 0.98), 60, 2.8),
    "view_45deg":     ((1.75, -1.75, 1.15), (0.0, 0, 1.0), 60, 2.8),
    "view_fullbody":  ((1.95, -3.45, 0.70), (0.0, 0, 0.82), 40, 4.0),
}
ONLY = os.environ.get("ONLY")
for n, (cp, tp, lens, fs) in SHOTS.items():
    if ONLY and n != ONLY: continue
    cam.location, tgt.location = cp, tp
    cam.data.lens = lens; cam.data.dof.aperture_fstop = fs
    s.frame_set(1)
    s.render.filepath = os.path.join(outdir, n + ".png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", n, flush=True)
