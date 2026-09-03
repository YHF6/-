'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Calculator, Info, LockKeyhole, RotateCcw, ShieldCheck } from 'lucide-react';

type InputSpec = { name: string; label: string; type: 'number' | 'select'; default: number | string; min?: number; max?: number; options?: Array<number | string> };
type TreeNode = { leaf_value?: number; split_feature?: number; threshold?: number | string; decision_type?: string; left_child?: TreeNode; right_child?: TreeNode };
type DeploymentModel = {
  model_name: string; model_version: string; threshold: number; training_n: number; test_n: number; outer_cv_auc: number; test_auc: number;
  food_columns: string[]; numeric_columns: string[]; categorical_columns: string[]; defaults: Record<string, number | string>; input_schema: InputSpec[];
  food_standardizer: { mean: number[]; scale: number[] }; efa_score: { intercept: number; weights: number[] }; numeric_standardizer: { mean: number[]; scale: number[] };
  categorical_categories: Record<string, Array<number | string>>; control_standardizer: { mean: number[]; scale: number[] }; selected_control_indices: number[];
  lightgbm_model: { tree_info: Array<{ tree_structure: TreeNode }> };
};

const fieldLabels: Record<string, string> = {
  grp_staple: '谷薯类', grp_tuber: '薯类', grp_pickled_fried: '腌制与油炸食品', grp_egg: '蛋类', grp_meat: '肉类', grp_seafood: '水产品', grp_dairy: '奶类',
  grp_snack: '零食', grp_beverage: '饮料', grp_soy: '大豆及制品', grp_vegetable: '蔬菜', grp_fruit: '水果', grp_dried: '坚果与干制品',
  ebq_total: '饮食行为量表总分', education: '受教育程度', marital: '婚姻状况', work: '就业状况', religion: '宗教信仰', income: '家庭收入',
  residence: '居住地', medical_access: '医疗可及性', alone: '独居情况', no_insurance: '无医疗保险', smoking: '吸烟情况', drinking: '饮酒情况', exercise: '运动情况', sleep: '睡眠时长',
};

function formatNumber(value: number, digits = 3) { return Number.isFinite(value) ? value.toFixed(digits) : '—'; }
function evaluateTree(node: TreeNode, values: number[]): number {
  if (node.leaf_value !== undefined) return node.leaf_value;
  const feature = values[node.split_feature ?? 0];
  const decision = node.decision_type ?? '<=';
  const goesLeft = decision.includes('<=') ? feature <= Number(node.threshold) : String(node.threshold).split('||').includes(String(feature));
  return evaluateTree(goesLeft ? node.left_child! : node.right_child!, values);
}
function calculatePrediction(model: DeploymentModel, values: Record<string, string>) {
  const foodZ = model.food_columns.map((name, index) => (Number(values[name]) - model.food_standardizer.mean[index]) / model.food_standardizer.scale[index]);
  const efaScore = model.efa_score.intercept + foodZ.reduce((sum, value, index) => sum + value * model.efa_score.weights[index], 0);
  const preparedControls: number[] = [];
  model.numeric_columns.forEach((name, index) => preparedControls.push((Number(values[name] ?? model.defaults[name]) - model.numeric_standardizer.mean[index]) / model.numeric_standardizer.scale[index]));
  model.categorical_columns.forEach((name) => {
    const raw = String(values[name] ?? model.defaults[name]);
    model.categorical_categories[name].slice(1).forEach((category) => preparedControls.push(raw === String(category) ? 1 : 0));
  });
  const controlZ = preparedControls.map((value, index) => (value - model.control_standardizer.mean[index]) / model.control_standardizer.scale[index]);
  const modelValues = [efaScore, ...model.selected_control_indices.map((index) => controlZ[index])];
  const rawScore = model.lightgbm_model.tree_info.reduce((sum, tree) => sum + evaluateTree(tree.tree_structure, modelValues), 0);
  return { probability: 1 / (1 + Math.exp(-rawScore)), efaScore };
}

