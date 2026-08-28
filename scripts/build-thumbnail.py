"""
Build a 1280x720 YouTube-style thumbnail for the NewsFlow Trader demo video.
Cleaner composition:
- Top 65% = dashboard screenshot (header + KPI row + start of columns)
- Bottom 35% = solid dark band with title, subtitle, badges
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = '/home/z/my-project/download/thumbnail-source.png'
OUT = '/home/z/my-project/download/newsflow-trader-thumbnail.png'

TARGET_W, TARGET_H = 1280, 720
TOP_H = int(TARGET_H * 0.65)  # 468px for the dashboard
BOTTOM_H = TARGET_H - TOP_H  # 252px for the title band

# Load source
src = Image.open(SRC).convert('RGB')
src_w, src_h = src.size
print(f'source: {src.size}')

# Crop the top portion of the dashboard (header + KPI cards + start of columns)
# The dashboard is 1440x1541 — we want the top 468 / 720 (target ratio) of the *visual* content
# Just take a top-center crop that's wider than 16:9, then resize to 1280x468
src_aspect_for_top = TARGET_W / TOP_H  # ~2.74
# We want to take the top of the screenshot — header + KPIs + start of 3-column layout
# Source is 1440 wide. So the crop height = 1440 / 2.74 = 525px
crop_h = int(src_w / src_aspect_for_top)
top_crop = src.crop((0, 0, src_w, crop_h))
top_crop = top_crop.resize((TARGET_W, TOP_H), Image.LANCZOS)
print(f'top crop: {top_crop.size}')

# Build the canvas
canvas = Image.new('RGB', (TARGET_W, TARGET_H), (8, 12, 20))  # slate-950
canvas.paste(top_crop, (0, 0))

# Bottom band: solid slate-950 with a thin emerald divider line at top
draw = ImageDraw.Draw(canvas)
# Divider line
draw.line([(0, TOP_H), (TARGET_W, TOP_H)], fill=(16, 185, 129), width=2)  # emerald-500

# Load fonts
def font(name, size):
    return ImageFont.truetype(f'/usr/share/fonts/truetype/dejavu/{name}', size)

title_font = font('DejaVuSans-Bold.ttf', 80)
sub_font = font('DejaVuSans.ttf', 32)
badge_font = font('DejaVuSans-Bold.ttf', 22)
tag_font = font('DejaVuSans-Bold.ttf', 18)

# Title (bottom-left, large)
title_text = 'NewsFlow Trader'
title_y = TOP_H + 35
draw.text((40, title_y), title_text, font=title_font, fill=(255, 255, 255))

# Subtitle
sub_text = 'Autonomous LLM-driven news trading agent · Alpaca Trading API'
sub_y = title_y + 95
draw.text((40, sub_y), sub_text, font=sub_font, fill=(148, 163, 184))  # slate-400

# Hackathon badge (top-right of bottom band)
badge_text = 'ALPACA AI TRADING AGENTS HACKATHON'
bbox = draw.textbbox((0, 0), badge_text, font=badge_font)
badge_w = bbox[2] - bbox[0]
badge_h = bbox[3] - bbox[1]
pad = 14
box_w = badge_w + pad * 2
box_h = badge_h + pad
bx = TARGET_W - 40 - box_w
by = TOP_H + 25
draw.rounded_rectangle(
    [bx, by, bx + box_w, by + box_h],
    radius=box_h // 2,
    fill=(6, 95, 70),  # emerald-800
)
draw.text((bx + pad, by + pad // 2 - 2), badge_text, font=badge_font, fill=(255, 255, 255))

# Tech stack tags (below the hackathon badge)
stack = ['Next.js 16', 'GLM-4.6', 'z-ai SDK', 'Alpaca Paper', 'Prisma']
tag_y = by + box_h + 14
cur_x = TARGET_W - 40
for s in reversed(stack):
    bbox = draw.textbbox((0, 0), s, font=tag_font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    pad_x, pad_y = 10, 6
    bw = w + pad_x * 2
    bh = h + pad_y
    cur_x -= bw
    draw.rounded_rectangle(
        [cur_x, tag_y, cur_x + bw, tag_y + bh],
        radius=bh // 2,
        fill=(30, 41, 59),  # slate-800
        outline=(71, 85, 105),  # slate-600
        width=1,
    )
    draw.text((cur_x + pad_x, tag_y + pad_y // 2 - 1), s, font=tag_font, fill=(226, 232, 240))  # slate-200
    cur_x -= 10  # gap

# "LIVE DEMO" red badge top-right of the dashboard area (positioned to not collide with the dashboard's own badges)
# Put it in the top-left corner where there's empty space next to the title
live_x, live_y = 40, 30
draw.ellipse([live_x, live_y, live_x + 14, live_y + 14], fill=(239, 68, 68))
draw.text((live_x + 22, live_y - 4), 'LIVE DEMO · 2:43', font=badge_font, fill=(255, 255, 255))

# Save
canvas.save(OUT, 'PNG', optimize=True)
print(f'thumbnail saved: {OUT}')
print(f'size: {canvas.size}')
