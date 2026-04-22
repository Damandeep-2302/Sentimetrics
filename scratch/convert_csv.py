import csv
import json
import os

csv_path = r'Y:\Sentimetrics\smart-sales-assistant\smartphones_cleaned_v6.csv'
json_path = r'y:\Mini Project\node_modules\Sentimetrics\src\api\phones.json'

phones = []

with open(csv_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        try:
            # Basic info
            brand = row['brand_name'].capitalize()
            model = row['model']
            price = int(float(row['price'])) if row['price'] else 0
            battery = int(float(row['battery_capacity'])) if row['battery_capacity'] else 0
            screen = float(row['screen_size']) if row['screen_size'] else 0.0
            storage = int(float(row['internal_memory'])) if row['internal_memory'] else 0
            ram = int(float(row['ram_capacity'])) if row['ram_capacity'] else 0
            processor = float(row['processor_speed']) if row['processor_speed'] else 0.0
            camera = int(float(row['primary_camera_rear'])) if row['primary_camera_rear'] else 0
            charging = int(float(row['fast_charging'])) if row['fast_charging'] else 0
            
            # Subjective scores derived from rating or defaults
            rating = float(row['rating']) if row['rating'] else 70.0
            score = round(rating / 10, 1)
            
            has_5g = row['has_5g'].lower() == 'true'
            is_ios = row['os'].lower() == 'ios'
            
            phones.append({
                "id": i + 1,
                "name": model,
                "brand": brand,
                "price": price,
                "battery": battery,
                "screen": screen,
                "storage": storage,
                "ram": ram,
                "processor": processor,
                "camera": camera,
                "charging": charging,
                "performance": min(10, round(score * 1.1, 1)) if processor > 3.0 else score,
                "quality": score,
                "sound": score,
                "design": score,
                "network": 10 if has_5g else 6,
                "software": 10 if is_ios else 8,
                "build": score
            })
        except Exception as e:
            print(f"Error parsing row {i}: {e}")
            continue

# Limit to top results if needed, but let's try all
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(phones, f, indent=2)

print(f"Successfully converted {len(phones)} phones to JSON.")
