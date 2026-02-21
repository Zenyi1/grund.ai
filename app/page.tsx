import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          cracked.ai
        </h1>
        <p className="text-xl text-gray-500">
          Voice AI interviews that match startup founders with exceptional candidates.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/signup"
            className="px-6 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
