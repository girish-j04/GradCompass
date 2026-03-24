import React, { useEffect } from 'react';
import useMatchingStore from '../stores/matchingStore';

// ---- Verdict badge colours ----
const verdictStyles = {
  Qualified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  Borderline: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  Unlikely:   'bg-red-100   text-red-800   dark:bg-red-900   dark:text-red-100',
};

const categoryStyles = {
  Safe:   'bg-green-100  text-green-800  dark:bg-green-900  dark:text-green-100',
  Target: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  Reach:  'bg-red-100    text-red-800    dark:bg-red-900    dark:text-red-100',
};

const UniversityMatcherPage = () => {
  const {
    matches, isLoading, error,
    filters, setFilter,
    runMatch, clearMatches,
    loadProfileFeatures,
  } = useMatchingStore();

  useEffect(() => {
    loadProfileFeatures();
  }, []);

  const handleMatchRequest = (e) => {
    e.preventDefault();
    runMatch();
  };

  const results   = matches?.results   ?? [];
  const shortlist = matches?.shortlist  ?? [];
  const gaps      = matches?.profile_gaps ?? [];
  const fallback  = matches?.fallback_triggered ?? false;
  const fallbackSuggestions = matches?.fallback_suggestions ?? [];

  // Build a quick lookup: program_id → shortlist entry (for the "Recommended" badge)
  const shortlistIds = new Set((shortlist || []).map(s => s.program_id));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-mocha-text dark:text-latte-text">University Matcher</h1>
          <p className="text-mocha-subtext0 dark:text-latte-subtext0">
            ML-powered ranking + AI validation for every result.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ---- Filters Sidebar ---- */}
        <div className="md:col-span-1 bg-white dark:bg-mocha-surface0 rounded-lg shadow-sm border border-latte-overlay0 dark:border-mocha-overlay0 p-6 h-fit">
          <h2 className="text-xl font-semibold mb-4 text-mocha-text dark:text-latte-text">Match Filters</h2>
          <form onSubmit={handleMatchRequest} className="space-y-4">

            <div>
              <label className="block text-sm font-medium mb-1 text-mocha-text dark:text-latte-text">Degree Type</label>
              <select
                value={filters.target_degree}
                onChange={(e) => setFilter('target_degree', e.target.value)}
                className="w-full rounded-md border-latte-overlay0 dark:border-mocha-overlay0 bg-latte-crust dark:bg-mocha-crust text-mocha-text dark:text-latte-text shadow-sm px-3 py-2"
              >
                <option value="MS">Master of Science (MS)</option>
                <option value="MEng">Master of Engineering (MEng)</option>
                <option value="MBA">MBA</option>
                <option value="PhD">PhD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-mocha-text dark:text-latte-text">Course Keywords</label>
              <input
                type="text"
                placeholder="e.g. computer science"
                value={filters.target_course_keywords}
                onChange={(e) => setFilter('target_course_keywords', e.target.value)}
                className="w-full rounded-md border-latte-overlay0 dark:border-mocha-overlay0 bg-latte-crust dark:bg-mocha-crust text-mocha-text dark:text-latte-text shadow-sm px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-mocha-text dark:text-latte-text">Max Total Cost (Tuition + Living) $</label>
              <input
                type="number"
                placeholder="No limit"
                value={filters.max_total_cost || ''}
                onChange={(e) => setFilter('max_total_cost', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full rounded-md border-latte-overlay0 dark:border-mocha-overlay0 bg-latte-crust dark:bg-mocha-crust text-mocha-text dark:text-latte-text shadow-sm px-3 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full font-medium py-2 px-4 rounded-md text-white transition-colors
                ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isLoading ? 'Running AI Engine...' : 'Find Matches'}
            </button>

            {matches && (
              <button
                type="button"
                onClick={clearMatches}
                className="w-full text-sm mt-3 text-red-500 hover:text-red-600 transition-colors"
              >
                Clear Results
              </button>
            )}
          </form>
        </div>

        {/* ---- Results Area ---- */}
        <div className="md:col-span-2 space-y-6">

          {/* Error */}
          {error && (
            <div className="p-4 text-red-800 bg-red-100 dark:bg-red-900/30 dark:text-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!matches && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-mocha-surface0 rounded-lg border border-dashed border-latte-overlay0 dark:border-mocha-overlay0">
              <span className="text-4xl mb-4">🎓</span>
              <p className="text-mocha-subtext0 dark:text-latte-subtext0 text-center px-6">
                Enter your preferences and hit "Find Matches" to run our AI Predictor across thousands of programs.
              </p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
              <p className="text-sm text-mocha-subtext0 dark:text-latte-subtext0">
                ML scoring + AI validation in progress…
              </p>
            </div>
          )}

          {/* Results */}
          {matches && !isLoading && (
            <>
              {/* ---- Fallback Coach banner ---- */}
              {fallback && fallbackSuggestions.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    ⚠️ Limited Results — AI Coach Suggestions
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-amber-700 dark:text-amber-300">
                    {fallbackSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {/* ---- Profile Gaps ---- */}
              {gaps.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    💡 Profile Improvements
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
                    {gaps.map((g, i) => <li key={i}>{g}</li>)}
                  </ul>
                </div>
              )}

              {/* ---- Shortlist (Advisor picks) ---- */}
              {shortlist.length > 0 && (
                <div className="bg-white dark:bg-mocha-surface0 rounded-lg shadow-sm border border-latte-overlay0 dark:border-mocha-overlay0 p-5">
                  <h3 className="font-semibold text-lg text-mocha-text dark:text-latte-text mb-3">
                    ⭐ AI Recommended Shortlist
                  </h3>
                  <div className="space-y-3">
                    {shortlist.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-latte-crust dark:bg-mocha-crust rounded-lg">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full shrink-0 ${categoryStyles[item.category] || ''}`}>
                          {item.category}
                        </span>
                        <div>
                          <p className="font-medium text-sm text-mocha-text dark:text-latte-text">{item.uni_name}</p>
                          <p className="text-xs text-mocha-subtext0 dark:text-latte-subtext0 mt-0.5">{item.justification}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ---- Full Results Header ---- */}
              <div className="bg-white dark:bg-mocha-surface0 rounded-lg p-4 shadow-sm border border-latte-overlay0 dark:border-mocha-overlay0 flex justify-between items-center">
                <h3 className="font-semibold text-mocha-text dark:text-latte-text">All Results</h3>
                <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-3 py-1 rounded-full">
                  {results.length} Programs
                </span>
              </div>

              {/* ---- Result Cards ---- */}
              <div className="grid grid-cols-1 gap-4">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`bg-white dark:bg-mocha-surface0 p-5 rounded-lg shadow-sm border hover:shadow-md transition-shadow
                      ${shortlistIds.has(result.program?.program_id)
                        ? 'border-blue-400 dark:border-blue-600'
                        : 'border-latte-overlay0 dark:border-mocha-overlay0'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-lg font-bold text-mocha-text dark:text-latte-text">
                            {result.program.uni_name}
                          </h4>
                          {shortlistIds.has(result.program?.program_id) && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full font-medium">
                              ⭐ Shortlisted
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-mocha-subtext0 dark:text-latte-subtext0 mt-0.5">
                          {result.program.degree_norm}{result.program.course_name ? ` — ${result.program.course_name}` : ''}
                        </p>
                        {/* Validator reason */}
                        {result.verdict_reason && (
                          <p className="text-xs text-mocha-subtext0 dark:text-latte-subtext0 mt-1 italic">
                            {result.verdict_reason}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        {/* ML category */}
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full block mb-1 ${categoryStyles[result.match_category] || ''}`}>
                          {result.match_category}
                        </span>
                        {/* Validator verdict */}
                        {result.verdict && (
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full block mb-1 ${verdictStyles[result.verdict] || ''}`}>
                            {result.verdict}
                          </span>
                        )}
                        <div className="text-sm font-medium text-mocha-text dark:text-latte-text mt-1">
                          {(result.probability_score * 100).toFixed(1)}% Admit Prob.
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-latte-overlay0/50 dark:border-mocha-overlay0/50 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-mocha-subtext0 dark:text-latte-subtext0 block">Tuition</span>
                        <span className="font-medium text-mocha-text dark:text-latte-text">
                          {result.program.tuition_fee_usd ? `$${result.program.tuition_fee_usd.toLocaleString()}` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-mocha-subtext0 dark:text-latte-subtext0 block">Global Rank</span>
                        <span className="font-medium text-mocha-text dark:text-latte-text">
                          {result.program.global_rank_uni ? `#${result.program.global_rank_uni}` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UniversityMatcherPage;
