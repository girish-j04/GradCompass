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
        self.user_profile = None
        self.work_experiences = None
    
    def _generate_question(self, state: VisaInterviewState) -> str:
        """Generate a single question based on current state"""
        # Extract profile information
        college_info = self._build_college_info(self.user_profile)
        student_details = self._build_student_details(self.user_profile, self.work_experiences)
        
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
            f"Have variety in your questions — ask about the college, past academics or work experience, financial situation, and future goals.\n"
            f"Do not ask more than 5 questions total. Do NOT repeat questions already asked.\n"
            f"Ask only ONE question at a time.\n"
            f"Question #{len(state['transcript']) + 1}:"
        )
        
        response = self.llm.invoke([HumanMessage(content=prompt)])
        return response.content.strip()
    
    def _should_continue_interview(self, state: VisaInterviewState) -> bool:
        """Determine if interview should continue"""
        # Hard limit: stop after 5 questions
        if len(state["transcript"]) >= 5:
            return False
        
        # Minimum questions before allowing LLM to decide
        if len(state["transcript"]) < 3:
            return True
        
        # LLM decision for questions 3-4
        summary = self._generate_summary(state)
        prompt = (
            "You are a US visa officer. Based on the current summary below, "
            "decide if you have enough information to make a decision:\n\n"
            f"{summary}\n\n"
            f"Current question count: {len(state['transcript'])}/5\n"
            "Answer only with YES or NO."
        )
        
        try:
            verdict = self.llm.invoke([HumanMessage(content=prompt)]).content.strip().lower()
            return not verdict.startswith("yes")  # Continue if answer is NO
        except Exception as e:
            print(f"Error in LLM call: {e}")
            return True  # Continue on error
    
    def _generate_summary(self, state: VisaInterviewState) -> str:
        """Generate summary of interview so far"""
        if not state["transcript"]:
            return "No conversation yet."
        
        convo = "\n".join([f"Q: {p['q']}\nA: {p['a']}" for p in state["transcript"]])
        summary_prompt = f"Summarize the key info from this F1 visa interview:\n{convo}"
        summary = self.llm.invoke([HumanMessage(content=summary_prompt)]).content
        return summary
    
    def _generate_final_decision(self, state: VisaInterviewState) -> str:
        """Generate final visa decision"""
        summary = self._generate_summary(state)
        final_prompt = (
            "You are a US visa officer. Here is the full transcript summary:\n\n"
            f"{summary}\n\n"
            "Based on this, decide if the visa should be APPROVED or REJECTED and explain why. "
            "If rejected, tell why and also give suggestions for improvement."
        )
        
        feedback = self.llm.invoke([HumanMessage(content=final_prompt)]).content
        return feedback
    
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
    
    def _serialize_message(self, message) -> dict:
        """Convert LangChain message to JSON-serializable dict"""
        if isinstance(message, AIMessage):
            return {"type": "ai", "content": message.content}
        elif isinstance(message, HumanMessage):
            return {"type": "human", "content": message.content}
        else:
            return {"type": "unknown", "content": str(message)}
    
    def _deserialize_message(self, message_dict: dict):
        """Convert dict back to LangChain message"""
        if message_dict["type"] == "ai":
            return AIMessage(content=message_dict["content"])
        elif message_dict["type"] == "human":
            return HumanMessage(content=message_dict["content"])
        else:
            return HumanMessage(content=message_dict["content"])  # fallback
    
    async def start_interview(self, user_profile: UserProfile, work_experiences: List[WorkExperience]) -> Dict[str, Any]:
        """Initialize a new interview session - just generate first question"""
        # Store profile data for later use
        self.user_profile = user_profile
        self.work_experiences = work_experiences
        
        initial_state = {
            "messages": [],
            "transcript": [],
            "current_question": "",
            "summary": "",
            "outcome": "",
            "done": False,
        }
        
        # Generate first question
        question = self._generate_question(initial_state)
        
        # Update state with first question (serialize for JSON storage)
        initial_state["current_question"] = question
        ai_message = AIMessage(content=question)
        initial_state["messages"].append(self._serialize_message(ai_message))
        
        return {
            "question": question,
            "state": initial_state,
            "done": False
        }
    
    async def process_response(self, user_response: str, current_state: Dict[str, Any]) -> Dict[str, Any]:
        """Process user response and generate next question or final decision"""
        # Add user response to transcript
        current_state["transcript"].append({
            "q": current_state["current_question"], 
            "a": user_response
        })
        
        # Add user message to messages (serialize for JSON storage)
        human_message = HumanMessage(content=user_response)
        current_state["messages"].append(self._serialize_message(human_message))
        
        # Check if interview should continue
        state_for_check = {
            "messages": [self._deserialize_message(msg) for msg in current_state["messages"]],
            "transcript": current_state["transcript"],
            "current_question": current_state["current_question"],
            "summary": current_state.get("summary", ""),
            "outcome": current_state.get("outcome", ""),
            "done": current_state.get("done", False)
        }
        
        should_continue = self._should_continue_interview(state_for_check)
        
        if not should_continue:
            # Generate final decision
            final_decision = self._generate_final_decision(state_for_check)
            current_state["outcome"] = final_decision
            current_state["done"] = True
            
            return {
                "question": final_decision,
                "state": current_state,
                "done": True,
                "is_complete": True
            }
        else:
            # Generate next question
            next_question = self._generate_question(state_for_check)
            current_state["current_question"] = next_question
            
            # Add AI message to state
            ai_message = AIMessage(content=next_question)
            current_state["messages"].append(self._serialize_message(ai_message))
            
            return {
                "question": next_question,
                "state": current_state,
                "done": False,
                "is_complete": False
            }