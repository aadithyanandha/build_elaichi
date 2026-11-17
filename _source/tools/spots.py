"""Turn the Blender hotspot file into look directions for each panorama, and draw them on the images to check."""
import json, math, sys
from PIL import Image, ImageDraw
src, imgdir, out = sys.argv[1], sys.argv[2], sys.argv[3]
H = json.load(open(src))["panoramas"]

def local(cam, p):
    R = cam["rotation_matrix"]; L = cam["location"]
    d = [p[i] - L[i] for i in range(3)]
    col = lambda j: [R[0][j], R[1][j], R[2][j]]
    right, up, back = col(0), col(1), col(2)
    dot = lambda a, b: sum(x * y for x, y in zip(a, b))
    x, y, z = dot(d, right), dot(d, up), -dot(d, back)
    dist = math.sqrt(x * x + y * y + z * z)
    return math.degrees(math.atan2(x, z)), math.degrees(math.asin(y / dist)), dist

res = {}
for name, cam in H.items():
    R = cam["rotation_matrix"]; fwd = [-R[0][2], -R[1][2], -R[2][2]]
    heading = math.degrees(math.atan2(fwd[0], fwd[1]))           # world heading: 0 = +Y (toward the counter), + = toward +X
    spots = {}
    for k, p in cam["hotspots"].items():
        if k.startswith("pano_"):
            q = [p[0], p[1], 0.02]                                  # step markers sit on the floor
            yaw, pitch, dist = local(cam, q)
        else:
            yaw, pitch, dist = local(cam, p)
        spots[k] = [round(yaw, 2), round(pitch, 2), round(dist, 2)]
    res[name] = {"heading": round(heading, 2), "location": cam["location"], "spots": spots}
    im = Image.open(f"{imgdir}/{cam['image']}").convert("RGB").resize((2048, 1024), Image.LANCZOS)
    dr = ImageDraw.Draw(im)
    for k, (yaw, pitch, dist) in spots.items():
        u = (0.5 + yaw / 360) * 2048; v = (0.5 - pitch / 180) * 1024
        c = (255, 40, 200) if k.startswith("pano_") else (0, 255, 255)
        dr.ellipse([u - 7, v - 7, u + 7, v + 7], outline=c, width=3); dr.text((u + 9, v - 6), k, fill=c)
    im.save(f"{out}/{cam['image'].replace('.png','-spots.png')}")
json.dump(res, open(f"{out}/spots.json", "w"), indent=1)
for n, r in res.items(): print(n, "heading", r["heading"], "loc", r["location"])
