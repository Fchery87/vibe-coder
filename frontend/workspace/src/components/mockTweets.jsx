const mockTweets = [
  {
    id: 1,
    user: {
      name: 'Elon Musk',
      handle: '@elonmusk',
      avatar: 'https://i.imgur.com/avatar1.jpg', // Placeholder avatar
    },
    content: "Excited for the next big thing in AI! 🚀 #AI #Future",
    likes: 150000,
    retweets: 30000,
    timestamp: '2h ago',
  },
  {
    id: 2,
    user: {
      name: 'The Boring Company',
      handle: '@boringcompany',
      avatar: 'https://i.imgur.com/avatar2.jpg', // Placeholder avatar
    },
    content: "Tunnel progress is steady. Faster, safer, and more affordable transportation coming soon.",
    likes: 15000,
    retweets: 3000,
    timestamp: '5h ago',
  },
  {
    id: 3,
    user: {
      name: 'SpaceX',
      handle: '@SpaceX',
      avatar: 'https://i.imgur.com/avatar3.jpg', // Placeholder avatar
    },
    content: "Starship launch window is approaching. Get ready for orbit! 🌕 #Starship #Space",
    likes: 250000,
    retweets: 50000,
    timestamp: '1d ago',
  },
  {
    id: 4,
    user: {
      name: 'Tesla',
      handle: '@Tesla',
      avatar: 'https://i.imgur.com/avatar4.jpg', // Placeholder avatar
    },
    content: "Autopilot updates rolling out now. Enhanced safety and convenience.",
    likes: 120000,
    retweets: 25000,
    timestamp: '2d ago',
  },
  {
    id: 5,
    user: {
      name: 'OpenAI',
      handle: '@OpenAI',
      avatar: 'https://i.imgur.com/avatar5.jpg', // Placeholder avatar
    },
    content: "Introducing our latest model, capable of generating realistic images from text prompts.",
    likes: 300000,
    retweets: 60000,
    timestamp: '3d ago',
  },
];

// Game state types
interface Tweet {
  id: number;
  user: {
    name: string;
    handle: string;
    avatar: string;
  };
  content: string;
  likes: number;
  retweets: number;
  timestamp: string;
}

interface GameState {
  currentTweet: Tweet | null;
  score: number;
  lives: number;
  gameOver: boolean;
  streak: number;
  streakBonus: number;
}
