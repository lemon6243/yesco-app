import { useEffect, useState } from "react";

export function useAdjacencyMap() {
  const [adjacency, setAdjacency] = useState({});

  useEffect(() => {
    fetch("/data/dong_adjacency.json")
      .then((r) => r.json())
      .then((data) => {
        // dong_adjacency.json 구조 검증 - { 행정동: { neighbors: [...] } } 또는 { 행정동: [...] }
        const normalized = {};
        Object.entries(data).forEach(([k, v]) => {
          if (Array.isArray(v)) normalized[k] = v;
          else if (v && Array.isArray(v.neighbors)) normalized[k] = v.neighbors;
          else if (v && Array.isArray(v.인접동)) normalized[k] = v.인접동;
          else normalized[k] = [];
        });
        setAdjacency(normalized);
      })
      .catch((e) => console.warn("adjacency load failed:", e));
  }, []);

  return adjacency;
}
