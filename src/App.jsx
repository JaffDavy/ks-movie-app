import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Search from "./Components/search.jsx";
import Spinner from "./Components/Spinner.jsx";
import MovieCard from "./Components/movieCard.jsx";
import { useDebounce } from "react-use";
import { updateSearchCount, getTrendingMovies } from "./appwrite.js";

const API_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
};

const fetchMoviesData = async (query = "") => {
  let endpoint = `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;
  if (query) {
    endpoint = `${API_BASE_URL}/search/movie?query=${encodeURIComponent(
      query
    )}`;
  }

  const response = await fetch(endpoint, API_OPTIONS);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (!data.results) {
    throw new Error("Invalid response format.");
  }

  return data.results;
};

const fetchTrendingMoviesData = async () => {
  return getTrendingMovies();
};

const App = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const queryClient = useQueryClient();

  useDebounce(
    () => {
      setDebouncedSearchTerm(searchTerm);
    },
    500,
    [searchTerm]
  );
  const {
    data: movies,
    isLoading: isMoviesLoading,
    isError: isMoviesError,
    error: moviesError,
  } = useQuery({
    queryKey: ["movies", debouncedSearchTerm],
    queryFn: () => fetchMoviesData(debouncedSearchTerm),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: trendingMovies = [],
    isLoading: isTrendingLoading,
    isError: isTrendingError,
  } = useQuery({
    queryKey: ["trendingMovies"],
    queryFn: fetchTrendingMoviesData,
    staleTime: Infinity,
  });

  const updateCountMutation = useMutation({
    mutationFn: ({ query, movie }) => updateSearchCount(query, movie),
    onSuccess: () => {},
    onError: (error) => {
      console.error("Failed to update search count:", error);
    },
  });

  React.useEffect(() => {
    if (debouncedSearchTerm && movies && movies.length > 0) {
      updateCountMutation.mutate({
        query: debouncedSearchTerm,
        movie: movies[0],
      });
    }
  }, [debouncedSearchTerm, movies]);

  const errorMessage = (() => {
    if (isMoviesError) {
      return "Failed to fetch movies. Please try again later.";
    }
    if (debouncedSearchTerm && movies && movies.length === 0) {
      return `No results found for "${debouncedSearchTerm}".`;
    }
    if (
      !debouncedSearchTerm &&
      movies &&
      movies.length === 0 &&
      !isMoviesLoading
    ) {
      return "Could not load initial movies.";
    }
    return "";
  })();

  const displayMovies = movies || [];

  return (
    <main>
      <div className="pattern" />

      <div className="wrapper">
        <header>
          <img src="./hero-img.png" alt="logo" />
          <h1>
            Find <span className="text-gradient">Movies </span> You'll Enjoy
            Without The Hassle
          </h1>
          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </header>

        {(isTrendingLoading || trendingMovies.length > 0) && (
          <section className="trending">
            <h2>Trending Movies</h2>
            {isTrendingLoading ? (
              <Spinner />
            ) : trendingMovies.length > 0 ? (
              <ul>
                {trendingMovies.map((movie, index) => (
                  <li key={movie.$id}>
                    <p>{index + 1}</p>
                    <img src={movie.poster_url} alt={movie.title} />
                  </li>
                ))}
              </ul>
            ) : isTrendingError ? (
              <p className="text-red-500">Failed to load trending movies.</p>
            ) : null}
          </section>
        )}

        <section className="all-movies">
          <h2>
            {searchTerm ? `Search Results for "${searchTerm}"` : "All Movies"}
          </h2>

          {isMoviesLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className="text-red-500">{errorMessage}</p>
          ) : (
            <ul>
              {displayMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default App;
