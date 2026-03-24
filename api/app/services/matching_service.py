import os
import joblib
import pandas as pd
import numpy as np
from typing import List, Tuple, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.matching import (
    Program, ProgramStats, MatchRun, MatchResult,
    MatchRequest, MatchResultResponse, ProfileFeaturesResponse,
    ShortlistItem,
)
from app.models.user import User
from app.models.profile import UserProfile, WorkExperience

class MatchingService:
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.data_dir = os.path.join(base_dir, "data", "university_matcher")
        self.model_path = os.path.join(self.data_dir, "university_matcher_model.pkl")
        self.feature_cols_path = os.path.join(self.data_dir, "model_feature_columns.pkl")
        self.model = None
        self.feature_cols = None
        # Tier caches (uploaded alongside the model files)
        self.uni_tier_dict: Dict[str, int] = {}
        self.company_tier_dict: Dict[str, int] = {}
        self._load_models()
        self._load_caches()

    def _load_models(self):
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.feature_cols_path):
                self.model = joblib.load(self.model_path)
                self.feature_cols = joblib.load(self.feature_cols_path)
                print(f"Loaded matching model ({len(self.feature_cols)} features).")
            else:
                print("Matching model not found — falling back to baseline admit_rate_smoothed.")
        except Exception as e:
            print(f"Error loading matching model: {e}")

    def _load_caches(self):
        try:
            uni_path = os.path.join(self.data_dir, "uni_tier_cache.csv")
            if os.path.exists(uni_path):
                df = pd.read_csv(uni_path)
                self.uni_tier_dict = df.set_index('undergrad_uni')['undergrad_uni_tier'].to_dict()

            comp_path = os.path.join(self.data_dir, "company_tier_cache.csv")
            if os.path.exists(comp_path):
                df = pd.read_csv(comp_path)
                self.company_tier_dict = df.set_index('company_worked')['company_tier'].to_dict()
        except Exception as e:
            print(f"Error loading tier caches: {e}")

    # ------------------------------------------------------------------
    # Feature helpers — mirror Colab training pipeline exactly
    # ------------------------------------------------------------------

    def _unified_english(self, ielts: Optional[float], toefl: Optional[float]) -> float:
        """TOEFL preferred; IELTS scaled to 0-120; NaN if neither taken."""
        if toefl is not None and not np.isnan(toefl):
            return toefl
        if ielts is not None and not np.isnan(ielts):
            return ielts * (120 / 9)
        return np.nan  # LightGBM handles NaN natively — do not replace with 0

    def _gpa_mod(self, gpa: Optional[float], uni_name: Optional[str]) -> float:
        """Apply prestige modifier to a 4.0-scale GPA."""
        if gpa is None or np.isnan(gpa):
            return np.nan
        tier = self.uni_tier_dict.get(uni_name or '', 3)
        if tier == 1:
            return min(gpa + 0.2, 4.0)
        elif tier == 3:
            return max(gpa - 0.1, 0.0)
        return gpa

    # ------------------------------------------------------------------
    # Profile feature extraction  (server-side bridge)
    # ------------------------------------------------------------------

    async def compute_profile_features(
        self, db: AsyncSession, user: User
    ) -> ProfileFeaturesResponse:
        """Read the user's profile + work experiences from the DB and
        return pre-computed feature values ready to plug into MatchRequest."""
        from datetime import date

        result = await db.execute(
            select(UserProfile)
            .options(selectinload(UserProfile.work_experiences))
            .where(UserProfile.user_id == user.id)
        )
        profile = result.scalars().first()

        if profile is None:
            return ProfileFeaturesResponse()

        # --- GPA normalisation ---
        gpa_4 = None
        if profile.gpa is not None:
            if profile.gpa_scale == "10.0":
                gpa_4 = round(profile.gpa / 2.5, 3)      # linear 10→4 scale
            else:
                gpa_4 = profile.gpa                       # already 4.0
            gpa_4 = max(0.0, min(4.0, gpa_4))             # clamp

        # --- Work experience ---
        total_months = 0.0
        is_prestigious = False
        today = date.today()

        for exp in (profile.work_experiences or []):
            try:
                start = exp.start_date
                end = exp.end_date if (not exp.is_current and exp.end_date) else today
                months = (end.year - start.year) * 12 + (end.month - start.month)
                total_months += max(0, months)
            except Exception:
                pass

            # Check company prestige tier (tier 1 = prestigious)
            company_key = (exp.company_name or "").strip()
            tier = self.company_tier_dict.get(company_key)
            if tier == 1:
                is_prestigious = True

        return ProfileFeaturesResponse(
            undergrad_gpa_mod=gpa_4,
            undergrad_college=profile.undergraduate_college,
            work_exp_months=total_months if total_months > 0 else None,
            has_prestigious_experience=is_prestigious,
            gre_total=float(profile.gre_score) if profile.gre_score is not None else None,
            quant=None,          # not stored separately in the profile
            verbal=None,
            awa=None,
            total_ielts_score=float(profile.ielts_score) if profile.ielts_score is not None else None,
            total_toefl_score=float(profile.toefl_score) if profile.toefl_score is not None else None,
            suggested_degree=profile.target_degree,
            suggested_course_keywords=profile.target_field,
        )

    # ------------------------------------------------------------------
    # Lightweight ML-only scorer (used by Agent 3 rerun_fn)
    # ------------------------------------------------------------------

    async def _run_ml_only(
        self, db: AsyncSession, user: User, request: MatchRequest
    ) -> list:
        """
        Run DB query + ML scoring only. No agent pipeline, no DB writes.
        Returns a list of flat dicts consumed by the fallback coach node.
        """
        query = select(Program).options(selectinload(Program.stats))
        if request.target_degree:
            query = query.where(Program.degree_norm == request.target_degree)
        if request.target_course_keywords:
            keyword = f"%{request.target_course_keywords.lower()}%"
            query = query.where(Program.course_norm.ilike(keyword))

        result  = await db.execute(query)
        programs = result.scalars().all()
        if not programs:
            return []

        unified_english = self._unified_english(request.total_ielts_score, request.total_toefl_score)
        gpa_mod         = self._gpa_mod(request.undergrad_gpa_mod, request.undergrad_college)

        user_stats = {
            'undergrad_gpa_mod':          gpa_mod,
            'work_experience_months':     request.work_exp_months if request.work_exp_months is not None else 0.0,
            'has_prestigious_experience': int(request.has_prestigious_experience),
            'gre_total_clean':            request.gre_total if request.gre_total is not None else np.nan,
            'has_gre':                    1 if request.gre_total is not None else 0,
            'unified_english_score':      unified_english,
            'has_english_test':           0 if np.isnan(unified_english) else 1,
            f"degree_bucket_{request.target_degree}": 1,
        }

        rows = []
        for p in programs:
            row = user_stats.copy()
            row['admit_rate_smoothed'] = p.stats.admit_rate_smoothed if p.stats else 0.3
            row['program_id'] = p.program_id
            rows.append(row)

        df = pd.DataFrame(rows)
        if self.model and self.feature_cols:
            df_aligned    = df.reindex(columns=self.feature_cols, fill_value=0)
            probabilities = self.model.predict_proba(df_aligned.to_numpy())[:, 1]
        else:
            probabilities = np.array([r['admit_rate_smoothed'] for r in rows])

        df['probability'] = probabilities

        if request.max_total_cost is not None:
            cost_map = {p.program_id: (p.tuition_fee_usd or 0.0) + (p.living_expense or 0.0) for p in programs}
            df = df[df['program_id'].map(cost_map) <= request.max_total_cost]

        df_sorted = df.sort_values('probability', ascending=False).head(request.top_k)
        probs     = df_sorted['probability'].values
        p30, p70  = (np.percentile(probs, 30), np.percentile(probs, 70)) if len(probs) >= 3 else (0.40, 0.70)

        prog_map = {p.program_id: p for p in programs}
        out = []
        for _, row in df_sorted.iterrows():
            prob = row['probability']
            pid  = row['program_id']
            cat  = "Safe" if prob >= p70 else ("Target" if prob >= p30 else "Reach")
            p    = prog_map.get(pid)
            out.append({
                "program_id":       pid,
                "uni_name":         p.uni_name if p else "",
                "degree_norm":      p.degree_norm if p else request.target_degree,
                "course_name":      p.course_name if p else "",
                "probability_score": float(prob),
                "match_category":   cat,
            })
        return out

    # ------------------------------------------------------------------
    # Main matching logic
    # ------------------------------------------------------------------

    async def generate_matches(
        self, db: AsyncSession, user: User, request: MatchRequest
    ):

        # 1. Fetch candidate programs (degree + course keyword filter)
        query = select(Program).options(selectinload(Program.stats))
        if request.target_degree:
            query = query.where(Program.degree_norm == request.target_degree)
        if request.target_course_keywords:
            keyword = f"%{request.target_course_keywords.lower()}%"
            query = query.where(Program.course_norm.ilike(keyword))

        result = await db.execute(query)
        programs = result.scalars().all()

        if not programs:
            raise ValueError("No programs found matching the criteria.")

        # 2. Compute user feature vector (mirrors training feature engineering)
        unified_english = self._unified_english(request.total_ielts_score, request.total_toefl_score)
        gpa_mod = self._gpa_mod(request.undergrad_gpa_mod, request.undergrad_college)

        user_stats = {
            'undergrad_gpa_mod':          gpa_mod,
            'work_experience_months':     request.work_exp_months if request.work_exp_months is not None else 0.0,
            'has_prestigious_experience': int(request.has_prestigious_experience),
            'gre_total_clean':            request.gre_total if request.gre_total is not None else np.nan,
            'has_gre':                    1 if request.gre_total is not None else 0,
            'unified_english_score':      unified_english,
            'has_english_test':           0 if np.isnan(unified_english) else 1,
            f"degree_bucket_{request.target_degree}": 1,
        }

        # 3. Build one row per candidate program
        rows = []
        for p in programs:
            row = user_stats.copy()
            row['admit_rate_smoothed'] = p.stats.admit_rate_smoothed if p.stats else 0.3
            row['program_id'] = p.program_id
            rows.append(row)

        df = pd.DataFrame(rows)

        # 4. Predict probabilities
        if self.model and self.feature_cols:
            # reindex: fills missing degree_bucket_* columns with 0
            # NaN values (GRE, English) pass through — LightGBM routes them natively
            df_aligned = df.reindex(columns=self.feature_cols, fill_value=0)
            probabilities = self.model.predict_proba(df_aligned.to_numpy())[:, 1]
        else:
            # Baseline: use historical admit rate directly
            probabilities = np.array([r['admit_rate_smoothed'] for r in rows])

        df['probability'] = probabilities

        # 5. Cost filter (post-model so ML gets full candidate set)
        if request.max_total_cost is not None:
            program_cost = {
                p.program_id: (p.tuition_fee_usd or 0.0) + (p.living_expense or 0.0)
                for p in programs
            }
            df = df[df['program_id'].map(program_cost) <= request.max_total_cost]

        # 6. Sort and take top K
        df_sorted = df.sort_values('probability', ascending=False).head(request.top_k)

        # 7. Quantile-based Reach/Target/Safe thresholds
        # Relative to the *current result set* so the spread is always meaningful,
        # regardless of the absolute probability values from the model.
        probs = df_sorted['probability'].values
        if len(probs) >= 3:
            p30 = np.percentile(probs, 30)
            p70 = np.percentile(probs, 70)
        else:
            p30, p70 = 0.40, 0.70  # fallback for very small result sets

        def categorize(prob: float) -> str:
            if prob >= p70: return "Safe"
            if prob >= p30: return "Target"
            return "Reach"

        # 8. Persist MatchRun + MatchResults
        match_run = MatchRun(
            user_id=user.id,
            undergrad_gpa_mod=gpa_mod,
            work_exp_months=request.work_exp_months,
            has_prestigious_experience=int(request.has_prestigious_experience),
            gre_total=request.gre_total,
            quant=request.quant,
            verbal=request.verbal,
            awa=request.awa,
            total_ielts_score=request.total_ielts_score,
            total_toefl_score=request.total_toefl_score,
            target_degree=request.target_degree,
            target_course_keywords=request.target_course_keywords,
            max_total_cost=request.max_total_cost,
        )
        db.add(match_run)
        await db.flush()

        program_map = {p.program_id: p for p in programs}
        response_items = []
        for rank_pos, (_, row) in enumerate(df_sorted.iterrows(), start=1):
            prob = row['probability']
            pid = row['program_id']
            cat = categorize(prob)

            db.add(MatchResult(
                run_id=match_run.id,
                program_id=pid,
                probability_score=prob,
                match_category=cat,
                rank_position=rank_pos,
            ))
            response_items.append(MatchResultResponse(
                program=program_map[pid],
                probability_score=prob,
                match_category=cat,
                rank_position=rank_pos,
            ))

        await db.commit()

        # 9. Run agent pipeline over the ML results
        #    Build the flat dicts the pipeline expects
        ml_result_dicts = [
            {
                "program_id":       item.program.program_id,
                "uni_name":         item.program.uni_name,
                "degree_norm":      item.program.degree_norm or request.target_degree,
                "course_name":      item.program.course_name or "",
                "probability_score": item.probability_score,
                "match_category":   item.match_category,
            }
            for item in response_items
        ]

        profile_snapshot = {
            "undergrad_gpa_mod":          gpa_mod,
            "undergrad_college":          request.undergrad_college,
            "work_exp_months":            request.work_exp_months,
            "has_prestigious_experience": request.has_prestigious_experience,
            "gre_total":                  request.gre_total,
            "total_ielts_score":          request.total_ielts_score,
            "total_toefl_score":          request.total_toefl_score,
        }

        request_filters = {
            "target_degree":         request.target_degree,
            "target_course_keywords": request.target_course_keywords,
            "max_total_cost":         request.max_total_cost,
            "top_k":                  request.top_k,
        }

        pipeline_output = {
            "verdicts":             [],
            "shortlist":            [],
            "profile_gaps":         [],
            "fallback_triggered":   False,
            "fallback_suggestions": [],
            "fallback_results":     [],
            "irrelevant_count":     0,
        }

        try:
            from app.agents.matching_pipeline_agent import run_matching_pipeline

            # Build a lightweight re-run callable for Agent 3 Stage 2.
            # It re-uses the same DB session + user so the re-run is authorised.
            async def _rerun_ml(relaxed_filters: dict) -> list:
                """Re-run the ML scorer with relaxed keyword filters."""
                relaxed_req = MatchRequest(
                    **{
                        **request.model_dump(),  # keep all profile fields
                        "target_course_keywords": relaxed_filters.get(
                            "target_course_keywords", request.target_course_keywords
                        ),
                    }
                )
                # Run only the DB + ML scoring step (no pipeline, no DB commit)
                return await self._run_ml_only(db, user, relaxed_req)

            pipeline_output = await run_matching_pipeline(
                ml_results=ml_result_dicts,
                profile_snapshot=profile_snapshot,
                request_filters=request_filters,
                rerun_fn=_rerun_ml,
            )
        except Exception as agent_err:
            print(f"[MatchingPipeline] Agent pipeline error (non-fatal): {agent_err}")

        # Merge validator verdicts back onto response items by program_id
        verdict_map = {
            v["program_id"]: v for v in pipeline_output.get("verdicts", [])
        }
        enriched_items = []
        for item in response_items:
            v = verdict_map.get(item.program.program_id)
            enriched_items.append(MatchResultResponse(
                program=item.program,
                probability_score=item.probability_score,
                match_category=item.match_category,
                rank_position=item.rank_position,
                verdict=v["verdict"] if v else None,
                verdict_reason=v["reason"] if v else None,
            ))

        # Convert raw shortlist dicts → ShortlistItem Pydantic objects
        shortlist_items = [
            ShortlistItem(
                program_id=s.get("program_id", ""),
                uni_name=s.get("uni_name", ""),
                category=s.get("category", "Target"),
                justification=s.get("justification", ""),
            )
            for s in pipeline_output.get("shortlist", [])
        ]

        return match_run, enriched_items, shortlist_items, (
            pipeline_output.get("profile_gaps", []),
            pipeline_output.get("fallback_triggered", False),
            pipeline_output.get("fallback_suggestions", []),
            pipeline_output.get("fallback_results", []),
            pipeline_output.get("irrelevant_count", 0),
        )

# Singleton instance
matching_service_instance = MatchingService()
