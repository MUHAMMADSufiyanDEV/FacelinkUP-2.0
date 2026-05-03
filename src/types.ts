export type UserRole = 'user' | 'freelancer' | 'recruiter';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  bio?: string;
  skills?: string[];
  experience?: any[];
  portfolio?: any[];
  resumeUrl?: string;
  resumeText?: string;
  optimizedResume?: string;
  atsScore?: number;
  careerGoals?: string;
  createdAt: string;
  lastAnalyzed?: string;
  activeJobId?: string;
  linkedin?: string;
  github?: string;
  followersCount?: number;
  followingCount?: number;
}

export interface CareerTask {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  type: 'networking' | 'upskilling' | 'application' | 'resume';
  createdAt: string;
}

export interface JobMatchResult {
  id: string;
  userId: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  matchScore: number;
  explanation: string;
  skillsGap: string[];
  recommendations: string[];
  createdAt: string;
}
export interface Post {
  id: string;
  authorId: string;
  authorName?: string;
  authorPhoto?: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likesCount: number;
  commentsCount: number;
  createdAt: any;
}

export interface Job {
  id: string;
  recruiterId: string;
  recruiterName?: string;
  title: string;
  description: string;
  budget: string;
  type: 'fixed' | 'hourly';
  status: 'open' | 'closed' | 'in-progress';
  createdAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  freelancerId: string;
  freelancerName?: string;
  proposal: string;
  bidAmount: string;
  status: 'pending' | 'shortlisted' | 'hired' | 'rejected';
  createdAt: string;
}

export interface Connection {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'message' | 'system';
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: any;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName?: string;
  authorPhoto?: string;
  text: string;
  createdAt: any;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export interface Chat {
  id: string;
  participants: string[];
  participantNames?: Record<string, string>;
  lastMessage?: string;
  updatedAt: any;
}

export interface Gig {
  id: string;
  freelancerId: string;
  freelancerName?: string;
  freelancerPhoto?: string;
  title: string;
  description: string;
  price: number;
  deliveryDays?: number;
  category?: string;
  images?: string[];
  tags?: string[];
  rating?: number;
  reviewsCount?: number;
  createdAt: any;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: any;
}

export interface Blog {
  id: string;
  title: string;
  content: string;
  authorId: string;
  imageUrl?: string;
  tags?: string[];
  createdAt: any;
  published?: boolean;
}
