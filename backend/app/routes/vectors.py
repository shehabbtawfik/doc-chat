from __future__ import annotations
from fastapi import APIRouter, HTTPException
from app.services.vector_store import _collection

router = APIRouter(prefix="/api/vectors", tags=["vectors"])


@router.get("/3d")
def get_vectors_3d():
    """
    Return all chunk embeddings reduced to 3 dimensions via PCA.
    Each point carries doc metadata and a chunk preview.
    """
    from sklearn.decomposition import PCA
    import numpy as np

    result = _collection.get(include=["embeddings", "metadatas", "documents"])

    if not result["ids"]:
        raise HTTPException(404, "No documents indexed yet.")

    embeddings = np.array(result["embeddings"])
    metadatas = result["metadatas"]
    documents = result["documents"]

    # Reduce to 3D — fall back gracefully if fewer than 3 samples
    n_components = min(3, len(embeddings))
    pca = PCA(n_components=n_components)
    coords = pca.fit_transform(embeddings)

    # Pad to 3D if needed
    if coords.shape[1] < 3:
        pad = np.zeros((coords.shape[0], 3 - coords.shape[1]))
        coords = np.hstack([coords, pad])

    # Normalise to [-1, 1] for nicer rendering
    for i in range(3):
        col = coords[:, i]
        rng = col.max() - col.min()
        if rng > 0:
            coords[:, i] = 2 * (col - col.min()) / rng - 1

    variance = pca.explained_variance_ratio_.tolist()

    points = []
    for i, (meta, doc) in enumerate(zip(metadatas, documents)):
        points.append({
            "id": result["ids"][i],
            "x": float(coords[i, 0]),
            "y": float(coords[i, 1]),
            "z": float(coords[i, 2]),
            "doc_id": meta["doc_id"],
            "title": meta["title"],
            "preview": doc[:120] + "…" if len(doc) > 120 else doc,
        })

    # Group unique documents for legend
    docs_seen: dict[str, str] = {}
    for p in points:
        docs_seen[p["doc_id"]] = p["title"]

    return {
        "points": points,
        "documents": [{"doc_id": k, "title": v} for k, v in docs_seen.items()],
        "variance_explained": variance,
        "total_chunks": len(points),
    }
