"""
University Matching Pipeline Agent — LangGraph StateGraph

Four nodes, all using Gemini 2.5 Flash:

  0. relevance_filter   — drops garbage / off-topic ML results before expensive searches
  1. program_validator  — validates relevant results against live web requirements
  2. shortlist_advisor  — strategic apply list + profile gap callouts
  3. fallback_coach     — 3-stage: diagnose → relaxed ML re-run → knowledge-based recs

Flow:
    START
        → relevance_filter
        → program_validator
        → shortlist_advisor
        → [fallback_coach if needed]
        → END
"""
import asyncio
import json
import re
from typing import Any, Callable, Dict, List, Optional, TypedDict

from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

from app.config import settings
from app.agents.tools.program_search_tool import search_program_requirements


# --------------------------------------------------------------------------- #
# State                                                                         #
# --------------------------------------------------------------------------- #

class MatchingPipelineState(TypedDict):
    # Inputs
    request_filters: Dict[str, Any]
    profile_snapshot: Dict[str, Any]
    ml_results: List[Dict[str, Any]]
    top_k: int
    rerun_fn: Optional[Any]             # async callable(relaxed_filters) → list[dict]

    # Node 0 output
    relevant_ml_results: List[Dict[str, Any]]   # filtered subset
    irrelevant_count: int                        # how many were dropped

    # Node 1 output
    verdicts: List[Dict[str, Any]]

    # Node 2 output
    shortlist: List[Dict[str, Any]]
    profile_gaps: List[str]

    # Node 3 output
    fallback_triggered: bool
    fallback_suggestions: List[str]
    fallback_results: List[Dict[str, Any]]       # re-run or knowledge-based


# --------------------------------------------------------------------------- #
# LLM helpers                                                                   #
# --------------------------------------------------------------------------- #

def _get_llm(temperature: float = 0.2) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=temperature,
    )


def _extract_json_block(text: str) -> Any:
    """Pull the first JSON array or object out of an LLM response."""
    m = re.search(r"```(?:json)?\s*([\[{].*?)\s*```", text, re.DOTALL)
    if m:
        return json.loads(m.group(1))
    m = re.search(r"(\[.*\]|\{.*\})", text, re.DOTALL)
    if m:
        return json.loads(m.group(1))
    raise ValueError(f"No JSON block found in: {text[:400]}")


def _build_profile_str(profile: Dict) -> str:
    gpa   = profile.get("undergrad_gpa_mod")
    gre   = profile.get("gre_total")
    toefl = profile.get("total_toefl_score")
    ielts = profile.get("total_ielts_score")
    work  = profile.get("work_exp_months")
    parts = [
        f"GPA {gpa:.2f}/4.0"      if gpa   else "GPA unknown",
        f"GRE {int(gre)}"         if gre   else "no GRE",
        f"TOEFL {int(toefl)}"     if toefl else (f"IELTS {ielts}" if ielts else "no English test"),
        f"{int(work)} months work" if work  else "no work experience",
    ]
    return ", ".join(parts)


# --------------------------------------------------------------------------- #
# Node 0 — Relevance Filter                                                     #
# --------------------------------------------------------------------------- #

