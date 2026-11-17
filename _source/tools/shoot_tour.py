"""Open the 360° tour in headless Chrome and screenshot each state."""
import sys, os, subprocess, time
from playwright.sync_api import sync_playwright
SITE, FONTS, OUT = sys.argv[1:4]
os.makedirs(OUT, exist_ok=True)
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8775", "--bind", "127.0.0.1"], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
FONT_CSS = """@font-face{font-family:Fraunces;src:url(/__fonts/Fraunces.ttf);font-weight:100 900;font-style:normal}
@font-face{font-family:Fraunces;src:url(/__fonts/Fraunces-Italic.ttf);font-weight:100 900;font-style:italic}
@font-face{font-family:Jost;src:url(/__fonts/Jost.ttf);font-weight:100 900;font-style:normal}"""
log = []
def ctx_for(pw, viewport, touch):
    b = pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"])
    c = b.new_context(viewport=viewport, device_scale_factor=1, has_touch=touch, is_mobile=touch)
    c.route("**/fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", headers={"access-control-allow-origin": "*"}, body=FONT_CSS))
    c.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    c.route("**/__fonts/*", lambda r: r.fulfill(status=200, content_type="font/ttf", path=os.path.join(FONTS, r.request.url.rsplit("/", 1)[1])))
    return b, c
def hook(page, name):
    page.on("console", lambda m: log.append(f"[{name}] {m.type}: {m.text}") if m.type in ("error", "warning") and "404" not in m.text else None)
    page.on("pageerror", lambda e: log.append(f"[{name}] PAGEERROR: {e}"))
    page.on("requestfailed", lambda r: log.append(f"[{name}] FAILED: {r.url}") if "gstatic" not in r.url and ".glb" not in r.url else None)
with sync_playwright() as pw:
    b, c = ctx_for(pw, {"width": 1440, "height": 900}, False)
    p = c.new_page(); hook(p, "desk")
    p.goto("http://127.0.0.1:8775/index.html"); p.wait_for_timeout(5000)
    shot = lambda n: p.screenshot(path=f"{OUT}/desk_{n}.png")
    shot("01_arrive")
    pin = p.locator('.pin[data-open="board:coffee"]'); bb = pin.bounding_box(); print("coffee pin", bb)
    p.mouse.move(bb["x"] + 22, bb["y"] + 22); p.wait_for_timeout(500); shot("02_hover_board")
    pin.click(); p.wait_for_timeout(1500); shot("03_board_open")
    p.keyboard.press("Escape"); p.wait_for_timeout(1200)
    p.mouse.move(720, 450); p.mouse.down(); p.mouse.move(520, 470, steps=12); p.mouse.up(); p.wait_for_timeout(1500); shot("04_dragged")
    p.locator('.places button[data-go="tables"]').click(); p.wait_for_timeout(3200); shot("05_tables")
    d = p.locator('.pin[data-open="dish:red-velvet"]'); print("red velvet visible", d.is_visible())
    d.click(); p.wait_for_timeout(1800); shot("06_dish")
    p.keyboard.press("Escape"); p.wait_for_timeout(1200)
    st = p.locator('.step[data-go="counter"]'); print("step counter visible", st.is_visible(), st.bounding_box())
    st.click(); p.wait_for_timeout(3400); shot("07_counter")
    p.locator('.places button[data-go="lamp"]').click(); p.wait_for_timeout(3400); shot("08_lamp")
    p.locator('.fineprint button').click(); p.wait_for_timeout(1300); shot("09_credits")
    b.close()
    b, c = ctx_for(pw, {"width": 390, "height": 844}, True)
    p = c.new_page(); hook(p, "phone")
    p.goto("http://127.0.0.1:8775/index.html"); p.wait_for_timeout(5000)
    p.screenshot(path=f"{OUT}/phone_01.png")
    p.locator('.places button[data-go="tables"]').tap(); p.wait_for_timeout(3400); p.screenshot(path=f"{OUT}/phone_02_tables.png")
    b.close()
    b, c = ctx_for(pw, {"width": 1280, "height": 800}, False)
    p = c.new_page(); hook(p, "flat")
    p.goto("http://127.0.0.1:8775/index.html?flat"); p.wait_for_timeout(3500); p.screenshot(path=f"{OUT}/flat_01.png")
    b.close()
srv.terminate()
print("\n".join(log) or "no console errors")
