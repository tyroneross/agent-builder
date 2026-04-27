import "./globals.css";

export const metadata = {
  title: "Agent Builder",
  description: "Design, preview, and build local agent harness files.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
