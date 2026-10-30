import { useEffect, useState } from "react";
import { readQuizScores } from "@/lib/progressStore";

export function useQuizScores() {
  const [scores, setScores] = useState(readQuizScores);

  useEffect(() => {
    const handler = () => setScores(readQuizScores());
    window.addEventListener("decoded:progress", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("decoded:progress", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return scores;
}
