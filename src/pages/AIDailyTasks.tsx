import React, { useState, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'motion/react';
import { ListChecks, Wand2, Loader2, CheckCircle2, Circle, Trophy, Trash2, PlusCircle, Target } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { saveCareerTask, completeTask, deleteTask, getActiveTasks, updateCareerProfile } from '../services/profileService';
import { analyzeResume } from '../services/aiService'; // Reusing AI for task generation logic if needed, or simple mock

export default function AIDailyTasks() {
  const { profile, user } = useAuth();
  const [careerGoals, setCareerGoals] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    if (profile?.careerGoals) {
      setCareerGoals(profile.careerGoals);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    return getActiveTasks(user.uid, (data) => {
      setTasks(data);
    }, (error) => {
      console.error("Daily Planner Snapshot Error:", error);
      alert("Failed to load your tasks. Please refresh.");
    });
  }, [user]);

  const handleSuggest = async () => {
    if (!careerGoals.trim() || !user) return;
    setLoading(true);
    try {
      // Update profile goals
      await updateCareerProfile(user.uid, { careerGoals });

      // Simulate AI delay for task suggestions
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const suggestions = [
        { title: 'Update LinkedIn Headline', description: 'Align with your goal of ' + careerGoals, type: 'resume' },
        { title: 'Network with 3 Professionals', description: 'Reach out to people in the target industry', type: 'networking' },
        { title: 'Complete a relevant Skill Course', description: 'Upskill to match career expectations', type: 'upskilling' }
      ];
      
      for (const task of suggestions) {
        await saveCareerTask(user.uid, {
          userId: user.uid,
          title: task.title,
          description: task.description,
          type: task.type,
          status: 'pending',
          completed: false
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (task: any) => {
    if (!user) return;
    await completeTask(user.uid, task.id);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    await deleteTask(user.uid, taskId);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !user) return;
    
    await saveCareerTask(user.uid, {
      userId: user.uid,
      title: newTask,
      description: 'Manual task',
      type: 'personal',
      status: 'pending',
      completed: false
    });
    
    setNewTask('');
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[#0A2F6F] tracking-tight flex items-center gap-2">
          <ListChecks className="w-8 h-8" />
          AI Daily Planner
        </h1>
        <p className="text-gray-500">Plan your career growth with high-impact daily tasks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#0A2F6F] rounded-3xl p-6 text-white overflow-hidden relative shadow-xl shadow-blue-900/20">
            <div className="relative z-10">
              <h3 className="font-bold flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-blue-300" />
                Focus Topic
              </h3>
              <p className="text-xs text-blue-100 mb-4 leading-relaxed">
                What are you trying to achieve this week? (e.g. "Landing a React job" or "Building my SaaS")
              </p>
              <textarea
                value={careerGoals}
                onChange={(e) => setCareerGoals(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-white/30 h-24 resize-none"
                placeholder="Type your goal here..."
              />
              <button
                onClick={handleSuggest}
                disabled={loading || !careerGoals.trim()}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-white text-[#0A2F6F] font-bold rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Generate Tasks
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Your Progress</h4>
            <div className="relative inline-flex items-center justify-center mb-4">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                <circle 
                  cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                  className="text-[#0A2F6F]" 
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * progress) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xl font-black text-[#0A2F6F]">{Math.round(progress)}%</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">Keep going! You've crushed {completedCount} tasks today.</p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleAddTask} className="relative">
            <input 
              type="text" 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a custom task..."
              className="w-full py-4 pl-6 pr-14 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#0A2F6F] outline-none font-medium"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[#0A2F6F] text-white rounded-xl hover:bg-[#0A2F6F]/90 transition-all">
              <PlusCircle className="w-5 h-5" />
            </button>
          </form>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    task.completed 
                    ? 'bg-gray-50 border-gray-100 opacity-60' 
                    : 'bg-white border-gray-100 hover:border-blue-200'
                  }`}
                >
                  <button 
                    onClick={() => handleToggleTask(task)}
                    className={`shrink-0 transition-colors ${task.completed ? 'text-[#10A37F]' : 'text-gray-300 hover:text-blue-500'}`}
                  >
                    {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>
                  <span className={`flex-1 text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {task.title}
                  </span>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {tasks.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                  <Trophy className="w-8 h-8 text-gray-200" />
                </div>
                <p className="text-gray-400 font-medium">No tasks yet. Use the AI to generate some goals!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
