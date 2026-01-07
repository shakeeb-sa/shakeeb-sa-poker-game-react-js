import React, { useState, useEffect } from 'react';
import './App.css';
import { createDeck, determineWinner } from './utils/pokerLogic';
import Card from './components/Card';

function App() {
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [botHand, setBotHand] = useState([]);
  const [communityCards, setCommunityCards] = useState([]);
  const [stage, setStage] = useState('start'); // start, preflop, flop, turn, river, showdown
  const [result, setResult] = useState(null);

  // Initialize Game
  const dealGame = () => {
    const newDeck = createDeck();
    const pHand = [newDeck.pop(), newDeck.pop()];
    const bHand = [newDeck.pop(), newDeck.pop()];
    
    setDeck(newDeck);
    setPlayerHand(pHand);
    setBotHand(bHand);
    setCommunityCards([]);
    setResult(null);
    setStage('preflop');
  };

  const nextStage = () => {
    const newDeck = [...deck];
    const currentComm = [...communityCards];

    if (stage === 'preflop') {
      // Burn one (optional in digital, but standard)
      newDeck.pop();
      // Deal Flop (3 cards)
      currentComm.push(newDeck.pop(), newDeck.pop(), newDeck.pop());
      setStage('flop');
    } else if (stage === 'flop') {
      newDeck.pop(); // Burn
      currentComm.push(newDeck.pop()); // Turn
      setStage('turn');
    } else if (stage === 'turn') {
      newDeck.pop(); // Burn
      currentComm.push(newDeck.pop()); // River
      setStage('river');
    } else if (stage === 'river') {
      // Showdown
      const gameResult = determineWinner(playerHand, botHand, currentComm);
      setResult(gameResult);
      setStage('showdown');
      return; // Don't update deck/comm cards
    }

    setDeck(newDeck);
    setCommunityCards(currentComm);
  };

  return (
    <div className="table">
      {/* Bot Area */}
      <div className="hand-area">
        <h3>Bot</h3>
        <div className="cards-container">
          {botHand.map((card, i) => (
            <Card key={i} card={card} hidden={stage !== 'showdown'} />
          ))}
        </div>
      </div>

      {/* Community Cards */}
      <div className="community-area">
        <div className="cards-container">
          {communityCards.map((card, i) => (
             <Card key={i} card={card} />
          ))}
          {communityCards.length === 0 && <span style={{opacity: 0.5}}>Waiting for deal...</span>}
        </div>
      </div>

      {/* Result Message */}
      {result && (
        <div style={{ background: 'rgba(0,0,0,0.8)', padding: '20px', borderRadius: '10px' }}>
          <h2>{result.winner === 'Tie' ? "It's a Tie!" : `${result.winner} Wins!`}</h2>
          <p>{result.description}</p>
          <button onClick={dealGame} style={{marginTop: '10px', padding: '10px'}}>New Hand</button>
        </div>
      )}

      {/* Player Area */}
      <div className="hand-area">
        <h3>You</h3>
        <div className="cards-container">
          {playerHand.map((card, i) => (
             <Card key={i} card={card} />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        {stage === 'start' && <button onClick={dealGame}>Deal Hand</button>}
        
        {stage !== 'start' && stage !== 'showdown' && (
          <button onClick={nextStage}>
            {stage === 'river' ? 'Showdown' : 'Deal Next Card'}
          </button>
        )}
      </div>
    </div>
  );
}

export default App;