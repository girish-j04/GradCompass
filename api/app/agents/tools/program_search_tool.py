"""
DDGS-based program requirements search tool for the Program Validator agent.

Used as a LangChain tool so Gemini 2.5 Flash can call it via function calling.
"""
from langchain_core.tools import tool
from duckduckgo_search import DDGS


@tool
def search_program_requirements(uni_name: str, degree: str, course: str) -> str:
    """Search the web for admission requirements for a specific graduate program.

    Args:
        uni_name: University name, e.g. 'MIT'
        degree: Degree type, e.g. 'MS'
        course: Course/field name, e.g. 'Computer Science'

    Returns:
        A text summary of the top web results about admission requirements,
        including GPA cutoffs, GRE expectations, English score thresholds,
        and application deadlines where available.
    """
    query = (
        f"{uni_name} {degree} {course} admission requirements "
        f"GPA GRE TOEFL IELTS cutoff 2024 2025"
    )
    try:
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=4):
                title = r.get("title", "")
                body = r.get("body", "")
                href = r.get("href", "")
                results.append(f"[{title}] {body} (Source: {href})")

        if not results:
            return f"No specific admission requirements found for {uni_name} {degree} {course}."

        return "\n\n".join(results)
    except Exception as e:
        return f"Search failed for {uni_name} {degree} {course}: {str(e)}"
