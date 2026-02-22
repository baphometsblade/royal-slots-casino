from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

output_dir = Path(r"C:\created games\Casino\assets")

def create_game_thumbnail(name, gradient_colors, symbol_type, filename):
    img = Image.new('RGB', (400, 300), gradient_colors[0])
    draw = ImageDraw.Draw(img)
    
    # Gradient background
    for i in range(300):
        r = gradient_colors[0][0] + (gradient_colors[1][0] - gradient_colors[0][0]) * i // 300
        g = gradient_colors[0][1] + (gradient_colors[1][1] - gradient_colors[0][1]) * i // 300
        b = gradient_colors[0][2] + (gradient_colors[1][2] - gradient_colors[0][2]) * i // 300
        draw.rectangle([0, i, 400, i+1], fill=(r, g, b))
    
    # Crown symbol
    draw.polygon([(120, 180), (140, 130), (160, 180)], fill=(255, 215, 0))
    draw.polygon([(175, 180), (200, 110), (225, 180)], fill=(255, 215, 0))
    draw.polygon([(240, 180), (260, 130), (280, 180)], fill=(255, 215, 0))
    draw.rectangle([120, 180, 280, 210], fill=(255, 215, 0))
    # Rubies
    draw.ellipse([133, 123, 147, 137], fill=(220, 20, 60))
    draw.ellipse([193, 103, 207, 117], fill=(220, 20, 60))
    draw.ellipse([253, 123, 267, 137], fill=(220, 20, 60))
    
    img.save(output_dir / filename)
    print(f"Created: {filename}")

# Create Crown Jewels thumbnail
create_game_thumbnail("Crown Jewels", [(252, 203, 144), (213, 126, 235)], 'crown', "thumb_royal_crown.jpg")
print("Crown Jewels thumbnail created successfully!")
