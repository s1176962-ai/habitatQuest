"""
Generates the 12 offline SVG illustration cards for HabitatQuest Speaking Practice.

Run:  python scripts/gen_cards.py     (or  npm run gen:cards)

Everything is drawn with plain SVG primitives — no external images, no CDN,
no generated bitmaps. Output: src/assets/cards/<id>.svg, 420x320 each.
"""
import os
import math

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "src", "assets", "cards"))
os.makedirs(OUT, exist_ok=True)

W, H = 420, 320
INK = '#2f2a26'
OL = f'stroke="{INK}" stroke-opacity=".16" stroke-width="2" stroke-linejoin="round"'


def el(cx, cy, rx, ry, fill, extra=""):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'


def ci(cx, cy, r, fill, extra=""):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" {extra}/>'


def pa(d, fill, extra=""):
    return f'<path d="{d}" fill="{fill}" {extra}/>'


def poly(points, fill, extra=""):
    return f'<polygon points="{points}" fill="{fill}" {extra}/>'


def rect(x, y, w, h, fill, extra=""):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" {extra}/>'


# --------------------------------------------------------------------------
# Habitat scenery. Each returns (background layers, foreground layer).
# --------------------------------------------------------------------------
HABITATS = {
    "polar":   {"sky": ("#a9c4e0", "#e9f3fb"), "color": "#8E9BB8"},
    "ocean":   {"sky": ("#8fd3d8", "#0e5570"), "color": "#2F8FA8"},
    "desert":  {"sky": ("#f7cf94", "#fdf1d6"), "color": "#D9A05B"},
    "savanna": {"sky": ("#f5cf8f", "#fbf0d3"), "color": "#C9A961"},
    "forest":  {"sky": ("#cfe4bd", "#f0f7e5"), "color": "#4F7A57"},
    "wetland": {"sky": ("#cfe3d5", "#eef6ea"), "color": "#6D9B84"},
}


def scenery_polar():
    b = [ci(338, 58, 30, "#fdf6e2", 'opacity=".8"')]
    b += [poly("0,214 66,158 116,214", "#c8dcee"),
          poly("92,214 172,142 258,214", "#dbe8f4"),
          poly("236,214 316,168 420,214", "#c8dcee")]
    b += [pa(f"M0 210 Q110 196 210 208 Q320 220 420 204 L420 320 L0 320 Z", "#eff6fb")]
    b += [pa("M0 246 Q100 234 200 248 Q310 262 420 242 L420 320 L0 320 Z", "#e2eef7")]
    flakes = []
    for i, (x, y, r) in enumerate([(38, 46, 2.4), (96, 92, 1.8), (152, 38, 2), (222, 70, 1.6),
                                   (284, 34, 2.2), (372, 108, 1.8), (46, 142, 1.6), (398, 62, 2)]):
        flakes.append(ci(x, y, r, "#ffffff", 'opacity=".75"'))
    f = [pa("M0 292 Q120 280 210 292 Q320 304 420 288 L420 320 L0 320 Z", "#ffffff", 'opacity=".65"')]
    return "\n".join(b + flakes), "\n".join(f)


def scenery_ocean():
    b = []
    # light rays
    b += [poly("80,0 130,0 210,320 130,320", "#c9f2ee", 'opacity=".10"'),
          poly("230,0 268,0 340,320 268,320", "#c9f2ee", 'opacity=".08"')]
    # distant fish silhouettes
    for x, y, s in [(70, 108, 1), (330, 88, .8), (366, 150, .6), (48, 182, .55)]:
        b.append(f'<g transform="translate({x} {y}) scale({s})" opacity=".22" fill="#063f56">'
                 f'{el(0, 0, 16, 8, "#063f56")}{poly("-14,0 -26,-9 -26,9", "#063f56")}'
                 f'{ci(7, -2, 1.6, "#eafafa")}</g>')
    b += [pa("M0 262 Q100 246 210 260 Q320 274 420 254 L420 320 L0 320 Z", "#e9d9a9")]
    b += [pa("M0 276 Q120 262 230 278 Q330 290 420 272 L420 320 L0 320 Z", "#dcc38d")]
    # bubbles
    for x, y, r in [(44, 210, 4), (58, 178, 2.5), (372, 196, 3.5), (386, 158, 2), (340, 228, 2.2)]:
        b.append(ci(x, y, r, "none", 'stroke="#d9f7f4" stroke-width="1.5" opacity=".55"'))
    # seaweed
    f = []
    for x, h, c in [(24, 62, "#2b7f78"), (40, 44, "#3b978a"), (392, 70, "#2b7f78"), (378, 48, "#3b978a")]:
        f.append(pa(f"M{x} 300 Q{x-14} {300-h/2} {x+4} {300-h} Q{x+18} {300-h/2} {x+8} 300 Z", c, 'opacity=".85"'))
    return "\n".join(b), "\n".join(f)


