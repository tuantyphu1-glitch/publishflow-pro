"""
DOUBLE KICKFLIP 720  - 240 frames @ 30 fps
Re-uses the v2 character / skateboard / skatepark from build_scene.py (sections 1-6,
unchanged), lengthens the legs (LEG_SCALE) and builds a new animation in which the
board flips independently of the character.

Run:  python build_kickflip.py <output_dir>
Saves <output_dir>/Double_Kickflip_720.blend

Control hierarchy
  CTRL_Master  : travel (X) + body flight height (Z). Never rotates.
    RIG_Character : armature; foot_IK bones are animated so the feet leave and re-catch the board
    BOARD_Ctrl    : board pivot at the board's centre line (z = PIV). Animated: height
                    relative to the body, ollie pitch (rot Y) and the kickflip (rot X, 720 deg)
      BOARD_Root  : deck, trucks, wheels (unchanged)
"""
import os, sys, math

HERE = os.path.dirname(os.path.abspath(__file__))
LEG_SCALE = 1.20            # legs about +18 %
src = open(os.path.join(HERE, "build_scene.py")).read()
marker = src.index("# 7. ANIMATION")
marker = src.rindex("# ====", 0, marker)
exec(compile(src[:marker], "build_scene.py(sections 1-6)", "exec"))   # character, board, park, lights

from mathutils import Vector, Euler
from bpy_extras import anim_utils

F_START, F_END = 1, 240
PIV = 0.065                   # flip axis height above the ground when the board is grounded

# ---------------------------------------------------------------- board control
board_ctrl = bpy.data.objects.new("BOARD_Ctrl", None)
board_ctrl.empty_display_type = "SINGLE_ARROW"
board_ctrl.empty_display_size = 0.5
C_BOARD.objects.link(board_ctrl)
board_ctrl.parent = master
board_ctrl.location = (0, 0, PIV)
board_ctrl.rotation_mode = "XYZ"
board_root.parent = board_ctrl
board_root.location = (0, 0, -PIV)


def fcurves(idb):
    ad = idb.animation_data
    return anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot).fcurves


def key_curve(obj, path, index, keys):
    """keys: (frame, value, slope_in, slope_out) in units/frame; cubic-Hermite handles
    at 1/3 of the neighbouring interval, FREE handles allow velocity breaks."""
    prop = getattr(obj, path)
    for f, v, _, _ in keys:
        prop[index] = v
        obj.keyframe_insert(path, index=index, frame=f)
    fc = fcurves(obj).find(path, index=index)
    kp = sorted(fc.keyframe_points, key=lambda k: k.co.x)
    for i, k in enumerate(kp):
        _, _, sin, sout = keys[i]
        k.interpolation = "BEZIER"
        k.handle_left_type = k.handle_right_type = "FREE"
        dl = (k.co.x - kp[i - 1].co.x) / 3 if i > 0 else 5
        dr = (kp[i + 1].co.x - k.co.x) / 3 if i < len(kp) - 1 else 5
        k.handle_left = (k.co.x - dl, k.co.y - sin * dl)
        k.handle_right = (k.co.x + dr, k.co.y + sout * dr)
    return fc


def key_auto(obj, path, index, keys):
    """plain auto-clamped Bezier keys (ease in / ease out)"""
    prop = getattr(obj, path)
    for f, v in keys:
        prop[index] = v
        obj.keyframe_insert(path, index=index, frame=f)


# ---------------------------------------------------------------- body travel + flight
fc_x = key_curve(master, "location", 0, [
    (1, 0.0, 0.070, 0.070),
    (62, 4.30, 0.072, 0.072),
    (118, 7.55, 0.040, 0.040),     # stylised hang time while the board flips
    (181, 10.97, 0.072, 0.072),
    (240, 14.57, 0.050, 0.050),
])
fc_z = key_curve(master, "location", 2, [
    (1, 0.0, 0.0, 0.0),
    (62, 0.0, 0.0, 0.036),         # pop: velocity break
    (118, 0.80, 0.0, 0.0),         # apex
    (181, 0.0, -0.034, 0.0),       # impact: velocity break, then rolling
    (240, 0.0, 0.0, 0.0),
])

# ---------------------------------------------------------------- board: height, ollie pitch, double kickflip
key_auto(board_ctrl, "location", 2, [(1, PIV), (62, PIV), (78, PIV), (92, PIV - 0.065), (150, PIV - 0.065),
                                     (160, PIV), (240, PIV)])
key_auto(board_ctrl, "rotation_euler", 1, [(1, 0.0), (62, 0.0), (68, math.radians(-10)), (78, math.radians(-2)),
                                           (86, 0.0), (240, 0.0)])
fc_flip = key_curve(board_ctrl, "rotation_euler", 0, [
    (1, 0.0, 0, 0),
    (89, 0.0, 0, 0),
    (121, 2 * math.pi, 0.235, 0.235),   # first rotation done, still spinning fast
    (153, 4 * math.pi, 0, 0),           # second rotation done -> wheels down again
    (240, 4 * math.pi, 0, 0),
])