async def relevance_filter_node(state: MatchingPipelineState) -> Dict:
    """
    Filter out garbage / totally off-topic programs before Agent 1 burns API
    calls on them.

    Strategy (two-layer):
      Layer A — fast keyword check: if the course_name has zero overlap with the
                search keywords, mark it suspect immediately (no LLM needed).
      Layer B — for ambiguous cases, Gemini decides in a single batched call.

    A program is kept unless it is clearly irrelevant.
    """
    ml_results  = state["ml_results"]
    filters     = state["request_filters"]
    target_kw   = (filters.get("target_course_keywords") or "").lower().strip()
    target_deg  = (filters.get("target_degree") or "").upper()

    if not ml_results:
        return {"relevant_ml_results": [], "irrelevant_count": 0}

    # --- Layer A: fast keyword pre-filter ---
    # If user typed no keywords, skip this layer entirely (keep everything).
    if target_kw:
        kw_tokens = set(target_kw.replace(",", " ").split())

        def _has_keyword_overlap(prog: Dict) -> bool:
            course = (prog.get("course_name") or "").lower()
            degree = (prog.get("degree_norm") or "").upper()
            # Accept different degree types that are still graduate-level
            if degree and target_deg and degree not in {"MS", "MENG", "MBA", "PHD", "MA", "MRES"}:
                # Only flag degree mismatch if it's something obviously wrong (e.g. BSc, Diploma)
                if degree not in target_deg and target_deg not in degree:
                    return False
            # Keyword overlap: at least 1 token must appear in course name
            # OR course name is very generic (e.g. "Engineering", "Science") — keep it
            generic_terms = {"engineering", "science", "technology", "studies", "management", "analytics"}
            course_tokens = set(course.replace("-", " ").split())
            if course_tokens & generic_terms:
                return True     # generic bucket — benefit of the doubt
            return bool(kw_tokens & course_tokens)

        candidate_results = [p for p in ml_results if _has_keyword_overlap(p)]
        obviously_irrelevant = [p for p in ml_results if not _has_keyword_overlap(p)]
    else:
        candidate_results    = ml_results
        obviously_irrelevant = []

    # --- Layer B: Gemini check for borderline/ambiguous candidates ---
    # Only invoked when we have ≥1 candidate but some are ambiguous.
    # We batch all candidates in one prompt to keep latency low.
    if candidate_results:
        programs_summary = "\n".join([
            f"{i+1}. [{p.get('degree_norm','?')}] {p.get('course_name','?')} @ {p.get('uni_name','?')}"
            for i, p in enumerate(candidate_results)
        ])
        llm = _get_llm(temperature=0.0)
        prompt = (
            f"You are filtering graduate program search results for relevance.\n\n"
            f"The student searched for: '{target_deg} in {target_kw or 'any field'}'\n\n"
            f"Here are the programs returned by the ML model:\n"
            f"{programs_summary}\n\n"
            f"For each program, decide: is it RELEVANT (matches or is closely related to the search) "
            f"or IRRELEVANT (clearly wrong field, unrelated subject, obvious data error)?\n\n"
            f"Only mark as IRRELEVANT if you are very confident it is wrong. "
            f"If unsure, mark as RELEVANT (benefit of the doubt).\n\n"
            f"Reply ONLY as a JSON array of numbers (1-indexed) of IRRELEVANT programs. "
            f"If all are relevant, return an empty array [].\n"
            f"Example: [2, 5] means programs 2 and 5 are irrelevant."
        )
        try:
            resp = llm.invoke([HumanMessage(content=prompt)])
            irrelevant_indices = _extract_json_block(resp.content)
            if isinstance(irrelevant_indices, list):
                # Convert 1-indexed → 0-indexed
                drop_set = {i - 1 for i in irrelevant_indices if isinstance(i, int)}
                filtered  = [p for i, p in enumerate(candidate_results) if i not in drop_set]
                dropped   = [p for i, p in enumerate(candidate_results) if i in drop_set]
                obviously_irrelevant.extend(dropped)
                candidate_results = filtered
        except Exception:
            pass  # On any error keep all candidates

    total_dropped = len(obviously_irrelevant)
    print(f"[RelevanceFilter] Kept {len(candidate_results)}/{len(ml_results)}, dropped {total_dropped}")

    return {
        "relevant_ml_results": candidate_results,
        "irrelevant_count":    total_dropped,
    }


# --------------------------------------------------------------------------- #
# Node 1 — Program Validator                                                    #
# --------------------------------------------------------------------------- #

