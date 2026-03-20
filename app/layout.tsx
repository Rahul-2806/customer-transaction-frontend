import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CustomerPredict — Rahul R",
  description: "Customer Transaction Prediction — LightGBM + XGBoost + CatBoost Ensemble | ROC-AUC 0.9034",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}