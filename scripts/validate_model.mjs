import { readFileSync } from 'node:fs';

const model = JSON.parse(readFileSync(new URL('../public/model.json', import.meta.url), 'utf8'));

function predictTree(nodes, features) {
  let index = 0;
  while (nodes[index].feature >= 0) {
    const node = nodes[index];
    index = Math.fround(features[node.feature]) <= node.threshold ? node.left : node.right;
  }
  return nodes[index].probability;
}

function predict(input) {
  const features = model.selectedFeatures.map((feature) => {
    if (feature.kind === 'factor') return input[feature.source];
    if (feature.kind === 'indicator') return input[feature.source] === feature.category ? 1 : 0;
    const transform = model.numericTransforms[feature.source];
    return (input[feature.source] - transform.mean) / transform.scale;
  });
  const raw = model.trees.reduce((sum, tree) => sum + predictTree(tree, features), 0) / model.trees.length;
  const bounded = Math.min(1 - 1e-8, Math.max(1e-8, raw));
  const logit = Math.log(bounded / (1 - bounded));
  const calibrated = 1 / (1 + Math.exp(-(model.recalibration.intercept + model.recalibration.slope * logit)));
  return { raw, calibrated };
}

let maximumError = 0;
for (const item of model.validationCases) {
  const result = predict(item.input);
  maximumError = Math.max(maximumError, Math.abs(result.raw - item.rawProbability), Math.abs(result.calibrated - item.calibratedProbability));
}
if (maximumError > 1e-12) throw new Error(`Prediction mismatch: ${maximumError}`);
console.log(`Validated ${model.validationCases.length} cases; maximum absolute error ${maximumError}.`);
