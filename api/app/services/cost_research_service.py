import warnings
warnings.filterwarnings("ignore", category=RuntimeWarning, module="langchain_community")

from typing import Dict, Any, Optional, List
from datetime import datetime
import re
import asyncio
from langchain_community.tools import DuckDuckGoSearchRun
from langchain.agents import initialize_agent, Tool, AgentType
from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class CostResearchService:
    def __init__(self):
        """Initialize the cost research service with LLM and search tools"""
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash-exp",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.1
        )
        self.search = DuckDuckGoSearchRun()
        self.tools = [
            Tool(
                name="web_search",
                description="Search the internet for current information",
                func=self.search.run
            )
        ]
        self.agent = initialize_agent(
            self.tools, 
            self.llm, 
            agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
            verbose=False  # Set to False to reduce noise in production
        )

    async def research_tuition_costs(self, city: str, year: str, university_name: Optional[str] = None) -> Dict[str, Any]:
        """Research tuition costs for universities in the specified city"""
        logger.info(f"Starting tuition research for {city}, {year}, university: {university_name}")
        
        try:
            # Define tuition-focused search queries
            if university_name:
                search_queries = [
                    f"{university_name} tuition fees {year} international students",
                    f"{university_name} graduate school tuition {year}",
                    f"{university_name} fees structure {year} F1 visa",
                    f"{university_name} financial aid international students {year}",
                    f"{university_name} total cost attendance {year}"
                ]
            else:
                search_queries = [
                    f"{city} university tuition costs {year} international students",
                    f"{city} graduate school tuition fees {year}",
                    f"{city} universities international student fees {year}",
                    f"{city} higher education costs {year} F1 visa",
                    f"top universities {city} tuition comparison {year}",
                    f"{city} university financial aid international students {year}"
                ]
            
            # Collect search results
            all_results = []
            for query in search_queries:
                try:
                    result = await asyncio.to_thread(self.search.run, query)
                    all_results.append(f"Query: {query}\nResults: {result}\n")
                except Exception as e:
                    logger.error(f"Search failed for {query}: {e}")
            
            # Combine results
            search_data = "\n".join(all_results)
            
            # Create tuition summarization prompt
            university_info = f"at {university_name}" if university_name else f"in {city}"
            
            tuition_prompt = f"""
            Based on the following search results, create a comprehensive tuition cost guide for an international graduate student on F1 visa planning to study {university_info} in {year}.

            Search Results:
            {search_data}

            Please provide a structured JSON response with:

            1. **tuition_breakdown**:
            - graduate_program_tuition_per_year: estimated range
            - international_student_fees: additional fees
            - technology_lab_fees: estimated costs
            - health_insurance: required coverage costs
            - other_mandatory_fees: miscellaneous costs

            2. **university_comparison** (if multiple universities):
            - List major universities with tuition ranges

            3. **financial_aid**:
            - scholarships_available: list of opportunities
            - assistantship_opportunities: TA/RA options
            - work_study_programs: available programs

            4. **f1_visa_requirements**:
            - i20_tuition_amount: required proof of funds
            - sevis_fee: current fee amount

            5. **estimated_costs**:
            - one_year_masters: total estimate
            - two_year_masters: total estimate
            - phd_program: if applicable

            Provide specific dollar amounts where possible and format as a practical guide.
            """
            
            response = await asyncio.to_thread(self.agent.run, tuition_prompt)
            
            return {
                "status": "success",
                "data": response,
                "city": city,
                "year": year,
                "university": university_name,
                "research_type": "tuition"
            }
            
        except Exception as e:
            logger.error(f"Error in tuition research: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "city": city,
                "year": year,
                "university": university_name,
                "research_type": "tuition"
            }

    async def research_cost_of_living(self, city: str, year: str) -> Dict[str, Any]:
        """Research and summarize cost of living for international grad students"""
        logger.info(f"Starting cost of living research for {city}, {year}")
        
        try:
            search_queries = [
                f"{city} cost of living {year} international students",
                f"{city} rent prices {year} graduate students",
                f"{city} food costs {year} grocery prices",
                f"{city} public transportation costs {year} student discounts",
                f"{city} university housing costs {year}",
                f"F1 visa financial requirements {city} {year}"
            ]
            
            # Collect search results
            all_results = []
            for query in search_queries:
                try:
                    result = await asyncio.to_thread(self.search.run, query)
                    all_results.append(f"Query: {query}\nResults: {result}\n")
                except Exception as e:
                    logger.error(f"Search failed for {query}: {e}")
            
            search_data = "\n".join(all_results)
            
            prompt = f"""
            Based on the following search results, create a comprehensive cost of living guide for an international graduate student on F1 visa planning to study in {city} in {year}.

            Search Results:
            {search_data}

            Please provide a structured response with:

            1. **Monthly Budget Breakdown**:
            - Housing/Rent (include on-campus vs off-campus options)
            - Food (groceries, dining out, meal plans)  
            - Transportation (public transit, student discounts)
            - Utilities & Other (phone, internet, health insurance)
            - Books & Supplies
            - Personal/Entertainment

            2. **Annual Total Estimate**

            3. **F1 Visa Considerations**:
            - I-20 financial requirements
            - Bank statement amounts needed
            - Work restrictions and opportunities

            4. **Money-Saving Tips** for international students

            5. **Housing Recommendations** (best areas, types of accommodation)

            Format as a clear, practical guide with specific dollar amounts and ranges where possible.
            """
            
            response = await asyncio.to_thread(self.agent.run, prompt)
            
            return {
                "status": "success",
                "data": response,
                "city": city,
                "year": year,
                "research_type": "cost_of_living"
            }
            
        except Exception as e:
            logger.error(f"Error in cost of living research: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "city": city,
                "year": year,
                "research_type": "cost_of_living"
            }

    async def research_funding_options(self, total_estimated_cost: float, year: str, destination_country: str = "USA") -> Dict[str, Any]:
        """Research funding options from Indian financial institutions"""
        logger.info(f"Starting funding research for ${total_estimated_cost:,.2f} in {destination_country}, {year}")
        
        try:
            search_queries = [
                f"education loan India {year} study abroad interest rates",
                f"SBI HDFC ICICI education loan {year} overseas study",
                f"Indian banks student loan {destination_country} {year} interest rates",
                f"education loan without collateral India {year} {destination_country}",
                f"best education loan India {year} processing fees comparison",
                f"government education loan schemes India {year} study abroad",
                f"NBFC education loans India {year} {destination_country} students",
                f"education loan eligibility criteria India {year} overseas"
            ]
            
            # Collect search results
            all_results = []
            for query in search_queries:
                try:
                    result = await asyncio.to_thread(self.search.run, query)
                    all_results.append(f"Query: {query}\nResults: {result}\n")
                except Exception as e:
                    logger.error(f"Search failed for {query}: {e}")
            
            search_data = "\n".join(all_results)
            
            funding_prompt = f"""
            Based on the following search results, create a comprehensive funding guide for an Indian student planning to study in {destination_country} in {year}.

            ESTIMATED TOTAL COST NEEDED: ${total_estimated_cost:,.2f} (approximately ₹{total_estimated_cost * 86:,.0f})

            Search Results:
            {search_data}

            Please provide detailed information about:

            1. **MAJOR INDIAN BANKS EDUCATION LOANS**:
            - State Bank of India (SBI) - interest rates, loan amount, features
            - HDFC Bank - interest rates, terms, eligibility
            - ICICI Bank - rates, processing fees, special schemes
            - Axis Bank - education loan features and rates
            - Bank of Baroda - overseas education loan details

            2. **LOAN AMOUNT CATEGORIES**:
            - Up to ₹7.5 lakhs (without collateral)
            - ₹7.5 lakhs to ₹1.5 crores (with collateral/co-applicant)
            - Above ₹1.5 crores (premium loan products)

            3. **LOAN RECOMMENDATION**:
            Based on the estimated cost of ${total_estimated_cost:,.2f}:
            - Best 3 loan options with reasons
            - Estimated EMI calculations
            - Total interest outgo over loan tenure

            4. **APPLICATION STRATEGY**:
            - Timeline for loan application
            - Documentation requirements
            - Tips for faster approval

            Format as a practical, actionable funding guide with current {year} rates and terms.
            """
            
            response = await asyncio.to_thread(self.agent.run, funding_prompt)
            
            return {
                "status": "success",
                "data": response,
                "total_cost": total_estimated_cost,
                "year": year,
                "destination_country": destination_country,
                "research_type": "funding"
            }
            
        except Exception as e:
            logger.error(f"Error in funding research: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "total_cost": total_estimated_cost,
                "year": year,
                "destination_country": destination_country,
                "research_type": "funding"
            }

    def extract_cost_estimate(self, tuition_report: str, living_report: str) -> float:
        """Extract estimated total cost from research reports using LLM"""
        try:
            extraction_prompt = f"""
            From the following tuition and cost of living research reports, extract the most likely total annual cost estimate for an international student.

            TUITION REPORT:
            {tuition_report}

            COST OF LIVING REPORT:
            {living_report}

            Please analyze both reports and provide:
            1. Annual tuition cost estimate (in USD)
            2. Annual living cost estimate (in USD)  
            3. Total annual cost (tuition + living)

            Return ONLY the total annual cost as a number (no currency symbol, no commas).
            If multiple scenarios exist, use the middle/realistic estimate.
            Example response: 75000
            """
            
            response = self.llm.invoke([{"role": "user", "content": extraction_prompt}])
            
            # Extract number from response
            numbers = re.findall(r'\d+', response.content.replace(',', ''))
            if numbers:
                return float(numbers[-1])  # Take the last number (likely the total)
            return 70000.0  # Default fallback
            
        except Exception as e:
            logger.error(f"Error extracting cost estimate: {str(e)}")
            return 70000.0  # Default fallback

    async def research_comprehensive_costs(
        self, 
        city: str, 
        year: str, 
        university_name: Optional[str] = None, 
        destination_country: str = "USA"
    ) -> Dict[str, Any]:
        """Research tuition, living costs, funding options, then provide comprehensive summary"""
        logger.info(f"Starting comprehensive cost research for {city}, {destination_country} in {year}")
        
        try:
            # Step 1: Research tuition costs
            tuition_result = await self.research_tuition_costs(city, year, university_name)
            
            # Step 2: Research cost of living  
            living_result = await self.research_cost_of_living(city, year)
            
            # Step 3: Extract cost estimates
            if tuition_result["status"] == "success" and living_result["status"] == "success":
                total_estimated_cost = self.extract_cost_estimate(
                    tuition_result["data"], 
                    living_result["data"]
                )
            else:
                total_estimated_cost = 70000.0  # Default estimate
            
            # Step 4: Research funding options
            funding_result = await self.research_funding_options(
                total_estimated_cost, year, destination_country
            )
            
            # Step 5: Create comprehensive summary
            if all(result["status"] == "success" for result in [tuition_result, living_result, funding_result]):
                final_prompt = f"""
                Create a comprehensive financial planning guide that combines tuition, living costs, and funding research for an Indian student planning to study in {city}, {destination_country} in {year}.

                TUITION RESEARCH:
                {tuition_result["data"]}

                COST OF LIVING RESEARCH:
                {living_result["data"]}

                FUNDING OPTIONS RESEARCH:
                {funding_result["data"]}

                ESTIMATED TOTAL ANNUAL COST: ${total_estimated_cost:,.2f}

                Provide a comprehensive executive summary with:

                1. **COMPLETE COST BREAKDOWN**:
                - Total annual costs with ranges
                - One-time setup costs
                - Two-year program total estimate

                2. **RECOMMENDED FUNDING STRATEGY**:
                - Best loan options for this cost range
                - Optimal loan-to-self funding ratio
                - Monthly EMI projections

                3. **ACTIONABLE TIMELINE**:
                - When to apply for loans
                - Visa documentation requirements
                - Pre-arrival financial preparation

                4. **RISK MITIGATION**:
                - Backup funding options
                - Emergency fund recommendations
                - Currency fluctuation protection

                Format as an actionable financial blueprint with specific amounts and timelines.
                """
                
                comprehensive_response = await asyncio.to_thread(self.agent.run, final_prompt)
                
                return {
                    "status": "success",
                    "comprehensive_plan": comprehensive_response,
                    "tuition_research": tuition_result,
                    "living_cost_research": living_result,
                    "funding_research": funding_result,
                    "estimated_total_cost": total_estimated_cost,
                    "city": city,
                    "year": year,
                    "university": university_name,
                    "destination_country": destination_country
                }
            else:
                # Return partial results if some research failed
                return {
                    "status": "partial_success",
                    "tuition_research": tuition_result,
                    "living_cost_research": living_result,
                    "funding_research": funding_result,
                    "estimated_total_cost": total_estimated_cost,
                    "city": city,
                    "year": year,
                    "university": university_name,
                    "destination_country": destination_country,
                    "message": "Some research components failed, but partial results available"
                }
                
        except Exception as e:
            logger.error(f"Error in comprehensive research: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "city": city,
                "year": year,
                "university": university_name,
                "destination_country": destination_country
            }