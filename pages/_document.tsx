import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <Head />
      <body className="antialiased bg-[#0a0a0b] text-[#e0e0e0]" style={{ backgroundColor: "#0a0a0b" }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