def scenery_desert():
    b = [ci(330, 62, 34, "#fff3cf"), ci(330, 62, 46, "#ffedb8", 'opacity=".35"')]
    b += [pa("M0 198 Q90 164 190 196 Q290 226 420 182 L420 320 L0 320 Z", "#eec48c")]
    b += [pa("M0 232 Q120 206 220 234 Q330 262 420 226 L420 320 L0 320 Z", "#e3ae73")]
    b += [pa("M0 272 Q130 250 240 274 Q340 294 420 266 L420 320 L0 320 Z", "#d99a5f")]
    # cactus
    b.append('<g transform="translate(64 176)">'
             + rect(-8, 0, 16, 74, "#6f9a6a", 'rx="8"')
             + pa("M-8 40 Q-30 40 -30 22 L-22 22 Q-22 30 -8 30 Z", "#6f9a6a")
             + pa("M8 30 Q28 30 28 12 L20 12 Q20 22 8 22 Z", "#6f9a6a")
             + '</g>')
    b.append('<g transform="translate(366 196) scale(.7)">'
             + rect(-8, 0, 16, 62, "#7ba573", 'rx="8"')
             + pa("M8 28 Q26 28 26 12 L18 12 Q18 20 8 20 Z", "#7ba573")
             + '</g>')
    f = []
    for x, y in [(38, 292), (112, 302), (300, 292), (388, 306)]:
        f.append(el(x, y, 9, 3, "#c98b53", 'opacity=".55"'))
    return "\n".join(b), "\n".join(f)


def scenery_savanna():
    b = [ci(318, 76, 40, "#fff0c4"), ci(318, 76, 54, "#ffe9ae", 'opacity=".3"')]
    b += [pa("M0 206 Q100 188 200 206 Q310 226 420 198 L420 320 L0 320 Z", "#d9c17f")]
    b += [pa("M0 238 Q120 220 230 240 Q330 258 420 232 L420 320 L0 320 Z", "#cbb069")]
    # acacia tree
    b.append('<g transform="translate(66 130)">'
             + rect(-5, 40, 10, 88, "#7a6242", 'rx="3"')
             + pa("M-4 62 L-38 46 M4 58 L40 42", "none", 'stroke="#7a6242" stroke-width="6" stroke-linecap="round"')
             + el(0, 30, 56, 17, "#7f9460")
             + el(-26, 24, 26, 11, "#8fa26b")
             + el(28, 22, 26, 11, "#8fa26b")
             + '</g>')
    # distant hills
    b += [pa("M250 208 Q300 178 356 208 Z", "#c3a86b", 'opacity=".6"')]
    f = []
    for x, s in [(24, 1), (128, .8), (196, 1.1), (286, .9), (352, 1.1), (404, .8)]:
        f.append(pa(f"M{x} 300 Q{x-10} {300-20*s} {x-2} {300-30*s} Q{x+3} {300-16*s} {x+6} 300 Z",
                    "#a99a58", 'opacity=".8"'))
    return "\n".join(b), "\n".join(f)


