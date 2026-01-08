import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ card, hidden, index }) => {
  // Animation variants
  const variants = {
    hidden: { 
      opacity: 0, 
      y: -100, 
      scale: 0.5,
      rotate: Math.random() * 20 - 10 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      rotate: 0,
      transition: { 
        delay: index * 0.1, // Stagger effect (deal cards one by one)
        type: "spring",
        stiffness: 200,
        damping: 15
      }
    }
  };

  // Card Logic
  let r = card.rank;
  if (r === 'T') r = '0'; // API fix
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
      whileHover={{ scale: 1.1, y: -10, zIndex: 100 }}
    >
      <img src={imageUrl} alt="card" className="card-image" />
    </motion.div>
  );
};

export default Card;