async def program_validator_node(state: MatchingPipelineState) -> Dict:
    """
    For each relevant ML result, search for live admission requirements and
    compare against the student's profile.
    Emit Qualified / Borderline / Unlikely + 1 line reason.
    Checks up to top-8, rate-limited to 4 concurrent DDGS requests.
    """
    programs_to_check = state.get("relevant_ml_results") or state["ml_results"]
    programs_to_check = programs_to_check[:8]
    profile = state["profile_snapshot"]
    profile_summary = _build_profile_str(profile)

    SEMAPHORE = asyncio.Semaphore(4)

    async def validate_one(prog: Dict) -> Dict:
        async with SEMAPHORE:
            uni    = prog.get("uni_name", "Unknown University")
            degree = prog.get("degree_norm", "MS")
            course = prog.get("course_name", "")

            loop = asyncio.get_event_loop()
            search_results = await loop.run_in_executor(
                None,
                lambda: search_program_requirements.invoke({
                    "uni_name": uni, "degree": degree, "course": course
                })
            )

            llm = _get_llm()
            prompt = (
                f"You are an expert graduate admissions advisor.\n\n"
                f"Student profile: {profile_summary}\n\n"
                f"Program: {degree} in {course} at {uni}\n\n"
                f"Web search results about admission requirements:\n{search_results[:2000]}\n\n"
                f"Verdicts:\n"
                f"- 'Qualified'  — student clearly meets or exceeds requirements\n"
                f"- 'Borderline' — student is on the edge (GPA slightly low, missing GRE, etc.)\n"
                f"- 'Unlikely'   — student is clearly below requirements\n"
                f"- If requirements are unclear from search → 'Qualified' (benefit of the doubt)\n\n"
                f"Reply in this exact JSON format only:\n"
                f'{{"verdict": "Qualified|Borderline|Unlikely", "reason": "1-sentence reason"}}'
            )
            try:
                response = llm.invoke([HumanMessage(content=prompt)])
                parsed = _extract_json_block(response.content)
                return {
                    "program_id":  prog.get("program_id"),
                    "uni_name":    uni,
                    "degree_norm": degree,
                    "course_name": course,
                    "verdict":     parsed.get("verdict", "Qualified"),
                    "reason":      parsed.get("reason", ""),
                }
            except Exception as e:
                return {
                    "program_id":  prog.get("program_id"),
                    "uni_name":    uni,
                    "degree_norm": degree,
                    "course_name": course,
                    "verdict":     "Qualified",
                    "reason":      f"Could not verify: {str(e)[:80]}",
                }

    verdicts = await asyncio.gather(*[validate_one(p) for p in programs_to_check])
    return {"verdicts": list(verdicts)}


# --------------------------------------------------------------------------- #
# Node 2 — Shortlist Advisor                                                    #
# --------------------------------------------------------------------------- #

async def shortlist_advisor_node(state: MatchingPipelineState) -> Dict:
    """
    Synthesises validator-annotated results into a strategic apply list + gaps.
    Pure reasoning — no external calls.
    """
    verdicts    = state["verdicts"]
    ml_results  = state.get("relevant_ml_results") or state["ml_results"]
    profile     = state["profile_snapshot"]
    filters     = state["request_filters"]
    ml_lookup   = {r["program_id"]: r for r in ml_results}

    enriched = [
        {
            "uni_name":      v["uni_name"],
            "degree":        v["degree_norm"],
            "course":        v["course_name"],
            "admit_prob":    round(ml_lookup.get(v.get("program_id"), {}).get("probability_score", 0) * 100, 1),
            "category":      ml_lookup.get(v.get("program_id"), {}).get("match_category", "Target"),
            "verdict":       v["verdict"],
            "verdict_reason": v["reason"],
        }
        for v in verdicts
    ]

    profile_str = _build_profile_str(profile)
    budget = filters.get("max_total_cost")
    if budget:
        profile_str += f", max budget ${budget:,}"

    llm = _get_llm()
    prompt = (
        f"You are an expert graduate admissions counselor.\n\n"
        f"Student: {profile_str}\n"
        f"Target: {filters.get('target_degree','MS')} in '{filters.get('target_course_keywords','their field')}'\n\n"
        f"ML-ranked programs with admission verdicts:\n{json.dumps(enriched, indent=2)}\n\n"
        f"Tasks:\n"
        f"1. Select 6-10 programs for a healthy Reach/Target/Safe balance. "
        f"Prefer 'Qualified'/'Borderline'. Include 'Unlikely' only if top-ranked and worth a stretch.\n"
        f"2. 1-2 sentence personalised justification per program.\n"
        f"3. Up to 5 profile gap callouts (e.g. 'Taking TOEFL unlocks 15+ more programs').\n\n"
        f"Return ONLY valid JSON:\n"
        f'{{"shortlist": [{{"program_id": "...", "uni_name": "...", "category": "Reach|Target|Safe", "justification": "..."}}], "profile_gaps": ["..."]}}'
    )

    try:
        resp   = llm.invoke([HumanMessage(content=prompt)])
        parsed = _extract_json_block(resp.content)
        sl     = parsed.get("shortlist", [])
        gaps   = parsed.get("profile_gaps", [])
        if not sl:
            sl = [
                {
                    "program_id":    v.get("program_id", ""),
                    "uni_name":      v["uni_name"],
                    "category":      ml_lookup.get(v.get("program_id"), {}).get("match_category", "Target"),
                    "justification": v["reason"],
                }
                for v in verdicts[:10]
            ]
        return {"shortlist": sl, "profile_gaps": gaps}
    except Exception as e:
        return {
            "shortlist": [
                {
                    "program_id":    v.get("program_id", ""),
                    "uni_name":      v["uni_name"],
                    "category":      ml_lookup.get(v.get("program_id"), {}).get("match_category", "Target"),
                    "justification": v.get("reason", ""),
                }
                for v in verdicts
            ],
            "profile_gaps": [f"Advisor error: {str(e)[:80]}"],
        }