def scenery_forest():
    b = [ci(332, 54, 26, "#fbf7d8", 'opacity=".85"')]
    # distant tree rows
    for x, y, r, c in [(40, 150, 48, "#9dc28c"), (110, 132, 56, "#8ab37c"),
                       (320, 138, 54, "#8ab37c"), (392, 156, 48, "#9dc28c")]:
        b.append(rect(x - 6, y, 12, 150, "#8b7253", 'rx="4"'))
        b.append(ci(x, y, r, c))
        b.append(ci(x - r/2, y + 10, r*.65, c))
        b.append(ci(x + r/2, y + 8, r*.65, c))
    b += [pa("M0 236 Q110 222 210 238 Q320 254 420 230 L420 320 L0 320 Z", "#77a36a")]
    b += [pa("M0 264 Q120 250 230 266 Q330 280 420 258 L420 320 L0 320 Z", "#5e8b57")]
    # sun rays
    b += [poly("332,54 180,0 230,0", "#fff8dc", 'opacity=".18"'),
          poly("332,54 420,0 420,74", "#fff8dc", 'opacity=".14"')]
    f = []
    for x, y in [(26, 292), (58, 302), (356, 298), (392, 286)]:
        f.append(pa(f"M{x} {y} Q{x-8} {y-18} {x-2} {y-26} Q{x+6} {y-14} {x+8} {y} Z", "#4f7a4c"))
    f.append('<g transform="translate(330 282)">' + rect(-2, 0, 4, 14, "#e9ddc5", 'rx="2"')
             + el(0, -1, 11, 6, "#c3695c") + ci(-4, -3, 1.4, "#fff") + ci(4, -2, 1.2, "#fff") + '</g>')
    return "\n".join(b), "\n".join(f)


def scenery_wetland():
    b = [ci(340, 56, 26, "#fdf8dc", 'opacity=".8"')]
    b += [pa("M0 176 Q110 166 210 178 Q320 190 420 170 L420 320 L0 320 Z", "#a8c6ac")]
    b += [pa("M0 220 Q110 210 210 222 Q320 234 420 214 L420 320 L0 320 Z", "#79a99b")]
    b += [pa("M0 252 Q120 242 230 256 Q330 268 420 246 L420 320 L0 320 Z", "#6b9c94")]
    # reeds
    for x, h in [(28, 84), (44, 66), (378, 92), (396, 70), (58, 54)]:
        b.append(pa(f"M{x} 250 Q{x-4} {250-h/2} {x+2} {250-h} Q{x+5} {250-h/2} {x+8} 250 Z", "#5f8a5c"))
        if h > 70:
            b.append(rect(x - 1, 250 - h - 14, 6, 16, "#9b7448", 'rx="3"'))
    # ripple lines
    for y, x in [(268, 90), (284, 180), (272, 300)]:
        b.append(pa(f"M{x} {y} q16 -5 32 0", "none", 'stroke="#dcefe6" stroke-width="2" opacity=".55" stroke-linecap="round"'))
    f = []
    for x, y, s in [(70, 282, 1), (352, 292, .8), (130, 302, .7)]:
        f.append(f'<g transform="translate({x} {y}) scale({s})">'
                 + pa("M0 0 A22 12 0 1 1 -22 -10 L0 -3 Z", "#5f9a6a") + '</g>')
    return "\n".join(b), "\n".join(f)


SCENERY = {
    "polar": scenery_polar, "ocean": scenery_ocean, "desert": scenery_desert,
    "savanna": scenery_savanna, "forest": scenery_forest, "wetland": scenery_wetland,
}


