import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Hand } from 'pokersolver'; 
import './App.css';
import { createDeck, determineWinner, getHandStrength } from './utils/pokerLogic';
import { playSound } from './utils/sound';
import Card from './components/Card';
import Chip from './components/Chip';

const INITIAL_CHIPS = 2000;

// DIFFICULTY CONFIGURATION
const DIFFICULTY_SETTINGS = {
  EASY: { blind: 10, name: "Rookie", color: "#2ecc71" },
  NORMAL: { blind: 50, name: "Pro", color: "#3498db" },
  HARD: { blind: 200, name: "Shark", color: "#e74c3c" }
};

function App() {
  // --- STATE ---
  const [difficulty, setDifficulty] = useState(null); // 'EASY', 'NORMAL', 'HARD' or null (Menu)
  
  const [deck, setDeck] = useState([]);
  const [stage, setStage] = useState('start'); 
  const [playerHand, setPlayerHand] = useState([]);
  const [botHand, setBotHand] = useState([]);
  const [communityCards, setCommunityCards] = useState([]);
  
  // Chips (Load from localStorage if available)
  const [playerChips, setPlayerChips] = useState(() => {
    const saved = localStorage.getItem('poker_player_chips');
    return saved ? parseInt(saved) : INITIAL_CHIPS;
  });
  const [botChips, setBotChips] = useState(INITIAL_CHIPS);
  
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0); 
  const [winStreak, setWinStreak] = useState(0);
  const [handDesc, setHandDesc] = useState(""); 

  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [winner, setWinner] = useState(null); 
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Refs
  const deckRef = useRef(deck);
  const stageRef = useRef(stage);
  const communityRef = useRef(communityCards);
  const diffRef = useRef(difficulty); // Ref for difficulty access in logic

  // Sync Refs
  useEffect(() => { deckRef.current = deck; }, [deck]);
  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { communityRef.current = communityCards; }, [communityCards]);
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);
  
  useEffect(() => {
    localStorage.setItem('poker_player_chips', playerChips);
  }, [playerChips]);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hand Reader
  useEffect(() => {
    if (playerHand.length > 0) {
      const format = (c) => `${c.rank}${c.suit}`;
      const cards = [...playerHand, ...communityCards].map(format);
      try {
        const solved = Hand.solve(cards);
        setHandDesc(solved.descr);
      } catch (e) { setHandDesc(""); }
    } else {
      setHandDesc("");
    }
  }, [playerHand, communityCards]);

  const notify = (msg) => toast.dark(msg, { position: "top-center", autoClose: 2000, hideProgressBar: true });

  // --- ACTIONS ---

  const selectDifficulty = (mode) => {
    playSound('chip');
    setDifficulty(mode);
    setPlayerChips(INITIAL_CHIPS); // Reset chips for fair start
    setBotChips(INITIAL_CHIPS);
    setWinStreak(0);
    setStage('start');
  };

  const dealGame = () => {
    setWinner(null);
    playSound('deal');
    
    const BLIND = DIFFICULTY_SETTINGS[difficulty].blind;

    if (playerChips < BLIND || botChips < BLIND) {
      if (playerChips < BLIND) {
        notify("Bankrupt! Returning to Menu...");
        setTimeout(() => setDifficulty(null), 2000);
      } else {
        notify("Bot Bankrupt! Rebuying...");
        setBotChips(INITIAL_CHIPS);
      }
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
    setIsPlayerTurn(true);
  };

  const handleFold = () => {
    playSound('fold');
    notify("You Folded.");
    setBotChips(prev => prev + pot);
    setPot(0);
    setStage('start');
    setWinStreak(0); 
  };

  const handleCheck = () => {
    if (currentBet > 0) {
      notify("Cannot Check. Must Call or Fold.");
      return;
    }
    playSound('chip');
    setIsPlayerTurn(false);
    setTimeout(botTurn, 1000); 
  };

  const handleCall = () => {
    playSound('chip');
    setPlayerChips(prev => prev - currentBet);
    setPot(prev => prev + currentBet);
    setCurrentBet(0); 
    setIsPlayerTurn(false);
    setTimeout(proceedToNextStreet, 1000);
  };

  const handleBet = (amount) => {
    if (playerChips < amount) {
       notify("Not enough chips!");
       return;
    }
    playSound('chip');
    setPlayerChips(prev => prev - amount);
    setPot(prev => prev + amount);
    setCurrentBet(amount);
    setIsPlayerTurn(false);
    setTimeout(botTurn, 1000);
  };

  const exitToMenu = () => {
    setDifficulty(null);
  };

  // --- BOT LOGIC (DYNAMIC DIFFICULTY) ---
  const botTurn = () => {
    const strength = getHandStrength(botHand, communityRef.current, stageRef.current);
    const rng = Math.random(); 
    
    // AI SETTINGS BASED ON DIFFICULTY
    let betThreshold, callThreshold, bluffChance;
    
    switch(diffRef.current) {
      case 'EASY':
        betThreshold = 65; // Only bets with great hands
        callThreshold = 20; // Loose calling (easy to trap)
        bluffChance = 0.05; // Rarely bluffs
        break;
      case 'HARD':
        betThreshold = 40; // Aggressive betting
        callThreshold = 30; // Smarter calling
        bluffChance = 0.40; // Bluffs a lot
        break;
      case 'NORMAL':
      default:
        betThreshold = 50;
        callThreshold = 25;
        bluffChance = 0.15;
        break;
    }

    if (currentBet === 0) {
      // DECISION: CHECK or BET
      if (strength > betThreshold || rng < bluffChance) {
        // Bet amount logic (Harder bots bet more logic)
        const betAmt = diffRef.current === 'HARD' ? 100 : 50; 
        const safeBet = Math.min(botChips, betAmt);
        
        playSound('chip');
        setBotChips(prev => prev - safeBet);
        setPot(prev => prev + safeBet);
        setCurrentBet(safeBet);
        notify(`Bot Bets $${safeBet}`);
        setIsPlayerTurn(true);
      } else {
        notify("Bot Checks");
        setTimeout(proceedToNextStreet, 1000);
      }
    } else {
      // DECISION: CALL or FOLD
      // Easy bots call way too much. Hard bots fold if odds are bad (simplified here)
      if (strength > callThreshold || rng < (bluffChance / 2)) { 
        playSound('chip');
        setBotChips(prev => prev - currentBet);
        setPot(prev => prev + currentBet);
        setCurrentBet(0);
        notify("Bot Calls");
        setTimeout(proceedToNextStreet, 1000);
      } else {
        playSound('fold');
        notify("Bot Folds. You Win!");
        setPlayerChips(prev => prev + pot);
        setPot(0);
        setStage('start');
        setWinner('Player');
        setWinStreak(prev => prev + 1);
        playSound('win');
      }
    }
  };

  const proceedToNextStreet = () => {
    playSound('deal');
    const newDeck = [...deckRef.current];
    const currentComm = [...communityRef.current];
    const currentStage = stageRef.current;

    if (currentStage === 'preflop') {
      newDeck.pop(); 
      currentComm.push(newDeck.pop(), newDeck.pop(), newDeck.pop());
      setStage('flop');
      setIsPlayerTurn(true);
    } else if (currentStage === 'flop') {
      newDeck.pop();
      currentComm.push(newDeck.pop());
      setStage('turn');
      setIsPlayerTurn(true);
    } else if (currentStage === 'turn') {
      newDeck.pop();
      currentComm.push(newDeck.pop());
      setStage('river');
      setIsPlayerTurn(true);
    } else if (currentStage === 'river') {
      handleShowdown(currentComm);
      return;
    }

    setDeck(newDeck);
    setCommunityCards(currentComm);
  };

  const handleShowdown = (finalComm) => {
    setStage('showdown');
    const result = determineWinner(playerHand, botHand, finalComm);
    
    if (result.winner === 'Player') {
      notify(`You Win! ${result.description}`);
      setPlayerChips(prev => prev + pot);
      setWinner('Player');
      setWinStreak(prev => prev + 1);
      playSound('win');
    } else if (result.winner === 'Bot') {
      notify(`Bot Wins! ${result.description}`);
      setBotChips(prev => prev + pot);
      setWinner('Bot');
      setWinStreak(0);
    } else {
      notify("It's a Tie! Pot Split.");
      setPlayerChips(prev => prev + (pot / 2));
      setBotChips(prev => prev + (pot / 2));
    }
    setPot(0);
  };

  // --- MENU RENDER ---
  if (!difficulty) {
    return (
      <div className="poker-table-wrapper">
         <div className="table">
            <div className="menu-overlay">
              <div className="menu-content">
                <h1 className="menu-title">Poker Pro</h1>
                <div className="menu-subtitle">SELECT YOUR CHALLENGE</div>
                
                <div className="difficulty-container">
                  {/* EASY CARD */}
                  <div className="diff-card easy" onClick={() => selectDifficulty('EASY')}>
                    <div className="diff-icon">🐣</div>
                    <div className="diff-name" style={{color: '#2ecc71'}}>Rookie</div>
                    <div className="diff-blind">Blind $10</div>
                    <div className="diff-desc">Loose player. Calls often. Perfect for beginners.</div>
                  </div>

                  {/* NORMAL CARD */}
                  <div className="diff-card normal" onClick={() => selectDifficulty('NORMAL')}>
                     <div className="diff-icon">😎</div>
                    <div className="diff-name" style={{color: '#3498db'}}>Pro</div>
                    <div className="diff-blind">Blind $50</div>
                    <div className="diff-desc">Standard play. Balanced strategy. Good practice.</div>
                  </div>

                  {/* HARD CARD */}
                  <div className="diff-card hard" onClick={() => selectDifficulty('HARD')}>
                     <div className="diff-icon">🦈</div>
                    <div className="diff-name" style={{color: '#e74c3c'}}>Shark</div>
                    <div className="diff-blind">Blind $200</div>
                    <div className="diff-desc">Aggressive bluffer. High stakes. For experts only.</div>
                  </div>
                </div>

              </div>
            </div>
         </div>
      </div>
    );
  }

  // --- GAME RENDER ---
  const diffConfig = DIFFICULTY_SETTINGS[difficulty];

  return (
    <div className="poker-table-wrapper">
      <div className="table">
        <ToastContainer />
        {winner === 'Player' && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} />}
        
        {/* STATS BAR */}
        <div className="game-stats">
          <div className="stat-badge">Streak: {winStreak} 🔥</div>
          <button style={{
            padding: '5px 15px', fontSize: '0.8rem', background: '#333', color: '#888',
            position: 'absolute', top: '-60px', left: '0'
          }} onClick={exitToMenu}>← MENU</button>
        </div>

        {/* DIFFICULTY BADGE */}
        <div className="difficulty-badge" style={{background: diffConfig.color, color: 'white'}}>
          {diffConfig.name} MODE
        </div>

        {/* BOT AREA */}
        <div className="player-area">
          <div className={`avatar-wrapper bot-avatar ${!isPlayerTurn ? 'active-turn' : ''}`}>
            <div className="avatar">BOT</div>
            <div className="chip-count">${botChips}</div>
            
            {/* Show Chip Stack if Bot has bet */}
            {currentBet > 0 && !isPlayerTurn && (
               <div className="bet-stack"><Chip amount={currentBet} /></div>
            )}
          </div>
          
          {/* FANNED CARDS - WRAPPED CORRECTLY */}
          <div className="player-hand-fan" style={{transform: 'scale(0.85)'}}>
            {botHand.map((card, i) => (
              <div key={i} className="card-image-container">
                <Card index={i} card={card} hidden={stage !== 'showdown'} />
              </div>
            ))}
          </div>
        </div>

        {/* COMMUNITY AREA */}
        <div className="community-area">
           <div className="pot-wrapper">
              <Chip amount={pot} />
              <div className="pot-label">POT: ${pot}</div>
           </div>
           <div className="cards-container">
              {communityCards.map((card, i) => (
                 <div key={i} className="card-image-container">
                    <Card card={card} hidden={false} />
                 </div>
              ))}
              {communityCards.length === 0 && <div style={{width: 50, height: 100}} />}
           </div>
        </div>

        {/* PLAYER AREA */}
        <div className="player-area">
          {/* Fanned Cards */}
          <div className="player-hand-fan">
            {playerHand.map((card, i) => (
               <div key={i} className="card-image-container">
                 <Card card={card} hidden={false} />
               </div>
            ))}
          </div>
          
          <div className="hand-reader">
            {stage !== 'start' && handDesc}
          </div>

          <div className={`avatar-wrapper player-avatar ${isPlayerTurn ? 'active-turn' : ''}`}>
            <div className="avatar">YOU</div>
            <div className="chip-count">${playerChips}</div>
             {/* Show Chip Stack if Player has bet */}
             {currentBet > 0 && isPlayerTurn && (
               <div className="bet-stack"><Chip amount={currentBet} /></div>
             )}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="controls-bar">
          {stage === 'start' || stage === 'showdown' ? (
            <button className="btn-main" onClick={dealGame}>
              {playerChips < diffConfig.blind ? "Bankrupt" : "Deal Hand"}
            </button>
          ) : (
            isPlayerTurn && (
              <>
                {currentBet === 0 ? (
                  <button className="btn-check" onClick={handleCheck}>Check</button>
                ) : (
                  <button className="btn-check" onClick={handleCall}>Call ${currentBet}</button>
                )}
                <button className="btn-bet" onClick={() => handleBet(50)}>Bet $50</button>
                <button className="btn-bet" onClick={() => handleBet(playerChips)}>All In</button>
                <button className="btn-fold" onClick={handleFold}>Fold</button>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default App;