import { Hand } from 'pokersolver';

const SUITS = ['d', 'c', 'h', 's'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const createDeck = () => {
  let deck = [];
  for (let suit of SUITS) {
    for (let rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return shuffleDeck(deck);
};

export const shuffleDeck = (deck) => {
  let newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const determineWinner = (playerHand, botHand, communityCards) => {
  const formatCard = (c) => `${c.rank}${c.suit}`;
  
  const playerArr = [...playerHand, ...communityCards].map(formatCard);
  const botArr = [...botHand, ...communityCards].map(formatCard);

  const hand1 = Hand.solve(playerArr);
  const hand2 = Hand.solve(botArr);
  const winner = Hand.winners([hand1, hand2]);

  return {
    winner: winner[0] === hand1 ? 'Player' : winner[0] === hand2 ? 'Bot' : 'Tie',
    description: winner[0].descr
  };
};

// --- NEW INTELLIGENT AI LOGIC ---

const getCardValue = (rank) => {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  if (rank === 'T') return 10;
  return parseInt(rank);
};

export const getHandStrength = (hand, communityCards, stage) => {
  // PRE-FLOP LOGIC (Only 2 cards)
  if (stage === 'preflop' || communityCards.length === 0) {
    const v1 = getCardValue(hand[0].rank);
    const v2 = getCardValue(hand[1].rank);
    const isPair = v1 === v2;
    const isSuited = hand[0].suit === hand[1].suit;
    const highCard = Math.max(v1, v2);

    // Score out of 100 roughly
    if (isPair) return 60 + v1; // Pair (62-74) -> Always Play
    if (highCard >= 10) return 40 + v1; // High cards (50-54) -> Playable
    if (isSuited) return 30 + v1; // Suited trash -> Borderline
    return 10 + v1; // Garbage
  }

  // POST-FLOP LOGIC (Community cards exist)
  const formatCard = (c) => `${c.rank}${c.suit}`;
  const allCards = [...hand, ...communityCards].map(formatCard);
  const solved = Hand.solve(allCards);
  
  // Rank: 1=HighCard, 2=Pair, 3=TwoPair, 4=Trips, 5=Straight, etc.
  const rank = solved.rank; 
  
  let score = 0;
  // In Heads-up (1v1), a Pair is very strong.
  if (rank === 1) score = 15; // High Card (Weak)
  else if (rank === 2) score = 55; // One Pair (Strong)
  else if (rank === 3) score = 75; // Two Pair (Very Strong)
  else score = 95; // Trips or better (Monster)

  // Add kicker value to break ties
  score += (solved.cardPool[0].value / 2); 
  
  return score; 
};