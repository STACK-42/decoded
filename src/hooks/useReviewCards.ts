import { useEffect, useState } from "react";
import { readCards } from "@/lib/review";

/** The review cards on this device, kept current across components and tabs. */
export function useReviewCards() {
  const [cards, setCards] = useState(readCards);
  useEffect(() => {
    const handler = () => setCards(readCards());
    window.addEventListener("decoded:progress", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("decoded:progress", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return cards;
}
