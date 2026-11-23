"""
WHATIF SKATE TEST - Skateboard 360
Builds the whole scene (character + rig, skateboard, skatepark, lights, camera,
animation) with the Blender Python API and saves skateboard_360.blend.

Run:  python build_scene.py <output_dir>      (bpy module)
  or  blender -b -P build_scene.py -- <output_dir>

Conventions
  * World units = metres. Travel direction = +X. Z = up.
  * The character stands sideways on the board (regular stance), body facing -Y,
    left side (+X) leading. The camera always stays on the -Y side.
  * Hierarchy:  CTRL_Master (travel / jump / ollie pitch / 360 spin)
                  |- BOARD_Root  (deck, trucks, wheels)
                  |- RIG_Character (armature; feet IK bones live under 'root',
                                    so the feet are locked to the deck)
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix, Euler, Quaternion

argv = sys.argv
OUT = argv[argv.index("--") + 1] if "--" in argv else (argv[1] if len(argv) > 1 else os.getcwd())
os.makedirs(OUT, exist_ok=True)

FPS, F_START, F_END = 30, 1, 450
DECK = 0.104          # top of the deck (flat part) when the board is on the ground
WHEEL_R = 0.03

# ---------------------------------------------------------------- reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = "SkateTest"
COLL = scene.collection


def collection(name):
    c = bpy.data.collections.new(name)
    COLL.children.link(c)
    return c


C_CHAR = collection("Character")
C_BOARD = collection("Skateboard")
C_ENV = collection("Skatepark")
C_CITY = collection("City")
C_CAM = collection("Camera_Lights")

# ---------------------------------------------------------------- materials
def principled(name, color, rough=0.5, metal=0.0, sheen=0.0, coat=0.0,
               emit=None, estr=0.0, spec=0.5):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    b = nt.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Sheen Weight"].default_value = sheen
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Specular IOR Level"].default_value = spec
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = estr
    m.diffuse_color = (*color, 1)
    return m


M = {
    "skin": principled("Toy_White", (0.86, 0.86, 0.88), rough=0.38, coat=0.25),
    "hoodie": principled("Hoodie_Blue", (0.018, 0.10, 0.72), rough=0.75, sheen=0.6),
    "hoodie_dark": principled("Hoodie_Blue_Seam", (0.010, 0.06, 0.45), rough=0.8, sheen=0.4),
    "string": principled("Drawstring_White", (0.9, 0.9, 0.9), rough=0.6),
    "eye": principled("Eye_Black", (0.005, 0.005, 0.008), rough=0.12, coat=1.0),
    "eye_hi": principled("Eye_Highlight", (1, 1, 1), rough=0.3, emit=(1, 1, 1), estr=3.0),
    "mouth": principled("Mouth", (0.16, 0.012, 0.02), rough=0.5),
    "shoe": principled("Shoe_White", (0.9, 0.9, 0.92), rough=0.45),
    "shoe_blue": principled("Shoe_Blue", (0.02, 0.16, 0.85), rough=0.5),
    "sole": principled("Shoe_Sole", (0.75, 0.76, 0.8), rough=0.7),
    "deck": principled("Deck_Blue", (0.06, 0.07, 0.45), rough=0.55),
    "deck_edge": principled("Deck_Wood_Orange", (0.85, 0.42, 0.08), rough=0.5),
    "deck_logo": principled("Deck_Logo", (0.55, 0.6, 0.85), rough=0.4),
    "metal": principled("Truck_Metal", (0.7, 0.72, 0.76), rough=0.3, metal=1.0),
    "wheel": principled("Wheel_Cream", (0.92, 0.86, 0.72), rough=0.45),
    "hub": principled("Wheel_Hub", (0.25, 0.27, 0.32), rough=0.35, metal=0.6),
    "wheel_mark": principled("Wheel_Mark", (0.05, 0.2, 0.9), rough=0.5),
    "trunk": principled("Tree_Trunk", (0.18, 0.1, 0.06), rough=0.8),
    "leaf": principled("Tree_Leaves", (0.22, 0.42, 0.06), rough=0.7, sheen=0.5),
    "leaf2": principled("Tree_Leaves_Warm", (0.4, 0.5, 0.08), rough=0.7, sheen=0.5),
    "pole": principled("Lamp_Pole", (0.25, 0.25, 0.32), rough=0.4, metal=0.8),
    "bulb": principled("Lamp_Bulb", (1, 0.9, 0.7), emit=(1, 0.85, 0.6), estr=12.0),
    "rail": principled("Rail_Metal", (0.55, 0.55, 0.65), rough=0.25, metal=1.0),
    "graffiti": principled("Graffiti", (0.6, 0.35, 0.95), rough=0.5, emit=(0.6, 0.35, 0.95), estr=0.15),
}


def concrete_material(name, tint=(0.60, 0.57, 0.66), joint=4.0):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    bsdf = N.get("Principled BSDF")
    tc = N.new("ShaderNodeTexCoord")
    noise = N.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 3.0
    noise.inputs["Detail"].default_value = 8.0
    L.new(tc.outputs["Object"], noise.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (tint[0] * 0.85, tint[1] * 0.85, tint[2] * 0.88, 1)
    ramp.color_ramp.elements[1].color = (*tint, 1)
    L.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    brick = N.new("ShaderNodeTexBrick")
    brick.offset = 0.0
    brick.squash_frequency = 1
    brick.inputs["Scale"].default_value = 1.0 / joint
    brick.inputs["Mortar Size"].default_value = 0.006
    brick.inputs["Brick Width"].default_value = 1.0
    brick.inputs["Row Height"].default_value = 1.0
    L.new(tc.outputs["Object"], brick.inputs["Vector"])
    mix = N.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    L.new(brick.outputs["Fac"], mix.inputs["Factor"])
    L.new(ramp.outputs["Color"], mix.inputs[6])
    mix.inputs[7].default_value = (tint[0] * 0.45, tint[1] * 0.45, tint[2] * 0.5, 1)
    L.new(mix.outputs[2], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.72
    fine = N.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 60.0
    L.new(tc.outputs["Object"], fine.inputs["Vector"])
    bump = N.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    L.new(fine.outputs["Fac"], bump.inputs["Height"])
    L.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    m.diffuse_color = (*tint, 1)
    return m


def building_material(name, wall, lit=(1.0, 0.78, 0.5)):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    bsdf = N.get("Principled BSDF")
    tc = N.new("ShaderNodeTexCoord")
    brick = N.new("ShaderNodeTexBrick")
    brick.offset = 0.0
    brick.inputs["Scale"].default_value = 0.55
    brick.inputs["Mortar Size"].default_value = 0.45
    brick.inputs["Mortar Smooth"].default_value = 0.0
    brick.inputs["Bias"].default_value = -0.55
    brick.inputs["Brick Width"].default_value = 1.0
    brick.inputs["Row Height"].default_value = 1.2
    brick.inputs["Color1"].default_value = (*lit, 1)
    brick.inputs["Color2"].default_value = (0.08, 0.08, 0.2, 1)
    brick.inputs["Mortar"].default_value = (*wall, 1)
    L.new(tc.outputs["Object"], brick.inputs["Vector"])
    L.new(brick.outputs["Color"], bsdf.inputs["Base Color"])
    inv = N.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    L.new(brick.outputs["Fac"], inv.inputs[1])
    mul = N.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 0.9
    L.new(inv.outputs[0], mul.inputs[0])
    L.new(brick.outputs["Color"], bsdf.inputs["Emission Color"])
    L.new(mul.outputs[0], bsdf.inputs["Emission Strength"])
    bsdf.inputs["Roughness"].default_value = 0.6
    m.diffuse_color = (*wall, 1)
    return m


M["ground"] = concrete_material("Concrete_Ground", (0.60, 0.56, 0.66), joint=4.0)
M["ramp"] = concrete_material("Concrete_Ramp", (0.66, 0.62, 0.74), joint=2.5)
M["wall"] = concrete_material("Concrete_Wall", (0.52, 0.48, 0.62), joint=3.0)
M["bld_near"] = building_material("Building_Near", (0.30, 0.26, 0.55))
M["bld_far"] = building_material("Building_Far", (0.55, 0.45, 0.78))

# ---------------------------------------------------------------- mesh helpers
def make_obj(name, bm, mat=None, coll=C_CHAR, smooth=True, sharp_angle=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        me.shade_smooth()
        if sharp_angle is not None:
            me.set_sharp_from_angle(angle=math.radians(sharp_angle))
    if mat:
        me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    return ob


def bm_sphere(r=1.0, u=40, v=20):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r)
    return bm


def bm_capsule(r, length, u=32, v=16):
    """capsule along local Z, centred at origin, total length = length + 2r"""
    bm = bm_sphere(r, u, v)
    for vert in bm.verts:
        if vert.co.z > 1e-6:
            vert.co.z += length / 2
        elif vert.co.z < -1e-6:
            vert.co.z -= length / 2
    return bm


def bm_box(sx, sy, sz):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for vert in bm.verts:
        vert.co = Vector((vert.co.x * sx, vert.co.y * sy, vert.co.z * sz))
    return bm


def bm_cyl(r, depth, seg=32, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg,
                          radius1=r, radius2=r if r2 is None else r2, depth=depth)
    return bm


def transform_bm(bm, mat):
    bmesh.ops.transform(bm, matrix=mat, verts=bm.verts)
    return bm


def sphere(name, center, scale=(1, 1, 1), r=1.0, mat=None, coll=C_CHAR, rot=None, u=40, v=20):
    bm = bm_sphere(r, u, v)
    S = Matrix.Diagonal((*scale, 1.0))
    R = (rot.to_matrix().to_4x4() if rot is not None else Matrix.Identity(4))
    transform_bm(bm, R @ S)
    ob = make_obj(name, bm, mat, coll)
    ob.location = center
    return ob


def segment(name, a, b, r, mat, coll=C_CHAR, squash=None, u=32, v=16):
    """capsule from point a to point b (world), origin at midpoint"""
    a, b = Vector(a), Vector(b)
    d = b - a
    bm = bm_capsule(r, d.length, u, v)
    if squash:
        transform_bm(bm, Matrix.Diagonal((*squash, 1.0)))
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    transform_bm(bm, q.to_matrix().to_4x4())
    ob = make_obj(name, bm, mat, coll)
    ob.location = (a + b) / 2
    return ob


def text_mesh(name, body, size, extrude, mat, coll, bevel=0.0, align=("CENTER", "CENTER")):
    cu = bpy.data.curves.new(name + "_txt", "FONT")
    cu.body = body
    cu.size = size
    cu.extrude = extrude
    cu.bevel_depth = bevel
    cu.bevel_resolution = 2
    cu.align_x, cu.align_y = align
    tmp = bpy.data.objects.new(name + "_tmp", cu)
    coll.objects.link(tmp)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    me.name = name
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    me.materials.clear()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    return ob


# ======================================================================
# 1. CONTROL HIERARCHY
# ======================================================================
master = bpy.data.objects.new("CTRL_Master", None)
master.empty_display_type = "ARROWS"
master.empty_display_size = 0.6
C_CHAR.objects.link(master)
master.rotation_mode = "XYZ"

board_root = bpy.data.objects.new("BOARD_Root", None)
board_root.empty_display_type = "PLAIN_AXES"
C_BOARD.objects.link(board_root)
board_root.parent = master

# ======================================================================
# 2. SKATEBOARD
# ======================================================================
def build_deck():
    L, W, FLAT, KICK = 0.80, 0.21, 0.26, 0.05
    nx, ny = 48, 10
    bm = bmesh.new()
    grid = []
    for i in range(nx + 1):
        row = []
        x = -L / 2 + L * i / nx
        # stadium outline
        half = W / 2
        rx = L / 2 - half
        if abs(x) > rx:
            dx = abs(x) - rx
            half = math.sqrt(max(half * half - dx * dx, 0.0)) if dx < half else 0.0
            half = max(half, 0.012)
        for j in range(ny + 1):
            y = -half + 2 * half * j / ny
            z = 0.0
            if abs(x) > FLAT:
                t = (abs(x) - FLAT) / (L / 2 - FLAT)
                z = KICK * t * t
            # slight concave
            z += 0.004 * (abs(y) / (W / 2)) ** 2
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for i in range(nx):
        for j in range(ny):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0:
            f.normal_flip()
    ob = make_obj("Board_Deck", bm, M["deck"], C_BOARD)
    ob.data.materials.append(M["deck_edge"])
    sol = ob.modifiers.new("Thickness", "SOLIDIFY")
    sol.thickness = 0.014
    sol.offset = -1.0
    sol.material_offset_rim = 1
    sol.use_even_offset = True
    ob.location = (0, 0, DECK)
    ob.parent = board_root
    # logo underneath (visible during the jump)
    logo = text_mesh("Board_Logo", "H", 0.17, 0.0015, M["deck_logo"], C_BOARD)
    logo.rotation_euler = (math.pi, 0, -math.pi / 2)
    logo.location = (0, 0, DECK - 0.0155)
    logo.parent = board_root
    return ob


deck = build_deck()

wheels = []
for sx in (1, -1):
    xt = 0.255 * sx
    # baseplate + riser
    bp = make_obj(f"Truck_Base_{'F' if sx > 0 else 'B'}", bm_box(0.05, 0.06, 0.012), M["metal"], C_BOARD,
                  sharp_angle=40)
    bp.location = (xt, 0, DECK - 0.020)
    bp.parent = board_root
    king = make_obj(f"Truck_King_{'F' if sx > 0 else 'B'}", bm_cyl(0.014, 0.03), M["metal"], C_BOARD,
                    sharp_angle=40)
    king.location = (xt, 0, DECK - 0.040)
    king.parent = board_root
    hanger_bm = transform_bm(bm_cyl(0.011, 0.17, 20), Matrix.Rotation(math.pi / 2, 4, "X"))
    hanger = make_obj(f"Truck_Hanger_{'F' if sx > 0 else 'B'}", hanger_bm, M["metal"], C_BOARD, sharp_angle=40)
    hanger.location = (xt, 0, WHEEL_R)
    hanger.parent = board_root
    for sy in (1, -1):
        wbm = bm_cyl(WHEEL_R, 0.03, 36)
        bmesh.ops.bevel(wbm, geom=[e for e in wbm.edges if len(e.link_faces) == 2 and
                                      abs(e.link_faces[0].normal.z) + abs(e.link_faces[1].normal.z) > 0.5],
                        offset=0.007, segments=3, affect="EDGES", profile=0.5)
        transform_bm(wbm, Matrix.Rotation(math.pi / 2, 4, "X"))
        tag = ("F" if sx > 0 else "B") + ("L" if sy > 0 else "R")
        w = make_obj(f"Wheel_{tag}", wbm, M["wheel"], C_BOARD, sharp_angle=50)
        w.location = (xt, 0.085 * sy, WHEEL_R)
        w.rotation_mode = "XYZ"
        w.parent = board_root
        hub = make_obj(f"Wheel_{tag}_Hub", transform_bm(bm_cyl(0.012, 0.034, 20), Matrix.Rotation(math.pi / 2, 4, "X")),
                       M["hub"], C_BOARD, sharp_angle=40)
        hub.parent = w
        # printed marks on the outer face so the rotation is readable
        for k in range(3):
            a = k * 2 * math.pi / 3
            mk = make_obj(f"Wheel_{tag}_Mark{k}", bm_box(0.006, 0.002, 0.01), M["wheel_mark"], C_BOARD,
                          sharp_angle=40)
            mk.location = (0.021 * math.cos(a), 0.0155 * sy, 0.021 * math.sin(a))
            mk.rotation_euler = (0, -a, 0)
            mk.parent = w
        wheels.append(w)

# ======================================================================
# 3. CHARACTER RIG (armature)
# ======================================================================
arm_data = bpy.data.armatures.new("RIG_Character")
arm_data.display_type = "STICK"
rig = bpy.data.objects.new("RIG_Character", arm_data)
C_CHAR.objects.link(rig)
rig.parent = master
rig.show_in_front = True
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
EB = arm_data.edit_bones


def bone(name, head, tail, parent=None, connect=False, deform=False):
    b = EB.new(name)
    b.head, b.tail = Vector(head), Vector(tail)
    b.roll = 0.0
    if parent:
        b.parent = EB[parent]
        b.use_connect = connect
    b.use_deform = deform
    return b


ANK = DECK + 0.066
bone("root", (0, 0, 0), (0, 0.35, 0))
bone("hips", (0, 0, 0.60), (0, 0, 0.76), "root")
bone("spine", (0, 0, 0.76), (0, 0, 0.92), "hips", True)
bone("chest", (0, 0, 0.92), (0, 0, 1.06), "spine", True)
bone("neck", (0, 0, 1.06), (0, 0, 1.12), "chest", True)
bone("head", (0, 0, 1.12), (0, 0, 1.42), "neck", True)
for s, sg in (("L", 1), ("R", -1)):
    bone(f"upper_arm.{s}", (0.15 * sg, 0, 1.03), (0.29 * sg, 0.0, 0.87), "chest")
    bone(f"forearm.{s}", (0.29 * sg, 0.0, 0.87), (0.40 * sg, -0.04, 0.72), f"upper_arm.{s}", True)
    bone(f"hand.{s}", (0.40 * sg, -0.04, 0.72), (0.44 * sg, -0.05, 0.66), f"forearm.{s}", True)
    bone(f"thigh.{s}", (0.085 * sg, 0, 0.64), (0.165 * sg, -0.075, 0.405), "hips")
    bone(f"shin.{s}", (0.165 * sg, -0.075, 0.405), (0.22 * sg, 0, ANK), f"thigh.{s}", True)
    bone(f"foot_IK.{s}", (0.22 * sg, 0, ANK), (0.22 * sg, -0.12, ANK), "root")
    bone(f"knee_pole.{s}", (0.26 * sg, -0.9, 0.45), (0.26 * sg, -0.9, 0.55), "root")
bpy.ops.object.mode_set(mode="OBJECT")

for pb in rig.pose.bones:
    pb.rotation_mode = "QUATERNION"

for s in ("L", "R"):
    ik = rig.pose.bones[f"shin.{s}"].constraints.new("IK")
    ik.target = rig
    ik.subtarget = f"foot_IK.{s}"
    ik.pole_target = rig
    ik.pole_subtarget = f"knee_pole.{s}"
    ik.chain_count = 2
    # find the pole angle that keeps the rest pose
    rest_knee = rig.data.bones[f"shin.{s}"].head_local.copy()
    best = None
    for deg in range(-180, 180, 5):
        ik.pole_angle = math.radians(deg)
        bpy.context.view_layer.update()
        err = (rig.pose.bones[f"shin.{s}"].head - rest_knee).length
        if best is None or err < best[0]:
            best = (err, deg)
    ik.pole_angle = math.radians(best[1])
    print(f"IK {s}: pole angle {best[1]} deg (rest error {best[0]:.4f})")

# colour groups for readability
for pb in rig.pose.bones:
    if "IK" in pb.name or "pole" in pb.name:
        pb.color.palette = "THEME01"
    elif pb.name.endswith(".L"):
        pb.color.palette = "THEME03"
    elif pb.name.endswith(".R"):
        pb.color.palette = "THEME04"


def attach(ob, bname):
    """rigid-parent an object (built in rest-pose world space) to a bone"""
    b = rig.data.bones[bname]
    pm = b.matrix_local @ Matrix.Translation((0, b.length, 0))
    ob.parent = rig
    ob.parent_type = "BONE"
    ob.parent_bone = bname
    ob.matrix_parent_inverse = pm.inverted()
    return ob


# ======================================================================
# 4. CHARACTER MESHES  (v2 - look-dev pass: puffy hoodie, eyebrows,
#    tongue, chunky sneakers, soft toy materials). Bones are unchanged.
# ======================================================================
def fabric_material(name, color, sheen_tint=(0.6, 0.75, 1.0), knit=220.0, bump=0.12):
    m = principled(name, color, rough=0.82, sheen=0.9)
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    b = N.get("Principled BSDF")
    b.inputs["Sheen Tint"].default_value = (*sheen_tint, 1)
    b.inputs["Sheen Roughness"].default_value = 0.35
    tc = N.new("ShaderNodeTexCoord")
    wave = N.new("ShaderNodeTexWave")          # fine knit rib
    wave.wave_type = "BANDS"
    wave.bands_direction = "Z"
    wave.inputs["Scale"].default_value = knit
    wave.inputs["Distortion"].default_value = 0.5
    L.new(tc.outputs["Object"], wave.inputs["Vector"])
    noise = N.new("ShaderNodeTexNoise")        # soft folds
    noise.inputs["Scale"].default_value = 9.0
    noise.inputs["Detail"].default_value = 3.0
    L.new(tc.outputs["Object"], noise.inputs["Vector"])
    add = N.new("ShaderNodeMath"); add.operation = "MULTIPLY_ADD"
    L.new(wave.outputs["Fac"], add.inputs[0]); add.inputs[1].default_value = 0.15
    L.new(noise.outputs["Fac"], add.inputs[2])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump
    L.new(add.outputs[0], bp.inputs["Height"])
    L.new(bp.outputs["Normal"], b.inputs["Normal"])
    # darker in cavities -> more volume
    ao = N.new("ShaderNodeAmbientOcclusion"); ao.inputs["Distance"].default_value = 0.05
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 0.5
    mix.inputs[6].default_value = (*color, 1)
    L.new(ao.outputs["Color"], mix.inputs[7])
    L.new(mix.outputs[2], b.inputs["Base Color"])
    return m


def toy_material(name, color, rough=0.42):
    m = principled(name, color, rough=rough, coat=0.12)
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Subsurface Weight"].default_value = 0.12
    b.inputs["Subsurface Radius"].default_value = (0.9, 0.8, 0.75)
    b.inputs["Subsurface Scale"].default_value = 0.02
    b.inputs["Coat Roughness"].default_value = 0.35
    return m


M["skin"] = toy_material("Toy_White", (0.90, 0.90, 0.92))
M["hoodie"] = fabric_material("Hoodie_Blue", (0.008, 0.07, 0.85), sheen_tint=(0.35, 0.5, 1.0))
M["hoodie_dark"] = fabric_material("Hoodie_Blue_Rib", (0.008, 0.055, 0.55), knit=420, bump=0.25)
M["hood_lining"] = fabric_material("Hoodie_Lining", (0.006, 0.04, 0.42))
M["brow"] = principled("Eyebrow", (0.03, 0.03, 0.04), rough=0.5)
M["tongue"] = principled("Tongue", (0.75, 0.16, 0.18), rough=0.45, coat=0.3)
M["mouth"] = principled("Mouth_Inside", (0.11, 0.008, 0.015), rough=0.55)
M["shoe"] = toy_material("Shoe_White", (0.93, 0.93, 0.95), rough=0.5)
M["shoe_blue"] = principled("Shoe_Blue", (0.012, 0.11, 0.85), rough=0.45, coat=0.2)

HEAD_C = Vector((0, 0, 1.365))
HEAD_R = 0.272
attach(sphere("Head", HEAD_C, r=HEAD_R, mat=M["skin"], u=96, v=48), "head")


def on_head(u, v, out=0.0):
    """point on head surface; u = sideways (+X = character's left), v = up, front = -Y"""
    d = Vector((u, -1.0, v)).normalized()
    return HEAD_C + d * (HEAD_R + out), d


def frame_from_normal(d):
    Y = -d
    X = Y.cross(Vector((0, 0, 1))).normalized()
    Z = X.cross(Y).normalized()
    return Matrix((X, Y, Z)).transposed()


def tube_on_head(name, uv_pts, radius, mat, out=0.004, taper=True, flat=0.55):
    """smooth tube that follows the head surface (eyebrows, ...)"""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 4
    cu.use_fill_caps = True
    cu.resolution_u = 16
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(uv_pts) - 1)
    for i, (u, v) in enumerate(uv_pts):
        p, _ = on_head(u, v, out)
        bp = sp.bezier_points[i]
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = "AUTO"
        t = i / (len(uv_pts) - 1)
        bp.radius = (0.45 + 0.55 * math.sin(math.pi * t)) if taper else 1.0
    tmp = bpy.data.objects.new(name + "_tmp", cu)
    C_CHAR.objects.link(tmp)
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    me.name = name
    me.materials.clear(); me.materials.append(mat)
    me.shade_smooth()
    ob = bpy.data.objects.new(name, me)
    C_CHAR.objects.link(ob)
    return ob