# --------------------------------------------------------------------------
# Animals. Each is drawn around (210, 190) with a soft outline.
# --------------------------------------------------------------------------
def snowy_owl():
    g = ['<g transform="translate(210 168)">']
    g.append(el(0, 66, 58, 62, "#f8fafd", OL))
    g.append(pa("M-52 44 Q-70 84 -36 112 Q-16 98 -20 52 Z", "#e3ebf6", OL))
    g.append(pa("M52 44 Q70 84 36 112 Q16 98 20 52 Z", "#e3ebf6", OL))
    for i in range(3):
        g.append(pa(f"M{-46+i*3} {62+i*14} q18 8 30 4", "none", 'stroke="#b9c8dc" stroke-width="2" opacity=".7"'))
        g.append(pa(f"M{46-i*3} {62+i*14} q-18 8 -30 4", "none", 'stroke="#b9c8dc" stroke-width="2" opacity=".7"'))
    # feet
    g.append(pa("M-22 122 l-8 12 m8 -12 l0 13 m8 -13 l8 12 M22 122 l-8 12 m8 -12 l0 13 m8 -13 l8 12",
                "none", 'stroke="#d9a05b" stroke-width="3" stroke-linecap="round"'))
    # ear tufts + head
    g.append(pa("M-38 -34 L-48 -60 L-22 -46 Z", "#f8fafd", OL))
    g.append(pa("M38 -34 L48 -60 L22 -46 Z", "#f8fafd", OL))
    g.append(ci(0, 0, 50, "#fcfdff", OL))
    # facial disc
    g.append(el(-20, -2, 19, 20, "#eef3fa"))
    g.append(el(20, -2, 19, 20, "#eef3fa"))
    g.append(ci(-20, -2, 12, "#f2c14e"))
    g.append(ci(20, -2, 12, "#f2c14e"))
    g.append(ci(-20, -2, 6, "#2f2a26"))
    g.append(ci(20, -2, 6, "#2f2a26"))
    g.append(ci(-22, -5, 2, "#fff"))
    g.append(ci(18, -5, 2, "#fff"))
    g.append(pa("M0 8 L-7 20 Q0 25 7 20 Z", "#d9a05b", OL))
    # speckles
    for x, y in [(-38, 46), (-26, 74), (0, 88), (26, 74), (38, 46), (-8, 60), (12, 58)]:
        g.append(pa(f"M{x} {y} l6 5", "none", 'stroke="#b6c5da" stroke-width="2" opacity=".65"'))
    g.append('</g>')
    return "".join(g)


def fox(fur="#f9fbfd", tail="#f4f8fc", tail_tip="#dbe6f2", ear="#d9e2ef", chest="#ffffff"):
    """Shared fox silhouette; white = arctic fox, rust = red fox."""
    g = ['<g transform="translate(210 190)">']
    g.append(pa("M44 66 Q96 60 92 12 Q88 -18 62 -12 Q76 22 44 34 Z", tail, OL))  # tail
    g.append(pa("M62 -12 Q80 -6 84 12 Q70 4 60 12 Z", tail_tip))
    g.append(el(0, 48, 50, 48, fur, OL))       # body
    g.append(el(0, 66, 28, 28, chest))         # chest
    g.append(el(-30, 84, 13, 8, tail, OL))
    g.append(el(30, 84, 13, 8, tail, OL))
    # head
    g.append(pa("M-40 -12 L-34 -60 L-8 -34 Z", fur, OL))
    g.append(pa("M40 -12 L34 -60 L8 -34 Z", fur, OL))
    g.append(pa("M-34 -56 L-30 -34 L-16 -38 Z", ear))
    g.append(pa("M34 -56 L30 -34 L16 -38 Z", ear))
    g.append(el(0, -10, 38, 34, fur, OL))
    g.append(pa("M-24 6 Q0 34 24 6 Q0 22 -24 6 Z", chest))
    g.append(ci(-14, -12, 4.2, "#3a3430"))
    g.append(ci(14, -12, 4.2, "#3a3430"))
    g.append(pa("M0 2 L-6 9 Q0 14 6 9 Z", "#3a3430"))
    g.append(ci(-3.5, 3, 1.2, "#fff"))
    g.append('</g>')
    return "".join(g)


def clownfish():
    g = ['<g transform="translate(206 176)">']
    g.append(pa("M-52 0 L-96 -34 L-88 0 L-96 34 Z", "#f2873c", OL))
    g.append(el(0, 0, 66, 40, "#f68a3c", OL))
    g.append(pa("M-30 -38 Q-6 -56 20 -36 L14 -22 Z", "#ef7a2c", OL))
    g.append(pa("M-16 38 Q4 54 26 36 L18 26 Z", "#ef7a2c", OL))
    g.append(rect(-30, -40, 13, 80, "#fdf7ec", 'rx="5"'))
    g.append(rect(14, -36, 12, 72, "#fdf7ec", 'rx="5"'))
    g.append(el(-30, 0, 6.5, 40, "#fdf7ec"))
    g.append(el(20, 0, 6, 36, "#fdf7ec"))
    g.append(ci(40, -8, 9, "#fff"))
    g.append(ci(40, -8, 5, "#2f2a26"))
    g.append(ci(42, -10, 1.8, "#fff"))
    g.append(pa("M56 8 q8 5 14 0", "none", 'stroke="#b4551f" stroke-width="2.5" stroke-linecap="round"'))
    g.append('</g>')
    return "".join(g)


