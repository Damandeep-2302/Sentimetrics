from flask import Flask, render_template, request, jsonify
import pandas as pd
import json, re

app = Flask(__name__)

print("Loading data...")

df = pd.read_csv("auto_labeled_dataset.csv")
df = df[df['aspect'].notna() & df['aspect_sentiment'].notna()].copy()
df['predicted_sentiment'] = df['aspect_sentiment']
df['phone'] = df['phone'].astype(str).str.strip()

models_df = pd.read_csv("available_phone_models.csv")
models_df['Brand Name'] = models_df['Brand Name'].astype(str).str.strip()
models_df['Model Name'] = models_df['Model Name'].astype(str).str.strip()
models_df = models_df[models_df['Brand Name'].notna() & models_df['Model Name'].notna()]

# Sort by review_count descending so popular/latest models appear first
models_df = models_df.sort_values('review_count', ascending=False)

BRANDS = sorted(models_df['Brand Name'].unique().tolist())

brand_models = {}
for brand in BRANDS:
    bdf = models_df[models_df['Brand Name'] == brand]
    # Keep order by review_count (already sorted above)
    models = bdf['Model Name'].tolist()
    seen = set()
    unique_models = []
    for m in models:
        if m not in seen:
            seen.add(m)
            unique_models.append(m)
    if unique_models:
        brand_models[brand] = unique_models

print(f"Brands: {len(brand_models)}, Sentiment rows: {len(df)}")

def get_scores(ftype, value):
    # Both brand and model: match by brand name prefix in sentiment data
    # Extract brand from value (first word)
    brand_key = value.split()[0]
    sub = df[df['phone'].str.lower().str.startswith(brand_key.lower())]

    if not len(sub): return {}

    agg = sub.groupby(['aspect', 'predicted_sentiment']).size().unstack(fill_value=0)
    for c in ['positive', 'negative', 'neutral']:
        if c not in agg.columns: agg[c] = 0
    agg = agg.reset_index()
    agg['total'] = agg['positive'] + agg['negative'] + agg['neutral']
    agg = agg[agg['total'] >= 5]
    agg['score'] = ((agg['positive'] - agg['negative']) / agg['total'] * 100).round(1)
    agg['positive_pct'] = (agg['positive'] / agg['total'] * 100).round(1)
    return agg.set_index('aspect')[['score', 'positive_pct', 'total']].to_dict('index')

@app.route('/')
def index():
    return render_template('index.html',
                           brands=list(brand_models.keys()),
                           brand_models=json.dumps(brand_models))

@app.route('/compare', methods=['POST'])
def compare():
    d = request.json
    sa = get_scores(d['type_a'], d['value_a'])
    sb = get_scores(d['type_b'], d['value_b'])
    if not sa: return jsonify({'error': f"No review data found for: {d['value_a']}"}), 400
    if not sb: return jsonify({'error': f"No review data found for: {d['value_b']}"}), 400
    common = set(sa) & set(sb)
    top = sorted(common, key=lambda a: abs(sa[a]['score']) + abs(sb[a]['score']), reverse=True)[:10]
    return jsonify({'label_a': d['value_a'], 'label_b': d['value_b'],
                    'aspects': top,
                    'scores_a': {a: sa[a] for a in top},
                    'scores_b': {a: sb[a] for a in top}})

@app.route('/models/<brand>')
def models(brand):
    return jsonify(brand_models.get(brand, []))

if __name__ == '__main__':
    app.run(debug=True)