# ---- eyes: tall glossy black ovals with two highlights
eyes = []
for s, u in (("L", 0.27), ("R", -0.27)):
    c, d = on_head(u, 0.05, -0.013)
    bm = bm_sphere(1.0, 48, 24)
    transform_bm(bm, Matrix.Diagonal((0.042, 0.027, 0.070, 1)))
    rot = Matrix.Rotation(math.radians(-6 if s == "L" else 6), 3, d) @ frame_from_normal(d)
    transform_bm(bm, rot.to_4x4())
    e = make_obj(f"Eye_{s}", bm, M["eye"])
    e.location = c
    attach(e, "head")
    eyes.append(e)
    for k, (du, dv, rr) in enumerate(((0.045, 0.12, 0.012), (-0.022, 0.0, 0.006))):
        hc, _ = on_head(u + du, dv, 0.004)
        h = sphere(f"Eye_{s}_Highlight{k}", hc, r=rr, mat=M["eye_hi"], u=16, v=8)
        h.parent = e
        h.matrix_parent_inverse = Matrix.Translation(c).inverted()

# ---- eyebrows: soft tapered arcs, slightly raised for a happy look
brows = []
for s, sg in (("L", 1), ("R", -1)):
    pts = [(sg * 0.16, 0.395), (sg * 0.25, 0.44), (sg * 0.36, 0.425)]
    b = tube_on_head(f"Eyebrow_{s}", pts, 0.0115, M["brow"])
    attach(b, "head")
    brows.append(b)