def sea_turtle():
    g = ['<g transform="translate(210 182)">']
    g.append(pa("M-48 -18 Q-102 -44 -88 -8 Q-80 8 -52 12 Z", "#5f9f86", OL))
    g.append(pa("M-48 20 Q-100 46 -86 60 Q-68 62 -44 34 Z", "#5f9f86", OL))
    g.append(pa("M48 -18 Q102 -44 88 -8 Q80 8 52 12 Z", "#5f9f86", OL))
    g.append(pa("M48 20 Q100 46 86 60 Q68 62 44 34 Z", "#5f9f86", OL))
    g.append(el(72, -4, 26, 21, "#76b394", OL))
    g.append(ci(84, -9, 3.2, "#2f2a26"))
    g.append(ci(85, -10, 1, "#fff"))
    g.append(el(0, 4, 62, 48, "#3f8b70", OL))
    g.append(el(0, 2, 54, 41, "#57a684"))
    for cx, cy, r in [(-24, -12, 13), (12, -16, 14), (-30, 16, 12), (8, 20, 14), (36, 6, 11)]:
        g.append(pa(f"M{cx} {cy-r} L{cx+r} {cy} L{cx} {cy+r} L{cx-r} {cy} Z",
                    "#3c8067", 'stroke="#a9d6bd" stroke-width="1.6" fill-opacity=".65"'))
    g.append('</g>')
    return "".join(g)


def fennec_fox():
    g = ['<g transform="translate(210 186)">']
    g.append(pa("M40 70 Q94 66 94 20 Q90 -6 66 2 Q82 30 42 38 Z", "#e8bd83", OL))
    g.append(pa("M66 2 Q86 8 88 24 Q76 12 62 18 Z", "#fdf1da"))
    g.append(el(0, 52, 46, 46, "#eec691", OL))
    g.append(el(0, 70, 26, 26, "#fdf2dd"))
    g.append(el(-28, 90, 12, 7, "#e2b277", OL))
    g.append(el(28, 90, 12, 7, "#e2b277", OL))
    g.append(pa("M-34 -18 L-46 -86 L-6 -42 Z", "#eec691", OL))
    g.append(pa("M34 -18 L46 -86 L6 -42 Z", "#eec691", OL))
    g.append(pa("M-40 -72 L-34 -40 L-16 -46 Z", "#e79f94"))
    g.append(pa("M40 -72 L34 -40 L16 -46 Z", "#e79f94"))
    g.append(el(0, -10, 36, 32, "#f6dcae", OL))
    g.append(pa("M-22 6 Q0 32 22 6 Q0 20 -22 6 Z", "#fdf2dd"))
    g.append(ci(-13, -12, 4, "#3a3430"))
    g.append(ci(13, -12, 4, "#3a3430"))
    g.append(pa("M0 2 L-6 9 Q0 14 6 9 Z", "#3a3430"))
    g.append('</g>')
    return "".join(g)


def camel():
    g = ['<g transform="translate(210 176)">']
    # legs
    for x in [-42, -22, 22, 42]:
        g.append(rect(x - 6, 60, 12, 66, "#d2a368", f'rx="5" {OL}'))
        g.append(el(x, 128, 11, 6, "#b9874f", OL))
    g.append(el(0, 52, 68, 36, "#dfb277", OL))
    g.append(pa("M-56 40 Q-42 -6 -26 40 Z", "#dfb277", OL))
    g.append(pa("M-2 40 Q14 -8 30 40 Z", "#dfb277", OL))
    # neck + head
    g.append(pa("M52 46 Q66 8 62 -40 L86 -38 Q88 12 70 54 Z", "#dfb277", OL))
    g.append(el(78, -48, 26, 17, "#e7bd85", OL))
    g.append(pa("M96 -48 Q112 -44 106 -30 L88 -32 Z", "#e7bd85", OL))
    g.append(ci(80, -54, 3.4, "#3a3430"))
    g.append(pa("M-64 48 q-12 18 -4 34", "none", 'stroke="#c9975c" stroke-width="7" stroke-linecap="round"'))
    g.append('</g>')
    return "".join(g)


