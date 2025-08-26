from typing import Dict, Any, List, TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph.message import add_messages
from app.models.user import User
from app.models.profile import UserProfile, WorkExperience
from app.config import settings

# Define the state structure (same as your notebook)
class VisaInterviewState(TypedDict):
    messages: Annotated[List[HumanMessage | AIMessage], add_messages]
    transcript: List[dict]
    current_question: str
    summary: str
    outcome: str
    done: bool

class VisaInterviewService:
    def __init__(self):
        # Initialize the LLM
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=settings.GEMINI_API_KEY
        )
        self.graph = None
    
    def build_interview_graph(self, user_profile: UserProfile, work_experiences: List[WorkExperience]):
        """Build the interview graph with user's profile data"""
        
        def ask_question_node(state: VisaInterviewState):
            # Extract profile information
            college_info = self._build_college_info(user_profile)
            student_details = self._build_student_details(user_profile, work_experiences)
            
            # Include conversation history
            conversation_context = ""
            if state["transcript"]:
                conversation_context = "\n\nPrevious conversation:\n"
                for qa in state["transcript"]:
                    conversation_context += f"Officer: {qa['q']}\nStudent: {qa['a']}\n"
            
            prompt = (
                f"You are a US Visa Officer conducting an F1 visa interview.\n"
                f"The student is applying to {college_info}.\n"
                f"Student details: {student_details}\n\n"
                f"{conversation_context}\n\n"
                f"Based on the conversation so far, ask the next appropriate question to assess the student's visa eligibility.\n"
                f"Have variety in your questions – ask about the college, past academics or work experience, financial situation, and future goals.\n"
                f"Do not ask more than 5 questions total. Do NOT repeat questions already asked.\n"
                f"Ask only ONE question at a time."
            )
            
            if len(state["transcript"]) >= 5:
                state["done"] = True
                return state
                
            response = self.llm.invoke([HumanMessage(content=prompt)])
            question = response.content
            
            state["messages"].append(AIMessage(content=question))
            state["current_question"] = question
            return state
        
        def update_summary_node(state: VisaInterviewState):
            convo = "\n".join([f"Q: {p['q']}\nA: {p['a']}" for p in state["transcript"]])
            summary_prompt = f"Summarize the key info from this F1 visa interview:\n{convo}"
            summary = self.llm.invoke([HumanMessage(content=summary_prompt)]).content
            state["summary"] = summary
            return {"summary": summary}
        
        def check_done_node(state: VisaInterviewState):
            # Hard limit: stop after 5 questions
            if len(state["transcript"]) >= 5:
                state["done"] = True
                return {"done": True}
            
            # Minimum questions before allowing LLM to decide
            if len(state["transcript"]) < 3:
                state["done"] = False
                return {"done": False}
            
            # LLM decision for questions 3-4
            prompt = (
                "You are a US visa officer. Based on the current summary below, "
                "decide if you have enough information to make a decision:\n\n"
                f"{state['summary']}\n\n"
                f"Current question count: {len(state['transcript'])}/5\n"
                "Answer only with YES or NO."
            )
            
            try:
                verdict = self.llm.invoke([HumanMessage(content=prompt)]).content.strip().lower()
                is_done = verdict.startswith("yes")
            except Exception as e:
                print(f"Error in LLM call: {e}")
                is_done = False
            
            state["done"] = is_done
            return {"done": is_done}
        
        def final_feedback_node(state: VisaInterviewState):
            final_prompt = (
                "You are a US visa officer. Here is the full transcript summary:\n\n"
                f"{state['summary']}\n\n"
                "Based on this, decide if the visa should be APPROVED or REJECTED and explain why. "
                "If rejected, tell why and also give suggestions for improvement."
            )

            feedback = self.llm.invoke([HumanMessage(content=final_prompt)]).content
            state["outcome"] = feedback
            return state
        
        # Build the workflow
        workflow = StateGraph(VisaInterviewState)
        workflow.add_node("ask_question", ask_question_node)
        workflow.add_node("update_summary", update_summary_node)
        workflow.add_node("check_done", check_done_node)
        workflow.add_node("final_feedback", final_feedback_node)

        # Logic edges
        workflow.set_entry_point("ask_question")
        workflow.add_edge("ask_question", "update_summary")
        workflow.add_edge("update_summary", "check_done")

        # Conditional branching
        def decide_next(state):
            return "final_feedback" if state["done"] else "ask_question"

        workflow.add_conditional_edges("check_done", decide_next)
        workflow.add_edge("final_feedback", END)
        
        return workflow.compile()
    
    def _build_college_info(self, user_profile: UserProfile) -> str:
        """Build college information string from user profile"""
        degree = user_profile.target_degree or "Graduate degree"
        field = user_profile.target_field or "their chosen field"
        countries = user_profile.preferred_countries or ["USA"]
        
        if isinstance(countries, list) and len(countries) > 0:
            country = countries[0]  # Use first preferred country
        else:
            country = "USA"
        
        return f"{degree} in {field} in {country}"
    
    def _build_student_details(self, user_profile: UserProfile, work_experiences: List[WorkExperience]) -> str:
        """Build student details string from user profile"""
        details = []
        
        # Academic background
        if user_profile.undergraduate_college:
            details.append(f"Undergrad University: {user_profile.undergraduate_college}")
        
        if user_profile.major:
            details.append(f"Undergrad Major: {user_profile.major}")
            
        if user_profile.gpa and user_profile.gpa_scale:
            if user_profile.gpa_scale == "4.0":
                details.append(f"Undergrad GPA: {user_profile.gpa}/4.0")
            else:
                details.append(f"Undergrad GPA: {user_profile.gpa}/10.0")
        
        if user_profile.graduation_year:
            details.append(f"Graduation Year: {user_profile.graduation_year}")
        
        # Test scores
        if user_profile.gre_score:
            details.append(f"GRE Score: {user_profile.gre_score}")
        
        if user_profile.toefl_score:
            details.append(f"TOEFL Score: {user_profile.toefl_score}")
            
        if user_profile.ielts_score:
            details.append(f"IELTS Score: {user_profile.ielts_score}")
        
        # Work experience
        if work_experiences:
            for i, exp in enumerate(work_experiences):
                years = "Current" if exp.is_current else f"{exp.start_date} to {exp.end_date}"
                details.append(f"Work Experience {i+1}: {exp.role} at {exp.company_name} ({years})")
        
        return ". ".join(details) if details else "Limited profile information available"
    
    async def start_interview(self, user_profile: UserProfile, work_experiences: List[WorkExperience]) -> Dict[str, Any]:
        """Initialize a new interview session"""
        self.graph = self.build_interview_graph(user_profile, work_experiences)
        
        initial_state = {
            "messages": [],
            "transcript": [],
            "current_question": "",
            "summary": "",
            "outcome": "",
            "done": False,
        }
        
        # Generate first question
        result = self.graph.invoke(initial_state)
        
        return {
            "question": result["current_question"],
            "state": result,
            "done": result["done"]
        }
    
    async def process_response(self, user_response: str, current_state: Dict[str, Any]) -> Dict[str, Any]:
        """Process user response and generate next question or final decision"""
        # Add user response to state
        current_state["messages"].append(HumanMessage(content=user_response))
        current_state["transcript"].append({
            "q": current_state["current_question"], 
            "a": user_response
        })
        
        # Continue the graph execution
        result = self.graph.invoke(current_state)
        
        if result["done"]:
            return {
                "type": "final_decision",
                "content": result["outcome"],
                "state": result,
                "done": True
            }
        else:
            return {
                "type": "question", 
                "content": result["current_question"],
                "state": result,
                "done": False
            }