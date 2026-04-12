import re
from io import BytesIO
from pdfminer.high_level import extract_text
import json

class ParserService:
    @staticmethod
    def extract_raw_text(file_obj):
        """Extracts text from a PDF file object."""
        try:
            # pdfminer expects a file-like object
            text = extract_text(BytesIO(file_obj.read()))
            return text
        except Exception as e:
            print(f"Error extracting text: {e}")
            return ""

    @staticmethod
    def parse_resume(text):
        """
        Heuristic parsing of resume text.
        Extracts Name, Email, Phone, Socials, and Experience hints.
        """
        data = {
            "name": "",
            "email": "",
            "phone": "",
            "linkedin": "",
            "github": "",
            "portfolio": "",
            "skills": [],
            "experience": []
        }

        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # 1. Heuristic Name (Usually the first non-empty line)
        if lines:
            data["name"] = lines[0][:100] # Limiting length just in case

        # 2. Regex Email
        email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        emails = re.findall(email_pattern, text)
        if emails:
            data["email"] = emails[0].lower()

        # 3. Regex Phone (Indian and Generic)
        phone_pattern = r'(?:\+91|0)?\s?[6-9]\d{9}|(?:\+1|1)?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}'
        phones = re.findall(phone_pattern, text)
        if phones:
            data["phone"] = phones[0].replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

        # 4. Social Links
        data["linkedin"] = ParserService._find_link(text, r'(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-\_]+')
        data["github"] = ParserService._find_link(text, r'(?:https?://)?(?:www\.)?github\.com/[\w\-\_]+')
        
        # Portfolio (Basic heuristic for common domains)
        portfolio_pattern = r'(?:https?://)?(?:www\.)?[\w\-\_]+\.(?:io|me|vercel.app|netlify.app|github.io)'
        portfolios = re.findall(portfolio_pattern, text.lower())
        if portfolios:
            data["portfolio"] = portfolios[0]

        # 5. Skills (Dictionary-based keyword matching)
        common_skills = [
            'Python', 'Django', 'React', 'JavaScript', 'Node', 'Docker', 'AWS', 
            'SQL', 'PostgreSQL', 'HTML', 'CSS', 'Tailwind', 'Git', 'Java', 
            'C++', 'Machine Learning', 'AI', 'Flutter', 'Next.js'
        ]
        text_lower = text.lower()
        for skill in common_skills:
            if skill.lower() in text_lower:
                data["skills"].append(skill)

        # 6. Experience Segments (Heuristic: Look for date patterns 20xx - 20xx)
        # Pattern: (Month/Year) - (Month/Year/Present)
        date_pattern = r'(?P<start>(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December|[0-9]{2})?[\s/.-]?[0-9]{4})\s?[\-–—to\s]+\s?(?P<end>(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December|[0-9]{2})?[\s/.-]?[0-9]{4}|Present|Current)'
        
        matches = re.finditer(date_pattern, text, re.IGNORECASE)
        for match in matches:
            # We don't have company/title extracted reliably without LLM, 
            # so we just capture the date segments for now as hints.
            data["experience"].append({
                "company": "Company Detected", # Placeholder
                "title": "Role", # Placeholder
                "start_date": match.group('start').strip(),
                "end_date": match.group('end').strip()
            })

        return data

    @staticmethod
    def _find_link(text, pattern):
        matches = re.findall(pattern, text, re.IGNORECASE)
        return matches[0] if matches else ""
