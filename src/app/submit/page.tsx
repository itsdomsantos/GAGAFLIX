import type { Metadata } from "next";
import SubmitForm from "./SubmitForm";

export const metadata: Metadata = {
  title: "Suggest a video",
  description:
    "Found a Lady Gaga performance, interview or rare clip that's missing from GAGAFLIX? Send us the link.",
  alternates: { canonical: "/submit" },
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-28 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-era">For Little Monsters</p>
      <h1 className="font-display mt-2 text-5xl chrome-text sm:text-6xl">Suggest a video</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
        Found a performance, interview, fashion moment or rare clip that isn&apos;t on GAGAFLIX yet?
        Paste the link — YouTube, Vimeo, X, Dailymotion, anything that plays. Every suggestion is
        checked by hand before it goes live.
      </p>
      <SubmitForm />
    </div>
  );
}
