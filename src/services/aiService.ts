import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini AI client
// Note: process.env.GEMINI_API_KEY is handled by the platform
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL_NAME = "gemini-3-flash-preview";

export interface ResumeAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  optimizedText: string;
  keywords: string[];
}

/**
 * AI Resume Analyzer Service
 */
export const analyzeResume = async (resumeText: string): Promise<ResumeAnalysis> => {
  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error("Resume text is too short to analyze.");
  }

  const systemInstruction = `
    You are an expert HR Manager and Senior Recruiter.
    Analyze the resume text and provide specialized feedback in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze the following resume text:\n\n${resumeText}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            optimizedText: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["score", "summary", "strengths", "improvements", "optimizedText", "keywords"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return result as ResumeAnalysis;
  } catch (error) {
    console.error("Gemini AI Resume Analysis Error:", error);
    throw new Error("Failed to analyze resume. Please try again later.");
  }
};

/**
 * AI Job Matcher
 */
export interface JobMatch {
  matchScore: number;
  explanation: string;
  skillsGap: string[];
  recommendations: string[];
}

export const matchJob = async (resumeText: string, jobDescription: string): Promise<JobMatch> => {
  const systemInstruction = "You are an AI Career Coach. Compare the resume with the job description and return a JSON match analysis.";
  
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Resume: ${resumeText}\n\nJob Description: ${jobDescription}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matchScore: { type: Type.NUMBER },
          explanation: { type: Type.STRING },
          skillsGap: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["matchScore", "explanation", "skillsGap", "recommendations"]
      }
    }
  });

  return JSON.parse(response.text);
};

/**
 * AI Proposal Generator
 */
export const generateProposal = async (resumeText: string, jobDescription: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Based on this resume: ${resumeText}\n\nWrite a compelling job proposal for this role: ${jobDescription}`,
    config: {
      systemInstruction: "You are a professional proposal writer. Write a concise, persuasive, and customized job proposal."
    }
  });

  return response.text;
};

/**
 * AI Interview Q&A Generator
 */
export interface InterviewQA {
  question: string;
  suggestedAnswer: string;
  tip: string;
}

export const generateInterviewPrep = async (jobDescription: string): Promise<InterviewQA[]> => {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Generate 5 challenging interview questions and answers for this job: ${jobDescription}`,
    config: {
      systemInstruction: "Act as a technical interviewer.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            suggestedAnswer: { type: Type.STRING },
            tip: { type: Type.STRING }
          },
          required: ["question", "suggestedAnswer", "tip"]
        }
      }
    }
  });

  return JSON.parse(response.text);
};

/**
 * AI Email Writer
 */
export const writeEmail = async (context: string, type: 'follow-up' | 'networking' | 'application'): Promise<string> => {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Write a ${type} email based on this context: ${context}`,
    config: {
      systemInstruction: "You are a corporate communication expert. Write a professional, polite, and effective email."
    }
  });

  return response.text;
};

/**
 * AI Resume Maker
 */
export interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    website?: string;
  };
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location: string;
    graduationDate: string;
    gpa?: string;
  }>;
  skills: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }>;
}

export const generateResume = async (data: ResumeData): Promise<string> => {
  const systemInstruction = `
    You are a professional resume writer. Create a well-formatted, ATS-friendly resume in plain text format.
    Use clear sections, bullet points, and professional language. Keep it concise but comprehensive.
    Format it with proper spacing and structure.
  `;

  const resumeText = `
Personal Information:
- Name: ${data.personalInfo.name}
- Email: ${data.personalInfo.email}
- Phone: ${data.personalInfo.phone}
- Location: ${data.personalInfo.location}
${data.personalInfo.linkedin ? `- LinkedIn: ${data.personalInfo.linkedin}` : ''}
${data.personalInfo.website ? `- Website: ${data.personalInfo.website}` : ''}

Professional Summary:
${data.summary}

Experience:
${data.experience.map(exp => `
${exp.title}
${exp.company}, ${exp.location}
${exp.startDate} - ${exp.endDate}
${exp.description}
`).join('')}

Education:
${data.education.map(edu => `
${edu.degree}
${edu.institution}, ${edu.location}
${edu.graduationDate}${edu.gpa ? ` - GPA: ${edu.gpa}` : ''}
`).join('')}

Skills:
${data.skills.join(', ')}

${data.certifications && data.certifications.length > 0 ? `
Certifications:
${data.certifications.map(cert => `- ${cert.name} - ${cert.issuer} (${cert.date})`).join('\n')}
` : ''}

${data.projects && data.projects.length > 0 ? `
Projects:
${data.projects.map(project => `
${project.name}
${project.description}
Technologies: ${project.technologies.join(', ')}${project.url ? `\nURL: ${project.url}` : ''}
`).join('')}
` : ''}
  `.trim();

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Generate a professional resume based on this information:\n\n${resumeText}`,
    config: {
      systemInstruction
    }
  });

  return response.text;
};
