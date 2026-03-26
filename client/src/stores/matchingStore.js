import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise a GPA value to a 4.0 scale.
 *  gpa_scale is stored as the string "4.0" or "10.0". */
function normaliseGpa(gpa, gpaScale) {
  if (gpa == null) return null;
  if (gpaScale === '10.0') return Math.min(4.0, Math.round((gpa / 2.5) * 1000) / 1000);
  return Math.min(4.0, Math.max(0, gpa)); // already 4.0 scale
}

/** Compute total work experience in months from an array of WorkExperience objects.
 *  end_date is null when is_current === true, so we use today in that case. */
function computeWorkExpMonths(workExperiences) {
  if (!workExperiences || workExperiences.length === 0) return null;
  const today = new Date();
  let total = 0;
  for (const exp of workExperiences) {
    const start = new Date(exp.start_date);
    const end = (exp.is_current || !exp.end_date) ? today : new Date(exp.end_date);
    const months = (end.getFullYear() - start.getFullYear()) * 12
                 + (end.getMonth() - start.getMonth());
    total += Math.max(0, months);
  }
  return total > 0 ? total : null;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const useMatchingStore = create((set, get) => ({
  matches: null,
  isLoading: false,
  error: null,

  // User-editable filter overrides shown in the sidebar
  filters: {
    target_degree: 'MS',
    target_course_keywords: '',
    max_total_cost: null,
    top_k: 20,
  },

  // Pre-fetched server-side profile features (set when loadProfileFeatures runs)
  profileFeatures: null,

  setFilter: (key, value) => set(state => ({
    filters: { ...state.filters, [key]: value },
  })),

  /**
   * Fetch pre-computed feature values for the current user from the backend.
   * This must be called before runMatch (or on page mount) so the model
   * receives all student-specific features, not just the filter overrides.
   *
   * The backend reads UserProfile + WorkExperience from the DB, applies GPA
   * normalisation and company-tier prestige lookup, and returns a
   * ProfileFeaturesResponse object.
   *
   * We also use suggested_degree / suggested_course_keywords to pre-fill the
   * filter UI if the user hasn't already customised those fields.
   */
  loadProfileFeatures: async () => {
    try {
      const token = useAuthStore.getState().token;
      const res = await axios.get(`${API_URL}/matching/profile-features`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const features = res.data;

      set(state => {
        // Pre-fill filter defaults from profile only if they haven't been
        // manually changed from their initial values.
        const updatedFilters = { ...state.filters };
        if (features.suggested_degree && updatedFilters.target_degree === 'MS') {
          updatedFilters.target_degree = features.suggested_degree;
        }
        if (features.suggested_course_keywords && !updatedFilters.target_course_keywords) {
          updatedFilters.target_course_keywords = features.suggested_course_keywords;
        }
        return { profileFeatures: features, filters: updatedFilters };
      });
    } catch (err) {
      // Non-fatal: matching can still run (with fewer features).
      console.warn('Could not load profile features:', err?.response?.data?.detail || err.message);
    }
  },

  /**
   * Run the university matcher.
   *
   * Payload construction:
   *   1. Start with profileFeatures (all student-specific ML features).
   *   2. Override/extend with the user's filter choices (degree, keywords, cost, top_k).
   *
   * This ensures the model always sees real GPA, test scores, work experience etc.
   * while still respecting user-controlled search filters.
   */
  runMatch: async () => {
    set({ isLoading: true, error: null });
    try {
      // Lazily fetch profile features if they haven't been loaded yet.
      if (!get().profileFeatures) {
        await get().loadProfileFeatures();
      }

      const { filters, profileFeatures } = get();

      // Merge: profileFeatures provides all ML inputs; filters provide search params.
      const payload = {
        // --- ML features from profile (server-computed) ---
        undergrad_gpa_mod:          profileFeatures?.undergrad_gpa_mod    ?? null,
        undergrad_college:          profileFeatures?.undergrad_college     ?? null,
        work_exp_months:            profileFeatures?.work_exp_months       ?? null,
        has_prestigious_experience: profileFeatures?.has_prestigious_experience ?? false,
        gre_total:                  profileFeatures?.gre_total             ?? null,
        quant:                      profileFeatures?.quant                 ?? null,
        verbal:                     profileFeatures?.verbal                ?? null,
        awa:                        profileFeatures?.awa                   ?? null,
        total_ielts_score:          profileFeatures?.total_ielts_score     ?? null,
        total_toefl_score:          profileFeatures?.total_toefl_score     ?? null,

        // --- User-controlled search filters ---
        target_degree:              filters.target_degree,
        target_course_keywords:     filters.target_course_keywords || null,
        max_total_cost:             filters.max_total_cost,
        top_k:                      filters.top_k,
      };

      const token = useAuthStore.getState().token;
      const response = await axios.post(`${API_URL}/matching/run`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      set({ matches: response.data, isLoading: false });
    } catch (err) {
      console.error('Matching Error:', err);
      set({
        error: err.response?.data?.detail || 'Failed to compute matches.',
        isLoading: false,
      });
    }
  },

  clearMatches: () => set({ matches: null, error: null }),
}));

export default useMatchingStore;
