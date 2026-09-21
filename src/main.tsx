import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, AlertCircle, Calculator, Info, RotateCcw, ShieldCheck } from 'lucide-react';
import type { DeploymentModel, InputField } from './model';
import { predict } from './model';
import './styles.css';

type Result = ReturnType<typeof predict>;

const sectionOrder = [
  { title: 'Personal characteristics', fields: ['age', 'ebq_total', 'sex', 'work', 'education', 'residence'] },
  { title: 'Health behaviours', fields: ['smoking', 'drinking', 'exercise', 'sleep'] },
  { title: 'Family history', fields: ['fam_obesity', 'fam_hyperten', 'fam_coronary', 'fam_cancer'] },
  { title: 'Dietary pattern scores', fields: ['efa_f1', 'efa_f2', 'efa_f3'] },
];

function App() {
  const [model, setModel] = useState<DeploymentModel | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result | null>(null);
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

  function reset() {
    if (!model) return;
    setValues(Object.fromEntries(model.fields.map((field) => [field.name, String(field.default)])));
    setResult(null);
    setError('');
  }

  function calculate() {
    if (!model) return;
    const parsed: Record<string, number> = {};
    for (const field of model.fields) {
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
    setError('');
    setResult(predict(model, parsed));
  }

  if (!model && !error) return <main className="loading">Loading the locked prediction model…</main>;

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
        <p className="lede">Enter the variables used by the locked three-factor EFA and random forest model to obtain an internally calibrated probability estimate.</p>
      </section>

      <div className="shell workspace">
        <section className="form-panel" aria-labelledby="patient-data-title">
          <div className="panel-heading">
            <div><p className="kicker">Input</p><h2 id="patient-data-title">Enter participant data</h2></div>
            <button className="icon-button" type="button" onClick={reset} title="Reset all fields" aria-label="Reset all fields"><RotateCcw size={18} /></button>
          </div>

          {sectionOrder.map((section, index) => (
            <fieldset key={section.title} className="field-section">
              <legend><span>{index + 1}</span>{section.title}</legend>
              <div className="field-grid">
                {section.fields.map((name) => {
                  const field = fieldsByName.get(name);
                  return field ? <Field key={name} field={field} value={values[name] ?? ''} onChange={(value) => { setValues((current) => ({ ...current, [name]: value })); setResult(null); }} /> : null;
                })}
              </div>
              {section.title === 'Dietary pattern scores' && <p className="section-help">Enter standardized factor scores generated using the study&apos;s maximum-likelihood EFA with Oblimin rotation. Scores outside the development-sample range are not accepted.</p>}
            </fieldset>
          ))}

          {error && <p className="error"><AlertCircle size={17} aria-hidden="true" />{error}</p>}
          <button className="primary-button" type="button" onClick={calculate}><Calculator size={18} aria-hidden="true" />Predict obesity probability</button>
        </section>

        <aside className="result-panel" aria-live="polite">
          <p className="kicker">Prediction result</p>
          <h2>Estimated probability</h2>
          {result && model ? (
            <div className="result-content">
              <p className={`risk-status ${highRisk ? 'high' : ''}`}><span />{highRisk ? 'Above the model threshold' : 'Below the model threshold'}</p>
              <p className="probability">{(result.calibratedProbability * 100).toFixed(1)}<span>%</span></p>
              <p className="probability-caption">internally recalibrated probability of obesity</p>
              <div className="meter"><span style={{ width: `${result.calibratedProbability * 100}%` }} /></div>
              <dl>
                <div><dt>Decision threshold</dt><dd>{(model.calibratedThreshold * 100).toFixed(1)}%</dd></div>
                <div><dt>Raw RF probability</dt><dd>{(result.rawProbability * 100).toFixed(1)}%</dd></div>
              </dl>
            </div>
          ) : (
            <div className="empty-result"><Calculator size={30} aria-hidden="true" /><p>Complete the fields and select<br />“Predict obesity probability”.</p></div>
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