export default function Home() {
  const [model, setModel] = useState<DeploymentModel | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ probability: number; efaScore: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/预测模型参数.json').then((response) => response.json()).then((loaded: DeploymentModel) => {
      setModel(loaded); setValues(Object.fromEntries(loaded.input_schema.map((field) => [field.name, String(field.default)])));
    }).catch(() => setError('模型参数未能加载，请刷新页面后重试。'));
  }, []);

  const dietFields = useMemo(() => model?.input_schema.filter((field) => model.food_columns.includes(field.name)) ?? [], [model]);
  const controlFields = useMemo(() => model?.input_schema.filter((field) => !model.food_columns.includes(field.name)) ?? [], [model]);
  function updateValue(name: string, value: string) { setValues((current) => ({ ...current, [name]: value })); setResult(null); }
  function predict() {
    if (!model) return;
    const missing = model.input_schema.find((field) => values[field.name] === '' || Number.isNaN(Number(values[field.name])));
    if (missing) { setError(`请填写“${fieldLabels[missing.name] ?? missing.label}”。`); return; }
    const invalid = dietFields.concat(controlFields.filter((field) => field.type === 'number')).find((field) => {
      const value = Number(values[field.name]); return field.min !== undefined && field.max !== undefined && (value < field.min || value > field.max);
    });
    if (invalid) { setError(`“${fieldLabels[invalid.name] ?? invalid.label}”需位于研究样本的可用范围内。`); return; }
    setError(''); setResult(calculatePrediction(model, values));
  }
  function reset() { if (!model) return; setValues(Object.fromEntries(model.input_schema.map((field) => [field.name, String(field.default)]))); setResult(null); setError(''); }
  if (!model && !error) return <main className="loading">正在加载预测模型…</main>;
  const riskLevel = result && model && result.probability >= model.threshold ? '较高预测风险' : '较低预测风险';

  return <main>
    <header className="site-header"><div className="header-inner"><div className="brand"><Activity size={22} strokeWidth={2.2} /><span>肥胖风险预测工具</span></div><div className="model-mark">EFA one-factor + LightGBM</div></div></header>
    <section className="intro" aria-labelledby="page-title"><p className="eyebrow">Research-use prediction calculator</p><h1 id="page-title">肥胖风险预测</h1><p>根据研究中锁定的 EFA 单因子与 LightGBM 模型，输入问卷特征后计算个体预测概率。</p></section>
    <div className="page-grid">
      <section className="calculator" aria-labelledby="input-title">
        <div className="section-heading"><div><p className="section-kicker">Input features</p><h2 id="input-title">输入特征</h2></div><button type="button" className="icon-button" onClick={reset} title="恢复研究样本默认值" aria-label="恢复研究样本默认值"><RotateCcw size={18} /></button></div>
        <div className="input-section"><div className="section-note"><span>1</span><div><strong>13 个食物组频率</strong><p>按本研究问卷的频率编码填写。经方向校正后，数值越高表示摄入频率越高。</p></div></div><div className="form-grid diet-grid">{dietFields.map((field) => <Field key={field.name} field={field} value={values[field.name] ?? ''} onChange={updateValue} />)}</div></div>
        <div className="input-section controls-section"><div className="section-note"><span>2</span><div><strong>LASSO 保留的控制变量</strong><p>仅展示最终模型中实际保留的 14 项控制变量；其余候选变量未进入最终预测模型。</p></div></div><div className="form-grid control-grid">{controlFields.map((field) => <Field key={field.name} field={field} value={values[field.name] ?? ''} onChange={updateValue} />)}</div></div>
        {error && <div className="error-message"><AlertCircle size={17} />{error}</div>}<button type="button" className="predict-button" onClick={predict}><Calculator size={18} />计算预测结果</button>
      </section>
      <aside className="result-panel" aria-live="polite" aria-labelledby="result-title"><p className="section-kicker">Prediction result</p><h2 id="result-title">预测结果</h2>
        {result && model ? <><div className="risk-label"><span className={result.probability >= model.threshold ? 'dot high' : 'dot'} />{riskLevel}</div><p className="probability">{(result.probability * 100).toFixed(1)}<span>%</span></p><p className="probability-label">预测为肥胖的概率</p><div className="probability-track" aria-label={`预测概率 ${(result.probability * 100).toFixed(1)}%`}><span style={{ width: `${result.probability * 100}%` }} /></div><dl className="result-detail"><div><dt>模型阈值</dt><dd>{formatNumber(model.threshold)}</dd></div><div><dt>计算的 EFA 得分</dt><dd>{formatNumber(result.efaScore)}</dd></div></dl></> : <div className="result-empty"><Calculator size={28} /><p>填写左侧特征后，点击“计算预测结果”。</p></div>}
        <div className="caution"><Info size={16} /><p>该结果仅用于本研究的风险分层与结果展示，不构成临床诊断或治疗建议。</p></div>
      </aside>
    </div>
    {model && <section className="method-strip" aria-label="模型信息"><div><span>最终模型</span><strong>{model.model_name}</strong></div><div><span>训练样本 / 测试样本</span><strong>{model.training_n} / {model.test_n}</strong></div><div><span>训练集 5 折 CV AUC</span><strong>{formatNumber(model.outer_cv_auc)}</strong></div><div><span>独立测试集 AUC</span><strong>{formatNumber(model.test_auc)}</strong></div></section>}
    <footer><ShieldCheck size={16} /><span>所有计算均在当前浏览器完成；本页面不上传、不保存或传输输入数据。</span><LockKeyhole size={16} /></footer>
  </main>;
}

function Field({ field, value, onChange }: { field: InputSpec; value: string; onChange: (name: string, value: string) => void }) {
  const label = fieldLabels[field.name] ?? field.label;
  return <label className="field"><span>{label}</span>{field.type === 'select' ? <select value={value} onChange={(event) => onChange(field.name, event.target.value)}>{field.options?.map((option) => <option key={String(option)} value={String(option)}>编码 {String(option)}</option>)}</select> : <input type="number" inputMode="decimal" min={field.min} max={field.max} step="0.01" value={value} onChange={(event) => onChange(field.name, event.target.value)} />}</label>;
}
