import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ card, hidden, index = 0 }) => {
  if (!card) return null;

  // Animation: Simple fade in + slide up
  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, y: 0, 
      transition: { delay: index * 0.1, duration: 0.3 } 
    }
  };

  let r = card.rank;
  if (r === 'T') r = '0';
  const s = card.suit ? card.suit.toUpperCase() : '';
  
  const imageUrl = hidden 
    ? "https://deckofcardsapi.com/static/img/back.png"
    : `https://deckofcardsapi.com/static/img/${r}${s}.png`;

  return (
    <motion.div 
      className="card-image-container"
      variants={variants}
      initial="hidden"
      animate="visible"
    >
      <img 
        src={imageUrl} 
        alt={hidden ? "Hidden" : `${r}${s}`} 
        style={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: '8px', // Matching CSS
          objectFit: 'cover',
          display: 'block',
          background: 'white' // Fallback
        }}
        onError={(e) => { e.target.src = "https://deckofcardsapi.com/static/img/back.png" }}
      />
    </motion.div>
  );
};

export default Card;