# --------------------------------------------------------------------------- #
# Node 3 — Fallback Coach (3-stage)                                             #
# --------------------------------------------------------------------------- #

async def fallback_coach_node(state: MatchingPipelineState) -> Dict:
    """
    Three-stage fallback when the ML results are thin or all-Reach:

    Stage 1 — Diagnose & suggest relaxed parameters.
    Stage 2 — Re-run the ML model with relaxed params (if rerun_fn available).
              If re-run still bad → proceed to Stage 3.
    Stage 3 — Knowledge-based recommendations grounded in the student's
              actual profile. Gemini only names programs with high confidence
              and explicitly flags that these are from its training knowledge.
              Anti-hallucination guardrails are baked into the prompt.
    """
    filters     = state["request_filters"]
    profile     = state["profile_snapshot"]
    ml_results  = state.get("relevant_ml_results") or state["ml_results"]
    rerun_fn    = state.get("rerun_fn")

    total      = len(ml_results)
    all_reach  = total > 0 and all(r.get("match_category") == "Reach" for r in ml_results)
    situation  = (
        f"Only {total} programs returned."     if total < 3
        else "All programs are Reach (highly selective)."
    )

    profile_str   = _build_profile_str(profile)
    degree        = filters.get("target_degree", "MS")
    field         = filters.get("target_course_keywords", "")

    llm = _get_llm(temperature=0.1)

    # ------------------------------------------------------------------ #
    # Stage 1 — Diagnose + suggest relaxed params                         #
    # ------------------------------------------------------------------ #
    diagnosis_prompt = (
        f"You are an expert graduate admissions coach.\n\n"
        f"Situation: {situation}\n"
        f"Student search: {degree} in '{field or 'unspecified field'}'\n"
        f"Student profile: {profile_str}\n\n"
        f"Diagnose why results are limited, then give 4-6 concrete suggestions including:\n"
        f"- Alternative, broader course keywords\n"
        f"- Alternative degree types\n"
        f"- Specific profile improvements\n\n"
        f"Also provide 'relaxed_keywords': a single, broader keyword string to retry the search.\n\n"
        f"Return ONLY valid JSON:\n"
        f'{{"diagnosis": "...", "suggestions": ["..."], "relaxed_keywords": "..."}}'
    )
    suggestions      = []
    relaxed_keywords = field   # default: same keyword if Gemini fails

    try:
        resp   = llm.invoke([HumanMessage(content=diagnosis_prompt)])
        parsed = _extract_json_block(resp.content)
        diagnosis        = parsed.get("diagnosis", "")
        suggestions      = parsed.get("suggestions", [])
        relaxed_keywords = parsed.get("relaxed_keywords", field) or field
        if diagnosis:
            suggestions = [diagnosis] + suggestions
    except Exception:
        suggestions = [
            "Try broader keywords (e.g. 'data science' instead of a very specific subfield).",
            "Consider taking a TOEFL/IELTS to qualify for more programs.",
        ]

    # ------------------------------------------------------------------ #
    # Stage 2 — ML re-run with relaxed params (if service injected fn)    #
    # ------------------------------------------------------------------ #
    rerun_results    = []
    rerun_successful = False

    if rerun_fn and relaxed_keywords and relaxed_keywords.strip().lower() != field.strip().lower():
        try:
            relaxed_filters = {
                **filters,
                "target_course_keywords": relaxed_keywords,
                "top_k": filters.get("top_k", 20),
            }
            rerun_results = await rerun_fn(relaxed_filters)
            # Assess re-run quality: ≥3 results with at least 1 non-Reach
            non_reach = [r for r in rerun_results if r.get("match_category") != "Reach"]
            rerun_successful = len(rerun_results) >= 3 and len(non_reach) >= 1
            print(f"[FallbackCoach] Stage 2 re-run: {len(rerun_results)} results, "
                  f"{len(non_reach)} non-Reach → {'OK' if rerun_successful else 'still bad'}")
        except Exception as e:
            print(f"[FallbackCoach] Stage 2 re-run error: {e}")

    # ------------------------------------------------------------------ #
    # Stage 3 — Knowledge-based recommendations (anti-hallucination)       #
    # ------------------------------------------------------------------ #
    knowledge_recs = []

    if not rerun_successful:
        # Determine confidence tier from profile
        gpa  = profile.get("undergrad_gpa_mod") or 0.0
        gre  = profile.get("gre_total")
        has_english = bool(
            profile.get("total_toefl_score") or profile.get("total_ielts_score")
        )

        if gpa >= 3.5 and gre and gre >= 320:
            confidence_tier = "strong"
        elif gpa >= 3.0:
            confidence_tier = "average"
        else:
            confidence_tier = "below-average"

        knowledge_prompt = (
            f"You are a graduate admissions expert. A student needs program recommendations "
            f"because the database search returned poor results.\n\n"
            f"Student profile: {profile_str}\n"
            f"Target: {degree} in {field or 'any related field'}\n"
            f"Profile strength tier: {confidence_tier}\n\n"
            f"STRICT ANTI-HALLUCINATION RULES:\n"
            f"1. Only name programs you are VERY confident actually exist and accept graduate applications.\n"
            f"2. Only recommend programs whose typical admission profile roughly matches this student.\n"
            f"3. If you are not confident about a specific program, skip it entirely — do NOT guess.\n"
            f"4. Each recommendation MUST include a confidence note: "
            f"'[Based on general knowledge — verify directly with the university]'.\n"
            f"5. Do NOT invent admission statistics, deadlines, or fees.\n\n"
            f"Recommend 6-10 real programs that would be a genuine fit. Include a healthy "
            f"Reach/Target/Safe mix appropriate for a {confidence_tier} applicant.\n\n"
            f"Return ONLY valid JSON:\n"
            f'{{"knowledge_recommendations": [{{'
            f'"uni_name": "...", "degree": "{degree}", "field": "...", '
            f'"category": "Reach|Target|Safe", "justification": "... [Based on general knowledge — verify directly with the university]"'
            f'}}]}}'
        )

        try:
            resp   = _get_llm(temperature=0.1).invoke([HumanMessage(content=knowledge_prompt)])
            parsed = _extract_json_block(resp.content)
            recs   = parsed.get("knowledge_recommendations", [])

            # Validate recs minimally — must have uni_name, justification
            knowledge_recs = [
                r for r in recs
                if r.get("uni_name") and r.get("justification")
            ]
            print(f"[FallbackCoach] Stage 3: {len(knowledge_recs)} knowledge-based recs")
        except Exception as e:
            print(f"[FallbackCoach] Stage 3 error: {e}")
            knowledge_recs = []

    # Decide what to return as fallback_results
    if rerun_successful:
        final_fallback_results = rerun_results
    else:
        # Convert knowledge recs to the same shape as ML results for the frontend
        final_fallback_results = [
            {
                "program_id":       f"kb_{i}",
                "uni_name":         r.get("uni_name", ""),
                "degree_norm":      r.get("degree", degree),
                "course_name":      r.get("field", field),
                "probability_score": None,             # no ML score — it's a knowledge rec
                "match_category":   r.get("category", "Target"),
                "justification":    r.get("justification", ""),
                "source":           "knowledge",       # flag for frontend
            }
            for i, r in enumerate(knowledge_recs)
        ]

    return {
        "fallback_triggered":   True,
        "fallback_suggestions": suggestions,
        "fallback_results":     final_fallback_results,
    }


