export type PhoneNumber = {
  id: string;
  type: string;
  number: string;
};

export type Student = {
  id: string;
  name: string;
  course: string;
  year: string;
  phoneNumbers: PhoneNumber[];
  email: string;
  status: 'new' | 'contacted' | 'enrolled' | 'not_interested';
  notes: string;
  lastContact?: string;
  avatar: string;
  gender?: string;
  dob?: string;
  guardianPhone?: string;
};

export const studentsData: Student[] = [
  {
    id: 's1',
    name: 'Santhosh Kumar',
    course: 'B.Tech Computer Science',
    year: 'First Year',
    phoneNumbers: [{ id: 'p1', type: 'Mobile', number: '+91 98765 43210' }],
    email: 'santhosh.k@example.in',
    status: 'new',
    notes: 'Interested in AI specialisation and hostel accommodation.',
    avatar: 'https://ui-avatars.com/api/?name=Santhosh+Kumar&background=random',
  },
  {
    id: 's2',
    name: 'Mrs.Hamavathi',
    course: 'MBA Marketing',
    year: 'Post Graduate',
    phoneNumbers: [
      { id: 'p1', type: 'Mobile', number: '+91 91234 56789' },
      { id: 'p2', type: 'Home', number: '+91 11 2345 6789' }
    ],
    email: 'mrs.hamavathi@example.in',
    status: 'contacted',
    lastContact: '2 days ago',
    notes: 'Asked about scholarships and placement records.',
    avatar: 'https://ui-avatars.com/api/?name=mrs.hamavathi&background=random',
  },
  {
    id: 's3',
    name: 'Ranganadhan',
    course: 'B.Sc Mathematics',
    year: 'First Year',
    phoneNumbers: [{ id: 'p1', type: 'Mobile', number: '+91 99887 76655' }],
    email: 'ranganadhan.k99@example.in',
    status: 'enrolled',
    lastContact: '1 week ago',
    notes: 'Completed admission fee payment. Needs timetable.',
    avatar: 'https://ui-avatars.com/api/?name=Ranganadhan&background=random',
  },
  {
    id: 's4',
    name: 'Jeelan',
    course: 'B.Tech Mechanical',
    year: 'Lateral Entry',
    phoneNumbers: [{ id: 'p1', type: 'Mobile', number: '+91 98989 89898' }],
    email: 'jeelan.k@example.in',
    status: 'new',
    notes: 'Transferring from polytechnic. Wants to join robotics club.',
    avatar: 'https://ui-avatars.com/api/?name=Jeelan&background=random',
  },
  {
    id: 's5',
    name: 'Sriram',
    course: 'BA Economics',
    year: 'First Year',
    phoneNumbers: [{ id: 'p1', type: 'Mobile', number: '+91 97777 66666' }],
    email: 'sriram.k1@example.in',
    status: 'not_interested',
    lastContact: '3 weeks ago',
    notes: 'Decided to prepare for UPSC instead of joining college right now.',
    avatar: 'https://ui-avatars.com/api/?name=sriram&background=random',
  },
];

export const scripts = [
  {
    title: 'Initial Welcome (English/Hindi)',
    content: "Hi [Name], this is [Your Name] calling from University Admissions. We saw you recently applied for the [Course] program. Do you have any queries regarding the admission process? / Namaste [Name], main University Admissions se [Your Name] baat kar raha/rahi hu. Aapke admission form ke sandarbh mein call kiya hai.",
  },
  {
    title: 'Fee Payment Follow-up',
    content: "Hello [Name], we noticed your semester fee payment is still pending. The deadline is approaching soon. Let me send you a quick WhatsApp with the payment link.",
  },
  {
    title: 'Document Verification Reminder',
    content: "Hi [Name]! Just a quick reminder to submit your 12th marksheet and Aadhar card copies for document verification before the orientation begins.",
  }
];
