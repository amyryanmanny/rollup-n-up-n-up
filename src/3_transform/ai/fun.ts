import { generateSummary, type SummaryParameters } from "./summarize";

const genres = [
  "Western",
  "Mystery",
  "Horror",
  "Sci-Fi",
  "Fantasy",
  "Comedy",
  "Thriller",
  "True Crime",
];

export async function generateFunSummary(
  params: Omit<SummaryParameters, "prompt">,
) {
  const randomGenre = genres[Math.floor(Math.random() * genres.length)]!;

  return await generateSummary({
    ...params,
    prompt: "fun.prompt.yaml",
    placeholders: {
      ...params.placeholders,
      genre: randomGenre,
    },
  });
}
