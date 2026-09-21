export type NumericField = {
  kind: 'number';
  name: string;
  label: string;
  description?: string;
  min: number;
  max: number;
  step: number;
  default: number;
};

export type SelectField = {
  kind: 'select';
  name: string;
  label: string;
  description?: string;
  default: number;
  options: Array<{ value: number; label: string }>;
};

export type InputField = NumericField | SelectField;

export type TreeNode = {
  feature: number;
  threshold: number;
  left: number;
  right: number;
  probability?: number;
};

export type DeploymentModel = {
  modelName: string;
  modelVersion: string;
  outcome: string;
  trainingN: number;
  testN: number;
  outerCvAuc: number;
  outerCvSd: number;
  testAuc: number;
  testAucCi: [number, number];
  rawThreshold: number;
  calibratedThreshold: number;
  recalibration: { intercept: number; slope: number };
  featureNames: string[];
  fields: InputField[];
  numericTransforms: Record<string, { mean: number; scale: number }>;
  selectedFeatures: Array<
    | { kind: 'factor'; source: string }
    | { kind: 'numeric'; source: string }
    | { kind: 'indicator'; source: string; category: number }
  >;
  trees: TreeNode[][];
  validationCases: Array<{ input: Record<string, number>; rawProbability: number; calibratedProbability: number }>;
};

const clamp = (value: number, lower: number, upper: number) => Math.min(upper, Math.max(lower, value));

function predictTree(nodes: TreeNode[], features: number[]) {
  let index = 0;
  while (nodes[index].feature >= 0) {
    const node = nodes[index];
    index = Math.fround(features[node.feature]) <= node.threshold ? node.left : node.right;
  }
  return nodes[index].probability ?? 0;
}

export function predict(model: DeploymentModel, input: Record<string, number>) {
  const features = model.selectedFeatures.map((feature) => {
    if (feature.kind === 'factor') return input[feature.source];
    if (feature.kind === 'indicator') return input[feature.source] === feature.category ? 1 : 0;
    const transform = model.numericTransforms[feature.source];
    return (input[feature.source] - transform.mean) / transform.scale;
  });

  const rawProbability = model.trees.reduce((sum, tree) => sum + predictTree(tree, features), 0) / model.trees.length;
  const bounded = clamp(rawProbability, 1e-8, 1 - 1e-8);
  const logit = Math.log(bounded / (1 - bounded));
  const calibratedProbability = 1 / (1 + Math.exp(-(model.recalibration.intercept + model.recalibration.slope * logit)));
  return { rawProbability, calibratedProbability, features };
}
