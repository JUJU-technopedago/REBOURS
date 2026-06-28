#!/usr/bin/env python3
"""Generate elegant clock icon for Tauri app."""

from PIL import Image, ImageDraw
import math

def create_clock_icon(size=256, output_path='src-tauri/icons/icon.ico'):
    """Create an elegant clock icon."""
    
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors
    bg_color = (41, 128, 185, 255)  # Nice blue
    circle_color = (255, 255, 255, 255)  # White
    tick_color = (52, 73, 94, 255)  # Dark gray
    hand_color = (52, 152, 219, 255)  # Light blue
    hour_hand_color = (44, 62, 80, 255)  # Dark blue
    center_color = (52, 73, 94, 255)  # Dark gray
    
    margin = 20
    center = (size // 2, size // 2)
    radius = (size - 2 * margin) // 2
    
    # Draw background circle
    draw.ellipse(
        [(center[0] - radius, center[1] - radius),
         (center[0] + radius, center[1] + radius)],
        fill=bg_color
    )
    
    # Draw white circle (clock face)
    clock_radius = radius - 10
    draw.ellipse(
        [(center[0] - clock_radius, center[1] - clock_radius),
         (center[0] + clock_radius, center[1] + clock_radius)],
        fill=circle_color,
        outline=bg_color,
        width=3
    )
    
    # Draw hour ticks
    tick_length = 15
    for i in range(12):
        angle = math.radians(i * 30 - 90)
        x1 = center[0] + (clock_radius - tick_length) * math.cos(angle)
        y1 = center[1] + (clock_radius - tick_length) * math.sin(angle)
        x2 = center[0] + clock_radius * math.cos(angle)
        y2 = center[1] + clock_radius * math.sin(angle)
        draw.line([(x1, y1), (x2, y2)], fill=tick_color, width=2)
    
    # Draw hour hand (pointing to 10)
    hour_angle = math.radians(300 - 90)  # 10 o'clock
    hour_length = clock_radius * 0.5
    hour_x = center[0] + hour_length * math.cos(hour_angle)
    hour_y = center[1] + hour_length * math.sin(hour_angle)
    draw.line([center, (hour_x, hour_y)], fill=hour_hand_color, width=5)
    
    # Draw minute hand (pointing to 2)
    minute_angle = math.radians(60 - 90)  # 2 o'clock
    minute_length = clock_radius * 0.7
    minute_x = center[0] + minute_length * math.cos(minute_angle)
    minute_y = center[1] + minute_length * math.sin(minute_angle)
    draw.line([center, (minute_x, minute_y)], fill=hand_color, width=4)
    
    # Draw center dot
    center_size = 8
    draw.ellipse(
        [(center[0] - center_size, center[1] - center_size),
         (center[0] + center_size, center[1] + center_size)],
        fill=center_color
    )
    
    # Convert to RGB for ICO format, save PNG first
    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
    rgb_img.paste(img, mask=img.split()[3])  # Use alpha channel as mask
    
    # Save as ICO
    rgb_img.save(output_path, format='ICO', sizes=[(256, 256)])
    print(f"✓ Icon created: {output_path}")
    
    # Also save as PNG for other uses
    img.save('src-tauri/icons/icon.png')
    print("✓ PNG version: src-tauri/icons/icon.png")

if __name__ == '__main__':
    import os
    os.makedirs('src-tauri/icons', exist_ok=True)
    create_clock_icon()