# --------------------------------------------------------------------------- #
# Conditional edge                                                               #
# --------------------------------------------------------------------------- #

def should_run_fallback(state: MatchingPipelineState) -> str:
    """Use relevant_ml_results (post-filter) to decide if fallback is needed."""
    results   = state.get("relevant_ml_results") or state.get("ml_results", [])
    too_few   = len(results) < 3
    all_reach = len(results) > 0 and all(
        r.get("match_category") == "Reach" for r in results
    )
    return "fallback_coach" if (too_few or all_reach) else END


# --------------------------------------------------------------------------- #
# Graph                                                                          #
# --------------------------------------------------------------------------- #

def build_matching_pipeline() -> Any:
    graph = StateGraph(MatchingPipelineState)

    graph.add_node("relevance_filter",   relevance_filter_node)
    graph.add_node("program_validator",  program_validator_node)
    graph.add_node("shortlist_advisor",  shortlist_advisor_node)
    graph.add_node("fallback_coach",     fallback_coach_node)

    graph.add_edge(START, "relevance_filter")
    graph.add_edge("relevance_filter",  "program_validator")
    graph.add_edge("program_validator", "shortlist_advisor")
    graph.add_conditional_edges(
        "shortlist_advisor",
        should_run_fallback,
        {"fallback_coach": "fallback_coach", END: END},
    )
    graph.add_edge("fallback_coach", END)

    return graph.compile()


