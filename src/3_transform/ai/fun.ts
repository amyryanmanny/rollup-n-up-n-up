import { generateSummary, type SummaryParameters } from "./summarize";

const genres = [
  "Western",
  `Western Parody overusing terms like "y'all" and "pardner" and "rootin' tootin'"`,
  "Mystery",
  "Horror",
  "Sci-Fi",
  "Fantasy",
  "Comedy",
  "Thriller",
  "True Crime",
  "Action",
  "Adventure",
  "Drama",
  "Documentary",
  "Found Footage",
  "Mockumentary",
  "Biopic",
  "Superhero",
  "Animated Kids Movie",
  "Musical",
  "Seinfeld Episode",
  "Musical Biopic Parody",
];

export async function generateFunSummary(
  params: Omit<SummaryParameters, "prompt">,
) {
  const funIndex = Math.floor(Math.random() * genres.length);
  const randomGenre = genres[funIndex]!;

  return await generateSummary({
    ...params,
    prompt: "fun.prompt.yaml",
    placeholders: {
      ...params.placeholders,
      genre: randomGenre,
    },
  });
}
