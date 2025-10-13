export default function BuildATwitterWeb() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [availableTweets, setAvailableTweets] = useState<Tweet[]>(mockTweets);

  // Function to get a random tweet that hasn't been shown yet
  const getRandomTweet = useCallback(() => {
    if (availableTweets.length === 0) {
      // Reset available tweets if we've shown them all
      setAvailableTweets(mockTweets);
      return mockTweets[Math.floor(Math.random() * mockTweets.length)];
    }
    const randomIndex = Math.floor(Math.random() * availableTweets.length);
    const tweet = availableTweets[randomIndex];
    setAvailableTweets(availableTweets.filter(t => t.id !== tweet.id)); // Remove from available
    return tweet;
  }, [availableTweets]);

  // Initialize the first tweet when the component mounts
  useEffect(() => {
    setGameState(prev => ({ ...prev, currentTweet: getRandomTweet() }));
  }, [getRandomTweet]);

  // Handle user's guess (e.g., guessing if the tweet is from a specific user)
  // For this simple game, let's assume the user guesses if the tweet is "popular" (high likes/retweets)
  // Or, we could make it a multiple choice: Guess the user, guess the topic, etc.
  // Let's go with a simple "Is this tweet popular?" guess.
  const handleGuess = (isPopularGuess: boolean) => {
    if (gameState.gameOver || !gameState.currentTweet) return;

    // Define "popular" - e.g., more than 100,000 likes OR 20,000 retweets
    const isTweetPopular = gameState.currentTweet.likes > 100000 || gameState.currentTweet.retweets > 20000;

    let newScore = gameState.score;
    let newLives = gameState.lives;
    let newStreak = gameState.streak;
    let newStreakBonus = gameState.streakBonus;

    if (isPopularGuess === isTweetPopular) {
      // Correct guess
      newStreak++;
      newStreakBonus = Math.max(0, newStreakBonus + (newStreak > 5 ? 500 : 0)); // Bonus for longer streaks
      newScore += 100 + newStreakBonus; // Base score + streak bonus
    } else {
      // Incorrect guess
      newLives--;
      newStreak = 0; // Reset streak
      newStreakBonus = 0; // Reset streak bonus
      if (newLives <= 0) {
        setGameState(prev => ({ ...prev, gameOver: true, lives: 0 }));
        return;
      }
    }

    // Get the next tweet
    const nextTweet = getRandomTweet();
    setGameState(prev => ({
      ...prev,
      currentTweet: nextTweet,
      score: newScore,
      lives: newLives,
      streak: newStreak,
      streakBonus: newStreakBonus,
    }));
  };

  const resetGame = () => {
    setGameState(INITIAL_STATE);
    setAvailableTweets(mockTweets); // Reset available tweets
    setGameState(prev => ({ ...prev, currentTweet: getRandomTweet() }));
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Twitter Game: Popularity Predictor</h1>
      <div className={styles.gameArea}>
        {gameState.gameOver ? (
          <div className={styles.gameOver}>
            <h2>Game Over!</h2>
            <p>Your final score: {gameState.score}</p>
            <button onClick={resetGame} className={styles.resetButton}>Play Again</button>
          </div>
        ) : (
          <>
            <div className={styles.stats}>
              <p>Score: {gameState.score}</p>
              <p>Lives: {Array(gameState.lives).fill('❤️').join(' ')}</p>
              <p>Streak: {gameState.streak} ({gameState.streakBonus > 0 ? `+${gameState.streakBonus}` : ''})</p>
            </div>
            {gameState.currentTweet && (
              <div className={styles.tweetCard}>
                <div className={styles.tweetHeader}>
                  <img src={gameState.currentTweet.user.avatar} alt="Avatar" className={styles.avatar} />
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{gameState.currentTweet.user.name}</span>
                    <span className={styles.userHandle}>{gameState.currentTweet.user.handle}</span>
                  </div>
                  <div className={styles.timestamp}>{gameState.currentTweet.timestamp}</div>
                </div>
                <div className={styles.tweetContent}>
                  <p>{gameState.currentTweet.content}</p>
                </div>
                <div className={styles.tweetActions}>
                  {/* These are just visual, not functional in this simple game */}
                  <span>❤️ {gameState.currentTweet.likes.toLocaleString()}</span>
                  <span>🔁 {gameState.currentTweet.retweets.toLocaleString()}</span>
                </div>
              </div>
            )}
            <div className={styles.guessButtons
