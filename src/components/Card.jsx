import React from 'react';

const Card = ({ card, hidden, style }) => {
  if (hidden) {
    return (
      <div className="card-image-container" style={style}>
        <img 
          src="https://deckofcardsapi.com/static/img/back.png" 
          alt="Hidden Card" 
          className="card-image"
        />
      </div>
    );
  }

  // Map our ranks/suits to API format
  // Our Ranks: 2,3...9,T,J,Q,K,A
  // API Ranks: 2,3...9,0,J,Q,K,A
  let r = card.rank;
  if (r === 'T') r = '0'; // The API uses '0' for Ten
  
  // Our Suits: d,c,h,s
  // API Suits: D,C,H,S
  const s = card.suit.toUpperCase();

  const imageUrl = `https://deckofcardsapi.com/static/img/${r}${s}.png`;

  return (
    <div className="card-image-container" style={style}>
      <img src={imageUrl} alt={`${card.rank}${card.suit}`} className="card-image" />
    </div>
  );
};

export default Card;