# ---- mouth: open smile cavity (Basis = closed smile, key 'Open') + tongue
NU, NV = 32, 5
MOUTH_CU, MOUTH_CV = 0.03, -0.115


def mouth_grid(kind):
    pts = []
    for i in range(NU + 1):
        s = -1 + 2 * i / NU
        if kind == "open":
            uu = 0.062 * s
            top = 0.010 * s * s - 0.003
            bot = -0.060 * (1 - s * s) ** 0.62 - 0.003
        elif kind == "closed":
            uu = 0.050 * s
            mid = 0.018 * s * s - 0.016
            th = 0.006 * (1 - 0.75 * s * s)
            top, bot = mid + th, mid - th
        elif kind == "tongue_open":
            uu = 0.040 * s
            bot = -0.060 * (1 - (s * 0.64) ** 2) ** 0.62 * 0.97 - 0.003
            top = bot + 0.030 * (1 - s * s) ** 0.8
        else:  # tongue_closed (hidden inside the line)
            uu = 0.030 * s
            mid = 0.018 * (s * 0.6) ** 2 - 0.016
            top, bot = mid + 0.0005, mid - 0.0005
        col = []
        for j in range(NV + 1):
            vv = top + (bot - top) * j / NV
            p, _ = on_head(MOUTH_CU + uu * 1.1 / HEAD_R, MOUTH_CV + vv * 1.1 / HEAD_R, 0.0015)
            col.append(p)
        pts.append(col)
    return pts


