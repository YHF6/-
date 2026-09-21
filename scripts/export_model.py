"""把锁定的三因子随机森林转换为浏览器可读取的 JSON。"""

from __future__ import annotations

import json
import math
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split


# joblib 中的预处理器由 Notebook 的主模块创建，载入时需要同名类型。
class StableObliminEFA:
    def transform(self, data):
        frame = pd.DataFrame(data, columns=GROUP_COLS)
        standardized = self.scaler_.transform(self.imputer_.transform(frame))
        scores = self.model_.transform(standardized)[:, self.permutation_] * self.signs_
        return self.score_scaler_.transform(scores)


class FeatureBuilder:
    pass


SITE = Path(__file__).resolve().parents[1]
ROOT = SITE.parent
MODEL_PATH = ROOT / "three_factor_ml_work" / "12_models" / "总体最佳模型.joblib"
DATA_PATH = ROOT / "three_factor_direction_work" / "01_data" / "analysis_clean_recoded_three_factor.csv"
PERFORMANCE_PATH = ROOT / "three_factor_ml_work" / "03_models" / "全部模型训练集与独立测试集性能.csv"
OUTPUT_PATH = SITE / "public" / "model.json"

SEED = 20260703
GROUP_COLS = [
    "grp_staple", "grp_tuber", "grp_pickled_fried", "grp_egg", "grp_meat",
    "grp_seafood", "grp_dairy", "grp_snack", "grp_beverage", "grp_soy",
    "grp_vegetable", "grp_fruit", "grp_dried",
]
NUMERIC = ["age", "ebq_total"]
CONTROLS = [
    "age", "ebq_total", "sex", "education", "marital", "work", "religion",
    "income", "residence", "medical_access", "alone", "no_insurance", "smoking",
    "drinking", "exercise", "sleep", "fam_obesity", "fam_diabetes", "fam_hyperlip",
    "fam_hyperten", "fam_coronary", "fam_stroke", "fam_cancer",
]

LABELS = {
    "age": "Age (years)",
    "ebq_total": "Total EBQ score",
    "sex": "Gender",
    "education": "Education",
    "work": "Employment status",
    "residence": "Place of residence",
    "smoking": "Smoking",
    "drinking": "Alcohol consumption",
    "exercise": "Physical activity",
    "sleep": "Sleep duration",
    "fam_obesity": "Family history of obesity",
    "fam_hyperten": "Family history of hypertension",
    "fam_coronary": "Family history of coronary disease",
    "fam_cancer": "Family history of cancer",
    "efa_f1": "EFA factor 1 score",
    "efa_f2": "EFA factor 2 score",
    "efa_f3": "EFA factor 3 score",
}

DESCRIPTIONS = {
    "education": "Retained by training-set LASSO.",
    "fam_coronary": "Retained by training-set LASSO.",
    "efa_f1": "Fruit, vegetable, dairy, soy and aquatic food pattern",
    "efa_f2": "Staple food, meat and egg pattern",
    "efa_f3": "Pickled/fried food, snack and beverage pattern",
}

OPTIONS = {
    "sex": {1: "Male", 2: "Female"},
    "education": {1: "Primary school or below", 2: "Middle school", 3: "High school / technical secondary school", 4: "College / bachelor's degree", 5: "Postgraduate degree or above"},
    "work": {
        1: "Student", 2: "Government or public institution employee", 3: "Enterprise manager / corporate executive",
        4: "Enterprise staff / white-collar worker", 5: "Professional and technical personnel",
        6: "Commercial / service industry worker", 7: "Factory or manufacturing worker",
        8: "Agriculture, forestry, animal husbandry or fishery worker", 9: "Freelancer / self-employed",
        10: "Unemployed / not currently working", 11: "Retired", 12: "Other",
    },
    "residence": {1: "Urban", 2: "Township", 3: "Rural"},
    "smoking": {1: "Never smoker", 2: "Former smoker", 3: "Current smoker"},
    "drinking": {1: "Never drinker", 2: "Former drinker", 3: "Current drinker"},
    "exercise": {1: "Yes", 2: "No"},
    "sleep": {1: "< 4 hours", 2: "4-6 hours", 3: "6-8 hours", 4: "> 8 hours"},
    "fam_obesity": {0: "No", 1: "Yes"},
    "fam_hyperten": {0: "No", 1: "Yes"},
    "fam_coronary": {0: "No", 1: "Yes"},
    "fam_cancer": {0: "No", 1: "Yes"},
}


