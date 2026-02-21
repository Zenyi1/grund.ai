export default function FounderDashboard() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Candidate Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Matched candidates will appear here after they complete their interviews.
        </p>
      </div>

      {/* Placeholder — Module 4 (Phase 2) */}
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
        <p className="text-gray-400 text-sm">
          No candidates yet. Start your founder interview to activate matching.
        </p>
      </div>
    </div>
  );
}
