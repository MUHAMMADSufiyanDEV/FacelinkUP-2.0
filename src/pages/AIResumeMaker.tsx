import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Wand2, Loader2, Copy, Check, AlertCircle, Plus, Trash2, User, Briefcase, GraduationCap, Award, Code, Download } from 'lucide-react';
import { generateResume, ResumeData } from '../services/aiService';
import { generateResumePDF } from '../lib/pdfUtils';

export default function AIResumeMaker() {
  const [resumeData, setResumeData] = useState<ResumeData>({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      website: ''
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: []
  });

  const [loading, setLoading] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<string | null>(null);
  const [generatedResumeHtml, setGeneratedResumeHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!resumeData.personalInfo.name || !resumeData.personalInfo.email || !resumeData.summary) {
      setError('Please fill in your name, email, and professional summary.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resume = await generateResume(resumeData);
      setGeneratedResume(resume);
      setGeneratedResumeHtml(generateResumeHtml(resumeData));
    } catch (err: any) {
      setError(err.message || 'Resume generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const generateResumeHtml = (data: ResumeData): string => {
    return `
      <div class="max-w-4xl mx-auto bg-white p-8 font-sans">
        <!-- Header -->
        <div class="border-b-2 border-blue-600 pb-6 mb-6">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">${data.personalInfo.name}</h1>
          <div class="flex flex-wrap gap-4 text-gray-600">
            <span>📧 ${data.personalInfo.email}</span>
            <span>📱 ${data.personalInfo.phone}</span>
            <span>📍 ${data.personalInfo.location}</span>
            ${data.personalInfo.linkedin ? `<span>💼 ${data.personalInfo.linkedin}</span>` : ''}
            ${data.personalInfo.website ? `<span>🌐 ${data.personalInfo.website}</span>` : ''}
          </div>
        </div>

        <!-- Summary -->
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-blue-600 mb-3 border-b border-gray-200 pb-1">Professional Summary</h2>
          <p class="text-gray-700 leading-relaxed">${data.summary}</p>
        </div>

        <!-- Experience -->
        ${data.experience.length > 0 ? `
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-blue-600 mb-3 border-b border-gray-200 pb-1">Work Experience</h2>
          <div class="space-y-4">
            ${data.experience.map(exp => `
              <div class="border-l-4 border-blue-500 pl-4">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <h3 class="text-xl font-semibold text-gray-900">${exp.title}</h3>
                    <p class="text-blue-600 font-medium">${exp.company}, ${exp.location}</p>
                  </div>
                  <span class="text-gray-500 text-sm">${exp.startDate} - ${exp.endDate}</span>
                </div>
                <p class="text-gray-700 leading-relaxed">${exp.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Education -->
        ${data.education.length > 0 ? `
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-blue-600 mb-3 border-b border-gray-200 pb-1">Education</h2>
          <div class="space-y-3">
            ${data.education.map(edu => `
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">${edu.degree}</h3>
                  <p class="text-blue-600">${edu.institution}, ${edu.location}</p>
                </div>
                <div class="text-right">
                  <span class="text-gray-500">${edu.graduationDate}</span>
                  ${edu.gpa ? `<br><span class="text-sm text-gray-600">GPA: ${edu.gpa}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Skills -->
        ${data.skills.length > 0 ? `
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-blue-600 mb-3 border-b border-gray-200 pb-1">Skills</h2>
          <div class="flex flex-wrap gap-2">
            ${data.skills.map(skill => `<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">${skill}</span>`).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Certifications -->
        ${data.certifications && data.certifications.length > 0 ? `
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-blue-600 mb-3 border-b border-gray-200 pb-1">Certifications</h2>
          <div class="space-y-2">
            ${data.certifications.map(cert => `
              <div class="flex justify-between">
                <span class="font-medium text-gray-900">${cert.name}</span>
                <span class="text-gray-600">${cert.issuer} - ${cert.date}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Projects -->
        ${data.projects && data.projects.length > 0 ? `
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-blue-600 mb-3 border-b border-gray-200 pb-1">Projects</h2>
          <div class="space-y-4">
            ${data.projects.map(project => `
              <div>
                <h3 class="text-lg font-semibold text-gray-900 mb-1">${project.name}</h3>
                <p class="text-gray-700 mb-2">${project.description}</p>
                <div class="flex flex-wrap gap-1 mb-2">
                  ${project.technologies.map(tech => `<span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">${tech}</span>`).join('')}
                </div>
                ${project.url ? `<a href="${project.url}" class="text-blue-600 hover:underline text-sm">${project.url}</a>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  };

  const handleDownloadPDF = async () => {
    if (!generatedResumeHtml) return;

    try {
      await generateResumePDF(generatedResumeHtml, `${resumeData.personalInfo.name.replace(/\s+/g, '_')}_Resume.pdf`);
    } catch (err: any) {
      console.error('PDF download failed:', err);
      alert('PDF generation failed. The required libraries may not be installed. You can still copy the text version.');
    }
  };

  const addExperience = () => {
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, {
        title: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        description: ''
      }]
    }));
  };

  const updateExperience = (index: number, field: string, value: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) =>
        i === index ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const removeExperience = (index: number) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const addEducation = () => {
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, {
        degree: '',
        institution: '',
        location: '',
        graduationDate: '',
        gpa: ''
      }]
    }));
  };

  const updateEducation = (index: number, field: string, value: string) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) =>
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const removeEducation = (index: number) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const addSkill = () => {
    setResumeData(prev => ({
      ...prev,
      skills: [...prev.skills, '']
    }));
  };

  const updateSkill = (index: number, value: string) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.map((skill, i) => i === index ? value : skill)
    }));
  };

  const removeSkill = (index: number) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#0A2F6F] tracking-tight flex items-center gap-2">
          <FileText className="w-8 h-8" />
          AI Resume Maker
        </h1>
        <p className="text-gray-500">Create a professional, ATS-friendly resume with AI assistance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#0A2F6F]" />
              <h3 className="font-bold text-[#0A2F6F]">Personal Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Full Name"
                value={resumeData.personalInfo.name}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, name: e.target.value }
                }))}
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2F6F] outline-none"
              />
              <input
                type="email"
                placeholder="Email"
                value={resumeData.personalInfo.email}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, email: e.target.value }
                }))}
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2F6F] outline-none"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={resumeData.personalInfo.phone}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, phone: e.target.value }
                }))}
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2F6F] outline-none"
              />
              <input
                type="text"
                placeholder="Location"
                value={resumeData.personalInfo.location}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, location: e.target.value }
                }))}
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2F6F] outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="url"
                placeholder="LinkedIn Profile (optional)"
                value={resumeData.personalInfo.linkedin}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, linkedin: e.target.value }
                }))}
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2F6F] outline-none"
              />
              <input
                type="url"
                placeholder="Website/Portfolio (optional)"
                value={resumeData.personalInfo.website}
                onChange={(e) => setResumeData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, website: e.target.value }
                }))}
                className="p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2F6F] outline-none"
              />
            </div>
          </div>

          {/* Professional Summary */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-[#0A2F6F]">Professional Summary</h3>
            <textarea
              placeholder="Write a compelling 2-3 sentence summary of your professional background and career goals..."
              value={resumeData.summary}
              onChange={(e) => setResumeData(prev => ({ ...prev, summary: e.target.value }))}
              className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0A2F6F] outline-none resize-none"
            />
          </div>

          {/* Experience */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#0A2F6F]" />
                <h3 className="font-bold text-[#0A2F6F]">Work Experience</h3>
              </div>
              <button
                onClick={addExperience}
                className="p-2 bg-[#0A2F6F] text-white rounded-lg hover:bg-[#0A2F6F]/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {resumeData.experience.map((exp, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <input
                      type="text"
                      placeholder="Job Title"
                      value={exp.title}
                      onChange={(e) => updateExperience(index, 'title', e.target.value)}
                      className="p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A2F6F] outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) => updateExperience(index, 'company', e.target.value)}
                      className="p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A2F6F] outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Location"
                      value={exp.location}
                      onChange={(e) => updateExperience(index, 'location', e.target.value)}
                      className="p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A2F6F] outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Start Date"
                        value={exp.startDate}
                        onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                        className="p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A2F6F] outline-none text-sm"
                      />
                      <input
                        type="text"
                        placeholder="End Date"
                        value={exp.endDate}
                        onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                        className="p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A2F6F] outline-none text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeExperience(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  placeholder="Describe your responsibilities and achievements..."
                  value={exp.description}
                  onChange={(e) => updateExperience(index, 'description', e.target.value)}
                  className="w-full h-20 p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A2F6F] outline-none resize-none text-sm"
                />
              </div>
            ))}
          </div>

          {/* Education */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#0A2F6F]" />
                <h3 className="font-bold text-[#0A2F6F]">Education</h3>
              </div>
              <button
                onClick={addEducation}
                className="p-2 bg-[#0A2F6F] text-white rounded-lg hover:bg-[#0A2F6F]/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {resumeData.education.map((edu, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <input
                      type="text"
                      placeholder="Degree/Program"
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                      className="p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A2F6F] outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Institution"
                      value={edu.institution}
                      onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                      className="p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A2F6F] outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Location"
                      value={edu.location}
                      onChange={(e) => updateEducation(index, 'location', e.target.value)}
                      className="p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A2F6F] outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Graduation Date"
                      value={edu.graduationDate}
                      onChange={(e) => updateEducation(index, 'graduationDate', e.target.value)}
                      className="p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A2F6F] outline-none"
                    />
                  </div>
                  <button
                    onClick={() => removeEducation(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="GPA (optional)"
                  value={edu.gpa || ''}
                  onChange={(e) => updateEducation(index, 'gpa', e.target.value)}
                  className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A2F6F] outline-none"
                />
              </div>
            ))}
          </div>

          {/* Skills */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-[#0A2F6F]" />
                <h3 className="font-bold text-[#0A2F6F]">Skills</h3>
              </div>
              <button
                onClick={addSkill}
                className="p-2 bg-[#0A2F6F] text-white rounded-lg hover:bg-[#0A2F6F]/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {resumeData.skills.map((skill, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Skill"
                    value={skill}
                    onChange={(e) => updateSkill(index, e.target.value)}
                    className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0A2F6F] outline-none"
                  />
                  <button
                    onClick={() => removeSkill(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-4 bg-[#0A2F6F] text-white font-bold rounded-2xl hover:bg-[#0A2F6F]/90 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            {loading ? 'Generating Resume...' : 'Generate Resume'}
          </button>
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-[500px] overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Generated Resume</span>
            <div className="flex gap-2">
              {generatedResume && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedResume);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2 bg-[#0A2F6F] text-white rounded-lg hover:bg-[#0A2F6F]/90 transition-colors flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
              )}
              {/* {generatedResumeHtml && (
                <button
                  onClick={handleDownloadPDF}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              )} */}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {generatedResumeHtml ? (
              <div className="p-6">
                <div
                  className="max-w-4xl mx-auto bg-white shadow-lg"
                  dangerouslySetInnerHTML={{ __html: generatedResumeHtml }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <FileText className="w-12 h-12 mb-4" />
                <p className="text-center">Your AI-generated resume will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}