def lion():
    g = ['<g transform="translate(210 184)">']
    g.append(pa("M48 54 Q94 50 88 8 Q84 -14 72 -6 Q80 22 54 26 Z", "#d9a55a", OL))
    g.append(ci(84, 2, 9, "#8a5e33"))
    g.append(el(0, 62, 50, 42, "#e0b56b", OL))
    for x in [-32, -12, 14, 34]:
        g.append(rect(x - 7, 92, 14, 32, "#d5a55d", f'rx="5" {OL}'))
        g.append(el(x, 124, 11, 6, "#b98849"))
    g.append(ci(0, 0, 58, "#a9713c", OL))
    # mane petals
    for i in range(16):
        a = 2 * math.pi * i / 16
        g.append(ci(52 * math.cos(a), 52 * math.sin(a), 17, "#c08a48"))
    g.append(ci(0, 0, 42, "#e6c183", OL))
    g.append(el(-16, -6, 7, 8, "#fff"))
    g.append(el(16, -6, 7, 8, "#fff"))
    g.append(ci(-16, -5, 3.8, "#3a3430"))
    g.append(ci(16, -5, 3.8, "#3a3430"))
    g.append(pa("M0 8 L-9 16 Q0 24 9 16 Z", "#8c5b3b"))
    g.append(pa("M-4 18 q4 8 8 0", "none", 'stroke="#8c5b3b" stroke-width="2"'))
    g.append(ci(-11, 14, 8, "#f0d3a5"))
    g.append(ci(11, 14, 8, "#f0d3a5"))
    g.append('</g>')
    return "".join(g)


def giraffe():
    g = ['<g transform="translate(204 172)">']
    for x in [-34, -14, 18, 38]:
        g.append(rect(x - 6, 84, 12, 62, "#e8bd70", f'rx="4" {OL}'))
        g.append(el(x, 146, 10, 5, "#b98b45"))
    g.append(el(0, 78, 56, 34, "#f0c878", OL))
    g.append(pa("M-40 62 Q-58 42 -52 26 L-40 28 Q-44 44 -32 58 Z", "#e8bd70", OL))
    g.append(rect(24, -68, 26, 118, "#f0c878", f'rx="12" {OL}'))
    g.append(el(44, -70, 24, 15, "#f4d08a", OL))
    g.append(pa("M30 -82 l-3 -18 m16 18 l3 -18", "none", 'stroke="#c99b4d" stroke-width="4" stroke-linecap="round"'))
    g.append(ci(27, -86, 4.5, "#b98b45"))
    g.append(ci(51, -86, 4.5, "#b98b45"))
    g.append(pa("M60 -70 q12 2 12 10 l-12 4 Z", "#f4d08a", OL))
    g.append(ci(47, -74, 3.4, "#3a3430"))
    # spots
    for x, y, r in [(-34, 70, 8), (-12, 84, 9), (12, 68, 8), (34, 84, 7), (-4, 58, 6),
                    (30, 20, 7), (38, 0, 6), (32, -30, 6), (40, -50, 5)]:
        g.append(pa(f"M{x-r} {y} l{r} {-r*.9} l{r} {r*.9} l{-r} {r} Z", "#c9934c", 'opacity=".85"'))
    g.append('</g>')
    return "".join(g)


