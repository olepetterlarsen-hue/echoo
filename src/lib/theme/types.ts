// Tema-typer i egen fil (ikke "use server") så de kan importeres fra
// både server- og klient-komponenter uten å trigge server-action-bundling.

export type Theme = "lin" | "dark";
