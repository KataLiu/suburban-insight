"""
Trains K-means clusters over the suburb dataset (Req.4 / FR4) and writes the
result back into data/processed/suburbs.json.

Runs offline, not per-request (see docs/architecture.md's "Recommendation-
system architecture" section) — the backend only ever reads the precomputed
result.

Features used: median household income, median rent, overseas-born %,
family household % — the four numeric demographic fields available for
every suburb. Cultural background isn't included as a raw feature since it's
a variable-length list per suburb (different countries per suburb), not a
fixed-width numeric vector; overseas-born % already captures the "diversity"
dimension numerically. Population growth is excluded — still null for every
suburb (deferred, see docs/roadmap.md).

k is chosen via silhouette score, not hardcoded to the proposal's
illustrative 3-cluster example (Slide 8 explicitly says that example is
illustrative only). Cluster labels are generated from each cluster's
centroid — the two features furthest from the dataset average — rather than
hand-picked, so they reflect whatever the real data produces.
"""

import json
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

DATASET_PATH = Path(__file__).resolve().parent.parent / "data" / "processed" / "suburbs.json"

FEATURES = [
    "median_weekly_household_income",
    "median_weekly_rent",
    "overseas_born_pct",
    "family_households_pct",
]

# (label if below dataset average, label if above) per feature.
FEATURE_LABELS = {
    "median_weekly_household_income": ("More affordable incomes", "Higher-income"),
    "median_weekly_rent": ("Lower-rent", "Higher-rent"),
    "overseas_born_pct": ("Predominantly Australian-born", "Culturally diverse"),
    "family_households_pct": ("Share / non-family households", "Family-oriented"),
}

RANDOM_STATE = 42
MAX_SIMILAR_SUBURBS = 3


def build_feature_matrix(suburbs):
    return np.array([[s["demographics"][f] for f in FEATURES] for s in suburbs])


def choose_k(X_scaled, k_range):
    print("k  inertia    silhouette")
    scores = {}
    for k in k_range:
        model = KMeans(n_clusters=k, random_state=RANDOM_STATE, n_init=10).fit(X_scaled)
        score = silhouette_score(X_scaled, model.labels_)
        scores[k] = score
        print(f"{k:<2} {model.inertia_:<10.1f} {score:.3f}")
    best_k = max(scores, key=scores.get)
    print(f"\nChosen k={best_k} (highest silhouette score)")
    return best_k


def label_cluster(centroid):
    """centroid is in standardized (z-score) space: positive = above the
    dataset average, negative = below. Pick the two most distinguishing
    features and describe them."""
    ranked = sorted(
        zip(FEATURES, centroid), key=lambda pair: abs(pair[1]), reverse=True
    )
    top_two = ranked[:2]
    parts = []
    for feature, z in top_two:
        low_label, high_label = FEATURE_LABELS[feature]
        parts.append(high_label if z > 0 else low_label)
    return " + ".join(parts)


def train():
    suburbs = json.loads(DATASET_PATH.read_text())
    X = build_feature_matrix(suburbs)
    X_scaled = StandardScaler().fit_transform(X)

    max_k = min(6, len(suburbs) - 1)
    best_k = choose_k(X_scaled, range(2, max_k + 1))

    kmeans = KMeans(n_clusters=best_k, random_state=RANDOM_STATE, n_init=10).fit(X_scaled)
    labels = [label_cluster(centroid) for centroid in kmeans.cluster_centers_]

    for suburb, cluster_id, point in zip(suburbs, kmeans.labels_, X_scaled):
        same_cluster = [
            (other["id"], np.linalg.norm(point - other_point))
            for other, other_id, other_point in zip(suburbs, kmeans.labels_, X_scaled)
            if other_id == cluster_id and other["id"] != suburb["id"]
        ]
        same_cluster.sort(key=lambda pair: pair[1])
        similar_ids = [suburb_id for suburb_id, _ in same_cluster[:MAX_SIMILAR_SUBURBS]]

        suburb["cluster"] = {
            "id": int(cluster_id),
            "label": labels[cluster_id],
            "similar_suburb_ids": similar_ids,
        }

    DATASET_PATH.write_text(json.dumps(suburbs, indent=2))
    print(f"\nWrote cluster assignments for {len(suburbs)} suburbs to {DATASET_PATH}")

    for cluster_id in range(best_k):
        members = [s["name"] for s in suburbs if s["cluster"]["id"] == cluster_id]
        print(f"\nCluster {cluster_id} — {labels[cluster_id]} ({len(members)} suburbs)")
        print(f"  {', '.join(members)}")


if __name__ == "__main__":
    train()
