# Obesity Probability Predictor

This static web calculator reproduces the locked three-factor EFA and random forest model from the dietary behaviour and obesity study. All calculations run in the browser; entered values are not transmitted or stored.

## Model scope

- Outcome: obesity defined as BMI >= 28 kg/m2.
- Development/test split: 498/214 participants.
- Feature construction: three maximum-likelihood EFA scores with Oblimin rotation plus LASSO-selected controls.
- Model selection: nested five-fold cross-validation in the development set.
- Status: internal hold-out validation only; not a clinical diagnostic tool.

## Local development

```bash
npm ci
npm run dev
```

## Reproducibility

`scripts/export_model.py` converts the locked Python model into `public/model.json`. The export includes validation cases used to check that browser and Python predictions agree.
