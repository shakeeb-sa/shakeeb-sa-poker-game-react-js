import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti'; // IMPORT CONFETTI
import './App.css';
import { createDeck, determineWinner, getHandStrength } from './utils/pokerLogic';
import { playSound } from './utils/sound'; // IMPORT SOUND
import Card from './components/Card';

const BLIND = 10;
const INITIAL_CHIPS = 1000;

function App() {
  const [deck, setDeck] = useState([]);
  const [stage, setStage] = useState('start'); 
  
  const [playerHand, setPlayerHand] = useState([]);
  const [botHand, setBotHand] = useState([]);
  const [communityCards, setCommunityCards] = useState([]);
  
  const [playerChips, setPlayerChips] = useState(INITIAL_CHIPS);
  const [botChips, setBotChips] = useState(INITIAL_CHIPS);
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0); 
  
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [message, setMessage] = useState("Click 'Deal' to start");
  const [winner, setWinner] = useState(null); // Track specific winner for effects
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Update window size for confetti
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const dealGame = () => {
    setWinner(null);
    playSound('deal');
    if (playerChips < BLIND || botChips < BLIND) {
      setMessage("Game Over! Refresh to restart.");
      return;
    }

    const newDeck = createDeck();
    setDeck(newDeck);
    
    setPlayerChips(prev => prev - BLIND);
    setBotChips(prev => prev - BLIND);
    setPot(BLIND * 2);

    setPlayerHand([newDeck.pop(), newDeck.pop()]);
    setBotHand([newDeck.pop(), newDeck.pop()]);
    setCommunityCards([]);
    
    setStage('preflop');
    setCurrentBet(0);
    setMessage("Your turn.");
    setIsPlayerTurn(true);
  };

  const handleFold = () => {
    playSound('fold');
    setMessage("You Folded. Bot wins.");
    setBotChips(prev => prev + pot);
    setPot(0);
    setStage('start');
  };

  const handleCheck = () => {
    if (currentBet > 0) {
      alert("You cannot check, you must Call or Fold.");
      return;
    }
    playSound('chip');
    setMessage("You Checked.");
    setIsPlayerTurn(false);
    setTimeout(botTurn, 1000); 
  };

  const handleCall = () => {
    playSound('chip');
    setPlayerChips(prev => prev - currentBet);
    setPot(prev => prev + currentBet);
    setCurrentBet(0); 
    setMessage("You Called.");
    setIsPlayerTurn(false);
    setTimeout(proceedToNextStreet, 1000);
  };

  const handleBet = (amount) => {
    if (playerChips < amount) return;
    playSound('chip');
    setPlayerChips(prev => prev - amount);
    setPot(prev => prev + amount);
    setCurrentBet(amount);
    setMessage(`You bet ${amount}.`);
    setIsPlayerTurn(false);
    setTimeout(botTurn, 1000);
  };

  // --- UPGRADED AI ---
  const botTurn = () => {
    const strength = getHandStrength(botHand, communityCards);
    const rng = Math.random();
    
    // Pot Odds Calculation: (Amount to Call) / (Total Pot + Amount to Call)
    // Low pot odds means it's cheap to call.
    const callCost = currentBet;
    const potOdds = callCost > 0 ? callCost / (pot + callCost) : 0;
    
    // AI Decision Matrix
    // 1. If checking (free): Bot almost always checks unless hand is great
    if (currentBet === 0) {
      if (strength > 60) { // Good hand
        const betAmt = Math.min(botChips, 50);
        playSound('chip');
        setBotChips(prev => prev - betAmt);
        setPot(prev => prev + betAmt);
        setCurrentBet(betAmt);
        setMessage(`Bot Bets ${betAmt}!`);
        setIsPlayerTurn(true);
      } else {
        setMessage("Bot Checks.");
        setTimeout(proceedToNextStreet, 1000);
      }
    } 
    // 2. If facing a bet: Use Pot Odds vs Hand Strength
    else {
      // Normalize strength to 0-1 (approx)
      const winProb = strength / 100; 

      if (winProb > potOdds || rng < 0.2) { // Call if odds are good OR bluff(20%)
        playSound('chip');
        setBotChips(prev => prev - currentBet);
        setPot(prev => prev + currentBet);
        setCurrentBet(0);
        setMessage("Bot Calls.");
        setTimeout(proceedToNextStreet, 1000);
      } else {
        playSound('fold');
        setMessage("Bot Folds! You Win.");
        setPlayerChips(prev => prev + pot);
        setPot(0);
        setStage('start');
        setWinner('Player'); // Trigger confetti
        playSound('win');
      }
    }
  };

  const proceedToNextStreet = () => {
    playSound('deal');
    const newDeck = [...deck];
    const currentComm = [...communityCards];

    if (stage === 'preflop') {
      newDeck.pop(); 
      currentComm.push(newDeck.pop(), newDeck.pop(), newDeck.pop());
      setStage('flop');
      setIsPlayerTurn(true);
    } else if (stage === 'flop') {
      newDeck.pop();
      currentComm.push(newDeck.pop());
      setStage('turn');
      setIsPlayerTurn(true);
    } else if (stage === 'turn') {
      newDeck.pop();
      currentComm.push(newDeck.pop());
      setStage('river');
      setIsPlayerTurn(true);
    } else if (stage === 'river') {
      handleShowdown(currentComm);
      return;
    }

    setDeck(newDeck);
    setCommunityCards(currentComm);
    setMessage(`Stage: ${stage.toUpperCase()}`);
  };

  const handleShowdown = (finalComm) => {
    setStage('showdown');
    const result = determineWinner(playerHand, botHand, finalComm);
    
    if (result.winner === 'Player') {
      setMessage(`You Win! ${result.description}`);
      setPlayerChips(prev => prev + pot);
      setWinner('Player');
      playSound('win');
    } else if (result.winner === 'Bot') {
      setMessage(`Bot Wins! ${result.description}`);
      setBotChips(prev => prev + pot);
      setWinner('Bot');
    } else {
      setMessage("It's a Tie! Pot Split.");
      setPlayerChips(prev => prev + (pot / 2));
      setBotChips(prev => prev + (pot / 2));
    }
    setPot(0);
  };

  return (
    <div className="table">
      {winner === 'Player' && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} />}
      
      {/* HUD */}
      <div className="info-bar">
        <span>Pot: ${pot}</span>
        <span>{message}</span>
      </div>

      {/* Bot */}
      <div className="player-area">
        <div className={`avatar bot-avatar ${isPlayerTurn ? '' : 'active-turn'}`}>
          Bot (${botChips})
        </div>
        <div className="cards-container">
          {botHand.map((card, i) => (
            <Card key={i} card={card} hidden={stage !== 'showdown'} />
          ))}
        </div>
      </div>

      {/* Community */}
      <div className="community-area">
        <div className="cards-container">
          {communityCards.map((card, i) => (
             <Card key={i} card={card} />
          ))}
        </div>
      </div>

      {/* Player */}
      <div className="player-area">
        <div className="cards-container">
          {playerHand.map((card, i) => (
             <Card key={i} card={card} />
          ))}
        </div>
        <div className={`avatar player-avatar ${isPlayerTurn ? 'active-turn' : ''}`}>
          You (${playerChips})
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        {stage === 'start' || stage === 'showdown' ? (
          <button className="btn-primary" onClick={dealGame}>
            {playerChips < BLIND ? "Game Over" : "New Hand ($10)"}
          </button>
        ) : (
          isPlayerTurn && (
            <>
              {currentBet === 0 ? (
                <button className="btn-action" onClick={handleCheck}>Check</button>
              ) : (
                <button className="btn-action" onClick={handleCall}>Call ${currentBet}</button>
              )}
              <button className="btn-action" onClick={() => handleBet(50)}>Bet $50</button>
              <button className="btn-fold" onClick={handleFold}>Fold</button>
            </>
          )
        )}
      </div>
    </div>
  );
}

export default App;