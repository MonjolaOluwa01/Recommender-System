import React, { useCallback, useEffect, useMemo, useReducer } from "react";
import SelectField from "./components/Select";
import listOfGenreOption from "./store/genre.json";
import listOfMoodOption from "./store/mood.json";


const initialState = {
  genre: "",
  mood: "",
  level: "",
  loading: false,
  error: "",
  results: [], // each item: { meta: {...}, text: "...", raw: data }
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_GENRE":
      return { ...state, genre: action.payload };
    case "SET_MOOD":
      return { ...state, mood: action.payload };
    case "SET_LEVEL":
      return { ...state, level: action.payload };
    case "REQUEST_START":
      return { ...state, loading: true, error: "" };
    case "REQUEST_ERROR":
      return { ...state, loading: false, error: action.payload || "Something went wrong." };
    case "REQUEST_SUCCESS":
      return {
        ...state,
        loading: false,
        error: "",
        results: [action.payload, ...state.results],
      };
    case "CLEAR_ERROR":
      return { ...state, error: "" };
    default:
      return state;
  }
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .map((p) => p?.text)
    .filter(Boolean)
    .join("\n")
    .trim();
  return text || "No text returned.";
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { genre, mood, level, loading, error, results } = state;

  const availableMoodBasedOnGenre = useMemo(() => {
    return listOfMoodOption?.[genre] || [];
  }, [genre]);
  
  useEffect(() => {
    if (!genre) {
      if (mood) dispatch({ type: "SET_MOOD", payload: "" });
      return;
    }

    const moods = listOfMoodOption?.[genre] || [];
    if (mood && !moods.includes(mood)) {
      dispatch({ type: "SET_MOOD", payload: "" });
    }
  }, [genre, mood]);

  const onSelectGenre = useCallback((val) => {
    dispatch({ type: "SET_GENRE", payload: val });
  }, []);

  const onSelectMood = useCallback((val) => {
    dispatch({ type: "SET_MOOD", payload: val });
  }, []);

  const onSelectLevel = useCallback((val) => {
    dispatch({ type: "SET_LEVEL", payload: val });
  }, []);

  const canSubmit = Boolean(genre && mood && level) && !loading;

  const fetchRecommendations = useCallback(async () => {
    dispatch({ type: "CLEAR_ERROR" });

    if (!genre || !mood || !level) {
      dispatch({ type: "REQUEST_ERROR", payload: "Please select genre, mood, and level." });
      return;
    }

    dispatch({ type: "REQUEST_START" });

    try {
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

      if (!GEMINI_API_KEY) {
        throw new Error("Missing API key. Set VITE_GEMINI_API_KEY (or REACT_APP_GEMINI_API_KEY).");
      }
      
      const MODEL = "gemini-2.5-flash";

      const prompt = `Recommend 6 books for a ${level} ${genre} reader feeling ${mood}. Explain why each book fits.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || "Gemini request failed.");
      }

      const text = extractGeminiText(data);

      dispatch({
        type: "REQUEST_SUCCESS",
        payload: {
          meta: { genre, mood, level, model: MODEL, at: new Date().toISOString() },
          text,
          raw: data,
        },
      });
    } catch (e) {
      dispatch({ type: "REQUEST_ERROR", payload: e?.message });
    }
  }, [genre, mood, level]);

  return (
    <section className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-3">Book Recommender</h1>

      <div className="grid gap-3">
        <SelectField
          placeholder="Please select a genre"
          id="genre"
          options={listOfGenreOption}
          onSelect={onSelectGenre}
          value={genre}
        />

        <SelectField
          placeholder={genre ? "Please select a mood" : "Select a genre first"}
          id="mood"
          options={availableMoodBasedOnGenre}
          onSelect={onSelectMood}
          value={mood}
          disabled={!genre}
        />

        <SelectField
          placeholder="Please select a level"
          id="level"
          options={["Beginner", "Intermediate", "Expert"]}
          onSelect={onSelectLevel}
          value={level}
        />

        <button
          onClick={fetchRecommendations}
          disabled={!canSubmit}
          className="px-4 py-2 rounded bg-white text-black disabled:opacity-50"
        >
          {loading ? "Getting recommendations..." : "Get Recommendation"}
        </button>

        {error ? <p className="text-red-400">{error}</p> : null}
      </div>

      <div className="mt-6 grid gap-3">
        {results.map((item, index) => (
          <details key={item.meta.at + index} className="rounded border border-zinc-700 p-3">
            <summary className="cursor-pointer">
              Recommendation {results.length - index} — {item.meta.genre} / {item.meta.mood} /{" "}
              {item.meta.level}
            </summary>
            <pre className="whitespace-pre-wrap mt-3 text-sm">{item.text}</pre>
          </details>
        ))}
      </div>
    </section>
  );
}
