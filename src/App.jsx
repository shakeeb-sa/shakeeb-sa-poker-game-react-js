import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import './App.css';
import { createDeck, determineWinner, getHandStrength } from './utils/pokerLogic';
import { playSound } from './utils/sound';
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
  const [winner, setWinner] = useState(null); 
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

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

  // --- REVISED BOT LOGIC ---
  const botTurn = () => {
    // 1. Get Score (0-100)
    const strength = getHandStrength(botHand, communityCards, stage);
    
    // 2. Calculate Pot Odds
    // Example: Pot $100, Bet $20. Total Pool $120. Call is $20. 
    // Ratio = 20 / 120 = 0.16 (Very cheap to call)
    const callCost = currentBet;
    const potSizeAfterCall = pot + callCost;
    const potOdds = callCost > 0 ? callCost / potSizeAfterCall : 0;

    // Random factor for bluffing
    const rng = Math.random(); 

    // DECISION TREE
    
    // A. Player Checked (Free Move)
    if (currentBet === 0) {
      // Check unless hand is Good (50+) or Random Bluff (20%)
      if (strength > 55 || rng < 0.2) {
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
    
    // B. Player Bet (Cost to play)
    else {
      // Determine "Willingness to Pay"
      let willingness = 0;
      
      // If hand is garbage (<30), only call if very cheap
      if (strength < 30) willingness = 0.1; 
      // If hand is decent (30-50), call reasonable bets
      else if (strength < 50) willingness = 0.35;
      // If hand is strong (50+), call almost anything
      else willingness = 0.9;

      // Always call if the bet is tiny compared to pot (Pot Committed)
      if (potOdds < 0.1) willingness += 0.5;

      // EXECUTE
      if (willingness > potOdds || rng < 0.15) { // 15% random 'hero call'
        playSound('chip');
        setBotChips(prev => prev - currentBet);
        setPot(prev => prev + currentBet);
        setCurrentBet(0);
        setMessage("Bot Calls.");
        setTimeout(proceedToNextStreet, 1000);
      } else {
        playSound('fold');
        setMessage("Bot Folds. You Win.");
        setPlayerChips(prev => prev + pot);
        setPot(0);
        setStage('start');
        setWinner('Player');
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
      
      <div className="info-bar">
        <span>Pot: ${pot}</span>
        <span>{message}</span>
      </div>

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

      <div className="community-area">
        <div className="cards-container">
          {communityCards.map((card, i) => (
             <Card key={i} card={card} />
          ))}
        </div>
      </div>

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