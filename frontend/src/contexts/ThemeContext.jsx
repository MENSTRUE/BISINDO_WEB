import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";


const ThemeContext =
  createContext(null);


const STORAGE_KEY =
  "bisindo-ui-theme";


const getInitialTheme = () => {
  if (
    typeof window ===
    "undefined"
  ) {
    return "dark";
  }


  try {
    const savedTheme =
      window.localStorage
        .getItem(
          STORAGE_KEY
        );


    if (
      savedTheme === "light"
      ||
      savedTheme === "dark"
    ) {
      return savedTheme;
    }
  }

  catch {
    /*
     * Jika localStorage
     * tidak tersedia,
     * gunakan dark mode.
     */
  }


  return "dark";
};


function ThemeProvider({
  children,
}) {
  const [
    theme,
    setTheme,
  ] = useState(
    getInitialTheme
  );


  useEffect(() => {
    const root =
      document.documentElement;


    root.setAttribute(
      "data-theme",
      theme
    );


    root.style.colorScheme =
      theme;


    try {
      window.localStorage
        .setItem(
          STORAGE_KEY,
          theme
        );
    }

    catch {
      /*
       * Tidak perlu menghentikan
       * aplikasi bila localStorage
       * gagal digunakan.
       */
    }

  }, [
    theme,
  ]);


  const setDarkTheme =
    () => {
      setTheme(
        "dark"
      );
    };


  const setLightTheme =
    () => {
      setTheme(
        "light"
      );
    };


  const toggleTheme =
    () => {
      setTheme(
        (currentTheme) =>
          currentTheme ===
          "dark"
            ? "light"
            : "dark"
      );
    };


  const value =
    useMemo(
      () => ({
        theme,

        isDark:
          theme ===
          "dark",

        isLight:
          theme ===
          "light",

        setTheme,

        setDarkTheme,

        setLightTheme,

        toggleTheme,
      }),
      [
        theme,
      ]
    );


  return (
    <ThemeContext.Provider
      value={value}
    >
      {children}
    </ThemeContext.Provider>
  );
}


function useTheme() {
  const context =
    useContext(
      ThemeContext
    );


  if (!context) {
    throw new Error(
      "useTheme harus digunakan di dalam ThemeProvider."
    );
  }


  return context;
}


export {
  ThemeProvider,
  useTheme,
};