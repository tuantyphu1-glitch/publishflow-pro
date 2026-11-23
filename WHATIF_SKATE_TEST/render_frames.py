"""Render frames from skateboard_360.blend.
python render_frames.py <blend> <outdir> <percent> <samples> <motionblur 0/1> <frames: 'a-b' or 'a,b,c'>"""
import bpy, sys, os, time
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
blend, outdir, pct, spp, mb, frames = ARGS[0:6]
bpy.ops.wm.open_mainfile(filepath=blend)
s = bpy.context.scene
s.render.resolution_percentage = int(pct)
s.eevee.taa_render_samples = int(spp)
s.render.use_motion_blur = mb == "1"
os.makedirs(outdir, exist_ok=True)
if "-" in frames:
    a, b = map(int, frames.split("-")); fl = range(a, b + 1)
else:
    fl = [int(x) for x in frames.split(",")]
t0 = time.time()
for f in fl:
    p = os.path.join(outdir, f"frame_{f:04d}.png")
    if os.path.exists(p):
        continue
    s.frame_set(f)
    s.render.filepath = p
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"RENDERED {f} {time.time()-t:.1f}s", flush=True)
print(f"TOTAL {time.time()-t0:.1f}s", flush=True)
