import "@/styles/globals.css";
import "../components/GooeyButton.css";
import "../components/Dock.css";
import "../components/ElectricBorder.css";
import "../components/GradientText.css";
import "../components/PillNav.css";
import type { AppProps } from "next/app";
import { Providers } from "@/lib/providers";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Providers>
      <Component {...pageProps} />
    </Providers>
  );
}
