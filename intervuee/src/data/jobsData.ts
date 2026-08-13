export interface JobOpening {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  type: 'Full-time' | 'Contract' | 'Remote' | 'Hybrid';
  ctc: string; // e.g. "₹14 - ₹22 LPA"
  experience: string; // e.g. "0-2 Yrs" or "3-5 Yrs"
  category: 'Frontend' | 'Backend' | 'Fullstack' | 'DevOps' | 'Data Science' | 'Mobile';
  source: 'Naukri' | 'LinkedIn' | 'Indeed' | 'Company Careers' | 'Verified Direct';
  postedAgo: string;
  applyUrl: string;
  skills: string[];
  description: string;
  interviewerCompanyMatch?: string; // Company name matching Roundora interviewers
}

export const JOBS_DATA: JobOpening[] = [
  {
    id: 'job-1',
    title: 'Software Development Engineer - I (SDE-1)',
    company: 'Amazon',
    location: 'Bangalore / Hybrid',
    type: 'Full-time',
    ctc: '₹18 - ₹28 LPA',
    experience: '0-2 Yrs',
    category: 'Backend',
    source: 'Company Careers',
    postedAgo: '2 hours ago',
    applyUrl: 'https://www.amazon.jobs/',
    skills: ['Java', 'Distributed Systems', 'AWS', 'Data Structures'],
    description: 'Looking for SDE-1 engineers to work on AWS cloud infrastructure & low-latency microservices.',
    interviewerCompanyMatch: 'Amazon',
  },
  {
    id: 'job-2',
    title: 'Frontend Engineer (React / TypeScript)',
    company: 'Swiggy',
    location: 'Remote / Bangalore',
    type: 'Full-time',
    ctc: '₹14 - ₹22 LPA',
    experience: '1-3 Yrs',
    category: 'Frontend',
    source: 'LinkedIn',
    postedAgo: '5 hours ago',
    applyUrl: 'https://careers.swiggy.com/',
    skills: ['React.js', 'TypeScript', 'TailwindCSS', 'Web Vitals'],
    description: 'Build fast, high-performance customer-facing web apps for millions of daily active users.',
    interviewerCompanyMatch: 'Swiggy',
  },
  {
    id: 'job-3',
    title: 'Backend Engineer (Go / Node.js)',
    company: 'CRED',
    location: 'Bangalore',
    type: 'Full-time',
    ctc: '₹22 - ₹35 LPA',
    experience: '2-4 Yrs',
    category: 'Backend',
    source: 'Naukri',
    postedAgo: 'Today',
    applyUrl: 'https://cred.club/careers',
    skills: ['Golang', 'Node.js', 'PostgreSQL', 'Redis', 'Kafka'],
    description: 'Join the core payments team building scalable microservices and fraud detection pipelines.',
    interviewerCompanyMatch: 'CRED',
  },
  {
    id: 'job-4',
    title: 'Full Stack Engineer (MERN / Next.js)',
    company: 'Zomato',
    location: 'Gurgaon / Hybrid',
    type: 'Full-time',
    ctc: '₹16 - ₹26 LPA',
    experience: '1-3 Yrs',
    category: 'Fullstack',
    source: 'Indeed',
    postedAgo: '1 day ago',
    applyUrl: 'https://www.zomato.com/careers',
    skills: ['React', 'Node.js', 'System Design', 'MongoDB'],
    description: 'Ownership of end-to-end features across web, backend APIs, and real-time delivery tracking.',
    interviewerCompanyMatch: 'Zomato',
  },
  {
    id: 'job-5',
    title: 'DevOps / Cloud Platform Engineer',
    company: 'Razorpay',
    location: 'Bangalore / Remote',
    type: 'Full-time',
    ctc: '₹20 - ₹32 LPA',
    experience: '2-5 Yrs',
    category: 'DevOps',
    source: 'Company Careers',
    postedAgo: '1 day ago',
    applyUrl: 'https://razorpay.com/jobs/',
    skills: ['Kubernetes', 'Docker', 'Terraform', 'CI/CD', 'AWS'],
    description: 'Manage 99.999% uptime payment gateway Kubernetes clusters and automated CI/CD pipelines.',
    interviewerCompanyMatch: 'Razorpay',
  },
  {
    id: 'job-6',
    title: 'Data Scientist / ML Engineer',
    company: 'Flipkart',
    location: 'Bangalore',
    type: 'Full-time',
    ctc: '₹24 - ₹40 LPA',
    experience: '2-4 Yrs',
    category: 'Data Science',
    source: 'LinkedIn',
    postedAgo: 'Just Now',
    applyUrl: 'https://www.flipkartcareers.com/',
    skills: ['Python', 'PyTorch', 'Recommendation Systems', 'SQL'],
    description: 'Develop recommendation algorithms and search ranking models for e-commerce search.',
    interviewerCompanyMatch: 'Flipkart',
  },
];
