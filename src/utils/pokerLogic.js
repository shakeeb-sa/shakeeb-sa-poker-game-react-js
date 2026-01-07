import { Hand } from 'pokersolver';

const SUITS = ['d', 'c', 'h', 's']; // Diamond, Club, Heart, Spade
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const createDeck = () => {
  let deck = [];
  for (let suit of SUITS) {
    for (let rank of RANKS) {
      deck.push({ rank, suit, id: `${rank}${suit}` });
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

// Converts our card object to string for pokersolver (e.g., {rank: 'T', suit: 'h'} -> "Th")
export const determineWinner = (playerHand, botHand, communityCards) => {
  const formatCard = (c) => `${c.rank}${c.suit}`;
  
  const playerArr = [...playerHand, ...communityCards].map(formatCard);
  const botArr = [...botHand, ...communityCards].map(formatCard);

  const hand1 = Hand.solve(playerArr);
  const hand2 = Hand.solve(botArr);
  const winner = Hand.winners([hand1, hand2]);

  return {
    winner: winner[0] === hand1 ? 'Player' : winner[0] === hand2 ? 'Bot' : 'Tie',
    description: winner[0].descr // e.g., "Two Pair", "Full House"
  };
};