def original_name(encoded: str) -> str:
    clean = encoded.replace("num__", "").replace("cat__", "")
    for name in sorted(CONTROLS, key=len, reverse=True):
        if clean == name or clean.startswith(name + "_"):
            return name
    raise ValueError(f"无法识别编码特征：{encoded}")


def export_tree(estimator) -> list[dict]:
    tree = estimator.tree_
    nodes = []
    for index in range(tree.node_count):
        node = {
            "feature": int(tree.feature[index]),
            "threshold": float(tree.threshold[index]),
            "left": int(tree.children_left[index]),
            "right": int(tree.children_right[index]),
        }
        if tree.feature[index] < 0:
            values = tree.value[index][0]
            node["probability"] = float(values[1] / values.sum())
        nodes.append(node)
    return nodes


def evaluate_tree(nodes: list[dict], features: np.ndarray) -> float:
    features = np.asarray(features, dtype=np.float32)
    index = 0
    while nodes[index]["feature"] >= 0:
        node = nodes[index]
        index = node["left"] if features[node["feature"]] <= node["threshold"] else node["right"]
    return nodes[index]["probability"]


def recalibrate(probability: float, intercept: float, slope: float) -> float:
    bounded = np.clip(probability, 1e-8, 1 - 1e-8)
    logit = math.log(bounded / (1 - bounded))
    return 1 / (1 + math.exp(-(intercept + slope * logit)))