def heron():
    g = ['<g transform="translate(210 168)">']
    g.append(pa("M-8 100 l-4 56 m20 -56 l6 56", "none", 'stroke="#9a7d55" stroke-width="5" stroke-linecap="round"'))
    g.append(pa("M-12 156 l-12 6 m12 -6 l10 6 m12 -6 l-10 6 m10 -6 l12 6", "none",
                'stroke="#9a7d55" stroke-width="3" stroke-linecap="round"'))
    g.append(el(0, 84, 44, 34, "#8fa5b4", OL))
    g.append(pa("M32 78 Q60 76 62 98 Q44 104 26 96 Z", "#7892a4", OL))
    g.append(pa("M-6 62 Q-24 30 -12 -2 L10 -2 Q22 30 12 66 Z", "#9fb4c1", OL))
    g.append(el(0, -14, 22, 19, "#b4c5cf", OL))
    g.append(pa("M16 -16 L62 -8 L16 0 Z", "#e0b45e", OL))
    g.append(ci(4, -20, 4, "#2f2a26"))
    g.append(ci(5.2, -21, 1.2, "#fff"))
    g.append(pa("M-10 -28 q-14 -10 -22 -4", "none", 'stroke="#b4c5cf" stroke-width="4" stroke-linecap="round"'))
    for x, y in [(-16, 78), (0, 88), (16, 80)]:
        g.append(pa(f"M{x} {y} q10 8 20 0", "none", 'stroke="#6f8798" stroke-width="2" opacity=".6"'))
    g.append('</g>')
    return "".join(g)


def tree_frog():
    g = ['<g transform="translate(210 196)">']
    # lily pad
    g.append(pa("M-96 62 A96 30 0 1 0 96 62 L14 56 Z", "#5f9a6a", OL))
    g.append(pa("M14 56 L96 62 A96 30 0 0 1 60 84 Z", "#4f875b"))
    g.append(el(0, 34, 54, 34, "#6cbf65", OL))
    g.append(el(0, 46, 38, 20, "#a9dc84"))
    g.append(pa("M-48 30 Q-78 24 -74 52 Q-58 62 -42 48 Z", "#5cae58", OL))
    g.append(pa("M48 30 Q78 24 74 52 Q58 62 42 48 Z", "#5cae58", OL))
    for x, y in [(-62, 50), (-54, 56), (62, 50), (54, 56)]:
        g.append(ci(x, y, 7, "#8ed06c", OL))
    g.append(ci(-24, 2, 16, "#f6f1d8", OL))
    g.append(ci(24, 2, 16, "#f6f1d8", OL))
    g.append(ci(-24, 2, 8, "#e8963c"))
    g.append(ci(24, 2, 8, "#e8963c"))
    g.append(ci(-24, 2, 4.2, "#2f2a26"))
    g.append(ci(24, 2, 4.2, "#2f2a26"))
    g.append(pa("M-12 30 Q0 38 12 30", "none", 'stroke="#3f8440" stroke-width="2.5" stroke-linecap="round"'))
    g.append('</g>')
    return "".join(g)


def penguin():
    g = ['<g transform="translate(210 176)">']
    g.append(el(-18, 126, 20, 8, "#e0a24f", OL))
    g.append(el(18, 126, 20, 8, "#e0a24f", OL))
    g.append(el(0, 56, 52, 72, "#33383f", OL))
    g.append(el(0, 70, 34, 54, "#fbfaf5"))
    g.append(pa("M-48 34 Q-74 66 -56 100 Q-44 88 -36 60 Z", "#33383f", OL))
    g.append(pa("M48 34 Q74 66 56 100 Q44 88 36 60 Z", "#33383f", OL))
    g.append(ci(0, -6, 40, "#33383f", OL))
    g.append(el(0, 6, 26, 30, "#fbfaf5"))
    g.append(ci(-14, -10, 4, "#fbfaf5"))
    g.append(ci(14, -10, 4, "#fbfaf5"))
    g.append(ci(-14, -10, 2.2, "#2f2a26"))
    g.append(ci(14, -10, 2.2, "#2f2a26"))
    g.append(pa("M-10 2 L10 2 L0 16 Z", "#e8a34d", OL))
    g.append('</g>')
    return "".join(g)


