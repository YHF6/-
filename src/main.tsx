import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, AlertCircle, Calculator, Info, RotateCcw, ShieldCheck } from 'lucide-react';
import type { DeploymentModel, InputField } from './model';
import { calculateDietFactors, predict } from './model';
import { DIET_PATTERNS, EBQ_ITEMS, FOOD_GROUPS, FOOD_ITEMS, FREQUENCY_OPTIONS } from './questionnaire';
import './styles.css';

type Result = ReturnType<typeof predict>;
type DerivedInputs = { ebqTotal: number; factors: number[]; groups: Record<string, number> };

const controlSections = [
  { title: 'Personal characteristics', fields: ['age', 'sex', 'work', 'education', 'residence'] },
  { title: 'Health behaviours', fields: ['smoking', 'drinking', 'exercise', 'sleep'] },
  { title: 'Family history', fields: ['fam_obesity', 'fam_hyperten', 'fam_coronary', 'fam_cancer'] },
];
const computedFields = new Set(['ebq_total', 'efa_f1', 'efa_f2', 'efa_f3']);
const ebqOptions = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neither agree nor disagree' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly agree' },
];

function App() {
  const [model, setModel] = useState<DeploymentModel | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [ebqValues, setEbqValues] = useState<Record<string, string>>({});
  const [foodValues, setFoodValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [derived, setDerived] = useState<DerivedInputs | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('./model.json')
      .then((response) => {
        if (!response.ok) throw new Error('Model file unavailable');
        return response.json();
      })
      .then((loaded: DeploymentModel) => {
        setModel(loaded);
        setValues(Object.fromEntries(loaded.fields.map((field) => [field.name, String(field.default)])));
      })
      .catch(() => setError('The prediction model could not be loaded. Please refresh the page.'));
  }, []);

  const fieldsByName = useMemo(
    () => new Map(model?.fields.map((field) => [field.name, field]) ?? []),
    [model],
  );
  const ebqCompleted = EBQ_ITEMS.filter((item) => ebqValues[item.name]).length;
  const foodCompleted = FOOD_ITEMS.filter((item) => foodValues[item.name]).length;

  function clearResult() {
    setResult(null);
    setDerived(null);
    setError('');
  }

  function reset() {
    if (!model) return;
    setValues(Object.fromEntries(model.fields.map((field) => [field.name, String(field.default)])));
    setEbqValues({});
    setFoodValues({});
    clearResult();
  }

  function calculate() {
    if (!model) return;
    const parsed: Record<string, number> = {};
    for (const field of model.fields) {
      if (computedFields.has(field.name)) continue;
      const value = Number(values[field.name]);
      if (!Number.isFinite(value)) {
        setError(`Please provide a valid value for ${field.label}.`);
        return;
      }
      if (field.kind === 'number' && (value < field.min || value > field.max)) {
        setError(`${field.label} must be between ${field.min} and ${field.max}.`);
        return;
      }
      parsed[field.name] = value;
    }

    if (ebqCompleted !== EBQ_ITEMS.length) {
      setError(`Please answer all 18 EBQ items. ${EBQ_ITEMS.length - ebqCompleted} response(s) are missing.`);
      return;
    }
    const ebqTotal = EBQ_ITEMS.reduce((sum, item) => sum + Number(ebqValues[item.name]), 0);

    if (foodCompleted !== FOOD_ITEMS.length) {
      setError(`Please complete all food-frequency items. ${FOOD_ITEMS.length - foodCompleted} response(s) are missing.`);
      return;
    }
    const groups = Object.fromEntries(FOOD_GROUPS.map((group) => {
      const total = group.items.reduce((sum, item) => sum + Number(foodValues[item.name]), 0);
      return [group.name, total / group.items.length];
    }));
    const factors = calculateDietFactors(model, groups);
    const outsideRange = factors.findIndex((score, index) => {
      const range = model.dietTransform.factorRanges[index];
      return score < range.min || score > range.max;
    });
    if (outsideRange >= 0) {
      setError(`The dietary responses produce Factor ${outsideRange + 1} outside the development-sample range. A probability estimate is not reported.`);
      return;
    }

    parsed.ebq_total = ebqTotal;
    factors.forEach((score, index) => { parsed[`efa_f${index + 1}`] = score; });
    setError('');
    setDerived({ ebqTotal, factors, groups });
    setResult(predict(model, parsed));
  }

  if (!model && !error) return <main className="loading">Loading the locked prediction model...</main>;

  const highRisk = Boolean(result && model && result.calibratedProbability >= model.calibratedThreshold);

  return (
    <main>
      <header className="topbar">
        <div className="shell topbar-inner">
          <div className="brand"><Activity size={21} aria-hidden="true" />Obesity Probability Predictor</div>
          <span className="version">Research model · 2026</span>
        </div>
      </header>

      <section className="shell intro">
        <p className="kicker">Research-use web calculator</p>
        <h1>A Prediction System for Chinese Adults&apos; Obesity</h1>
        <p className="lede">Complete the participant characteristics, EBQ-18 and food-frequency questionnaire. The calculator derives the EBQ total and three dietary-pattern scores before estimating obesity probability.</p>
      </section>

      <div className="shell workspace">
        <section className="form-panel" aria-labelledby="patient-data-title">
          <div className="panel-heading">
            <div><p className="kicker">Input</p><h2 id="patient-data-title">Enter participant data</h2></div>
            <button className="icon-button" type="button" onClick={reset} title="Reset all fields" aria-label="Reset all fields"><RotateCcw size={18} /></button>
          </div>

          {controlSections.map((section, index) => (
            <fieldset key={section.title} className="field-section">
              <legend><span>{index + 1}</span>{section.title}</legend>
              <div className="field-grid">
                {section.fields.map((name) => {
                  const field = fieldsByName.get(name);
                  return field ? <Field key={name} field={field} value={values[name] ?? ''} onChange={(value) => { setValues((current) => ({ ...current, [name]: value })); clearResult(); }} /> : null;
                })}
              </div>
            </fieldset>
          ))}

          <fieldset className="field-section questionnaire-section">
            <legend><span>4</span>Eating Beliefs Questionnaire</legend>
            <div className="section-intro">
              <p>Answer all 18 items using the five-point agreement scale. No items are reverse scored.</p>
              <strong>{ebqCompleted} / {EBQ_ITEMS.length} completed</strong>
            </div>
            <div className="questionnaire-list">
              {EBQ_ITEMS.map((item, index) => (
                <label className="questionnaire-row" key={item.name}>
                  <span className="question-copy"><b>{index + 1}</b><span>{item.label}<small>{item.domain}</small></span></span>
                  <select value={ebqValues[item.name] ?? ''} onChange={(event) => { setEbqValues((current) => ({ ...current, [item.name]: event.target.value })); clearResult(); }} aria-label={`EBQ item ${index + 1}`}>
                    <option value="">Select response</option>
                    {ebqOptions.map((option) => <option key={option.value} value={option.value}>{option.value} - {option.label}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="field-section diet-section">
            <legend><span>5</span>Food-frequency questionnaire</legend>
            <div className="section-intro">
              <p>Report usual intake frequency during the past 12 months. Responses are converted to 13 food-group scores and then to the three locked EFA scores.</p>
              <strong>{foodCompleted} / {FOOD_ITEMS.length} completed</strong>
            </div>
            <p className="section-help">Open each food group and select one frequency for every listed food. Higher internal scores represent more frequent intake.</p>
            <div className="pattern-list">
              {DIET_PATTERNS.map((pattern) => (
                <section className="pattern-block" key={pattern.name}>
                  <h3>{pattern.label}</h3>
                  {pattern.groups.map((group) => {
                    const completed = group.items.filter((item) => foodValues[item.name]).length;
                    return (
                      <details className="food-group" key={group.name}>
                        <summary><span>{group.label}</span><small>{completed} / {group.items.length}</small></summary>
                        <div className="food-item-list">
                          {group.items.map((item) => (
                            <label className="food-item" key={item.name}>
                              <span>{item.label}</span>
                              <select value={foodValues[item.name] ?? ''} onChange={(event) => { setFoodValues((current) => ({ ...current, [item.name]: event.target.value })); clearResult(); }}>
                                <option value="">Select frequency</option>
                                {FREQUENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                            </label>
                          ))}
                        </div>
                      </details>
                    );
                  })}
                </section>
              ))}
            </div>
          </fieldset>

          {error && <p className="error"><AlertCircle size={17} aria-hidden="true" />{error}</p>}
          <button className="primary-button" type="button" onClick={calculate}><Calculator size={18} aria-hidden="true" />Predict obesity probability</button>
        </section>

        <aside className="result-panel" aria-live="polite">
          <p className="kicker">Prediction result</p>
          <h2>Estimated probability</h2>
          {result && model && derived ? (
            <div className="result-content">
              <p className={`risk-status ${highRisk ? 'high' : ''}`}><span />{highRisk ? 'Above the model threshold' : 'Below the model threshold'}</p>
              <p className="probability">{(result.calibratedProbability * 100).toFixed(1)}<span>%</span></p>
              <p className="probability-caption">internally recalibrated probability of obesity</p>
              <div className="meter"><span style={{ width: `${result.calibratedProbability * 100}%` }} /></div>
              <dl>
                <div><dt>Decision threshold</dt><dd>{(model.calibratedThreshold * 100).toFixed(1)}%</dd></div>
                <div><dt>Raw RF probability</dt><dd>{(result.rawProbability * 100).toFixed(1)}%</dd></div>
              </dl>
              <div className="derived-inputs">
                <h3>Calculated questionnaire inputs</h3>
                <p><span>EBQ-18 total</span><b>{derived.ebqTotal}</b></p>
                {derived.factors.map((score, index) => <p key={index}><span>Dietary factor {index + 1}</span><b>{score.toFixed(3)}</b></p>)}
              </div>
            </div>
          ) : (
            <div className="empty-result"><Calculator size={30} aria-hidden="true" /><p>Complete all required fields and select<br />“Predict obesity probability”.</p></div>
          )}
          <div className="notice"><Info size={17} aria-hidden="true" /><p>This calculator is for research presentation only. It has not been externally validated and must not be used for diagnosis or treatment decisions.</p></div>
        </aside>
      </div>

      <footer className="shell"><ShieldCheck size={16} aria-hidden="true" /><span>All calculations run locally in the browser. Input values are not uploaded, retained or transmitted.</span></footer>
    </main>
  );
}

function Field({ field, value, onChange }: { field: InputField; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span className="field-label">{field.label}</span>
      <span className="field-description">{field.description ?? '\u00A0'}</span>
      {field.kind === 'select' ? (
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <input type="number" inputMode="decimal" min={field.min} max={field.max} step={field.step} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
