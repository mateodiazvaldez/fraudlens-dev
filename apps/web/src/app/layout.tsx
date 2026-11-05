import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FraudLens | Evaluación de transacciones",
  description: "Registro e historial de evaluaciones de transacciones de FraudLens.",
  icons: { icon: "/brand/favicon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
