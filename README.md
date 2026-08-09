<div align="center">

# SafeBite-DL

### A Deep-Learning-Native Allergen Safety and Craving-Aware Food Recommendation Platform

*Reading a label shouldn't require a chemistry degree.*

[![Course](https://img.shields.io/badge/course-CSE4006%20Deep%20Learning-1a1a2e?style=flat-square)](#)
[![Status](https://img.shields.io/badge/status-in%20development-orange?style=flat-square)](#)
[![License](https://img.shields.io/badge/license-academic%20project-blue?style=flat-square)](#)

</div>

---

## Table of Contents

- [Why This Exists](#why-this-exists)
- [From Hackathon to Deep Learning](#from-hackathon-to-deep-learning)
- [The Two Journeys](#the-two-journeys)
- [System Architecture](#system-architecture)
- [Module Map](#module-map)
- [Model Zoo](#model-zoo)
- [The One Thing We Deliberately Did *Not* Learn](#the-one-thing-we-deliberately-did-not-learn)
- [Datasets](#datasets)
- [Evaluation Philosophy](#evaluation-philosophy)
- [Competitive Landscape](#competitive-landscape)
- [Roadmap](#roadmap)
- [Risk Register](#risk-register)
- [References](#references)
- [Built By](#built-by)

---

## Why This Exists

Two problems keep colliding for anyone managing a food allergy or a diet change:

> **The Safety Problem** — allergens hide behind scientific names, E-numbers, and phrases
> like *"natural flavouring."* Most scanner apps answer with false confidence instead of
> admitting what they don't know.

> **The Craving Problem** — when the food you want is off-limits, the usual advice is a
> generic "healthier swap" that ignores *why* you wanted it in the first place — the crunch,
> the saltiness, the ritual of eating it.

SafeBite-DL keeps the same continuous flow the product was always meant to have —
**scan → verdict → craving-matched swap** — and rebuilds the engine underneath it so that
every stage is something *learned*, not scripted.

---

## From Hackathon to Deep Learning

The original SafeBite was a four-week hackathon build. It worked — but it worked by
borrowing: Tesseract.js for OCR, keyword matching for safety, a hand-tuned formula for
swaps, and an LLM API for every sentence of explanation. Good engineering for a sprint.
Not a deep learning project.

This report keeps the **product vision and UX pixel-for-pixel** and swaps the engine:

| Then | Now |
|---|---|
| Off-the-shelf OCR (Tesseract.js / Vision API) | CNN/CRNN trained on photographed Indian packaged-food labels |
| Manual cropping | YOLO-based ingredient-panel detector |
| Two prompted LLM calls | Attention-based captioner + LSTM decoder |
| Hand-weighted similarity formula | VAE-learned embedding space |
| No sequence modeling | BiLSTM over scan history |
| Fixed training set | Conditional GAN augmentation |

One piece was **kept exactly as it was**, on purpose. More on that below.

---

## The Two Journeys
                          ┌────────────────────┐
                          │   PHOTOGRAPH LABEL   │
                          └──────────┬──────────┘
                                     │
                          YOLO panel detector
                                     │
                          CNN / CRNN OCR
                                     │
                 ┌───────────────────┴───────────────────┐
                 │   DETERMINISTIC SAFETY VERDICT ENGINE   │
                 │        safe · flagged · unclear         │
                 └───────────────────┬───────────────────┘
                                     │
                      flagged? ──────┴────── safe
                         │                      │
              attention captioner          done.
              explains why                   no swap needed
                         │
              VAE embedding search
              (allergen-filtered)
                         │
              LSTM-generated,
              fact-grounded swap
              explanation
              
The second entry point — **"I'm Craving"** — skips straight to the VAE embedding search,
because sometimes you don't need a verdict, you just need a smarter answer than
"eat a rice cake instead."

A third, quieter layer runs in the background: a **BiLSTM over scan history**, watching for
patterns and surfacing a proactive *"you may want to double-check this"* nudge before a
scan even happens.

---

## System Architecture

**Five layers, one continuous pipeline:**

1. **Frontend** — camera capture, allergen profile setup, verdict cards, swap UI
2. **Detection & Recognition** — YOLO panel detector → CNN/CRNN OCR → cleaned token list
3. **Deterministic Safety Layer** — exact + fuzzy keyword matching → three-state verdict
4. **Learned Recommendation Layer** — VAE embedding search, allergen-filtered
5. **Generation Layer** — attention captioner, LSTM decoder, BiLSTM predictor

---

## Module Map

Every model in this system earns its place against a specific taught module — nothing here
is decorative.

| Module | Concept | Role in SafeBite-DL |
|:---:|---|---|
| **M1 / M2** | Linear models → MLPs | From-scratch ingredient-category baseline; optimiser ablation (SGD vs. Adam vs. RMSProp) |
| **M3** | Convolutional Networks | CNN/CRNN label OCR, fine-tuned on Indian packaged-food labels |
| **M5** | Region-based CNNs, Attention | YOLO ingredient-panel detector + attention encoder–decoder for explanations |
| **M4** | RNN / LSTM / BiLSTM | Scan-history flag predictor + swap-explanation decoder |
| **M6** | GANs / VAEs | Conditional GAN for label-image augmentation; VAE for craving-embedding similarity |

---

## Model Zoo

**Ingredient-Category Baseline** — a bag-of-words / TF-IDF vector runs through a from-scratch
logistic regression, then a full MLP with dropout and batch norm. Not the safety path —
purely the required from-scratch reference and optimiser study.

**Label OCR (CNN/CRNN)** — a CNN backbone (or fine-tuned ResNet-18) feeds a BiLSTM + CTC
recognition head, pretrained on public scene-text data before fine-tuning on real
photographed labels. Benchmarked head-to-head against Tesseract.js on CER/WER.

**Panel Detector (YOLO)** — locates the ingredient panel inside a full, unframed product
photo, so the user never has to pre-crop anything.

**Explanation Generators (Attention + LSTM)** — two independent approaches, trained on
structured (ingredient, category, explanation) triples, compared head-to-head on
BLEU/ROUGE and a manual hallucination check: does the generated sentence contain any fact
that wasn't in the input.

**Scan-History BiLSTM** — reads a user's past scans and predicts which product categories
are statistically likely to get flagged next, enabling a proactive nudge instead of a purely
reactive scan.

**Conditional GAN** — synthesises label images under varied lighting, glare, and curvature,
addressing the very real data scarcity of photographed ingredient labels.

**Craving VAE** — learns a continuous embedding space over texture, mouth-ritual, flavour,
and format tags. At inference, the seed food is encoded and the nearest allergen-safe
neighbours become the swap candidates — replacing a hand-weighted formula with something
that actually generalises.

---

## The One Thing We Deliberately Did *Not* Learn

The allergen safety verdict stays **fully deterministic** — exact and fuzzy keyword
matching, no learned classifier in the loop.

This is not a shortcut. It is the single most defensible engineering decision in the whole
system:

- **Auditability** — a keyword match can be inspected line by line. A learned decision
  boundary cannot, not in a context where the cost of being wrong is someone's health.
- **Predictable failure** — the three-state verdict (*safe / flagged / unclear*) is designed
  to default to declared uncertainty. That property is trivial to guarantee deterministically
  and hard to guarantee with a calibrated model.
- **Asymmetric cost** — a wrong "safe" verdict is categorically worse than a mediocre OCR
  read or an imperfect swap suggestion. The highest-stakes decision in the system is kept
  the simplest and the most inspectable.

Knowing where *not* to apply deep learning is treated here as part of the engineering
contribution — not as effort avoided.

---

## Datasets

| Component | Source |
|---|---|
| Allergen-keyword database | Self-curated, 27 → 150–250 entries |
| Label OCR fine-tuning set | 150–250 team-photographed Indian packaged-food labels |
| Panel-detector annotations | Manually bounding-boxed via LabelImg / CVAT |
| Explanation triples | Bootstrapped structured data + hand-written explanations |
| Craving-signature dataset | 30 → 100+ foods, tagged on texture / ritual / flavour / format, macros from USDA FoodData Central |
| GAN training distribution | Same photographed label set as the OCR model |
| Scan-history sequences | Synthetic, sampled from plausible shopping patterns — explicitly disclosed as simulated |

---

## Evaluation Philosophy

Every learned component is benchmarked against its non-learned predecessor — CNN/CRNN vs.
Tesseract.js, VAE-ranked swaps vs. the original hand-weighted formula, generated
explanations vs. the original prompted-LLM output.

Where a learned model doesn't clearly beat its baseline at this dataset scale, **that gets
reported plainly.** An honest null result is stronger coursework than an inflated claim, and
this project is built on that premise from the ground up.

---

## Competitive Landscape

The allergen-scanning market is crowded and well-funded — Fig, Yuka, IngrediCheck, Subfy,
and others already do personalised matching, barcode scanning, and alias tracking at scale.
**This project does not claim to out-compete them there.**

What none of them do: ground a substitution recommendation in structured sensory attributes
— texture, mouth-ritual, flavour, format — rather than treating taste as a simple filter.
That gap is real, it's unclaimed, and it's the one hypothesis this project is built to test
honestly, not to oversell.

---

## Roadmap

**Phase 1 — Weeks 1–2**
Deterministic scan→verdict flow (working fallback demo), dataset collection begins, M1/M2 baseline trained.

**Phase 2 — Weeks 3–5**
YOLO detector and CNN/CRNN OCR trained and benchmarked; GAN augmentation begins.

**Phase 3 — Weeks 6–8**
VAE embedding space, explanation generators, and BiLSTM predictor trained and evaluated.

**Phase 4 — Weeks 9–10**
Full pipeline integration, final evaluation table, report, and demo walkthrough.

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Small label-image dataset | Pretrain on public OCR corpora, augment with GAN, report results honestly |
| Annotation effort is slow | Cap the set at 150–250 images, prioritise quality over volume |
| VAE swaps feel "off" | Run a structured taste-test with team and outside testers |
| Generated text hallucinates | Post-generation grounding check; discard ungrounded output |
| No real scan-history data | Explicitly disclosed as simulated; framed as proof-of-concept only |
| Six models, one semester | Deterministic flow kept as a working fallback at every stage |

---

## References

- Open Food Facts — openfoodfacts.org
- USDA FoodData Central — fdc.nal.usda.gov
- FDA FALCPA — U.S. major allergen labelling law
- FARE (Food Allergy Research & Education)
- EU FIC Regulation — E-number and additive naming
- YOLOv8 (Ultralytics) documentation
- Original SafeBite hackathon specification — CS Girlies Annual Hackathon, Technology for Wellness / Health Track

---

<div align="center">

## Built By

**Dharmi · Jasmine · Rajasree**

</div>