def main():
    if not MODEL_PATH.exists():
        raise FileNotFoundError("锁定模型尚未生成，请先执行机器学习 Notebook。")

    artifact = joblib.load(MODEL_PATH)
    if artifact["model_name"] != "RandomForest":
        raise ValueError(f"当前锁定模型不是 RandomForest：{artifact['model_name']}")

    builder = artifact["builder"]
    model = artifact["model"]
    df = pd.read_csv(DATA_PATH)
    y = df["obese28"].astype(int).reset_index(drop=True)
    X = df[GROUP_COLS + CONTROLS].copy().reset_index(drop=True)
    train_idx, test_idx = train_test_split(np.arange(len(df)), test_size=0.30, random_state=SEED, stratify=y)
    x_train = X.iloc[train_idx].reset_index(drop=True)

    selected_features = [{"kind": "factor", "source": f"efa_f{i}"} for i in range(1, 4)]
    selected_control_names = list(np.asarray(builder.control_feature_names_)[builder.selected_mask_])
    for encoded in selected_control_names:
        source = original_name(encoded)
        if encoded.startswith("num__"):
            selected_features.append({"kind": "numeric", "source": source})
        else:
            category = encoded.removeprefix("cat__").removeprefix(source + "_")
            selected_features.append({"kind": "indicator", "source": source, "category": int(float(category))})

    numeric_pipeline = builder.control_prep_.named_transformers_["num"]
    numeric_scaler = numeric_pipeline.named_steps["scaler"]
    numeric_names = [name for name in builder.controls if name in NUMERIC]
    numeric_transforms = {
        name: {"mean": float(numeric_scaler.mean_[index]), "scale": float(numeric_scaler.scale_[index])}
        for index, name in enumerate(numeric_names)
    }

    factor_train = builder.diet_.transform(x_train[GROUP_COLS])
    selected_originals = []
    for item in selected_features[3:]:
        if item["source"] not in selected_originals:
            selected_originals.append(item["source"])

    fields = []
    for name in selected_originals:
        if name in NUMERIC:
            fields.append({
                "kind": "number", "name": name, "label": LABELS[name],
                "min": float(x_train[name].min()), "max": float(x_train[name].max()),
                "step": 1, "default": float(x_train[name].median()),
            })
        else:
            observed = sorted(int(value) for value in x_train[name].dropna().unique())
            labels = OPTIONS[name]
            fields.append({
                "kind": "select", "name": name, "label": LABELS[name],
                "description": DESCRIPTIONS.get(name),
                "default": int(x_train[name].mode().iloc[0]),
                "options": [{"value": value, "label": labels[value]} for value in observed],
            })
    for index in range(3):
        name = f"efa_f{index + 1}"
        fields.append({
            "kind": "number", "name": name, "label": LABELS[name],
            "description": DESCRIPTIONS[name], "min": float(factor_train[:, index].min()),
            "max": float(factor_train[:, index].max()), "step": 0.01,
            "default": round(float(np.median(factor_train[:, index])), 2),
        })

    performance = pd.read_csv(PERFORMANCE_PATH)
    result = performance.loc[performance["模型"] == "RandomForest"].iloc[0]
    trees = [export_tree(estimator) for estimator in model.estimators_]
    intercept = float(result["训练OOF再校准截距"])
    slope = float(result["训练OOF再校准斜率"])
    raw_threshold = float(artifact["threshold"])
    calibrated_threshold = recalibrate(raw_threshold, intercept, slope)

    # 校验案例完全由字段范围人工构造，不复制任何受访者记录。
    default_case = {field["name"]: field["default"] for field in fields}
    lower_case = {
        field["name"]: (
            field["min"] + 0.25 * (field["max"] - field["min"])
            if field["kind"] == "number" else field["options"][0]["value"]
        )
        for field in fields
    }
    upper_case = {
        field["name"]: (
            field["min"] + 0.75 * (field["max"] - field["min"])
            if field["kind"] == "number" else field["options"][-1]["value"]
        )
        for field in fields
    }
    validation_cases = []
    for input_values in [default_case, lower_case, upper_case]:
        features = []
        for feature in selected_features:
            source = feature["source"]
            if feature["kind"] == "factor":
                features.append(input_values[source])
            elif feature["kind"] == "indicator":
                features.append(float(input_values[source] == feature["category"]))
            else:
                transform = numeric_transforms[source]
                features.append((input_values[source] - transform["mean"]) / transform["scale"])
        features = np.asarray(features, dtype=float)
        sklearn_probability = float(model.predict_proba(features.reshape(1, -1))[0, 1])
        json_probability = float(np.mean([evaluate_tree(tree, features) for tree in trees]))
        if abs(sklearn_probability - json_probability) > 1e-12:
            raise AssertionError(
                f"随机森林 JSON 与 Python 预测不一致：{sklearn_probability} vs {json_probability}"
            )
        validation_cases.append({
            "input": {name: float(value) for name, value in input_values.items()},
            "rawProbability": sklearn_probability,
            "calibratedProbability": recalibrate(sklearn_probability, intercept, slope),
        })

    payload = {
        "modelName": "EFA three-factor scores + RandomForest",
        "modelVersion": "FFQ frequency-direction corrected rerun, 2026-09-20",
        "outcome": "BMI >= 28 kg/m2",
        "trainingN": len(train_idx),
        "testN": len(test_idx),
        "outerCvAuc": float(result["外层CV_AUC均值"]),
        "outerCvSd": float(result["外层CV_AUC标准差"]),
        "testAuc": float(result["独立测试集AUC"]),
        "testAucCi": [float(result["独立测试集AUC_95CI下限"]), float(result["独立测试集AUC_95CI上限"])],
        "rawThreshold": raw_threshold,
        "calibratedThreshold": calibrated_threshold,
        "recalibration": {"intercept": intercept, "slope": slope},
        "featureNames": list(artifact["feature_names"]),
        "fields": fields,
        "numericTransforms": numeric_transforms,
        "selectedFeatures": selected_features,
        "trees": trees,
        "validationCases": validation_cases,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"已生成 {OUTPUT_PATH}")
    print(f"模型特征数：{len(selected_features)}；随机森林树数：{len(trees)}")
    print(f"原始阈值：{raw_threshold:.6f}；再校准阈值：{calibrated_threshold:.6f}")


if __name__ == "__main__":
    main()
