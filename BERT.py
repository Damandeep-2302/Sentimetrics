# =============================================================
#  ABSA PIPELINE — With Fine-tuned BERT Added
#  Run in Google Colab, GPU enabled (T4)
# =============================================================

# ---- CELL 1: Install ----------------------------------------
import subprocess
subprocess.check_call(['pip', 'install', 'transformers', 'torch', 'scikit-learn', 'pandas', 'matplotlib', 'seaborn', '-q'])

# ---- CELL 2: Imports ----------------------------------------
import pandas as pd
import numpy as np
import ast, re, warnings, os, torch
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.metrics import (classification_report, accuracy_score,
                              confusion_matrix)
from torch.utils.data import Dataset, DataLoader
from transformers import (BertTokenizer, BertForSequenceClassification,
                           get_scheduler)
from torch.optim import AdamW
from tqdm import tqdm

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Device: {device}")

# ---- CELL 3: Settings ---------------------------------------
FILE_NAME     = "auto_labeled_dataset.csv"   # ← your file
COL_REVIEW    = "clean_review"
COL_BRAND     = "phone"
COL_ASPECT    = "aspect"
COL_SENTIMENT = "aspect_sentiment"

def sep(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

# ---- CELL 4: Load Data --------------------------------------
sep("STEP 1 — Load Data")

df = pd.read_csv(FILE_NAME)
print(f"Rows: {len(df)}")
print(f"Columns: {list(df.columns)}")
print(df[[COL_REVIEW, COL_ASPECT, COL_SENTIMENT]].head(5))
print("\nLabel distribution:")
print(df[COL_SENTIMENT].value_counts())

# ---- CELL 5: Clean Data ------------------------------------
sep("STEP 2 — Clean Data")

def clean_text(text):
    if pd.isna(text): return ""
    text = str(text).lower()
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()

df = df.dropna(subset=[COL_REVIEW, COL_ASPECT, COL_SENTIMENT]).copy()
df[COL_REVIEW]    = df[COL_REVIEW].astype(str).str.strip()
df[COL_ASPECT]    = df[COL_ASPECT].astype(str).str.strip().str.lower()
df[COL_SENTIMENT] = df[COL_SENTIMENT].astype(str).str.strip().str.lower()

valid = ['positive', 'negative', 'neutral']
df    = df[df[COL_SENTIMENT].isin(valid)].reset_index(drop=True)

# Combined input text for TF-IDF models
df['text_with_aspect'] = df[COL_REVIEW] + " aspect " + df[COL_ASPECT]

# Combined input text for BERT  (uses [SEP] token between them)
df['bert_input'] = df[COL_REVIEW] + " [SEP] " + df[COL_ASPECT]

print(f"Rows after cleaning: {len(df)}")
print(df[COL_SENTIMENT].value_counts())

# ---- CELL 6: TF-IDF Vectorize + Split ----------------------
sep("STEP 3 — TF-IDF + Split")

label_map    = {'positive': 2, 'neutral': 1, 'negative': 0}
inv_label    = {v: k for k, v in label_map.items()}

X     = df['text_with_aspect']
y     = df[COL_SENTIMENT]
y_num = df[COL_SENTIMENT].map(label_map)

# Shared 80/20 split index for ALL models (fair comparison)
idx_train, idx_test = train_test_split(
    df.index, test_size=0.2, random_state=42, stratify=y
)

tfidf   = TfidfVectorizer(max_features=10000, ngram_range=(1,2),
                           min_df=2, sublinear_tf=True)
X_tfidf = tfidf.fit_transform(X)

X_train_tf = X_tfidf[idx_train]
X_test_tf  = X_tfidf[idx_test]
y_train    = y.iloc[idx_train]
y_test     = y.iloc[idx_test]

print(f"Train: {len(idx_train)}  |  Test: {len(idx_test)}")

# ---- CELL 7: Train LR + SVM --------------------------------
sep("STEP 4 — Train Logistic Regression & SVM")

print("Training Logistic Regression...")
lr = LogisticRegression(max_iter=1000, C=1.0,
                         class_weight='balanced', random_state=42)
lr.fit(X_train_tf, y_train)

print("Training SVM...")
svm = LinearSVC(C=1.0, class_weight='balanced',
                max_iter=2000, random_state=42)
svm.fit(X_train_tf, y_train)
print("Done!")

# ---- CELL 8: BERT Dataset Class ----------------------------
sep("STEP 5 — Prepare BERT Dataset")

tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

class ABSADataset(Dataset):
    def __init__(self, texts, labels, max_len=128):
        self.enc = tokenizer(
            list(texts), truncation=True, padding=True,
            max_length=max_len, return_tensors='pt'
        )
        self.labels = torch.tensor(list(labels), dtype=torch.long)

    def __len__(self): return len(self.labels)

    def __getitem__(self, idx):
        return {
            'input_ids':      self.enc['input_ids'][idx],
            'attention_mask': self.enc['attention_mask'][idx],
            'labels':         self.labels[idx]
        }

bert_texts  = df['bert_input']
bert_labels = y_num

train_ds = ABSADataset(bert_texts.iloc[idx_train],
                        bert_labels.iloc[idx_train])
test_ds  = ABSADataset(bert_texts.iloc[idx_test],
                        bert_labels.iloc[idx_test])

train_loader = DataLoader(train_ds, batch_size=16, shuffle=True)
test_loader  = DataLoader(test_ds,  batch_size=16)

print(f"BERT Train batches: {len(train_loader)}")
print(f"BERT Test  batches: {len(test_loader)}")

# ---- CELL 9: Fine-tune BERT --------------------------------
sep("STEP 6 — Fine-tune BERT (this takes ~20-40 mins on T4)")

model = BertForSequenceClassification.from_pretrained(
    'bert-base-uncased', num_labels=3
)
model.to(device)

NUM_EPOCHS = 4
optimizer  = AdamW(model.parameters(), lr=2e-5, weight_decay=0.01)
scheduler  = get_scheduler(
    "linear", optimizer=optimizer,
    num_warmup_steps=0,
    num_training_steps=NUM_EPOCHS * len(train_loader)
)

best_val_acc = 0
train_losses = []

for epoch in range(NUM_EPOCHS):
    model.train()
    total_loss = 0

    for batch in tqdm(train_loader, desc=f"Epoch {epoch+1}/{NUM_EPOCHS}"):
        optimizer.zero_grad()
        out  = model(
            input_ids      = batch['input_ids'].to(device),
            attention_mask = batch['attention_mask'].to(device),
            labels         = batch['labels'].to(device)
        )
        out.loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        scheduler.step()
        total_loss += out.loss.item()

    avg_loss = total_loss / len(train_loader)
    train_losses.append(avg_loss)

    # Quick validation
    model.eval()
    preds, trues = [], []
    with torch.no_grad():
        for batch in test_loader:
            o = model(
                input_ids      = batch['input_ids'].to(device),
                attention_mask = batch['attention_mask'].to(device)
            )
            preds.extend(torch.argmax(o.logits, 1).cpu().numpy())
            trues.extend(batch['labels'].numpy())

    val_acc = accuracy_score(trues, preds)
    print(f"Epoch {epoch+1} | Loss: {avg_loss:.4f} | Val Acc: {val_acc*100:.2f}%")

    if val_acc > best_val_acc:
        best_val_acc = val_acc
        torch.save(model.state_dict(), 'best_bert.pt')
        print("  ✅ Best model saved!")

# ---- CELL 10: Evaluate All 3 Models ------------------------
sep("STEP 7 — Compare All 3 Models")

# LR + SVM predictions
lr_pred  = lr.predict(X_test_tf)
svm_pred = svm.predict(X_test_tf)
lr_acc   = accuracy_score(y_test, lr_pred)
svm_acc  = accuracy_score(y_test, svm_pred)

# BERT predictions
model.load_state_dict(torch.load('best_bert.pt'))
model.eval()
bert_preds, bert_trues = [], []
with torch.no_grad():
    for batch in test_loader:
        o = model(
            input_ids      = batch['input_ids'].to(device),
            attention_mask = batch['attention_mask'].to(device)
        )
        bert_preds.extend(torch.argmax(o.logits, 1).cpu().numpy())
        bert_trues.extend(batch['labels'].numpy())

# Convert BERT numbers back to labels
bert_pred_labels = [inv_label[p] for p in bert_preds]
bert_true_labels = [inv_label[t] for t in bert_trues]
bert_acc = accuracy_score(bert_true_labels, bert_pred_labels)

# Print all results
print("\n" + "─"*50)
print(f"  Logistic Regression : {lr_acc*100:.2f}%")
print(f"  SVM                 : {svm_acc*100:.2f}%")
print(f"  Fine-tuned BERT     : {bert_acc*100:.2f}%  ⭐")
print("─"*50)

print("\nBERT Detailed Report:")
print(classification_report(bert_true_labels, bert_pred_labels,
                              target_names=['negative','neutral','positive']))

# ---- CELL 11: Accuracy Comparison Chart (for paper!) -------
sep("STEP 8 — Accuracy Comparison Chart")

models      = ['TF-IDF\nLogistic Regression', 'TF-IDF\nSVM',
               'Fine-tuned\nBERT']
accuracies  = [lr_acc*100, svm_acc*100, bert_acc*100]
colors      = ['#378ADD', '#1D9E75', '#E94560']

fig, ax = plt.subplots(figsize=(9, 6))
bars = ax.bar(models, accuracies, color=colors,
              width=0.5, edgecolor='white', linewidth=1.5)

for bar, acc in zip(bars, accuracies):
    ax.text(bar.get_x() + bar.get_width()/2,
            bar.get_height() + 0.5,
            f'{acc:.1f}%', ha='center', va='bottom',
            fontsize=13, fontweight='bold')

ax.set_ylim(50, 100)
ax.set_ylabel('Accuracy (%)', fontsize=13)
ax.set_title('Model Comparison — ABSA Accuracy\n'
             'TF-IDF vs Fine-tuned BERT', fontsize=14)
ax.axhline(90, color='gray', linestyle='--',
           linewidth=0.8, label='90% target')
ax.legend(fontsize=11)
ax.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.savefig('model_comparison_chart.png', dpi=150, bbox_inches='tight')
plt.close()
print(">> Saved: model_comparison_chart.png")

# ---- CELL 12: Confusion Matrix for BERT --------------------
sep("STEP 9 — BERT Confusion Matrix")

label_names = ['negative', 'neutral', 'positive']
cm = confusion_matrix(bert_true_labels, bert_pred_labels,
                       labels=label_names)
fig, ax = plt.subplots(figsize=(7, 5))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=ax,
            xticklabels=label_names, yticklabels=label_names)
