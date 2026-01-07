import React from 'react';

const Card = ({ card, hidden }) => {
  if (hidden) {
    return <div className="card back"></div>;
  }

  const isRed = card.suit === 'h' || card.suit === 'd';
  const suitSymbol = { h: '♥', d: '♦', c: '♣', s: '♠' };

  return (
    <div className={`card ${isRed ? 'red' : 'black'}`}>
      {card.rank}{suitSymbol[card.suit]}
    </div>
  );
};

export default Card;