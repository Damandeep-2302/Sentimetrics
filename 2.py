# =============================================================
#  ABSA PIPELINE — Mobile Phone Comparison
#  Uses correctly labeled auto_labeled_dataset.csv
# 
#  HOW TO RUN:
#  1. Install libraries once (run in terminal):
#       pip install pandas scikit-learn matplotlib seaborn
#  2. Put this file in same folder as auto_labeled_dataset.csv
#  3. Run:   python absa_pipeline.py
# =============================================================

import pandas as pd 
import numpy as np
import ast, re, warnings
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

# =============================================================
#  SETTINGS — already updated to use your labeled file
# =============================================================
FILE_NAME     = "auto_labeled_dataset.csv"
COL_REVIEW    = "clean_review"        # already cleaned in colab
COL_BRAND     = "phone"               # 'phone' column created in colab
COL_ASPECT    = "aspect"              # aspect column
COL_SENTIMENT = "aspect_sentiment"    # correct per-aspect labels from colab

def sep(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


# =============================================================
#  STEP 1 — LOAD DATA
# =============================================================
sep("STEP 1 — Loading your labeled dataset")

df = pd.read_csv(FILE_NAME)

print(f"Rows loaded      : {len(df)}")
print(f"Columns          : {list(df.columns)}")
print(f"\nFirst 5 rows:")
print(df[[COL_REVIEW, COL_ASPECT, COL_SENTIMENT]].head(5).to_string())
print(f"\nLabel distribution (per-aspect sentiment):")
print(df[COL_SENTIMENT].value_counts().to_string())
print(f"\nTop aspects:")
print(df[COL_ASPECT].value_counts().head(14).to_string())
print(f"\nPhones in dataset:")
print(df[COL_BRAND].value_counts().head(10).to_string())

df.to_csv("step1_loaded.csv", index=False)
print("\n>> Saved: step1_loaded.csv")
input("\nPress ENTER to continue to Step 2...")


# =============================================================
#  STEP 2 — CLEAN AND PREPARE
#  Data is already exploded (one row per aspect) from Colab.
#  We just need to clean text and drop empty rows.
# =============================================================
sep("STEP 2 — Cleaning and preparing data")

def clean_text(text):
    if pd.isna(text): return ""
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()

# Drop missing values
df = df.dropna(subset=[COL_REVIEW, COL_ASPECT, COL_SENTIMENT]).copy()
df[COL_REVIEW]    = df[COL_REVIEW].astype(str).str.strip()
df[COL_ASPECT]    = df[COL_ASPECT].astype(str).str.strip().str.lower()
df[COL_SENTIMENT] = df[COL_SENTIMENT].astype(str).str.strip().str.lower()

# Keep only valid labels
valid = ['positive', 'negative', 'neutral']
df = df[df[COL_SENTIMENT].isin(valid)].copy()
df = df[df[COL_REVIEW] != ''].copy()
df = df[df[COL_ASPECT] != ''].copy()
df = df.reset_index(drop=True)

# Feature: review text + aspect word combined
# Model learns: "battery drains fast aspect battery" = negative
df['text_with_aspect'] = df[COL_REVIEW] + " aspect " + df[COL_ASPECT]

print(f"Rows after cleaning : {len(df)}")
print(f"\nLabel distribution after cleaning:")
print(df[COL_SENTIMENT].value_counts().to_string())
print(f"\nSample rows:")
print(df[['text_with_aspect', COL_SENTIMENT]].head(5).to_string())

df.to_csv("step2_cleaned.csv", index=False)
print("\n>> Saved: step2_cleaned.csv")
input("\nPress ENTER to continue to Step 3...")


# =============================================================
#  STEP 3 — TF-IDF VECTORIZATION
#  Converts text into numbers the ML model understands.
#  TF-IDF gives higher score to important/unique words.
# =============================================================
sep("STEP 3 — TF-IDF Vectorization (text → numbers)")

X = df['text_with_aspect']
y = df[COL_SENTIMENT]

print(f"Total samples : {len(X)}")
print(f"Labels        :\n{y.value_counts().to_string()}")

tfidf = TfidfVectorizer(
    max_features=10000,   # top 10,000 words
    ngram_range=(1, 2),   # single words + word pairs
    min_df=2,             # ignore words appearing only once
    sublinear_tf=True     # dampen very frequent words
)
X_tfidf = tfidf.fit_transform(X)

print(f"\nTF-IDF matrix : {X_tfidf.shape}")
print(f"  {X_tfidf.shape[0]} rows  x  {X_tfidf.shape[1]} word features")
input("\nPress ENTER to continue to Step 4...")


# =============================================================
#  STEP 4 — TRAIN / TEST SPLIT
#  80% → model trains on this
#  20% → we test accuracy on this (model never sees it)
# =============================================================
sep("STEP 4 — Train/Test Split (80% train / 20% test)")

X_train, X_test, y_train, y_test = train_test_split(
    X_tfidf, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print(f"Training rows : {X_train.shape[0]}")
print(f"Testing rows  : {X_test.shape[0]}")
print(f"\nTraining label distribution:")
print(y_train.value_counts().to_string())
print(f"\nTesting label distribution:")
print(y_test.value_counts().to_string())
input("\nPress ENTER to continue to Step 5...")


# =============================================================
#  STEP 5 — TRAIN BOTH MODELS
#  Logistic Regression: learns probabilities per class
#  SVM: draws decision boundaries between classes
#  We train both and pick the better one automatically.
# =============================================================
sep("STEP 5 — Training Logistic Regression and SVM")

print("[1/2] Training Logistic Regression...")
lr = LogisticRegression(
    max_iter=1000,
    C=1.0,
    class_weight='balanced',
    random_state=42
)
lr.fit(X_train, y_train)
print("      Done!")

print("\n[2/2] Training SVM (LinearSVC)...")
svm = LinearSVC(
    C=1.0,
    class_weight='balanced',
    max_iter=2000,
    random_state=42
)
svm.fit(X_train, y_train)
print("      Done!")
input("\nPress ENTER to see evaluation results...")


# =============================================================
#  STEP 6 — EVALUATE BOTH MODELS
#  Accuracy  : overall correct predictions
#  Precision : of predicted positives, how many are truly positive
#  Recall    : of true positives, how many did we catch
#  F1 score  : balance of precision and recall (main metric)
# =============================================================
sep("STEP 6 — Evaluation Results")

def evaluate(name, model, Xt, yt):
    pred = model.predict(Xt)
    acc  = accuracy_score(yt, pred)
    print(f"\n{'─'*50}")
    print(f"  {name}  —  Accuracy: {acc*100:.2f}%")
    print(f"{'─'*50}")
    print(classification_report(yt, pred, zero_division=0))
    return pred, acc

lr_pred,  lr_acc  = evaluate("Logistic Regression", lr,  X_test, y_test)
svm_pred, svm_acc = evaluate("SVM (LinearSVC)",     svm, X_test, y_test)

# Save confusion matrix image
labels = sorted(y.unique())
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
for ax, pred, title in zip(axes,
                            [lr_pred, svm_pred],
                            ["Logistic Regression", "SVM"]):
    cm = confusion_matrix(y_test, pred, labels=labels)
    sns.heatmap(cm, annot=True, fmt='d', ax=ax, cmap='Blues',
                xticklabels=labels, yticklabels=labels)
    ax.set_title(f"Confusion Matrix — {title}", fontsize=13)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
plt.tight_layout()
plt.savefig("step6_confusion_matrices.png", dpi=150, bbox_inches='tight')
plt.close()
print("\n>> Saved: step6_confusion_matrices.png")

# Pick best model
best_model = svm  if svm_acc >= lr_acc else lr
best_name  = "SVM" if svm_acc >= lr_acc else "Logistic Regression"
print(f"\n>> Best model: {best_name}  ({max(lr_acc, svm_acc)*100:.2f}% accuracy)")
print(f"   This will be used to predict on all reviews.")
input("\nPress ENTER to predict on all reviews...")


# =============================================================
#  STEP 7 — PREDICT ON ALL ROWS
#  The trained model now predicts sentiment for every
#  (review + aspect) pair in the full dataset.
# =============================================================
sep("STEP 7 — Predicting sentiment on ALL rows")

print(f"Using: {best_name}")
print(f"Predicting on {len(df)} rows...")

X_all = tfidf.transform(df['text_with_aspect'])
df['predicted_sentiment'] = best_model.predict(X_all)

print(f"\nDone!")
print(f"\nPredicted label distribution:")
print(df['predicted_sentiment'].value_counts().to_string())

print(f"\nSample predictions:")
print(df[[COL_REVIEW, COL_ASPECT,
          COL_SENTIMENT, 'predicted_sentiment']].head(10).to_string())

df.to_csv("step7_predictions.csv", index=False)
print("\n>> Saved: step7_predictions.csv")
input("\nPress ENTER to aggregate scores...")


# =============================================================
#  STEP 8 — AGGREGATE SCORES PER PHONE PER ASPECT
#  Count positives and negatives per phone per aspect.
#  Score = (positives - negatives) / total × 100
#  Score range: -100 (all negative) to +100 (all positive)
# =============================================================
sep("STEP 8 — Aggregating scores per phone per aspect")

# Drop rows with missing phone
df_agg = df[df[COL_BRAND].notna()].copy()

agg = (df_agg
       .groupby([COL_BRAND, COL_ASPECT, 'predicted_sentiment'])
       .size()
       .unstack(fill_value=0))

for col in ['positive', 'negative', 'neutral']:
    if col not in agg.columns:
        agg[col] = 0

agg = agg.reset_index()
agg['total']        = agg['positive'] + agg['negative'] + agg['neutral']
agg['score']        = ((agg['positive'] - agg['negative'])
                       / agg['total'] * 100).round(1)
agg['positive_pct'] = (agg['positive'] / agg['total'] * 100).round(1)

# Remove aspects with fewer than 10 mentions (too noisy)
agg = agg[agg['total'] >= 10].copy()
agg = agg.sort_values([COL_BRAND, 'score'], ascending=[True, False])

print(f"Aggregated scores (first 20 rows):")
print(agg.head(20).to_string())

agg.to_csv("step8_scores.csv", index=False)
print("\n>> Saved: step8_scores.csv")
print("\nOpen step8_scores.csv to see scores for every phone and aspect.")

# Print unique phones available for comparison
print(f"\nPhones available in your data:")
phones = agg[COL_BRAND].unique()
for i, p in enumerate(phones[:20]):
    print(f"  {i+1}. {p}")
print("\nNote these names — you will need them for the comparison chart below.")
input("\nPress ENTER to generate comparison chart...")


# =============================================================
#  STEP 9 — COMPARISON CHART
#  Change PHONE_A and PHONE_B to any two phones from the
#  list printed above to compare them.
# =============================================================
sep("STEP 9 — Phone Comparison Chart")

# *** CHANGE THESE TO THE TWO PHONES YOU WANT TO COMPARE ***
# Use exact names from the list printed above
top2    = df_agg[COL_BRAND].value_counts().head(2).index.tolist()
PHONE_A = top2[0] if len(top2) > 0 else None
PHONE_B = top2[1] if len(top2) > 1 else None

# Example — uncomment and change to compare specific phones:
# PHONE_A = "Samsung"
# PHONE_B = "Apple"

print(f"Comparing: [ {PHONE_A} ]  vs  [ {PHONE_B} ]")
print("To compare different phones: open script, find PHONE_A")
print("and PHONE_B near the bottom and change them, then run again.")

if PHONE_A and PHONE_B:
    a_asp  = set(agg[agg[COL_BRAND] == PHONE_A]['aspect'])
    b_asp  = set(agg[agg[COL_BRAND] == PHONE_B]['aspect'])
    common = list(a_asp & b_asp)

    if not common:
        print(f"\nNo common aspects between {PHONE_A} and {PHONE_B}.")
        print("Try different phone names from the list above.")
    else:
        # Pick top 8 most frequent common aspects
        freq    = df_agg[df_agg[COL_ASPECT].isin(common)][COL_ASPECT].value_counts()
        top8    = freq.head(8).index.tolist()

        scores_a = (agg[(agg[COL_BRAND] == PHONE_A) &
                        (agg[COL_ASPECT].isin(top8))]
                    .set_index(COL_ASPECT)['score'])
        scores_b = (agg[(agg[COL_BRAND] == PHONE_B) &
                        (agg[COL_ASPECT].isin(top8))]
                    .set_index(COL_ASPECT)['score'])

        cmp = pd.DataFrame({
            PHONE_A: scores_a,
            PHONE_B: scores_b
        }).reindex(top8).fillna(0)

        print(f"\nComparison table:")
        print(cmp.round(1).to_string())

        # Bar chart
        fig, ax = plt.subplots(figsize=(13, 6))
        x, w    = np.arange(len(cmp)), 0.35

        ba = ax.bar(x - w/2, cmp[PHONE_A], w,
                    label=PHONE_A, color='#378ADD', alpha=0.85)
        bb = ax.bar(x + w/2, cmp[PHONE_B], w,
                    label=PHONE_B, color='#1D9E75', alpha=0.85)

        ax.set_xlabel('Aspect', fontsize=12)
        ax.set_ylabel('Sentiment Score  (−100 to +100)', fontsize=12)
        ax.set_title(
            f'Phone Comparison — Aspect Based Sentiment Analysis\n'
            f'{PHONE_A}  vs  {PHONE_B}',
            fontsize=14)
        ax.set_xticks(x)
        ax.set_xticklabels(cmp.index, rotation=30, ha='right', fontsize=11)
        ax.axhline(0, color='gray', linewidth=0.8, linestyle='--')
        ax.legend(fontsize=12)
        ax.grid(axis='y', alpha=0.3)

        # Value labels on bars
        for bar in list(ba) + list(bb):
            h = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2,
                    h + 0.8, f'{h:.0f}',
                    ha='center', va='bottom', fontsize=9)

        plt.tight_layout()
        plt.savefig("step9_comparison_chart.png", dpi=150, bbox_inches='tight')
        plt.close()
        print(f"\n>> Saved: step9_comparison_chart.png")
        print(f"Open this image to see your final comparison chart!")


# =============================================================
sep("ALL DONE — Files created")
print("""
  step1_loaded.csv              your labeled data as loaded
  step2_cleaned.csv             cleaned data ready for training
  step6_confusion_matrices.png  how accurate each model is
  step7_predictions.csv         all rows with predicted sentiment
  step8_scores.csv              score per phone per aspect
  step9_comparison_chart.png    FINAL comparison chart

Open step9_comparison_chart.png — that is your final result!

To compare specific phones:
  Open this script, find PHONE_A and PHONE_B near the bottom,
  change them to phone names from the list that was printed,
  then run again. Takes only 1-2 minutes to rerun.
""")