ax.set_title('Confusion Matrix — Fine-tuned BERT', fontsize=13)
ax.set_xlabel('Predicted')
ax.set_ylabel('Actual')
plt.tight_layout()
plt.savefig('bert_confusion_matrix.png', dpi=150, bbox_inches='tight')
plt.close()
print(">> Saved: bert_confusion_matrix.png")

# ---- CELL 13: Predict on ALL rows with BERT ----------------
sep("STEP 10 — Predict ALL rows with BERT")

all_ds     = ABSADataset(bert_texts, bert_labels)
all_loader = DataLoader(all_ds, batch_size=32)

all_preds = []
model.eval()
with torch.no_grad():
    for batch in tqdm(all_loader, desc="Predicting all rows"):
        o = model(
            input_ids      = batch['input_ids'].to(device),
            attention_mask = batch['attention_mask'].to(device)
        )
        all_preds.extend(torch.argmax(o.logits, 1).cpu().numpy())

df['predicted_sentiment'] = [inv_label[p] for p in all_preds]
df.to_csv('bert_predictions.csv', index=False)
print(f"Saved: bert_predictions.csv")
print(df['predicted_sentiment'].value_counts())

# ---- CELL 14: Final Comparison Chart (same as before) ------
sep("STEP 11 — Phone Comparison Chart")