# wheels roll with the distance travelled
for w in wheels:
    for f in range(F_START, F_END + 1):
        w.rotation_euler[1] = fc_x.evaluate(f) / WHEEL_R
        w.keyframe_insert("rotation_euler", index=1, frame=f)
    for k in fcurves(w).find("rotation_euler", index=1).keyframe_points:
        k.interpolation = "LINEAR"


# ---------------------------------------------------------------- character
def key_bone(f, name, rot=None, loc=None):
    pb = rig.pose.bones[name]
    R = pb.bone.matrix_local.to_3x3()
    if rot is not None:
        E = Euler([math.radians(a) for a in rot], "XYZ").to_matrix()
        pb.rotation_quaternion = (R.inverted() @ E @ R).to_quaternion()
        pb.keyframe_insert("rotation_quaternion", frame=f)
    if loc is not None:
        pb.location = R.inverted() @ Vector(loc)
        pb.keyframe_insert("location", frame=f)


def P(hips_l, hips_r, spine, chest, neck, head, uaL, faL, uaR, faR):
    return {"hips": (hips_r, hips_l), "spine": (spine, None), "chest": (chest, None), "neck": (neck, None),
            "head": (head, None), "upper_arm.L": (uaL, None), "forearm.L": (faL, None),
            "upper_arm.R": (uaR, None), "forearm.R": (faR, None)}


# rotations: degrees around armature axes (X+ lean to the face / arms back, Y+ lean to travel, Z+ turn to travel)
RIDE_A = P((0, 0, -0.05), (4, 6, 0), (3, 3, 4), (2, 2, 8), (0, 0, 6), (-4, -3, 22),
           (-12, -14, 0), (-25, 0, 0), (8, 16, 0), (-15, 0, 0))
RIDE_B = P((0, 0, -0.08), (7, 7, 0), (4, 3, 4), (2, 2, 10), (0, 0, 6), (-2, -4, 24),
           (5, -18, 0), (-25, 0, 0), (20, 20, 0), (-18, 0, 0))
CROUCH = P((0, 0.02, -0.25), (20, 4, 0), (14, 2, 2), (8, 0, 4), (-6, 0, 4), (-22, 0, 16),
           (68, -26, 0), (-8, 0, 0), (68, 26, 0), (-8, 0, 0))
POP = P((0, 0, -0.02), (4, 2, 0), (-2, 0, 0), (-4, 0, 4), (0, 0, 4), (-6, 0, 12),
        (-75, -40, 0), (-25, 0, 0), (-75, 40, 0), (-25, 0, 0))
TUCK = P((0, 0, -0.17), (14, 0, 0), (10, 0, 0), (4, 0, 4), (6, 0, 2), (22, 0, 8),       # head looks at the board
         (-10, -72, 0), (-15, 0, 0), (-10, 72, 0), (-15, 0, 0))
BAL_1 = P((0, 0, -0.17), (14, -3, 0), (10, -3, 0), (4, -2, 4), (6, 0, 2), (24, 3, 10),
          (-25, -86, 8), (-30, 0, 0), (5, 58, 0), (-10, 0, 0))
BAL_2 = P((0, 0, -0.17), (14, 3, 0), (10, 3, 0), (4, 2, 4), (6, 0, 2), (24, -3, 6),
          (5, -58, 0), (-10, 0, 0), (-25, 86, -8), (-30, 0, 0))
CATCH = P((0, 0, -0.09), (9, 0, 0), (6, 0, 0), (2, 0, 6), (4, 0, 4), (12, 0, 14),
          (-12, -60, 0), (-20, 0, 0), (-12, 60, 0), (-20, 0, 0))
EXTEND = P((0, 0, -0.04), (6, 0, 0), (4, 0, 0), (2, 0, 6), (0, 0, 4), (-4, 0, 18),
           (-12, -52, 0), (-20, 0, 0), (-12, 52, 0), (-20, 0, 0))
COMPRESS = P((0, 0.02, -0.26), (20, 4, 0), (12, 2, 2), (6, 0, 6), (6, 0, 4), (2, 0, 16),
             (-30, -30, 0), (-30, 0, 0), (-30, 30, 0), (-30, 0, 0))
REBOUND = P((0, 0, -0.03), (4, 4, 0), (2, 2, 2), (0, 0, 8), (0, 0, 6), (-8, -2, 22),
            (-15, -40, 0), (-20, 0, 0), (-5, 30, 0), (-20, 0, 0))
SETTLE = P((0, 0, -0.07), (6, 6, 0), (3, 3, 4), (2, 2, 8), (0, 0, 6), (-6, -3, 24),
           (-10, -25, 0), (-20, 0, 0), (8, 18, 0), (-15, 0, 0))

for f, p in [(1, RIDE_A), (20, RIDE_B), (40, RIDE_A),
             (56, CROUCH), (61, CROUCH),                  # anticipation
             (68, POP),                                    # explosive extension
             (90, TUCK), (108, BAL_1), (128, BAL_2), (146, TUCK),
             (160, CATCH), (176, EXTEND), (181, EXTEND),   # legs reach for the ground
             (189, COMPRESS), (204, REBOUND), (216, SETTLE), (240, RIDE_A)]:
    for name, (rot, loc) in p.items():
        key_bone(f, name, rot, loc)

