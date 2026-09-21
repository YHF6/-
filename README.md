# Obesity Probability Predictor

This static web calculator reproduces the locked three-factor EFA and random forest model from the dietary behaviour and obesity study. All calculations run in the browser; entered values are not transmitted or stored.

Participants do not enter precomputed scale or factor scores. The interface collects the 18 Eating Beliefs Questionnaire (EBQ) responses and all 78 food-frequency questionnaire (FFQ) responses used by the study. In the browser, it sums the EBQ items, reverses the original FFQ direction so that higher values indicate more frequent intake, averages the items into 13 food-group scores, and applies the locked training-sample EFA transformation to obtain the three dietary-pattern scores.

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

`scripts/export_model.py` converts the locked Python model into `public/model.json`. The export includes validation cases for both the dietary-factor transformation and the final probability predictions. Run `npm run validate-model` to verify browser/Python numerical agreement before deployment.