df_agg = df[df[COL_BRAND].notna()].copy()
agg    = (df_agg
          .groupby([COL_BRAND, COL_ASPECT, 'predicted_sentiment'])
          .size().unstack(fill_value=0))

for col in ['positive', 'negative', 'neutral']:
    if col not in agg.columns: agg[col] = 0

agg             = agg.reset_index()
agg['total']    = agg['positive'] + agg['negative'] + agg['neutral']
agg['score']    = ((agg['positive'] - agg['negative'])
                   / agg['total'] * 100).round(1)
agg             = agg[agg['total'] >= 10]
agg.to_csv('bert_scores.csv', index=False)
print("Saved: bert_scores.csv")

top2    = df_agg[COL_BRAND].value_counts().head(2).index.tolist()
PHONE_A = top2[0] if len(top2) > 0 else None
PHONE_B = top2[1] if len(top2) > 1 else None
print(f"\nComparing: {PHONE_A}  vs  {PHONE_B}")

if PHONE_A and PHONE_B:
    a_asp  = set(agg[agg[COL_BRAND] == PHONE_A]['aspect'])
    b_asp  = set(agg[agg[COL_BRAND] == PHONE_B]['aspect'])
    common = list(a_asp & b_asp)
    freq   = df_agg[df_agg[COL_ASPECT].isin(common)][COL_ASPECT].value_counts()
    top8   = freq.head(8).index.tolist()

    scores_a = (agg[(agg[COL_BRAND]==PHONE_A) & (agg[COL_ASPECT].isin(top8))]
                .set_index(COL_ASPECT)['score'])
    scores_b = (agg[(agg[COL_BRAND]==PHONE_B) & (agg[COL_ASPECT].isin(top8))]
                .set_index(COL_ASPECT)['score'])

    cmp = pd.DataFrame({PHONE_A: scores_a,
                         PHONE_B: scores_b}).reindex(top8).fillna(0)

    fig, ax = plt.subplots(figsize=(13, 6))
    x, w    = np.arange(len(cmp)), 0.35
    ba = ax.bar(x-w/2, cmp[PHONE_A], w, label=PHONE_A,
                color='#378ADD', alpha=0.85)
    bb = ax.bar(x+w/2, cmp[PHONE_B], w, label=PHONE_B,
                color='#1D9E75', alpha=0.85)
    for bar in list(ba)+list(bb):
        h = bar.get_height()
        ax.text(bar.get_x()+bar.get_width()/2, h+0.8,
                f'{h:.0f}', ha='center', va='bottom', fontsize=9)
    ax.set_xticks(x)
    ax.set_xticklabels(cmp.index, rotation=30, ha='right', fontsize=11)
    ax.axhline(0, color='gray', linewidth=0.8, linestyle='--')
    ax.set_ylabel('Sentiment Score (−100 to +100)', fontsize=12)
    ax.set_title(f'BERT ABSA — {PHONE_A} vs {PHONE_B}', fontsize=14)
    ax.legend(fontsize=12)
    ax.grid(axis='y', alpha=0.3)
    plt.tight_layout()
    plt.savefig('bert_phone_comparison.png', dpi=150, bbox_inches='tight')
    plt.close()
    print(">> Saved: bert_phone_comparison.png")

sep("ALL DONE!")
print("""
Files saved:
  model_comparison_chart.png   ← accuracy of LR vs SVM vs BERT
  bert_confusion_matrix.png    ← BERT confusion matrix
  bert_predictions.csv         ← all rows with BERT sentiment
  bert_scores.csv              ← score per phone per aspect
  bert_phone_comparison.png    ← final comparison chart
""")