# feet: ride on the deck, slide up the nose during the ollie, lift clear of the flip, re-catch
FEET = [  # frame, front foot (L) offset, back foot (R) offset   (armature axes, metres)
    (1, (0, 0, 0), (0, 0, 0)),
    (62, (0, 0, 0), (0, 0, 0)),
    (68, (0, 0, 0.042), (0, 0, 0.0)),
    (78, (0.01, 0, 0.03), (0, 0, 0.012)),
    (90, (0.03, 0, 0.115), (-0.03, 0, 0.115)),
    (150, (0.03, 0, 0.115), (-0.03, 0, 0.115)),
    (160, (0, 0, 0), (0, 0, 0)),
    (240, (0, 0, 0), (0, 0, 0)),
]
for f, l, r in FEET:
    key_bone(f, "foot_IK.L", None, l)
    key_bone(f, "foot_IK.R", None, r)

# face
for e in eyes:
    for f, z in [(1, 1), (28, 1), (31, 0.08), (34, 1), (196, 1), (199, 0.08), (202, 1)]:
        e.scale[2] = z
        e.keyframe_insert("scale", index=2, frame=f)
kb = mouth.data.shape_keys.key_blocks["Open"]
for f, v in [(1, 0.35), (45, 0.3), (58, 0.0), (70, 0.45), (100, 0.15), (150, 0.2), (162, 0.7),
             (181, 0.3), (189, 0.0), (206, 0.8), (240, 1.0)]:
    kb.value = v
    kb.keyframe_insert("value", frame=f)

# ---------------------------------------------------------------- camera (3/4, follows, never spins)
cam_d = bpy.data.cameras.new("Camera")
cam_d.clip_start, cam_d.clip_end = 0.05, 400
cam = bpy.data.objects.new("Camera", cam_d)
C_CAM.objects.link(cam)
scene.camera = cam
tgt = bpy.data.objects.new("CAM_Target", None)
tgt.empty_display_type = "SPHERE"
tgt.empty_display_size = 0.1
C_CAM.objects.link(tgt)
for obj, zinf in ((cam, 0.55), (tgt, 0.85)):
    c1 = obj.constraints.new("COPY_LOCATION")
    c1.name, c1.target = "Follow_XY", master
    c1.use_z, c1.use_y, c1.use_offset = False, obj is tgt, True
    c2 = obj.constraints.new("COPY_LOCATION")
    c2.name, c2.target = "Follow_Z_partial", master
    c2.use_x = c2.use_y = False
    c2.use_offset, c2.influence = True, zinf
tr = cam.constraints.new("TRACK_TO")
tr.target, tr.track_axis, tr.up_axis = tgt, "TRACK_NEGATIVE_Z", "UP_Y"
cam_d.dof.use_dof = True
cam_d.dof.focus_object = tgt
cam_d.dof.aperture_fstop = 4.0


def polar(phi_deg, r, z):
    a = math.radians(phi_deg)
    return (r * math.cos(a), r * math.sin(a), z)


for f, co, to, lens in [
    (1, polar(-38, 4.4, 0.45), (0.10, 0, 0.86), 35),
    (60, polar(-45, 4.1, 0.40), (0.05, 0, 0.76), 35),
    (95, polar(-52, 4.1, 0.50), (0.0, 0, 0.86), 35),
    (150, polar(-58, 4.0, 0.48), (0.0, 0, 0.86), 35),
    (181, polar(-62, 4.0, 0.30), (0.05, 0, 0.80), 35),
    (240, polar(-48, 4.6, 0.55), (0.0, 0, 0.86), 33),
]:
    cam.location = co
    cam.keyframe_insert("location", frame=f)
    tgt.location = to
    tgt.keyframe_insert("location", frame=f)
    cam_d.lens = lens
    cam_d.keyframe_insert("lens", frame=f)

# ---------------------------------------------------------------- render settings
scene.frame_start, scene.frame_end = F_START, F_END
scene.render.fps = 30
scene.frame_set(1)
r = scene.render
r.engine = "BLENDER_EEVEE"
r.resolution_x, r.resolution_y, r.resolution_percentage = 1920, 1080, 100
r.use_motion_blur = True
r.motion_blur_shutter = 0.35
ee = scene.eevee
ee.taa_render_samples = 32
ee.motion_blur_steps = 1
ee.use_shadows = True
ee.shadow_ray_count = 2
ee.shadow_step_count = 6
ee.use_raytracing = False
ee.use_fast_gi = True
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Punchy"
scene.view_settings.exposure = -0.1
r.image_settings.file_format = "PNG"

out_blend = os.path.join(OUT, "Double_Kickflip_720.blend")
bpy.ops.wm.save_as_mainfile(filepath=out_blend, compress=True)
print("SAVED", out_blend)