def shaped_patch(name, basis, opened, mat, out_offset=0.0, thick=0.005):
    bm = bmesh.new()
    vs = [[bm.verts.new(p) for p in col] for col in basis]
    for i in range(NU):
        for j in range(NV):
            bm.faces.new((vs[i][j], vs[i][j + 1], vs[i + 1][j + 1], vs[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = make_obj(name, bm, mat)
    ob.shape_key_add(name="Basis")
    sk = ob.shape_key_add(name="Open")
    idx = 0
    for col in opened:
        for p in col:
            d = (p - HEAD_C).normalized()
            sk.data[idx].co = p + d * out_offset
            idx += 1
    if out_offset:
        for i, v in enumerate(ob.data.shape_keys.key_blocks["Basis"].data):
            v.co = v.co + (v.co - HEAD_C).normalized() * out_offset
    sol = ob.modifiers.new("Depth", "SOLIDIFY")
    sol.thickness = thick
    attach(ob, "head")
    return ob


mouth = shaped_patch("Mouth", mouth_grid("closed"), mouth_grid("open"), M["mouth"])
tongue = shaped_patch("Tongue", mouth_grid("tongue_closed"), mouth_grid("tongue_open"), M["tongue"],
                      out_offset=0.0012, thick=0.003)
# tongue follows the mouth automatically (simple-expression driver, no scripts needed)
drv = tongue.data.shape_keys.key_blocks["Open"].driver_add("value").driver
drv.type = "SUM"
var = drv.variables.new()
var.targets[0].id_type = "KEY"
var.targets[0].id = mouth.data.shape_keys
var.targets[0].data_path = 'key_blocks["Open"].value'

# neck (mostly hidden by the collar)
attach(segment("Neck", (0, 0, 1.04), (0, 0, 1.16), 0.048, M["skin"]), "neck")

# ---- hoodie body: roomy, puffy lathe with soft folds
TORSO_PROFILE = [(0.575, 0.170), (0.59, 0.192), (0.62, 0.198), (0.68, 0.200), (0.76, 0.206),
                 (0.86, 0.214), (0.95, 0.214), (1.00, 0.204), (1.04, 0.180), (1.075, 0.140),
                 (1.10, 0.090), (1.11, 0.05)]
TORSO_DEPTH = 0.80


def torso_r(z):
    for (z0, r0), (z1, r1) in zip(TORSO_PROFILE, TORSO_PROFILE[1:]):
        if z0 <= z <= z1:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return TORSO_PROFILE[-1][1]


def lathe(name, profile, depth, mat, seg=64, cap_bottom=True, cap_top=True, wobble=0.0):
    bm = bmesh.new()
    rings = []
    for zi, (z, r) in enumerate(profile):
        ring = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            rr = r * (1 + wobble * math.sin(5 * a + zi * 1.7) * math.sin(zi * 2.3 + 0.5))
            ring.append(bm.verts.new((rr * math.cos(a), depth * rr * math.sin(a), z)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    if cap_bottom:
        bm.faces.new(list(reversed(rings[0])))
    if cap_top:
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return make_obj(name, bm, mat)


torso = lathe("Hoodie_Body", TORSO_PROFILE, TORSO_DEPTH, M["hoodie"], wobble=0.018)
sub = torso.modifiers.new("Smooth", "SUBSURF")
sub.levels, sub.render_levels = 1, 2
attach(torso, "spine")
band = lathe("Hoodie_Band", [(0.565, 0.168), (0.572, 0.192), (0.615, 0.198), (0.625, 0.185)],
             TORSO_DEPTH, M["hoodie_dark"], cap_bottom=False, cap_top=False)
attach(band, "spine")


def front_y(z, out=0.004):
    return -(torso_r(z) * TORSO_DEPTH + out)


def surface_patch(name, z0, z1, half_w0, half_w1, mat, out=0.006, bone="spine"):
    """trapezoid patch wrapped onto the torso front (kangaroo pocket)"""
    bm = bmesh.new()
    nu, nv = 16, 6
    rows = []
    for j in range(nv + 1):
        z = z0 + (z1 - z0) * j / nv
        hw = half_w0 + (half_w1 - half_w0) * j / nv
        r = torso_r(z) + out
        row = []
        for i in range(nu + 1):
            x = -hw + 2 * hw * i / nu
            a = math.asin(max(-0.99, min(0.99, x / r)))
            row.append(bm.verts.new((r * math.sin(a), -TORSO_DEPTH * r * math.cos(a), z)))
        rows.append(row)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = make_obj(name, bm, mat)
    sol = ob.modifiers.new("Thick", "SOLIDIFY")
    sol.thickness = 0.012
    sol.offset = -1
    bev = ob.modifiers.new("Soft", "SUBSURF")
    bev.levels = bev.render_levels = 2
    attach(ob, bone)
    return ob


surface_patch("Hoodie_Pocket", 0.64, 0.79, 0.125, 0.085, M["hoodie"])
for s, sg in (("L", 1), ("R", -1)):     # pocket opening seams
    a = Vector((0.125 * sg, front_y(0.645, 0.015), 0.645))
    b = Vector((0.085 * sg, front_y(0.785, 0.015), 0.785))
    attach(segment(f"Hoodie_Pocket_Seam_{s}", a, b, 0.004, M["hood_lining"], u=8, v=4), "spine")

# ---- hood: thick rolled collar + bunched hood behind the head
def torus(name, R, r, center, tilt_deg, mat, sx=1.0, sy=1.0, seg=48, rs=20):
    bm = bmesh.new()
    rings = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        ring = []
        # thicker at the back, thinner at the front
        rr = r * (1.0 + 0.35 * max(0.0, math.sin(a)))
        for j in range(rs):
            b = 2 * math.pi * j / rs
            ring.append(bm.verts.new(((R + rr * math.cos(b)) * math.cos(a) * sx,
                                      (R + rr * math.cos(b)) * math.sin(a) * sy,
                                      rr * 1.15 * math.sin(b))))
        rings.append(ring)
    for i in range(seg):
        for j in range(rs):
            bm.faces.new((rings[i][j], rings[(i + 1) % seg][j], rings[(i + 1) % seg][(j + 1) % rs], rings[i][(j + 1) % rs]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    transform_bm(bm, Matrix.Rotation(math.radians(tilt_deg), 4, "X"))
    ob = make_obj(name, bm, mat)
    ob.location = center
    return ob


collar = torus("Hoodie_Hood_Collar", 0.115, 0.042, (0, 0.012, 1.085), -12, M["hoodie"], sx=1.12, sy=0.98)
attach(collar, "chest")
hood_back = sphere("Hoodie_Hood_Back", (0, 0.125, 1.115), (0.165, 0.085, 0.125), mat=M["hoodie"],
                   rot=Euler((math.radians(-28), 0, 0)))
sub = hood_back.modifiers.new("Smooth", "SUBSURF"); sub.levels = sub.render_levels = 1
attach(hood_back, "chest")
attach(sphere("Hoodie_Hood_Fold", (0, 0.085, 1.165), (0.12, 0.05, 0.06), mat=M["hood_lining"],
              rot=Euler((math.radians(-35), 0, 0))), "chest")

# drawstrings: curve down the chest following the surface
for s, sg in (("L", 1), ("R", -1)):
    pts = []
    for k in range(6):
        t = k / 5
        z = 1.055 - 0.15 * t
        x = sg * (0.042 + 0.012 * t + 0.006 * math.sin(t * 3.0))
        pts.append(Vector((x, front_y(z, 0.008), z)))
    for a, b in zip(pts, pts[1:]):
        attach(segment(f"Drawstring_{s}_{pts.index(a)}", a, b, 0.0075, M["string"], u=12, v=6), "chest")
    tip = pts[-1]
    attach(segment(f"Drawstring_{s}_Tip", tip, tip + Vector((0, -0.003, -0.03)), 0.0095, M["string"], u=12, v=6), "chest")
    attach(sphere(f"Drawstring_{s}_Eyelet", (sg * 0.042, front_y(1.06, 0.004), 1.06), (1, 0.4, 1), r=0.011,
                  mat=M["hood_lining"], u=12, v=6), "chest")

logo = text_mesh("Hoodie_Logo", "H", 0.095, 0.004, M["string"], C_CHAR, bevel=0.001)
logo.rotation_euler = (math.pi / 2, 0, math.radians(-8))
logo.location = (0.045, front_y(0.95, 0.003), 0.95)
attach(logo, "chest")

# shorts
attach(sphere("Shorts_Hips", (0, 0.0, 0.62), (0.18, 0.14, 0.105), mat=M["hoodie"]), "hips")

# ---- limbs
for s, sg in (("L", 1), ("R", -1)):
    B = rig.data.bones
    sh, el, wr = B[f"upper_arm.{s}"].head_local, B[f"forearm.{s}"].head_local, B[f"hand.{s}"].head_local
    attach(sphere(f"Shoulder_{s}", sh, r=0.075, mat=M["hoodie"]), f"upper_arm.{s}")
    up = segment(f"Sleeve_Upper_{s}", sh, el, 0.064, M["hoodie"])
    attach(up, f"upper_arm.{s}")
    attach(sphere(f"Elbow_{s}", el, r=0.062, mat=M["hoodie"]), f"forearm.{s}")
    lo = segment(f"Sleeve_Lower_{s}", el, wr + (el - wr).normalized() * 0.02, 0.058, M["hoodie"])
    attach(lo, f"forearm.{s}")
    cuff = segment(f"Sleeve_Cuff_{s}", wr + (el - wr).normalized() * 0.035, wr - (el - wr).normalized() * 0.005,
                   0.050, M["hoodie_dark"])
    attach(cuff, f"forearm.{s}")
    hd = (B[f"hand.{s}"].tail_local - wr).normalized()
    hc = wr + hd * 0.055
    hand = sphere(f"Hand_{s}", hc, (1.0, 0.92, 1.08), r=0.066, mat=M["skin"])
    attach(hand, f"hand.{s}")
    attach(sphere(f"Thumb_{s}", hc + Vector((-0.028 * sg, -0.05, 0.022)), (1, 1, 1.2), r=0.026, mat=M["skin"]),
           f"hand.{s}")
    attach(sphere(f"Wrist_{s}", wr, r=0.036, mat=M["skin"]), f"hand.{s}")

    hp, kn, an = B[f"thigh.{s}"].head_local, B[f"shin.{s}"].head_local, B[f"shin.{s}"].tail_local
    attach(segment(f"Thigh_{s}", hp, kn, 0.043, M["skin"]), f"thigh.{s}")
    attach(segment(f"Shorts_Leg_{s}", hp, hp + (kn - hp) * 0.48, 0.082, M["hoodie"]), f"thigh.{s}")
    attach(sphere(f"Shorts_Hem_{s}", hp + (kn - hp) * 0.48, (1, 1, 0.42), r=0.084, mat=M["hoodie_dark"],
                  rot=Vector((0, 0, 1)).rotation_difference(kn - hp)), f"thigh.{s}")
    attach(sphere(f"Knee_{s}", kn, r=0.044, mat=M["skin"]), f"shin.{s}")
    attach(segment(f"Shin_{s}", kn, an + Vector((0, 0, -0.03)), 0.039, M["skin"]), f"shin.{s}")

    # ---- chunky sneaker (toe -> -Y), sole flat on the deck
    fx = 0.22 * sg
    rotX = Matrix.Rotation(math.pi / 2, 4, "X")
    sole = make_obj(f"Shoe_Sole_{s}", transform_bm(bm_capsule(0.060, 0.135), rotX @ Matrix.Diagonal((1, 0.30, 1, 1))),
                    M["shoe"])
    sole.location = (fx, -0.04, DECK + 0.018)
    attach(sole, f"foot_IK.{s}")
    sole_line = make_obj(f"Shoe_SoleStripe_{s}", transform_bm(bm_capsule(0.0615, 0.135),
                                                               rotX @ Matrix.Diagonal((1, 0.06, 1, 1))), M["shoe_blue"])
    sole_line.location = (fx, -0.04, DECK + 0.03)
    attach(sole_line, f"foot_IK.{s}")
    upper = make_obj(f"Shoe_{s}", transform_bm(bm_capsule(0.056, 0.12), rotX @ Matrix.Diagonal((0.98, 0.80, 1, 1))),
                     M["shoe"])
    upper.location = (fx, -0.036, DECK + 0.066)
    attach(upper, f"foot_IK.{s}")
    toe = sphere(f"Shoe_Toe_{s}", (fx, -0.125, DECK + 0.05), (0.055, 0.05, 0.038), mat=M["shoe"])
    attach(toe, f"foot_IK.{s}")
    collar_s = torus(f"Shoe_Collar_{s}", 0.040, 0.013, (fx, 0.012, DECK + 0.103), 8, M["shoe"], sx=1.05, sy=1.2,
                     seg=32, rs=12)
    attach(collar_s, f"foot_IK.{s}")
    lining = sphere(f"Shoe_Lining_{s}", (fx, 0.012, DECK + 0.103), (0.044, 0.05, 0.01), mat=M["shoe_blue"])
    attach(lining, f"foot_IK.{s}")
    tongue_s = sphere(f"Shoe_Laces_{s}", (fx, -0.07, DECK + 0.103), (0.036, 0.062, 0.018), mat=M["shoe_blue"],
                      rot=Euler((math.radians(-22), 0, 0)))
    attach(tongue_s, f"foot_IK.{s}")
    for k in range(3):   # white laces across the blue tongue
        y = -0.045 - k * 0.026
        z = DECK + 0.112 - k * 0.011
        attach(segment(f"Shoe_Lace_{s}{k}", (fx - 0.03, y, z), (fx + 0.03, y, z), 0.0055, M["string"], u=10, v=5),
               f"foot_IK.{s}")
    for side in (1, -1):  # swoosh-like side stripe
        a = Vector((fx + 0.054 * side, -0.135, DECK + 0.045))
        m_ = Vector((fx + 0.057 * side, -0.04, DECK + 0.06))
        b = Vector((fx + 0.052 * side, 0.04, DECK + 0.09))
        attach(segment(f"Shoe_Stripe_{s}_{side}a", a, m_, 0.010, M["shoe_blue"], squash=(0.35, 1, 1), u=12, v=6),
               f"foot_IK.{s}")
        attach(segment(f"Shoe_Stripe_{s}_{side}b", m_, b, 0.008, M["shoe_blue"], squash=(0.35, 1, 1), u=12, v=6),
               f"foot_IK.{s}")

# ======================================================================
# 5. SKATEPARK + CITY
# ======================================================================
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=150)
ground = make_obj("Ground_Concrete", bm, M["ground"], C_ENV, smooth=False)
ground.location = (10, 0, 0)


def extrude_profile(name, prof, x0, x1, mat, coll=C_ENV, sharp=35):
    """profile = list of (y, z) closed polygon, extruded along X"""
    bm = bmesh.new()
    a = [bm.verts.new((x0, y, z)) for y, z in prof]
    b = [bm.verts.new((x1, y, z)) for y, z in prof]
    n = len(prof)
    for k in range(n):
        bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    bm.faces.new(list(reversed(a)))
    bm.faces.new(b)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return make_obj(name, bm, mat, coll, sharp_angle=sharp)


# big quarter pipe along the far side
R_QP, H_QP, Y_QP = 1.7, 1.35, 4.2
prof = [(Y_QP, 0.0)]
ang_end = math.acos(1 - H_QP / R_QP)
for k in range(1, 17):
    a = ang_end * k / 16
    prof.append((Y_QP + R_QP * math.sin(a), R_QP * (1 - math.cos(a))))
ytop = prof[-1][0]
prof += [(ytop + 1.6, H_QP), (ytop + 1.6, 0.0)]
extrude_profile("Ramp_QuarterPipe", prof, -14, 46, M["ramp"], sharp=20)
coping = make_obj("Ramp_Coping", transform_bm(bm_cyl(0.035, 60, 16), Matrix.Rotation(math.pi / 2, 4, "Y")),
                  M["rail"], C_ENV, sharp_angle=40)
coping.location = (16, ytop + 0.03, H_QP)
for k in range(13):
    x = -12 + k * 4.8
    p = make_obj(f"Fence_Post_{k}", bm_cyl(0.025, 1.0, 12), M["rail"], C_ENV, sharp_angle=40)
    p.location = (x, ytop + 1.5, H_QP + 0.5)
for zz in (0.55, 1.0):
    r = make_obj(f"Fence_Rail_{zz}", transform_bm(bm_cyl(0.025, 60, 12), Matrix.Rotation(math.pi / 2, 4, "Y")),
                 M["rail"], C_ENV, sharp_angle=40)
    r.location = (16, ytop + 1.5, H_QP + zz)

# low bank ramp (the "low slope")
extrude_profile("Ramp_LowBank", [(1.7, 0.0), (2.9, 0.42), (3.5, 0.42), (3.5, 0.0)], 6.0, 13.0, M["ramp"])
# graffiti wall
wall = make_obj("Wall_Graffiti", bm_box(7.0, 0.4, 1.0), M["wall"], C_ENV, sharp_angle=30)
wall.location = (-0.5, 2.6, 0.5)
g = text_mesh("Graffiti_SKATE", "SKATE", 0.85, 0.02, M["graffiti"], C_ENV, bevel=0.025)
g.rotation_euler = (math.pi / 2, math.radians(-6), 0)
g.location = (-1.0, 2.36, 0.5)
# grind rail
rail = make_obj("Grind_Rail", transform_bm(bm_cyl(0.03, 7.0, 16), Matrix.Rotation(math.pi / 2, 4, "Y")),
                M["rail"], C_ENV, sharp_angle=40)
rail.location = (17.5, 2.2, 0.42)
for x in (14.6, 17.5, 20.4):
    leg = make_obj(f"Grind_Rail_Leg_{x}", bm_cyl(0.022, 0.42, 12), M["rail"], C_ENV, sharp_angle=40)
    leg.location = (x, 2.2, 0.21)
# ledge
ledge = make_obj("Ledge_Box", bm_box(4.0, 0.9, 0.38), M["wall"], C_ENV, sharp_angle=30)
ledge.location = (27, 2.4, 0.19)
ledge2 = make_obj("Ledge_Box_2", bm_box(3.0, 0.9, 0.3), M["wall"], C_ENV, sharp_angle=30)
ledge2.location = (-7, 2.2, 0.15)

import random
random.seed(7)


def tree(name, x, y, h=4.5, s=1.0):
    t = make_obj(name + "_Trunk", bm_cyl(0.12 * s, h, 12, 0.07 * s), M["trunk"], C_ENV, sharp_angle=60)
    t.location = (x, y, h / 2)
    for k in range(5):
        r = random.uniform(1.0, 1.6) * s
        off = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-0.3, 0.8))) * s
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=3, radius=r)
        for v in bm.verts:
            v.co *= 1 + 0.12 * math.sin(v.co.x * 5) * math.cos(v.co.y * 4)
        o = make_obj(f"{name}_Leaves{k}", bm, M["leaf"] if k % 2 else M["leaf2"], C_ENV)
        o.location = Vector((x, y, h)) + off


def lamp(name, x, y, h=5.0):
    p = make_obj(name + "_Pole", bm_cyl(0.06, h, 12), M["pole"], C_ENV, sharp_angle=40)
    p.location = (x, y, h / 2)
    for k, dx in enumerate((-0.25, 0.0, 0.25)):
        sphere(f"{name}_Bulb{k}", (x + dx, y, h + 0.1), r=0.13, mat=M["bulb"], coll=C_ENV, u=16, v=8)


for k, (x, y) in enumerate([(-6, 9.5), (3, 10.5), (13, 9.8), (22, 10.6), (31, 9.6), (40, 10.4),
                            (-16, 4), (-15, -6), (48, 4), (50, -6), (8, -16), (25, -17)]):
    tree(f"Tree_{k:02d}", x, y, random.uniform(4.0, 5.5), random.uniform(0.9, 1.2))
for k, (x, y) in enumerate([(-3, 8.2), (10, 8.2), (24, 8.2), (36, 8.2), (-12, -3), (46, -2)]):
    lamp(f"Lamp_{k}", x, y)

# city skyline: ring of simple buildings
k = 0
for ring_r, mat, nb in ((58, M["bld_near"], 30), (90, M["bld_far"], 34)):
    for i in range(nb):
        a = 2 * math.pi * i / nb + random.uniform(-0.05, 0.05)
        cx, cy = 12 + ring_r * math.cos(a) * 1.15, ring_r * math.sin(a)
        w, d, h = random.uniform(5, 10), random.uniform(5, 9), random.uniform(10, 34 if ring_r > 70 else 22)
        b = make_obj(f"Building_{k:02d}", bm_box(w, d, h), mat, C_CITY, sharp_angle=30)
        b.location = (cx, cy, h / 2)
        b.rotation_euler = (0, 0, a + random.choice((0, math.pi / 2)))
        k += 1

# ======================================================================
# 6. WORLD + LIGHTS
# ======================================================================
world = bpy.data.worlds.new("Sunset_Sky")
scene.world = world
nt = world.node_tree
N, L = nt.nodes, nt.links
bg = N.get("Background")
tc = N.new("ShaderNodeTexCoord")
sep = N.new("ShaderNodeSeparateXYZ")
L.new(tc.outputs["Generated"], sep.inputs[0])
ramp = N.new("ShaderNodeValToRGB")
cr = ramp.color_ramp
cr.elements[0].position, cr.elements[0].color = 0.0, (1.0, 0.52, 0.32, 1)
cr.elements[1].position, cr.elements[1].color = 0.55, (0.16, 0.10, 0.55, 1)
e = cr.elements.new(0.08); e.color = (0.95, 0.42, 0.55, 1)
e = cr.elements.new(0.22); e.color = (0.55, 0.30, 0.85, 1)
L.new(sep.outputs["Z"], ramp.inputs["Fac"])
# soft streaky clouds
mapn = N.new("ShaderNodeMapping")
mapn.inputs["Scale"].default_value = (2.0, 2.0, 14.0)
L.new(tc.outputs["Generated"], mapn.inputs["Vector"])
cloud = N.new("ShaderNodeTexNoise")
cloud.inputs["Scale"].default_value = 1.5
cloud.inputs["Detail"].default_value = 4.0
L.new(mapn.outputs[0], cloud.inputs["Vector"])
cramp = N.new("ShaderNodeValToRGB")
cramp.color_ramp.elements[0].position = 0.55
cramp.color_ramp.elements[1].position = 0.75
L.new(cloud.outputs["Fac"], cramp.inputs["Fac"])
band = N.new("ShaderNodeMath"); band.operation = "MULTIPLY"
grad = N.new("ShaderNodeMapRange")
grad.inputs["From Min"].default_value = 0.04
grad.inputs["From Max"].default_value = 0.35
grad.inputs["To Min"].default_value = 1.0
grad.inputs["To Max"].default_value = 0.0
L.new(sep.outputs["Z"], grad.inputs["Value"])
L.new(cramp.outputs["Color"], band.inputs[0])
L.new(grad.outputs["Result"], band.inputs[1])
mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"
L.new(band.outputs[0], mix.inputs["Factor"])
L.new(ramp.outputs["Color"], mix.inputs[6])
mix.inputs[7].default_value = (1.0, 0.72, 0.78, 1)
L.new(mix.outputs[2], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 0.55

sun_d = bpy.data.lights.new("Sun_Golden", "SUN")
sun_d.energy = 6.5
sun_d.color = (1.0, 0.70, 0.42)
sun_d.angle = math.radians(4.0)
sun = bpy.data.objects.new("Sun_Golden", sun_d)
C_CAM.objects.link(sun)
light_dir = Vector((0.45, 0.80, -0.40)).normalized()     # sun sits low at -X/-Y (camera left)
sun.rotation_mode = "QUATERNION"
sun.rotation_quaternion = Vector((0, 0, -1)).rotation_difference(light_dir)

light_rig = bpy.data.objects.new("LIGHT_Follow", None)
C_CAM.objects.link(light_rig)
cl = light_rig.constraints.new("COPY_LOCATION")
cl.target = master
cl.use_y = cl.use_z = False


def area(name, loc, target, energy, color, size):
    d = bpy.data.lights.new(name, "AREA")
    d.energy, d.color, d.size = energy, color, size
    o = bpy.data.objects.new(name, d)
    C_CAM.objects.link(o)
    o.parent = light_rig
    o.location = loc
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = Vector((0, 0, -1)).rotation_difference((Vector(target) - Vector(loc)).normalized())
    return o


area("Fill_Blue", (3.0, -3.5, 2.2), (0, 0, 0.9), 110, (0.62, 0.68, 1.0), 3.0)
area("Rim_Pink", (-2.0, 3.0, 3.0), (0, 0, 1.0), 420, (1.0, 0.55, 0.75), 2.0)

# ======================================================================
# 7. ANIMATION
# ======================================================================
from bpy_extras import anim_utils


def fcurves(idb):
    ad = idb.animation_data
    return anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot).fcurves


def key_curve(obj, path, index, keys):
    """keys: list of (frame, value, slope_in, slope_out) - slopes in units/frame.
    Handles are placed at 1/3 of the neighbouring interval (cubic Hermite),
    'FREE' handles allow velocity breaks (take-off / impact)."""
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


# --- travel (X): accelerate, constant, stylised slow-motion hang time, release, coast
fc_x = key_curve(master, "location", 0, [
    (1, 0.0, 0.040, 0.040),
    (90, 5.34, 0.080, 0.080),
    (158, 10.78, 0.080, 0.080),
    (215, 13.90, 0.030, 0.030),
    (300, 16.45, 0.030, 0.030),
    (361, 19.80, 0.080, 0.080),
    (450, 25.60, 0.050, 0.050),
])
# --- height (Z): flat, pop (velocity break), rise, hang, fall, impact (velocity break), flat
fc_z = key_curve(master, "location", 2, [
    (1, 0.0, 0.0, 0.0),
    (158, 0.0, 0.0, 0.040),
    (215, 0.85, 0.0045, 0.0045),
    (258, 0.95, 0.0, 0.0),
    (300, 0.85, -0.0045, -0.0045),
    (361, 0.0, -0.036, 0.0),
    (450, 0.0, 0.0, 0.0),
])
# --- ollie pitch (nose up after the pop, levelled by the front foot)
fc_pitch = key_curve(master, "rotation_euler", 1, [
    (1, 0.0, 0, 0),
    (158, 0.0, 0, 0),
    (166, math.radians(-13), 0, 0),
    (182, math.radians(-3), 0.0045, 0.0045),
    (195, 0.0, 0, 0),
    (450, 0.0, 0, 0),
])
# --- 360 spin around the vertical axis (slow-in / slow-out)
fc_spin = key_curve(master, "rotation_euler", 2, [
    (1, 0.0, 0, 0),
    (206, 0.0, 0, 0),
    (258, math.pi, 0.095, 0.095),
    (318, 2 * math.pi, 0, 0),
    (450, 2 * math.pi, 0, 0),
])

# --- wheels: rotation = distance / radius (rolling without slipping), baked per frame
for w in wheels:
    for f in range(F_START, F_END + 1):
        w.rotation_euler[1] = fc_x.evaluate(f) / WHEEL_R
        w.keyframe_insert("rotation_euler", index=1, frame=f)
    for k in fcurves(w).find("rotation_euler", index=1).keyframe_points:
        k.interpolation = "LINEAR"

# --- character poses (rotations in degrees around armature axes:
#     X+ = lean towards the face (-Y) / swing arms back, Y+ = lean towards +X (travel),
#     Z+ = turn towards travel). Locations in metres (armature axes).
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


def pose(f, P):
    for name, (rot, loc) in P.items():
        key_bone(f, name, rot, loc)


def P(hips_l, hips_r, spine, chest, neck, head, uaL, faL, uaR, faR, hL=(0, 0, 0), hR=(0, 0, 0)):
    return {"hips": (hips_r, hips_l), "spine": (spine, None), "chest": (chest, None), "neck": (neck, None),
            "head": (head, None), "upper_arm.L": (uaL, None), "forearm.L": (faL, None),
            "upper_arm.R": (uaR, None), "forearm.R": (faR, None), "hand.L": (hL, None), "hand.R": (hR, None)}


RIDE_A = P((0.0, 0, -0.05), (4, 6, 0), (3, 3, 4), (2, 2, 8), (0, 0, 6), (-4, -3, 22),
           (-12, -12, 0), (-25, 0, 0), (8, 14, 0), (-15, 0, 0))
RIDE_B = P((0.0, 0, -0.07), (6, 8, 0), (4, 3, 4), (2, 2, 10), (0, 0, 6), (-2, -4, 26),
           (-18, -16, 0), (-30, 0, 0), (12, 18, 0), (-20, 0, 0))
CROUCH = P((0.0, 0.02, -0.21), (18, 4, 0), (12, 2, 2), (8, 0, 4), (-6, 0, 4), (-22, 0, 18),
           (60, -22, 0), (-10, 0, 0), (60, 22, 0), (-10, 0, 0))
CROUCH_DEEP = P((0.0, 0.03, -0.235), (21, 4, 0), (14, 2, 2), (9, 0, 4), (-7, 0, 4), (-24, 0, 18),
                (72, -26, 0), (-8, 0, 0), (72, 26, 0), (-8, 0, 0))
POP = P((0.0, 0, -0.01), (4, 2, 0), (-2, 0, 0), (-4, 0, 4), (0, 0, 4), (-10, 0, 16),
        (-75, -40, 0), (-25, 0, 0), (-75, 40, 0), (-25, 0, 0))
TUCK = P((0.0, 0, -0.175), (12, 0, 0), (8, 0, 0), (4, 0, 6), (0, 0, 4), (-10, 0, 14),
         (-10, -72, 0), (-15, 0, 0), (-10, 72, 0), (-15, 0, 0))
BAL_1 = P((0.0, 0, -0.17), (12, -3, 0), (8, -3, 0), (4, -2, 6), (0, 0, 4), (-8, 4, 18),
          (-25, -88, 10), (-30, 0, 0), (5, 58, 0), (-10, 0, 0))
BAL_2 = P((0.0, 0, -0.17), (12, 3, 0), (8, 3, 0), (4, 2, 6), (0, 0, 4), (-8, -4, 10),
          (5, -58, 0), (-10, 0, 0), (-25, 88, -10), (-30, 0, 0))
EXTEND = P((0.0, 0, -0.03), (6, 0, 0), (4, 0, 0), (2, 0, 6), (0, 0, 4), (-12, 0, 18),
           (-12, -55, 0), (-20, 0, 0), (-12, 55, 0), (-20, 0, 0))
COMPRESS = P((0.0, 0.02, -0.225), (20, 4, 0), (12, 2, 2), (6, 0, 6), (6, 0, 4), (2, 0, 16),
             (-30, -30, 0), (-30, 0, 0), (-30, 30, 0), (-30, 0, 0))
REBOUND = P((0.0, 0, -0.025), (4, 4, 0), (2, 2, 2), (0, 0, 8), (0, 0, 6), (-8, -2, 22),
            (-15, -40, 0), (-20, 0, 0), (-5, 30, 0), (-20, 0, 0))
SETTLE = P((0.0, 0, -0.065), (6, 6, 0), (3, 3, 4), (2, 2, 8), (0, 0, 6), (-6, -3, 24),
           (-10, -25, 0), (-20, 0, 0), (8, 18, 0), (-15, 0, 0))
CHEER_UP = P((0.0, 0, -0.05), (2, 5, 0), (-2, 4, 4), (-4, 2, 10), (0, 0, 8), (-10, -6, 28),
             (-5, -155, 0), (-5, -30, 0), (8, 18, 0), (-15, 0, 0))
CHEER_PUMP = P((0.0, 0, -0.07), (4, 6, 0), (0, 4, 4), (-2, 2, 10), (0, 0, 8), (-6, -6, 30),
               (-5, -140, 0), (-5, -55, 0), (8, 18, 0), (-15, 0, 0))

for f, p in [(1, RIDE_A), (30, RIDE_B), (60, RIDE_A), (90, RIDE_B),
             (118, CROUCH), (146, CROUCH_DEEP), (151, CROUCH_DEEP),     # anticipation
             (160, POP),                                                  # explosive extension
             (185, TUCK), (215, TUCK), (238, BAL_1), (262, BAL_2), (286, BAL_1), (304, TUCK),
             (340, EXTEND), (361, EXTEND),                                # legs reach for the ground
             (369, COMPRESS), (384, REBOUND), (396, SETTLE),              # absorb impact
             (410, CHEER_UP), (418, CHEER_PUMP), (426, CHEER_UP), (434, CHEER_PUMP), (450, CHEER_UP)]:
    pose(f, p)

# eyes: blinks (scale Z), mouth: expression shape key
for e in eyes:
    for f, z in [(1, 1), (40, 1), (43, 0.08), (46, 1), (132, 1), (135, 0.08), (138, 1),
                 (360, 1), (364, 0.35), (370, 0.6), (380, 1), (436, 1), (439, 0.08), (442, 1)]:
        e.scale[2] = z
        e.keyframe_insert("scale", index=2, frame=f)
kb = mouth.data.shape_keys.key_blocks["Open"]
for f, v in [(1, 0.35), (90, 0.35), (125, 0.0), (151, 0.0), (162, 0.6), (230, 0.9), (330, 0.5),
             (361, 0.3), (368, 0.0), (390, 0.4), (404, 1.0), (450, 1.0)]:
    kb.value = v
    kb.keyframe_insert("value", frame=f)

# ======================================================================
# 8. CAMERA
# ======================================================================
cam_d = bpy.data.cameras.new("Camera")
cam_d.lens = 38
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
    c1.name = "Follow_XY"
    c1.target = master
    c1.use_z = False
    c1.use_y = obj is tgt
    c1.use_offset = True
    c2 = obj.constraints.new("COPY_LOCATION")
    c2.name = "Follow_Z_partial"
    c2.target = master
    c2.use_x = c2.use_y = False
    c2.use_offset = True
    c2.influence = zinf
tr = cam.constraints.new("TRACK_TO")
tr.target = tgt
tr.track_axis = "TRACK_NEGATIVE_Z"
tr.up_axis = "UP_Y"

cam_d.dof.use_dof = True
cam_d.dof.focus_object = tgt
cam_d.dof.aperture_fstop = 4.0


def polar(phi_deg, r, z):
    a = math.radians(phi_deg)
    return (r * math.cos(a), r * math.sin(a), z)


CAM_KEYS = [  # frame, camera offset, target offset, lens
    (1, polar(-41, 3.9, 0.30), (0.10, 0, 0.64), 38),
    (90, polar(-48, 3.6, 0.38), (0.05, 0, 0.64), 38),
    (150, polar(-58, 3.4, 0.30), (0.0, 0, 0.62), 38),
    (160, polar(-60, 3.5, 0.40), (0.0, 0, 0.86), 38),
    (185, polar(-62, 3.5, 0.50), (0.0, 0, 0.80), 38),
    (215, polar(-64, 3.6, 0.58), (0.0, 0, 0.82), 38),
    (240, polar(-73, 3.5, 0.62), (0.0, 0, 0.82), 38),
    (265, polar(-84, 3.45, 0.62), (0.0, 0, 0.82), 38),
    (290, polar(-95, 3.45, 0.56), (0.0, 0, 0.80), 38),
    (318, polar(-102, 3.4, 0.44), (0.05, 0, 0.88), 38),
    (345, polar(-100, 3.3, 0.26), (0.10, 0, 0.92), 36),
    (361, polar(-96, 3.3, 0.18), (0.12, 0, 0.84), 36),
    (392, polar(-80, 3.5, 0.24), (0.10, 0, 0.84), 35),
    (450, polar(-55, 4.2, 0.70), (0.0, 0, 0.74), 30),
]
for f, co, to, lens in CAM_KEYS:
    cam.location = co
    cam.keyframe_insert("location", frame=f)
    tgt.location = to
    tgt.keyframe_insert("location", frame=f)
    cam_d.lens = lens
    cam_d.keyframe_insert("lens", frame=f)

# ======================================================================
# 9. RENDER SETTINGS
# ======================================================================
scene.frame_start, scene.frame_end = F_START, F_END
scene.render.fps = FPS
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
try:
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Punchy"
except Exception as ex:
    print("look not set:", ex)
scene.view_settings.exposure = -0.1
r.image_settings.file_format = "PNG"
r.film_transparent = False

out_blend = os.path.join(OUT, "skateboard_360.blend")
bpy.ops.wm.save_as_mainfile(filepath=out_blend, compress=True)
print("SAVED", out_blend)