matching_pipeline = build_matching_pipeline()


# --------------------------------------------------------------------------- #
# Entry point                                                                   #
# --------------------------------------------------------------------------- #

async def run_matching_pipeline(
    ml_results: List[Dict[str, Any]],
    profile_snapshot: Dict[str, Any],
    request_filters: Dict[str, Any],
    rerun_fn: Optional[Callable] = None,
) -> Dict[str, Any]:
    """
    Run the 4-node matching pipeline.

    Args:
        ml_results:       LightGBM ranked rows
        profile_snapshot: Flat user feature dict
        request_filters:  degree, keywords, max_cost, top_k
        rerun_fn:         Optional async callable(relaxed_filters) → list[dict].
                          If provided, Agent 3 will re-run the ML model with
                          relaxed keywords before falling to knowledge-based recs.

    Returns:
        Dict with verdicts, shortlist, profile_gaps,
              fallback_triggered, fallback_suggestions, fallback_results,
              irrelevant_count (number of garbage results filtered out)
    """
    initial: MatchingPipelineState = {
        "request_filters":    request_filters,
        "profile_snapshot":   profile_snapshot,
        "ml_results":         ml_results,
        "top_k":              request_filters.get("top_k", 20),
        "rerun_fn":           rerun_fn,
        "relevant_ml_results": [],
        "irrelevant_count":   0,
        "verdicts":           [],
        "shortlist":          [],
        "profile_gaps":       [],
        "fallback_triggered": False,
        "fallback_suggestions": [],
        "fallback_results":   [],
    }

    final = await matching_pipeline.ainvoke(initial)

    return {
        "verdicts":             final.get("verdicts", []),
        "shortlist":            final.get("shortlist", []),
        "profile_gaps":         final.get("profile_gaps", []),
        "fallback_triggered":   final.get("fallback_triggered", False),
        "fallback_suggestions": final.get("fallback_suggestions", []),
        "fallback_results":     final.get("fallback_results", []),
        "irrelevant_count":     final.get("irrelevant_count", 0),
    }