def polar_bear():
    g = ['<g transform="translate(206 184)">']
    g.append(el(0, 56, 74, 48, "#f3f6fa", OL))
    for x in [-48, -18, 22, 50]:
        g.append(rect(x - 11, 88, 22, 38, "#e8eef6", f'rx="8" {OL}'))
        g.append(el(x, 126, 14, 7, "#d5dfeb", OL))
    g.append(ci(-60, -34, 13, "#f3f6fa", OL))
    g.append(ci(60, -34, 13, "#f3f6fa", OL))
    g.append(el(0, -28, 44, 36, "#fbfcfe", OL))
    g.append(ci(-16, -34, 3.6, "#2f2a26"))
    g.append(ci(16, -34, 3.6, "#2f2a26"))
    g.append(el(0, -18, 15, 11, "#e6edf5", OL))
    g.append(pa("M0 -20 L-7 -16 Q0 -9 7 -16 Z", "#2f2a26"))
    g.append(ci(-2.5, -17.5, 1, "#fff"))
    g.append(pa("M-4 -8 q4 5 8 0", "none", 'stroke="#2f2a26" stroke-width="2" stroke-linecap="round"'))
    g.append(el(-52, 60, 16, 22, "#e9eff7", 'transform="rotate(-16 -52 60)"'))
    g.append('</g>')
    return "".join(g)


def mallard_duck():
    g = ['<g transform="translate(206 190)">']
    g.append(pa("M-58 26 q-26 -12 -34 -2 q12 12 34 12 Z", "#c9a15f", OL))  # tail
    g.append(el(0, 34, 62, 36, "#d9c39a", OL))
    g.append(pa("M-30 20 Q-2 6 34 22 Q10 48 -26 42 Z", "#8fa9a2", OL))    # wing
    g.append(el(0, 52, 40, 16, "#efe3c7"))
    g.append(pa("M32 14 Q34 -20 40 -30 L62 -30 Q68 -18 62 12 Z", "#3f7f6a", OL))  # neck
    g.append(ci(48, -38, 22, "#3f8f73", OL))
    g.append(pa("M64 -38 L92 -32 L64 -24 Z", "#e8b455", OL))                # bill
    g.append(ci(46, -44, 4, "#2f2a26"))
    g.append(ci(47, -45, 1.4, "#fff"))
    g.append(pa("M20 -30 q10 -12 20 -6", "none", 'stroke="#f4f0df" stroke-width="3" stroke-linecap="round"'))
    g.append('</g>')
    return "".join(g)


# --------------------------------------------------------------------------
CARDS = [
    ("polar-owl",        "polar",   snowy_owl),
    ("polar-fox",        "polar",   lambda: fox()),
    ("ocean-clownfish",  "ocean",   clownfish),
    ("ocean-turtle",     "ocean",   sea_turtle),
    ("desert-fennec",    "desert",  fennec_fox),
    ("desert-camel",     "desert",  camel),
    ("savanna-lion",     "savanna", lion),
    ("savanna-giraffe",  "savanna", giraffe),
    ("forest-frog",      "forest",  tree_frog),
    ("forest-fox",       "forest",  lambda: fox(fur="#d98b4e", tail="#c97a40", tail_tip="#fdf1da",
                                                ear="#e9a98f", chest="#fdf2dd")),
    ("wetland-heron",    "wetland", heron),
    ("wetland-duck",     "wetland", mallard_duck),
]


def build(card_id, habitat, animal_fn):
    h = HABITATS[habitat]
    back, front = SCENERY[habitat]()
    sun_glow = ""
    if habitat in ("polar", "wetland", "forest"):
        sun_glow = '<radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{card_id} habitat illustration">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{h['sky'][0]}"/><stop offset="1" stop-color="{h['sky'][1]}"/>
  </linearGradient>
  {sun_glow}
  <linearGradient id="vig" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".10"/>
  </linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky)"/>
{back}
<g>{animal_fn()}</g>
{front}
<rect width="{W}" height="{H}" fill="url(#vig)" pointer-events="none"/>
</svg>'''
    path = os.path.join(OUT, card_id + ".svg")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(svg)
    return path


if __name__ == "__main__":
    made = [build(*c) for c in CARDS]
    print(f"Wrote {len(made)} SVG cards to {OUT}")
